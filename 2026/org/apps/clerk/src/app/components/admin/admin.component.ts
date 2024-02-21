import { FirebaseService } from './../../services/firebase.service';
import { RuleData } from './../../models/ruleData.model';
import { House } from './../../models/house.model';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { GenutilsService } from './../../services/genutils.service';
import { KeyVal } from './../../models/keyval.model';
import { Globals } from './../../models/globals.model';
import { DeactivatableComponent } from './../../interfaces/deactivatableComponent.interface';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})

export class AdminComponent implements OnInit, OnDestroy, DeactivatableComponent {
  // ruleDatas is a map and a different animal. houses has mucho info.
  // Those 2 are it for needing more info
  // houses: string[] = new Array<string>() ;    // label: houses
  classMap: Map<string, string> = new Map<string, string>() ;
    classList: KeyVal[] = new Array<KeyVal>() ;
    defaultLevel = 'log' ;  logLevels = [''] ;  overrideLevel = '' ;
  fullHouse: House[] = new Array<House>() ;
  accounts: KeyVal[] = new Array<KeyVal>() ;  // label: accounts
  accountTypes: string[] = new Array<string>() ; // label: accounttypes
  tranTypes: string[] = new Array<string>() ; // label: trantypes
  taxCats: KeyVal[] = new Array<KeyVal>() ;   // label: taxcats
  categoryTaxcat: KeyVal[] = new Array<KeyVal>() ; // label: categoryTaxcat
  categoryFolders: KeyVal[] = new Array<KeyVal>() ; // label: categoryFolders
  ruleMap: Map<string, RuleData[]> = new Map<string, RuleData[]>() ; // label: ruleData
  ruleAdmin: RuleData[] = new Array<RuleData>() ;
  selectedType = '' ;   newRow = false ;   completeActions = 0 ;
  statusMsg = '' ;
  actionCounts = 0 ;
  fbGlobals: Globals[] = new Array<Globals>() ;
  admTypes: string[] = [] ;
  cid = 'noCid' ;     noGid = 'noGid' ;
  CLASSNAME = 'admin' ;

  constructor(private fireSvc: FirebaseService, private utilSvc: GenutilsService) { }

  ngOnInit(): void {
    this.logLevels = Object.values(this.utilSvc.msgLvls) ;
    this.fbGlobals = this.fireSvc.retrieveGlobals() ;
    const admTypes = Object.values(this.utilSvc.globalTypes) ;
    this.admTypes = admTypes.filter((admTp) => !this.utilSvc.noAdminGlobalTypes.includes(admTp)) ;
    const globalSubj = this.fireSvc.getGlobals(true) ;
    this.cid = this.fireSvc.getCid() ;
    if (typeof globalSubj === 'boolean') {
      this.utilSvc.cDebug(this.CLASSNAME, 'Boolean response from getGlobals') ;
      this.globalLoad() ;
    } else {
      const global$ = globalSubj.subscribe({
        next: () => {
          this.utilSvc.cDebug(this.CLASSNAME, 'Subscription came back in nginit.getGlobals')
          this.globalLoad() ;
        }, error: (error) => {
          this.utilSvc.cWarn(this.CLASSNAME, 'Error retrieving globals: ', error) ;
        }
      })
      setTimeout(() => {  global$.unsubscribe() ; }, 30000);
    }
  }

  globalLoad() {
    this.accounts = this.fireSvc.getAccounts() ;
    this.accountTypes = this.fireSvc.getAcctTypes() ;
    this.tranTypes = this.fireSvc.getTranTypes() ;
    this.taxCats = this.fireSvc.getTaxCats() ;
    this.categoryTaxcat = this.fireSvc.getCategoryTaxcat() ;
    this.categoryFolders = this.fireSvc.getCategoryFolders() ;
    this.ruleMap = this.fireSvc.getRuleMap() ;
    this.ruleAdmin = this.fireSvc.getRuleAdmin() ;
    this.fullHouse = this.fireSvc.getFullHouses() ;
    this.loadLogging() ;    // Retrieve logging info
  }

  onLogMod(className: string, level: string): void {
    this.classMap.set(className, level) ;   // This should reflect back to utilSvc
  }

  setDfltLogLevel() { this.utilSvc.setDfltLogLevel(this.defaultLevel) ;  }
  setOrideLogLevel() { this.utilSvc.setOverrideDfltLogLevel(this.overrideLevel) ;  }

