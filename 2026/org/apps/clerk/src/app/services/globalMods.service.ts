import { Globals } from './../models/globals.model';
import { Injectable } from '@angular/core';
import { RuleData } from '../models/ruleData.model';
import { KeyVal } from '../models/keyval.model';
import { House } from '../models/house.model';
import { GenutilsService } from './genutils.service';
import { FirebaseService } from './firebase.service';

@Injectable({
  providedIn: 'root'
})

export class GlobalModsService {
  CLASSNAME = 'globalMods'

  constructor(private utilSvc: GenutilsService, private fireSvc: FirebaseService) { }

  genCategoryMap(catFolders: KeyVal[], catTaxcat: KeyVal[]): Map<string, KeyVal[]> {
    const curMap: Map<string, KeyVal[]> = new Map<string, KeyVal[]>() ;
    for (const catFolder of catFolders) {
      curMap.set(catFolder.RKey, catTaxcat.filter((dt) => catFolder.RVal.includes(dt.RKey)))
    }
    this.utilSvc.cLog(this.CLASSNAME, 'genCategoryMap w/map: %O', curMap)
    return curMap ;
  }

  /*****************************************************************************
     Event occurred to a row in child component
      See if we can modify the arrays to avoid refreshing from DBs so that while
      admin is occurring.  On exit from admin, will refresh all from DB.
   *****************************************************************************/
  onParmMod(action: string, parmType: string, newVal: any, oldVal: any, fbGlobals: Globals[],
    fullHouse: House[], accountTypes: string[], tranTypes: string[], accounts: KeyVal[],
    categorFolders: KeyVal[], categoryTaxcat: KeyVal[], ruleAdmin: RuleData[],
    taxCats: KeyVal[], cid: string): [number, boolean, string] {
    let actionCnt = 0 ;  let newRow = false ;  let statusMsg = ''
    let globalId = (action === this.utilSvc.actionTypes.Add ||
      action === this.utilSvc.actionTypes.Cancel) ? '' :
      this.getKId4Global(parmType, newVal, oldVal, fbGlobals) ;  // If existing row, get GID
      this.utilSvc.cLog(this.CLASSNAME, 'into onParmMod w/action: %s  Tp: %s  new: %O  old: %O  gid: %s', action,
      parmType, newVal, oldVal, globalId) ;
    if (globalId === this.utilSvc.noGid) {
      this.utilSvc.cWarn(this.CLASSNAME,'Did not find GID so cannot process request')
      return [0, false, 'Failed to update category folder, found no key'];
    }
    let isErr = false ;
    let updResp: string | Promise<any> ;    let delResp: string | Promise<any> ;
    actionCnt++ ;   // Unless cancel, this is an added action
    switch (action) {
      case this.utilSvc.actionTypes.Add:
        newRow = false ;
        this.fireSvc.addGlobal(parmType, newVal).then(docRef => {
          globalId = docRef?.id ;
          this.utilSvc.cDebug(this.CLASSNAME,'onParmMod called addGlobal. globalId: %s cid %s', globalId, cid)
          statusMsg = 'Successfully added: ' + parmType ;
          this.modGlobalArr(action, globalId, parmType, newVal, fbGlobals, cid) ;
        }).catch(error => {
          statusMsg = 'Failed to add: ' + parmType ;
          this.utilSvc.cWarn(this.CLASSNAME, 'Failed to add: %s  Val: %O  err: %s', parmType, newVal, error) ;
          isErr = true ;
        })
        break ;
      case this.utilSvc.actionTypes.Update:
        this.utilSvc.cLog(this.CLASSNAME, 'update parmTp: %s old: %O new: %O gid: %s', parmType, oldVal, newVal, globalId) ;
        updResp = this.fireSvc.updateGlobal(parmType, oldVal, newVal, globalId) ;
        if (typeof updResp === 'string') {
          statusMsg = 'Failed to update: ' + parmType ;
          this.utilSvc.cWarn(this.CLASSNAME,'Failed to update: %s  Val: %O  Failed to find GId', parmType, newVal) ;
          isErr = true ;
        } else {
          updResp.then(() => {
            this.utilSvc.cLog(this.CLASSNAME,'Successfully updated global id: %s newRow: %O', globalId, newVal) ;
            statusMsg = 'Successfully updated: ' + parmType ;
            this.modGlobalArr(action, globalId, parmType, newVal, fbGlobals, cid) ;
          }).catch(error => {
            statusMsg = 'Failed to udpate: ' + parmType ;
            this.utilSvc.cWarn(this.CLASSNAME,'Failed to update: %s  Val: %O  Err: %s', parmType, newVal, error) ;
            isErr = true ;
          })
        }
        break ;
      case this.utilSvc.actionTypes.Delete:
        delResp = this.fireSvc.deleteGlobal(parmType, newVal, globalId) ;
        if (typeof delResp === 'string') {
          statusMsg = 'Failed to delete: ' + parmType ;
          this.utilSvc.cWarn(this.CLASSNAME, 'Failed to delete: %s  Val: %O  Failed to find GID', parmType, newVal) ;
          isErr = true ;
        } else {
          delResp.then(() => {
            statusMsg = 'Successfully deleted: ' + parmType ;
            this.modGlobalArr(action, globalId, parmType, newVal, fbGlobals, cid) ;
          }).catch(error => {
            statusMsg = 'Failed to delete: ' + parmType ;
            this.utilSvc.cWarn(this.CLASSNAME,'Failed to delete: %s  Val: %O  Err: %s', parmType, newVal, error) ;
            isErr = true ;
          })
        }
        break ;
      case this.utilSvc.actionTypes.Cancel:
        actionCnt-- ; newRow = false ;  break ;
      default:
        this.utilSvc.cWarn(this.CLASSNAME,'Invalid actionx: %s', action)
    }

    switch (parmType) {
      case this.utilSvc.globalTypes.Houses:
        this.modHouseArrs(action, globalId, newVal, oldVal, fullHouse) ;    break ;
      case this.utilSvc.globalTypes.AccountType:
      case this.utilSvc.globalTypes.TranType:
        this.modSingles(action, parmType, globalId, newVal, oldVal, accountTypes, tranTypes) ;  break ;
      case this.utilSvc.globalTypes.CategoryTaxcats:
      case this.utilSvc.globalTypes.CategoryFolders:
        this.modCategory(action, parmType, globalId, newVal, oldVal, categorFolders, categoryTaxcat)
        break ;
      case this.utilSvc.globalTypes.Accounts:
        this.modAccounts(action, globalId, newVal, oldVal, accounts) ;   break ;
      case this.utilSvc.globalTypes.TaxCats:
        this.modTaxCats(action, globalId, newVal, oldVal, taxCats) ;   break ;
      case this.utilSvc.globalTypes.RuleData:
        this.modRule(action, globalId, newVal, oldVal, ruleAdmin) ;  break ;
      default:
        this.utilSvc.cWarn(this.CLASSNAME, 'Invalid type: %s', parmType) ;
    }
    return [actionCnt, newRow, statusMsg]
  }

