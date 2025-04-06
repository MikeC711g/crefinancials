import { Globals } from './../models/globals.model';
import { Injectable } from '@angular/core';
import { RuleData } from '../models/ruledata.model';
import { KeyVal } from '../models/keyval.model';
import { House } from '../models/house.model';
import { GenutilsService } from './genutils.service';
import { FirebaseService } from './firebase.service';
import { Mortgage } from '../models/mortgages.model';

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

  onGlobalMod(action: string, gType: string, newGlob: Globals, oldGlob: Globals, fbGlobals: Globals[],
    accountTypes: string[], tranTypes: string[], accounts: KeyVal[], categorFolders: KeyVal[],
    categoryTaxcat: KeyVal[], taxCats: KeyVal[], cid: string): [number, string] {
    let actionCnt = 0 ;  let statusMsg = ''
    let globalId = (action === this.utilSvc.actionTypes.Add ||
      action === this.utilSvc.actionTypes.Cancel) ? '' :
      this.getKId4Global(gType, newGlob, oldGlob, fbGlobals) ;  // If existing row, get GID
    this.utilSvc.cLog(this.CLASSNAME, 'into onParmMod w/action: %s  Tp: %s  new: %O  old: %O  gid: %s', action,
      gType, newGlob, oldGlob, globalId) ;
    if (globalId === this.utilSvc.noGid) {
      this.utilSvc.cWarn(this.CLASSNAME,'Did not find GID so cannot process request')
      return [0, 'Failed to update category folder, found no key'];
    }
    let isErr = false ;
    let updResp: string | Promise<any> ;    let delResp: string | Promise<any> ;
    actionCnt++ ;   // Unless cancel, this is an added action
    switch (action) {
      case this.utilSvc.actionTypes.Add:
        this.fireSvc.addGlobal(newGlob).then(docRef => {
          globalId = docRef?.id ;
          newGlob.GlobalId = globalId ;
          this.utilSvc.cDebug(this.CLASSNAME,'onGlobalMod called addGlobal. globalId: %s cid %s', globalId, cid)
          statusMsg = 'Successfully added: ' + gType ;
          this.modGlobalArr(action, globalId, gType, newGlob, fbGlobals, cid) ;
        }).catch(error => {
          statusMsg = 'Failed to add: ' + gType ;
          this.utilSvc.cWarn(this.CLASSNAME, 'Failed to add: %s  Val: %O  err: %s', gType, newGlob, error) ;
          isErr = true ;
        })
        break ;
      case this.utilSvc.actionTypes.Update:
        this.utilSvc.cLog(this.CLASSNAME, 'update parmTp: %s old: %O new: %O gid: %s', gType, oldGlob, newGlob, globalId) ;
        updResp = this.fireSvc.updateGlobal(gType, oldGlob, newGlob, globalId) ;
        if (typeof updResp === 'string') {
          statusMsg = 'Failed to update: ' + gType ;
          this.utilSvc.cWarn(this.CLASSNAME,'Failed to update: %s  Val: %O  Failed to find GId', gType, newGlob) ;
          isErr = true ;
        } else {
          updResp.then(() => {
            this.utilSvc.cLog(this.CLASSNAME,'Successfully updated global id: %s newRow: %O', globalId, newGlob) ;
            statusMsg = 'Successfully updated: ' + gType ;
            this.modGlobalArr(action, globalId, gType, newGlob, fbGlobals, cid) ;
          }).catch(error => {
            statusMsg = 'Failed to udpate: ' + gType ;
            this.utilSvc.cWarn(this.CLASSNAME,'Failed to update: %s  Val: %O  Err: %s', gType, newGlob, error) ;
            isErr = true ;
          })
        }
        break ;
      case this.utilSvc.actionTypes.Delete:
        delResp = this.fireSvc.deleteGlobal(gType, newGlob, globalId) ;
        if (typeof delResp === 'string') {
          statusMsg = 'Failed to delete: ' + gType ;
          this.utilSvc.cWarn(this.CLASSNAME, 'Failed to delete: %s  Val: %O  Failed to find GID', gType, newGlob) ;
          isErr = true ;
        } else {
          delResp.then(() => {
            statusMsg = 'Successfully deleted: ' + gType ;
            this.modGlobalArr(action, globalId, gType, newGlob, fbGlobals, cid) ;
          }).catch(error => {
            statusMsg = 'Failed to delete: ' + gType ;
            this.utilSvc.cWarn(this.CLASSNAME,'Failed to delete: %s  Val: %O  Err: %s', gType, newGlob, error) ;
            isErr = true ;
          })
        }
        break ;
      case this.utilSvc.actionTypes.Cancel:
        actionCnt-- ; break ;
      default:
        this.utilSvc.cWarn(this.CLASSNAME,'Invalid actionx: %s', action)
    }

    let kvNew: KeyVal, kvOld: KeyVal ;
    switch (gType) {
      // case this.utilSvc.globalTypes.AccountTypes:
      // case this.utilSvc.globalTypes.TranTypes:
        // this.modSingles(action, gType, globalId, newGlob.RKey, oldGlob.RKey, accountTypes, tranTypes) ;  break ;
      case this.utilSvc.globalTypes.CategoryTaxcats:
      case this.utilSvc.globalTypes.CategoryFolders:
      case this.utilSvc.globalTypes.Accounts:
      case this.utilSvc.globalTypes.TaxCats:
        kvNew = new KeyVal(newGlob.RKey, newGlob.RVal!) ;
        kvOld = new KeyVal(oldGlob.RKey, oldGlob.RVal!) ;
        this.modKv(action, gType, globalId, kvNew, kvOld, categorFolders, categoryTaxcat,
          taxCats, accounts) ; break ;
      default:
        this.utilSvc.cWarn(this.CLASSNAME, 'Invalid type: %s', gType) ;
    }
    return [actionCnt, statusMsg]
  }

  /*****************************************************************************
     Event occurred to a row in child component
      See if we can modify the arrays to avoid refreshing from DBs so that while
      admin is occurring.  On exit from admin, will refresh all from DB.
   *****************************************************************************/
  onRuleMod(action: string, newRule: RuleData, oldRule: RuleData, cid: string, tranRules: RuleData []):
    [number, string] {
    let actionCnt = 0 ;  let statusMsg = ''
    let isErr = false ;
    let updResp: string | Promise<any> ;    let delResp: string | Promise<any> ;
    actionCnt++ ;   // Unless cancel, this is an added action
    switch (action) {
      case this.utilSvc.actionTypes.Add:
        this.fireSvc.addTranRule(newRule).then(docRef => {
          newRule.RuleId = docRef?.id ;
          statusMsg = 'Successfully added rule' ;
          const idx = tranRules.findIndex(rule => rule.ruleName.localeCompare(newRule.ruleName) > 0) ;
          tranRules.splice(idx, 0, newRule) ;   // Should sort here or isrt into sorted array
        }).catch(error => {
          statusMsg = 'Failed to add rule'
          this.utilSvc.cWarn(this.CLASSNAME, 'Failed to add rule  Val: %O  err: %s', newRule, error) ;
          isErr = true ;
        })
        break ;
      case this.utilSvc.actionTypes.Update:
        updResp = this.fireSvc.updateTranRule(oldRule, newRule) ;
        if (typeof updResp === 'string') {
          statusMsg = 'Failed to update rule '
          this.utilSvc.cWarn(this.CLASSNAME,'Failed to update rule Val: %O  Error: ', newRule, updResp) ;
          isErr = true ;
        } else {
          updResp.then(() => {
            statusMsg = 'Successfully updated rule '
            if (oldRule.ruleName !== newRule.ruleName) {  // Key flds modified
              const idx = tranRules.findIndex(rule => rule.ruleName.localeCompare(oldRule.ruleName) === 0) ;
              tranRules.splice(idx, 1) ;
              const nidx = tranRules.findIndex(rule => rule.ruleName.localeCompare(newRule.ruleName) > 0) ;
              tranRules.splice(nidx, 0, newRule) ;
            }
          }).catch(error => {
            statusMsg = 'Failed to udpate rule ' ;
            this.utilSvc.cWarn(this.CLASSNAME,'Failed to update rule Old: %O New: %O  Err: %s', oldRule, newRule, error) ;
            isErr = true ;
          })
        }
        break ;
      case this.utilSvc.actionTypes.Delete:
        delResp = this.fireSvc.deleteTranRule(newRule) ;
        if (typeof delResp === 'string') {
          statusMsg = 'Failed to delete rule '
          this.utilSvc.cWarn(this.CLASSNAME, 'Failed to delete rule  Val: %O  error: %s', newRule, delResp) ;
          isErr = true ;
        } else {
          delResp.then(() => {
            statusMsg = 'Successfully deleted rule '
            const idx = tranRules.findIndex(rule => rule.ruleName.localeCompare(newRule.ruleName) === 0) ;
            tranRules.splice(idx, 1) ;
          }).catch(error => {
            statusMsg = 'Failed to delete rule '
            this.utilSvc.cWarn(this.CLASSNAME,'Failed to delete rule Val: %O  Err: %s', newRule, error) ;
            isErr = true ;
          })
        }
        break ;
      case this.utilSvc.actionTypes.Cancel:
        actionCnt-- ; break ;
      default:
        this.utilSvc.cWarn(this.CLASSNAME,'Invalid actionx: %s', action)
    }
    return [actionCnt, statusMsg]
  }


  /*****************************************************************************
     Event occurred to a row in child component
      See if we can modify the arrays to avoid refreshing from DBs so that while
      admin is occurring.  On exit from admin, will refresh all from DB.
   *****************************************************************************/
  onHouseMod(action: string, newHouse: House, oldHouse: House, cid: string, houses: House []):
    [number, string] {
    let actionCnt = 0 ;  let statusMsg = ''
    let isErr = false ;
    let updResp: string | Promise<any> ;    let delResp: string | Promise<any> ;
    actionCnt++ ;   // Unless cancel, this is an added action
    switch (action) {
      case this.utilSvc.actionTypes.Add:
        this.fireSvc.addHouse(newHouse).then(docRef => {
          newHouse.HouseId = docRef?.id ;
          statusMsg = 'Successfully added house' ;
          const idx = houses.findIndex(house => house.name > newHouse.name) ;
          houses.splice(idx, 0, newHouse) ;   // Should sort here or isrt into sorted array
        }).catch(error => {
          statusMsg = 'Failed to add house'
          this.utilSvc.cWarn(this.CLASSNAME, 'Failed to add house  Val: %O  err: %s', newHouse, error) ;
          isErr = true ;
        })
        break ;
      case this.utilSvc.actionTypes.Update:
        updResp = this.fireSvc.updateHouse(oldHouse, newHouse) ;
        if (typeof updResp === 'string') {
          statusMsg = 'Failed to update house '
          this.utilSvc.cWarn(this.CLASSNAME,'Failed to update house Val: %O  Error: ', newHouse, updResp) ;
          isErr = true ;
        } else {
          updResp.then(() => {
            statusMsg = 'Successfully updated house ' // updated message
            if (newHouse.name !== oldHouse.name) {
              const idx = houses.findIndex(house => house.name === oldHouse.name) ;
              houses.splice(idx, 1) ;
              const nidx = houses.findIndex(house => house.name > newHouse.name) ;
              houses.splice(nidx, 0, newHouse) ;
            }
          }).catch(error => {
            statusMsg = 'Failed to udpate house ' ;
            this.utilSvc.cWarn(this.CLASSNAME,'Failed to update house Old: %O New: %O  Err: %s', oldHouse, newHouse, error) ;
            isErr = true ;
          })
        }
        break ;
      case this.utilSvc.actionTypes.Delete:
        delResp = this.fireSvc.deleteHouse(newHouse) ;
        if (typeof delResp === 'string') {
          statusMsg = 'Failed to delete house '
          this.utilSvc.cWarn(this.CLASSNAME, 'Failed to delete house  Val: %O  error: %s', newHouse, delResp) ;
          isErr = true ;
        } else {
          delResp.then(() => {
            statusMsg = 'Successfully deleted house '
            const idx = houses.findIndex(house => house.name === newHouse.name) ;
            houses.splice(idx, 1) ;
          }).catch(error => {
            statusMsg = 'Failed to delete house '
            this.utilSvc.cWarn(this.CLASSNAME,'Failed to delete house Val: %O  Err: %s', newHouse, error) ;
            isErr = true ;
          })
        }
        break ;
      case this.utilSvc.actionTypes.Cancel:
        actionCnt-- ; break ;
      default:
        this.utilSvc.cWarn(this.CLASSNAME,'Invalid action: %s', action)
    }
    return [actionCnt, statusMsg]
  }

  onMortgageMod(action: string, newMortgage: Mortgage, oldMortgage: Mortgage, cid: string,
    mortgages: Mortgage []):  [number, string] {
    let actionCnt = 0 ;  let statusMsg = ''
    let isErr = false ;
    let updResp: string | Promise<any> ;    let delResp: string | Promise<any> ;
    actionCnt++ ;   // Unless cancel, this is an added action
    switch (action) {
      case this.utilSvc.actionTypes.Add:
        this.fireSvc.addMortgage(newMortgage).then(docRef => {
          newMortgage.mortgageId = docRef?.id ;
          statusMsg = 'Successfully added mortgage' ;
          const idx = mortgages.findIndex(mortgage => mortgage.house > newMortgage.house) ;
          mortgages.splice(idx, 0, newMortgage) ;   // Should sort here or isrt into sorted array
        }).catch(error => {
          statusMsg = 'Failed to add mortgage' ;
          this.utilSvc.cWarn(this.CLASSNAME, 'Failed to add mortgage  Val: %O  err: %s', newMortgage, error) ;
          isErr = true ;
        })
        break ;
      case this.utilSvc.actionTypes.Update:
        updResp = this.fireSvc.updateMortgage(oldMortgage, newMortgage) ;
        if (typeof updResp === 'string') {
          statusMsg = 'Failed to update mortgage ' ;
          this.utilSvc.cWarn(this.CLASSNAME,'Failed to update mortgage Val: %O  Error: ', newMortgage, updResp) ;
          isErr = true ;
        } else {
          updResp.then(() => {
            statusMsg = 'Successfully updated mortgage ' // updated message
            if (newMortgage.house !== oldMortgage.house) {
              const idx = mortgages.findIndex(mortgage => mortgage.house === oldMortgage.house) ;
              mortgages.splice(idx, 1) ;
              const nidx = mortgages.findIndex(mortgage => mortgage.house > newMortgage.house) ;
              mortgages.splice(nidx, 0, newMortgage) ;
            }
          }).catch(error => {
            statusMsg = 'Failed to update mortgage ' ;
            this.utilSvc.cWarn(this.CLASSNAME,'Failed to update mortgage Old: %O New: %O  Err: %s', oldMortgage, newMortgage, error) ; // corrected from oldHouse, newHouse
            isErr = true ;
          })
        }
        break ;
      case this.utilSvc.actionTypes.Delete:
        delResp = this.fireSvc.deleteMortgage(newMortgage) ;
        if (typeof delResp === 'string') {
          statusMsg = 'Failed to delete mortgage '
          this.utilSvc.cWarn(this.CLASSNAME, 'Failed to delete mortgage  Val: %O  error: %s', newMortgage, delResp) ; // corrected from newHouse
          isErr = true ;
        } else {
          delResp.then(() => {
            statusMsg = 'Successfully deleted mortgage '
            const idx = mortgages.findIndex(mortgage => mortgage.mortgageId === newMortgage.mortgageId) ; // corrected from houses and newHouse
            mortgages.splice(idx, 1) ;
          }).catch(error => {
            statusMsg = 'Failed to delete mortgage ' 
            this.utilSvc.cWarn(this.CLASSNAME,'Failed to delete mortgage Val: %O  Err: %s', newMortgage, error) ; // corrected from newHouse
            isErr = true ;
          })
        }
        break ;
      case this.utilSvc.actionTypes.Cancel:
        actionCnt-- ; break ;
      default:
        this.utilSvc.cWarn(this.CLASSNAME,'Invalid action: %s', action)
    }
    return [actionCnt, statusMsg]
  }
  
  /**
   * getKId4Global searches current global array to find ID for DB from original array since
   * this value is NOT included in subArrays for components which do not need it.  Only admin
   * needs it. Note for arrays we use nrval (new) as array is updated in place ... for strings,
   * we use rval (old) since globals won't have been updated.
   * @param gType : Type of global
   * @param newGlobal : New value (if not available, dup old val) for items that get modified
   * like array items and such
   * @param oldGlobal : Old or original value
   * @returns : Global ID for row in DB or string noGid if not found
   */
  getKId4Global(gType: string, newGlobal: Globals, oldGlobal: Globals, fbGlobals: Globals[]): string {
    const tGlob = fbGlobals.find(fbGlobal => fbGlobal.GType == gType && fbGlobal.RKey === oldGlobal.RKey);
    return (tGlob) ? tGlob.GlobalId! : this.utilSvc.noGid ;
  }

  // To avoid extra refreshing of globals from FB during mass editing of globals
  modGlobalArr(action: string, gid: string, rKey: string, newGlob: Globals, fbGlobals: Globals[], cid: string) {
    this.utilSvc.cDebug(this.CLASSNAME, 'modGlobalArr with action: %s gid: %s  and key: %s  rVal: %O', action, gid, rKey, newGlob) ;
    let idx = -1 ;
    if (action === this.utilSvc.actionTypes.Delete || action === this.utilSvc.actionTypes.Update) {
      idx = fbGlobals.findIndex(gVal => gVal.GlobalId === gid) ;
    }
    switch (action) {
      case this.utilSvc.actionTypes.Delete:
        fbGlobals.splice(idx, 1) ; break ;
      case this.utilSvc.actionTypes.Update:
        newGlob.GlobalId = gid ;    fbGlobals[idx] = newGlob ;
        break ;
      case this.utilSvc.actionTypes.Add:
        fbGlobals.push(newGlob) ;
        break ;
      default:
        this.utilSvc.cWarn(this.CLASSNAME, 'Invalid action in modGlobalArr: %s', action)
    }
  }

  modSingles(action: string, parmType: string, gId: string, newVal: string, oldVal: string,
    accountTypes: string[], tranTypes: string[]) {
    let stringArr: string[] = (parmType === this.utilSvc.globalTypes.AccountTypes) ?
      accountTypes : tranTypes ;
    let uidx: number ;  let idx: number ;
    switch (action) {
      case this.utilSvc.actionTypes.Update:   // Single, no array, so must reflect updt in globals
        uidx = stringArr.findIndex(rKey => rKey === oldVal) ;
        stringArr[uidx] = newVal ;
        stringArr = stringArr.sort((a, b) => a.localeCompare(b)) ;
        break ;
      case this.utilSvc.actionTypes.Delete:
        idx = stringArr.findIndex(rKey => rKey === oldVal) ;
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

  modKv(action: string, parmType: string, gId: string, newVal: KeyVal, oldVal: KeyVal,
    categoryFolders: KeyVal[], categoryTaxcat: KeyVal[], taxCats: KeyVal[], accounts: KeyVal[]) {
    let kvArr: KeyVal[] = [] ;
    switch (parmType) {
      case this.utilSvc.globalTypes.CategoryFolders: kvArr = categoryFolders ; break ;
      case this.utilSvc.globalTypes.CategoryTaxcats: kvArr = categoryTaxcat ; break ;
      case this.utilSvc.globalTypes.TaxCats: kvArr = taxCats ; break ;
      case this.utilSvc.globalTypes.Accounts: kvArr = accounts ; break ;
    }
    let idx: number ;
    switch (action) {   // Hereiam: Do I need to find and replace or is kv updtd prior
      case this.utilSvc.actionTypes.Update:
        if (newVal.RKey !== oldVal.RKey) {
          kvArr = kvArr.sort((a, b) => a.RKey.localeCompare(b.RKey)) ;
        }
        break ;
      case this.utilSvc.actionTypes.Delete:
        idx = kvArr.findIndex(rVal => rVal.RKey === newVal.RKey) ;
        if (idx > -1) {
          kvArr.splice(idx, 1) ;
        } else {
          this.utilSvc.cWarn(this.CLASSNAME,'Failed to remove category %s: taxCat %s from categoryTaxcat',
            oldVal.RKey, oldVal.RVal) ;
        }
        break ;
      case this.utilSvc.actionTypes.Add:
        kvArr.push(newVal) ;
        kvArr = kvArr.sort((a, b) => a.RKey.localeCompare(b.RKey)) ;
    }
  }
}