  /*****************************************************************************
     Event occurred to a row in child component
      See if we can modify the arrays to avoid refreshing from DBs so that while
      admin is occurring.  On exit from admin, will refresh all from DB.
   *****************************************************************************/
  onParmMod(action: string, parmType: string, newVal: any, oldVal: any): void {
    let globalId = (action === this.utilSvc.actionTypes.Add ||
      action === this.utilSvc.actionTypes.Cancel) ? '' :
      this.getKId4Global(parmType, newVal, oldVal) ;  // If existing row, get GID
      this.utilSvc.cLog(this.CLASSNAME, 'into onParmMod w/action: %s  Tp: %s  new: %O  old: %O  gid: %s', action,
        parmType, newVal, oldVal, globalId) ;

    if (globalId === this.noGid) {
      this.utilSvc.cWarn(this.CLASSNAME,'Did not find GID so cannot process request')
      return ;
    }
    let isErr = false ;
    let updResp: string | Promise<any> ;    let delResp: string | Promise<any> ;
    this.actionCounts++ ;   // Unless cancel, this is an added action
    switch (action) {
      case this.utilSvc.actionTypes.Add:
        this.newRow = false ;
        this.fireSvc.addGlobal(parmType, newVal).then(docRef => {
          globalId = docRef?.id ;
          this.utilSvc.cDebug(this.CLASSNAME,'onParmMod called addGlobal. globalId: %s cid %s', globalId, this.cid)
          this.statusMsg = 'Successfully added: ' + parmType ;
          this.modGlobalArr(action, globalId, parmType, newVal) ;
        }).catch(error => {
          this.statusMsg = 'Failed to add: ' + parmType ;
          this.utilSvc.cWarn(this.CLASSNAME, 'Failed to add: %s  Val: %O  err: %s', parmType, newVal, error) ;
          isErr = true ;
        })
        break ;
      case this.utilSvc.actionTypes.Update:
        this.utilSvc.cLog(this.CLASSNAME, 'update parmTp: %s old: %O new: %O gid: %s', parmType, oldVal, newVal, globalId) ;
        updResp = this.fireSvc.updateGlobal(parmType, oldVal, newVal, globalId) ;
        if (typeof updResp === 'string') {
          this.statusMsg = 'Failed to update: ' + parmType ;
          this.utilSvc.cWarn(this.CLASSNAME,'Failed to update: %s  Val: %O  Failed to find GId', parmType, newVal) ;
          isErr = true ;
        } else {
          updResp.then(() => {
            this.utilSvc.cLog(this.CLASSNAME,'Successfully updated global id: %s newRow: %O', globalId, newVal) ;
            this.statusMsg = 'Successfully updated: ' + parmType ;
            this.modGlobalArr(action, globalId, parmType, newVal) ;
          }).catch(error => {
            this.statusMsg = 'Failed to udpate: ' + parmType ;
            this.utilSvc.cWarn(this.CLASSNAME,'Failed to update: %s  Val: %O  Err: %s', parmType, newVal, error) ;
            isErr = true ;
          })
        }
        break ;
      case this.utilSvc.actionTypes.Delete:
        delResp = this.fireSvc.deleteGlobal(parmType, newVal, globalId) ;
        if (typeof delResp === 'string') {
          this.statusMsg = 'Failed to delete: ' + parmType ;
          this.utilSvc.cWarn(this.CLASSNAME, 'Failed to delete: %s  Val: %O  Failed to find GID', parmType, newVal) ;
          isErr = true ;
        } else {
          delResp.then(() => {
            this.statusMsg = 'Successfully deleted: ' + parmType ;
            this.modGlobalArr(action, globalId, parmType, newVal) ;
          }).catch(error => {
            this.statusMsg = 'Failed to delete: ' + parmType ;
            this.utilSvc.cWarn(this.CLASSNAME,'Failed to delete: %s  Val: %O  Err: %s', parmType, newVal, error) ;
            isErr = true ;
          })
        }
        break ;
      case this.utilSvc.actionTypes.Cancel:
        this.actionCounts-- ; this.newRow = false ;  break ;
      default:
        this.utilSvc.cWarn(this.CLASSNAME,'Invalid actionx: %s', action)
    }
    switch (parmType) {
      case this.utilSvc.globalTypes.Houses:
        this.modHouseArrs(action, globalId, newVal, oldVal) ;    break ;
      case this.utilSvc.globalTypes.AccountType:
      case this.utilSvc.globalTypes.TranType:
        this.modSingles(action, parmType, globalId, newVal, oldVal) ;  break ;
      case this.utilSvc.globalTypes.CategoryTaxcats:
      case this.utilSvc.globalTypes.CategoryFolders:
        this.modCategory(action, parmType, globalId, newVal, oldVal) ;   break ;
      case this.utilSvc.globalTypes.Accounts:
        this.modAccounts(action, globalId, newVal, oldVal) ;   break ;
      case this.utilSvc.globalTypes.TaxCats:
        this.modTaxCats(action, globalId, newVal, oldVal) ;   break ;
      case this.utilSvc.globalTypes.RuleData:
        this.modRule(action, globalId, newVal, oldVal) ;  break ;
      default:
        this.utilSvc.cWarn(this.CLASSNAME, 'Invalid type: %s', parmType) ;
    }
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
  getKId4Global(rKey: string, nrVal: any, rVal: any): string {
    // filter down to just globals of this type (cid not needed as all for this cid in array)
    const keySubset = this.fbGlobals.filter(fbGlobal => fbGlobal.RKey === rKey) ;
    this.utilSvc.cLog(this.CLASSNAME,'GetKid 4 type: %s  Val: %O  FiltLen: %d', rKey, rVal, keySubset.length) ;
    let srchHouse: House ;  let globHouse: House ;  let tmpHouse: any ;
    let categoryData, lTaxCat, kvVal: KeyVal ;  let kvAny: any ;
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
        return this.noGid ;
      case this.utilSvc.globalTypes.Houses:
        srchHouse = nrVal ;
        this.utilSvc.cDebug(this.CLASSNAME, 'Searching for gid on house: %O', srchHouse) ;
        for (const cGlobal of keySubset) {
          tmpHouse = cGlobal.RVal ;
          globHouse = tmpHouse ;
          if (srchHouse.name === globHouse.name && srchHouse.Addr === globHouse.Addr &&
            srchHouse.zipCode === globHouse.zipCode) {
            return cGlobal.GlobalId! ;
          }
        }
        return this.noGid ;
      case this.utilSvc.globalTypes.CategoryTaxcats:  // category/taxCat
      case this.utilSvc.globalTypes.CategoryFolders:  // categoryFolder/category
        categoryData = nrVal ;
        this.utilSvc.cDebug(this.CLASSNAME,'Searching for gid on %s: %O', rKey, categoryData ) ;
        for (const cGlobal of keySubset) {
          kvAny = cGlobal.RVal ;
          kvVal = kvAny ;
          if (categoryData.RKey === kvVal.RKey) {    // RKey of RVal is ticket for either type
            return cGlobal.GlobalId! ;
          }
        }
        return this.noGid ;
      case this.utilSvc.globalTypes.Accounts:   // Accounts and Taxcat both keyvals
      case this.utilSvc.globalTypes.TaxCats:
        lTaxCat = nrVal ;
        this.utilSvc.cDebug(this.CLASSNAME, 'Searching for taxCat or account gid %s', lTaxCat.RKey) ;
        for (const cGlobal of keySubset) {
          kvAny = cGlobal.RVal ;
          kvVal = kvAny ;
          if (lTaxCat.RKey === kvVal.RKey) {
            return cGlobal.GlobalId! ;
          }
        }
        return this.noGid ;
      case this.utilSvc.globalTypes.RuleData:    // RuleData
        srchRule = rVal ;
        srchMatches = keySubset.filter(cGlob => {
          tmpRule = cGlob.RVal ;
          globRule = tmpRule ;
          return srchRule.srchStr === globRule.srchStr && srchRule.srchAmt === globRule.srchAmt
        })
        if (srchMatches.length === 1) return srchMatches[0].GlobalId! ;
        if (srchMatches.length === 0) return this.noGid ;
        srchWithAccts = srchMatches.filter(cGlob => {
          tmpRule = cGlob.RVal ;
          globRule = tmpRule ;
          return this.compareAccts(srchRule.accounts, globRule.accounts)
        })
        if (srchWithAccts.length === 1) return srchWithAccts[0].GlobalId!
        this.utilSvc.cWarn(this.CLASSNAME,'Searching for gid on rule: %O  Len of subset: %d', srchRule, srchWithAccts.length) ;
    }
    this.utilSvc.cWarn(this.CLASSNAME, 'RKey: %s got no match: %s', rKey)
    return this.noGid ;
  }