  /**
   * getKId4Global searches current global array to find ID for DB from original array since
   * this value is NOT included in subArrays for components which do not need it.  Only admin
   * needs it. Note for arrays we use nrval (new) as array is updated in place ... for strings,
   * we use rval (old) since globals won't have been updated.
   * @param rKey : Type of global
   * @param nrVal : New value (if not available, dup old val) for items that get modified
   * like array items and such
   * @param rVal : Old or original value
   * @returns : Global ID for row in DB or string noGid if not found
   */
  getKId4Global(rKey: string, nrVal: any, rVal: any, fbGlobals: Globals[]): string {
    // filter down to just globals of this type (cid not needed as all for this cid in array)
    const keySubset = fbGlobals.filter(fbGlobal => fbGlobal.RKey === rKey) ;
    this.utilSvc.cLog(this.CLASSNAME,'GetKid 4 type: %s  Val: %O  FiltLen: %d', rKey, rVal, keySubset.length) ;
    let srchHouse: House ;  let globHouse: House ;
    let categoryData, lTaxCat, kvVal: KeyVal ;
    let globRule: RuleData ;  let tmpRule: any ; let srchMatches: Globals[] ;
    let srchRule: RuleData ;  let srchWithAccts: Globals[] ;
    switch (rKey) {
      case this.utilSvc.globalTypes.TranType:
      case this.utilSvc.globalTypes.AccountType:
        for (const cGlobal of keySubset) {
          if (rVal == cGlobal.RVal) {
            return cGlobal.GlobalId! ;
          }
        }
        return this.utilSvc.noGid ;
      case this.utilSvc.globalTypes.Houses:
        srchHouse = nrVal ;
        this.utilSvc.cDebug(this.CLASSNAME, 'Searching for gid on house: %O', srchHouse) ;
        for (const cGlobal of keySubset) {
          globHouse = this.getHouse(cGlobal.RVal)
          if (srchHouse.name === globHouse.name && srchHouse.Addr === globHouse.Addr &&
            srchHouse.zipCode === globHouse.zipCode) {
            return cGlobal.GlobalId! ;
          }
        }
        return this.utilSvc.noGid ;
      case this.utilSvc.globalTypes.CategoryTaxcats:  // category/taxCat
      case this.utilSvc.globalTypes.CategoryFolders:  // categoryFolder/category
        categoryData = nrVal ;
        this.utilSvc.cDebug(this.CLASSNAME,'Searching for gid on %s: %O', rKey, categoryData ) ;
        for (const cGlobal of keySubset) {
          kvVal = this.getKv(cGlobal.RVal)
          if (categoryData.RKey === kvVal.RKey) {    // RKey of RVal is ticket for either type
          return cGlobal.GlobalId! ;
          }
        }
        return this.utilSvc.noGid ;
      case this.utilSvc.globalTypes.Accounts:   // Accounts and Taxcat both keyvals
      case this.utilSvc.globalTypes.TaxCats:
        lTaxCat = nrVal ;
        this.utilSvc.cDebug(this.CLASSNAME, 'Searching for taxCat or account gid %s', lTaxCat.RKey) ;
        for (const cGlobal of keySubset) {
          kvVal = this.getKv(cGlobal.RVal)
          if (lTaxCat.RKey === kvVal.RKey) {
          return cGlobal.GlobalId! ;
          }
        }
        return this.utilSvc.noGid ;
      case this.utilSvc.globalTypes.RuleData:    // RuleData
        srchRule = rVal ;
        srchMatches = keySubset.filter(cGlob => {
          globRule = this.getRule(cGlob.RVal)
          return srchRule.srchStr === globRule.srchStr && srchRule.srchAmt === globRule.srchAmt
        })
        if (srchMatches.length === 1) return srchMatches[0].GlobalId! ;
        if (srchMatches.length === 0) return this.utilSvc.noGid ;
        srchWithAccts = srchMatches.filter(cGlob => {
          globRule = this.getRule(cGlob.RVal)
          return (srchRule.accounts.length === globRule.accounts.length &&
          srchRule.accounts.every((acc, idx) => acc === globRule.accounts[idx])) ? true : false 
        })
        if (srchWithAccts.length === 1) return srchWithAccts[0].GlobalId!
          this.utilSvc.cWarn(this.CLASSNAME,'Searching for gid on rule: %O  Len of subset: %d', srchRule, srchWithAccts.length) ;
    }
    this.utilSvc.cWarn(this.CLASSNAME, 'RKey: %s got no match: %s', rKey)
    return this.utilSvc.noGid ;
  }