  compareAccts(srchAccts: string[], targAccts: string[]): boolean {
    if (srchAccts.length !== targAccts.length) { return false ; }
    for (let i = 0; i < srchAccts.length; i++) {
      if (srchAccts[i] !== targAccts[i]) {
        return false ;
      }
    }
    return true ;
  }

  // To avoid extra refreshing of globals from FB during mass editing of globals
  modGlobalArr(action: string, gid: string, rKey: string, rVal: any) {
    this.utilSvc.cDebug(this.CLASSNAME, 'modGlobalArr with action: %s gid: %s  and key: %s  rVal: %O', action, gid, rKey, rVal) ;
    let idx = -1 ;
    if (action === this.utilSvc.actionTypes.Delete || action === this.utilSvc.actionTypes.Update) {
      idx = this.fbGlobals.findIndex(gVal => gVal.GlobalId === gid) ;
    }
    let globRow: Globals ;
    switch (action) {
      case this.utilSvc.actionTypes.Delete:
        this.fbGlobals.splice(idx, 1) ; break ;
      case this.utilSvc.actionTypes.Update:
          this.fbGlobals[idx].RVal = rVal ;   // Somehow arr chg in other component not here
          break ;
      case this.utilSvc.actionTypes.Add:
        globRow = (new Globals(this.cid, rKey, rVal, gid)) ;
        this.fbGlobals.push(globRow) ;
        break ;
      default:
        this.utilSvc.cWarn(this.CLASSNAME, 'Invalid action in modGlobalArr: %s', action)
    }
  }