  // To avoid extra refreshing of globals from FB during mass editing of globals
  modGlobalArr(action: string, gid: string, rKey: string, rVal: any, fbGlobals: Globals[], cid: string) {
    this.utilSvc.cDebug(this.CLASSNAME, 'modGlobalArr with action: %s gid: %s  and key: %s  rVal: %O', action, gid, rKey, rVal) ;
    let idx = -1 ;
    if (action === this.utilSvc.actionTypes.Delete || action === this.utilSvc.actionTypes.Update) {
      idx = fbGlobals.findIndex(gVal => gVal.GlobalId === gid) ;
    }
    let globRow: Globals ;
    switch (action) {
      case this.utilSvc.actionTypes.Delete:
        fbGlobals.splice(idx, 1) ; break ;
      case this.utilSvc.actionTypes.Update:
          fbGlobals[idx].RVal = rVal ;   // Somehow arr chg in other component not here
          break ;
      case this.utilSvc.actionTypes.Add:
        globRow = (new Globals(cid, rKey, rVal, gid)) ;
        fbGlobals.push(globRow) ;
        break ;
      default:
        this.utilSvc.cWarn(this.CLASSNAME, 'Invalid action in modGlobalArr: %s', action)
    }
  }

  getHouse(inVal: any): House { return inVal as House }
  getKv(inVal: any): KeyVal {  return inVal as KeyVal }
  getRule(inVal: any): RuleData { return inVal as RuleData }