  /*********************************************************************
   Process the parameters in the data base
  ********************************************************************/
  loadLogging(): void {
    this.classMap = this.utilSvc.getLoggingMap() ;
    for (const curClassNm of this.classMap.keys()) {
      this.classList.push(new KeyVal(curClassNm, this.classMap.get(curClassNm)!)) ;
    }
    this.defaultLevel = this.utilSvc.getDfltLogLevel() ;
    this.overrideLevel = this.utilSvc.getOverrideLogLevel() ;
  }

  modHouseArrs(action: string, gId: string, newVal: House, oldVal: House) {
    let idx: number ;
    switch (action) {
      case this.utilSvc.actionTypes.Update:
        if (newVal.name !== oldVal.name) {
          this.fullHouse = this.fullHouse.sort((a, b) => a.name.localeCompare(b.name)) ;
        }   // Array updated in place, but if keys chgd, re-sort
        break ;
      case this.utilSvc.actionTypes.Delete:
        idx = this.fullHouse.findIndex(house => house.name === oldVal.name) ;
        if (idx > -1) {
          this.fullHouse.splice(idx, 1) ;
        } else {
          this.utilSvc.cWarn(this.CLASSNAME,'Failed to remove house: %s from arrays', oldVal.name) ;
        }
        break ;
      case this.utilSvc.actionTypes.Add:
        this.fullHouse.push(newVal) ;
        this.fullHouse = this.fullHouse.sort((a, b) => a.name.localeCompare(b.name)) ;
    }
  }