  modHouseArrs(action: string, gId: string, newVal: House, oldVal: House, fullHouse: House[]) {
    let idx: number ;
    switch (action) {
      case this.utilSvc.actionTypes.Update:
        if (newVal.name !== oldVal.name) {
          fullHouse = fullHouse.sort((a, b) => a.name.localeCompare(b.name)) ;
        }   // Array updated in place, but if keys chgd, re-sort
        break ;
      case this.utilSvc.actionTypes.Delete:
        idx = fullHouse.findIndex(house => house.name === oldVal.name) ;
        if (idx > -1) {
          fullHouse.splice(idx, 1) ;
        } else {
          this.utilSvc.cWarn(this.CLASSNAME,'Failed to remove house: %s from arrays', oldVal.name) ;
        }
        break ;
      case this.utilSvc.actionTypes.Add:
        fullHouse.push(newVal) ;
        fullHouse = fullHouse.sort((a, b) => a.name.localeCompare(b.name)) ;
    }
  }

  modSingles(action: string, parmType: string, gId: string, newVal: string, oldVal: string,
    accountTypes: string[], tranTypes: string[]) {
    let stringArr: string[] = (parmType === this.utilSvc.globalTypes.AccountType) ?
      accountTypes : tranTypes ;
    let uidx: number ;  let idx: number ;
    switch (action) {
      case this.utilSvc.actionTypes.Update:   // Single, no array, so must reflect updt in globals
        uidx = stringArr.findIndex(rVal => rVal === oldVal) ;
        stringArr[uidx] = newVal ;
        stringArr = stringArr.sort((a, b) => a.localeCompare(b)) ;
        break ;
      case this.utilSvc.actionTypes.Delete:
        idx = stringArr.findIndex(rVal => rVal === oldVal) ;
        if (idx > -1) {
          stringArr.splice(idx, 1) ;
        } else {
          this.utilSvc.cWarn(this.CLASSNAME, 'Failed to remove %s: val %s', parmType, oldVal) ;
        }
          break ;
      case this.utilSvc.actionTypes.Add:
        stringArr.push(newVal) ;
        stringArr = stringArr.sort((a, b) => a.localeCompare(b)) ;
      }
  }

  modCategory(action: string, parmType: string, gId: string, newVal: KeyVal, oldVal: KeyVal,
    categoryFolders: KeyVal[], categoryTaxcat: KeyVal[]) {
    let categoryArr = (parmType === this.utilSvc.globalTypes.CategoryFolders) ?
      categoryFolders : categoryTaxcat
    let idx: number ;
    switch (action) {
      case this.utilSvc.actionTypes.Update:
        if (newVal.RKey !== oldVal.RKey) {
          categoryArr = categoryArr.sort((a, b) => a.RKey.localeCompare(b.RKey)) ;
        }
        break ;
      case this.utilSvc.actionTypes.Delete:
        idx = categoryArr.findIndex(rVal => rVal.RKey === newVal.RKey) ;
        if (idx > -1) {
          categoryArr.splice(idx, 1) ;
        } else {
          this.utilSvc.cWarn(this.CLASSNAME,'Failed to remove category %s: taxCat %s from categoryTaxcat',
            oldVal.RKey, oldVal.RVal) ;
        }
        break ;
      case this.utilSvc.actionTypes.Add:
        categoryArr.push(newVal) ;
        categoryArr = categoryArr.sort((a, b) => a.RKey.localeCompare(b.RKey)) ;
    }
  }

  modTaxCats(action: string, gId: string, newVal: KeyVal, oldVal: KeyVal, taxCats: KeyVal[]) {
    let idx: number ;
    switch (action) {
      case this.utilSvc.actionTypes.Update:
        if (newVal.RKey !== oldVal.RKey) {
          taxCats = taxCats.sort((a, b) => a.RKey.localeCompare(b.RKey)) ;
        }
        break ;
      case this.utilSvc.actionTypes.Delete:
        idx = taxCats.findIndex(rVal => rVal.RKey === newVal.RKey) ;
        if (idx > -1) {
          taxCats.splice(idx, 1) ;
        } else {
          this.utilSvc.cWarn(this.CLASSNAME, 'Failed to remove taxCategory %s: label %s from taxCats',
            oldVal.RKey, oldVal.RVal) ;
        }
        break ;
      case this.utilSvc.actionTypes.Add:
        taxCats.push(newVal) ;
        taxCats = taxCats.sort((a, b) => a.RKey.localeCompare(b.RKey)) ;
      }
  }

  modAccounts(action: string, gId: string, newVal: KeyVal, oldVal: KeyVal, accounts: KeyVal[]) {
    let idx: number ;
    switch (action) {
      case this.utilSvc.actionTypes.Update:
        if (newVal.RKey !== oldVal.RKey) {
          accounts = accounts.sort((a, b) => a.RKey.localeCompare(b.RKey)) ;
        }     // If acctNm changed, re-sort
        break ;
      case this.utilSvc.actionTypes.Delete:
        idx = accounts.findIndex(rVal => rVal.RKey === newVal.RKey) ;
        if (idx > -1) {
          accounts.splice(idx, 1) ;
        } else {
          this.utilSvc.cWarn(this.CLASSNAME,'Failed to remove account %s: type %s from accounts',
            oldVal.RKey, oldVal.RVal) ;
        }
        break ;
      case this.utilSvc.actionTypes.Add:
        accounts.push(newVal) ;
        accounts = accounts.sort((a, b) => a.RKey.localeCompare(b.RKey)) ;
      }
  }

  modRule(action: string, gId: string, newVal: RuleData, oldVal: RuleData, ruleAdmin: RuleData[]) {
    this.utilSvc.cDebug(this.CLASSNAME,'Into modRule w/new rule: %O  Old: %O', newVal, oldVal) ;
    let ovAccounts: string ;  let idx: number ;  let ovAcctLen: number ;
    switch (action) {
      case this.utilSvc.actionTypes.Update:
        if (oldVal.srchStr != newVal.srchStr || oldVal.srchAmt !== newVal.srchAmt) {
          this.sortRules(ruleAdmin) ;
        }   // Updates are already updated in array, resort if a key changed
        break ;
      case this.utilSvc.actionTypes.Delete:
        ovAccounts = JSON.stringify(oldVal.accounts) ;
        ovAcctLen = oldVal.accounts.length ;
        this.utilSvc.cDebug(this.CLASSNAME, 'Updt/Del rule len: %d', ruleAdmin.length) ;
        idx = ruleAdmin.findIndex(rule => {
          if (this.utilSvc.isLoggable(this.CLASSNAME, this.utilSvc.msgLvls.Verbose)) {
            this.utilSvc.cVerbose(this.CLASSNAME,'fndidx: Rule: %O  Accts: %O  RuleAccts: %s', rule, ovAccounts, JSON.stringify(rule.accounts))
          }
          return (rule.srchStr === oldVal.srchStr &&    // equal if srchstrings = AND
          rule.accounts.length === ovAcctLen &&    // account array len = AND
          ovAccounts === JSON.stringify(rule.accounts))
        }) ;   // account arrays equal
        if (idx > -1) {
          ruleAdmin.splice(idx, 1) ;   // Map will be re-ca`lc`d when we leave component
        } else {
          this.utilSvc.cWarn(this.CLASSNAME, 'Failed to remove rule: %s from arrays', oldVal.srchStr) ;
        }
        break ;
      case this.utilSvc.actionTypes.Add:
        ruleAdmin.push(newVal) ;
        this.sortRules(ruleAdmin) ;
    }
  }

  sortRules(ruleAdmin: RuleData[]) {
    ruleAdmin = ruleAdmin.sort((a, b) => {
      const cmp = a.srchStr.localeCompare(b.srchStr) ;
      if (cmp != 0) { return cmp }
      return (a.srchAmt < b.srchAmt) ? -1 : 1 ;
    })
  }
}