  modSingles(action: string, parmType: string, gId: string, newVal: string, oldVal: string) {
    let stringArr: string[] = (parmType === this.utilSvc.globalTypes.AccountType) ?
      this.accountTypes : this.tranTypes ;
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

  modCategory(action: string, parmType: string, gId: string, newVal: KeyVal, oldVal: KeyVal) {
    let categoryArr = (parmType === this.utilSvc.globalTypes.CategoryFolders) ?
      this.categoryFolders : this.categoryTaxcat
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

  modTaxCats(action: string, gId: string, newVal: KeyVal, oldVal: KeyVal) {
    let idx: number ;
    switch (action) {
      case this.utilSvc.actionTypes.Update:
        if (newVal.RKey !== oldVal.RKey) {
          this.taxCats = this.taxCats.sort((a, b) => a.RKey.localeCompare(b.RKey)) ;
        }
        break ;
      case this.utilSvc.actionTypes.Delete:
        idx = this.taxCats.findIndex(rVal => rVal.RKey === newVal.RKey) ;
        if (idx > -1) {
          this.taxCats.splice(idx, 1) ;
        } else {
          this.utilSvc.cWarn(this.CLASSNAME, 'Failed to remove taxCategory %s: label %s from taxCats',
            oldVal.RKey, oldVal.RVal) ;
        }
        break ;
      case this.utilSvc.actionTypes.Add:
        this.taxCats.push(newVal) ;
        this.taxCats = this.taxCats.sort((a, b) => a.RKey.localeCompare(b.RKey)) ;
      }
  }

  modAccounts(action: string, gId: string, newVal: KeyVal, oldVal: KeyVal) {
    let idx: number ;
    switch (action) {
      case this.utilSvc.actionTypes.Update:
        if (newVal.RKey !== oldVal.RKey) {
          this.accounts = this.accounts.sort((a, b) => a.RKey.localeCompare(b.RKey)) ;
        }     // If acctNm changed, re-sort
        break ;
      case this.utilSvc.actionTypes.Delete:
        idx = this.accounts.findIndex(rVal => rVal.RKey === newVal.RKey) ;
        if (idx > -1) {
          this.accounts.splice(idx, 1) ;
        } else {
          this.utilSvc.cWarn(this.CLASSNAME,'Failed to remove account %s: type %s from accounts',
            oldVal.RKey, oldVal.RVal) ;
        }
        break ;
      case this.utilSvc.actionTypes.Add:
        this.accounts.push(newVal) ;
        this.accounts = this.accounts.sort((a, b) => a.RKey.localeCompare(b.RKey)) ;
      }
  }

  modRule(action: string, gId: string, newVal: RuleData, oldVal: RuleData) {
    this.utilSvc.cDebug(this.CLASSNAME,'Into modRule w/new rule: %O  Old: %O', newVal, oldVal) ;
    let ovAccounts: string ;  let idx: number ;  let ovAcctLen: number ;
    switch (action) {
      case this.utilSvc.actionTypes.Update:
        if (oldVal.srchStr != newVal.srchStr || oldVal.srchAmt !== newVal.srchAmt) {
          this.sortRules() ;
        }   // Updates are already updated in array, resort if a key changed
        break ;
      case this.utilSvc.actionTypes.Delete:
        ovAccounts = JSON.stringify(oldVal.accounts) ;
        ovAcctLen = oldVal.accounts.length ;
        this.utilSvc.cDebug(this.CLASSNAME, 'Updt/Del rule len: %d', this.ruleAdmin.length) ;
        idx = this.ruleAdmin.findIndex(rule => {
          if (this.utilSvc.isLoggable(this.CLASSNAME, this.utilSvc.msgLvls.Verbose)) {
            this.utilSvc.cVerbose(this.CLASSNAME,'fndidx: Rule: %O  Accts: %O  RuleAccts: %s', rule, ovAccounts, JSON.stringify(rule.accounts))
          }
          return (rule.srchStr === oldVal.srchStr &&    // equal if srchstrings = AND
          rule.accounts.length === ovAcctLen &&    // account array len = AND
          ovAccounts === JSON.stringify(rule.accounts))
        }) ;   // account arrays equal
        if (idx > -1) {
          this.ruleAdmin.splice(idx, 1) ;   // Map will be re-ca`lc`d when we leave component
        } else {
          this.utilSvc.cWarn(this.CLASSNAME, 'Failed to remove rule: %s from arrays', oldVal.srchStr) ;
        }
        break ;
      case this.utilSvc.actionTypes.Add:
        this.ruleAdmin.push(newVal) ;
        this.sortRules() ;
    }
  }

  sortRules() {
    this.ruleAdmin = this.ruleAdmin.sort((a, b) => {
      const cmp = a.srchStr.localeCompare(b.srchStr) ;
      if (cmp != 0) { return cmp }
      return (a.srchAmt < b.srchAmt) ? -1 : 1 ;
    })
  }

  canDeactivate(): boolean {
    console.log('Admin called canDeactivate')
    return true ;
  }

  ngOnDestroy() {
    this.utilSvc.cDebug(this.CLASSNAME, 'Desroy admin component w/actionCnt: %d',this.actionCounts) ;
    if (this.actionCounts > 0) {
      this.fireSvc.setGlobals(this.fbGlobals) ;   // returning array w/mods
      this.fireSvc.processGVals() ;   // Make global chgs visible thru service
    }
  }
}
