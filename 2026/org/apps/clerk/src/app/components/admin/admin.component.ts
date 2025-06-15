import { FirebaseService } from './../../services/firebase.service';
import { RuleData } from './../../models/ruledata.model';
import { House, Lease, Mortgage, Resident } from './../../models/house.model';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { GenutilsService } from './../../services/genutils.service';
import { Globals, objwCid, KeyVal } from './../../models/globals.model';
import { DeactivatableComponent } from './../../interfaces/deactivatableComponent.interface';
import { GlobalModsService } from './../../services/globalMods.service';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
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
  houses: House[] = new Array<House>() ;
  accounts: KeyVal[] = new Array<KeyVal>() ;  // label: accounts
  accountTypes: string[] = new Array<string>() ; // label: accounttypes
  tranTypes: string[] = new Array<string>() ; // label: trantypes
  taxCats: KeyVal[] = new Array<KeyVal>() ;   // label: taxcats
  categoryTaxcat: KeyVal[] = new Array<KeyVal>() ; // label: categoryTaxcat
  categoryFolders: KeyVal[] = new Array<KeyVal>() ; // label: categoryFolders
  tranRules: RuleData[] = new Array<RuleData>() ; // label: tranRules
  mortgages: Mortgage[] = new Array<Mortgage>() ;
  leases: Lease[] = new Array<Lease>() ;
  residents: Resident[] = new Array<Resident>() ;
  selectedType = '' ;   completeActions = 0 ;  newRow = false ;
  newRule = false ;  newHouse = false ;  newAccounts = false ;
  newTranTypes = false ;  newAccountTypes = false ;  newTaxCats = false ;
  statusMsg = '' ;
  actionCounts = 0 ;  globalsLoaded = false
  fbGlobals: Globals[] = new Array<Globals>() ;
  admTypes: string[] = [] ;  action$: Subscription = new Subscription() ;
  cid = 'noCid' ;     noGid = 'noGid' ;
  CLASSNAME = 'admin' ;

  constructor(private fireSvc: FirebaseService, private utilSvc: GenutilsService,
    private globSvc: GlobalModsService, private route: Router) {
    const admTypes = Object.values(this.utilSvc.globalTypes) ;
    this.admTypes = admTypes.filter((admTp) => !this.utilSvc.noAdminGlobalTypes.includes(admTp)) ;
    this.action$ = route.events.subscribe((routeUrl) => {
      if (routeUrl instanceof NavigationEnd) {
        const urlParts = routeUrl.url.split('/') ;
  // selectedType:  houses  accountType  accounts  tranType  taxCats  categoryTaxcat  ruleData  logging
        const lastPart = urlParts[urlParts.length-1]
        this.selectedType = (this.admTypes.indexOf(lastPart) > -1) ?
          lastPart : 'ruleData' 
        utilSvc.cLog(this.CLASSNAME, 'Into url chg with admin: ', this.selectedType)
      }
    })
  }

  ngOnInit(): void {
    this.logLevels = Object.values(this.utilSvc.msgLvls) ;
    this.globalsLoaded = false ;
    const admTypes = Object.values(this.utilSvc.globalTypes) ;
    this.admTypes = admTypes.filter((admTp) => !this.utilSvc.noAdminGlobalTypes.includes(admTp)) ;
    this.cid = this.fireSvc.getCid() ;
    const globRtn = this.fireSvc.getGlobals(true) ;
    if (Array.isArray(globRtn)) {
      this.fbGlobals = globRtn as Globals [] ;
      this.globalLoad() ;
    } else {
      const global$ = globRtn.subscribe({
        next: (globals) => {
          this.fbGlobals = globals as Globals[] ;
          this.fireSvc.setGlobals(this.fbGlobals) ;
          this.globalLoad() ;
        }, error: (error) => {
          this.utilSvc.cWarn(this.CLASSNAME, 'Error retrieving globals: ', error) ;
        }
      })
      setTimeout(() => { global$.unsubscribe() ; }, 30000);
    }
    const ruleRtn = this.fireSvc.getTranRuleDB() ;
    if (Array.isArray(ruleRtn)) {
      this.tranRules = ruleRtn as RuleData[] ;
    } else {
      const rule$ = ruleRtn.subscribe({
        next: (rules) => {
          this.tranRules = rules as RuleData[] ;
          this.fireSvc.setTranRules(this.tranRules) ;
        }
      })
      setTimeout(() => { rule$.unsubscribe() ; }, 30000);
    }
    const houseRtn = this.fireSvc.getHouseDB() ;
    if (Array.isArray(houseRtn)) {
      this.houses = houseRtn as House[] ;
      console.log('admin houses thru array: ', this.houses)
    } else {
      const house$ = houseRtn.subscribe({
        next: (houses) => {
          this.houses = houses as House[] ;
          this.fireSvc.setHouses(this.houses) ;
          console.log('admin houses thru subscribe: ', this.houses)
        }, error: (error) => {
          this.utilSvc.cWarn(this.CLASSNAME, 'Error retrieving houses: ', error) ;
        }
      })
      setTimeout(() => { house$.unsubscribe() ; }, 30000);
    }
    const mortgageRtn = this.fireSvc.getMortgageDB() ;
    if (Array.isArray(mortgageRtn)) {
      this.mortgages = mortgageRtn as Mortgage[] ;
      console.log('admin mortgages thru array: ', this.mortgages)
    } else {
      const mortgage$ = mortgageRtn.subscribe({
        next: (mortgages) => {
          this.mortgages = mortgages as Mortgage[] ;
          this.fireSvc.setMortgages(this.mortgages) ;
          console.log('admin mortgages thru subscribe: ', this.mortgages)
        }, error: (error) => {
          this.utilSvc.cWarn(this.CLASSNAME, 'Error retrieving mortgages: ', error) ;
        }
      })
      setTimeout(() => { mortgage$.unsubscribe() ; }, 30000);
    }
    const leaseRtn = this.fireSvc.getLeaseDB() ;
    if (Array.isArray(leaseRtn)) {
      this.leases = leaseRtn as Lease[] ;
    } else {
      const lease$ = leaseRtn.subscribe({
        next: (leases) => {
          this.leases = leases as Lease[] ;
          this.fireSvc.setLeases(this.leases) ;
        }, error: (error) => {
          this.utilSvc.cWarn(this.CLASSNAME, 'Error retrieving leases: ', error) ;
        }
      })
      setTimeout(() => { lease$.unsubscribe() ; }, 30000);
    }
    const residentRtn = this.fireSvc.getResidentDB() ;
    if (Array.isArray(residentRtn)) {
      this.residents = residentRtn as Resident[] ;
    } else {
      const resident$ = residentRtn.subscribe({
        next: (residents) => {
          this.residents = residents as Resident[] ;
          this.fireSvc.setResidents(this.residents) ;
        }, error: (error) => {
          this.utilSvc.cWarn(this.CLASSNAME, 'Error retrieving residents: ', error) ;
        }
      })
      setTimeout(() => { resident$.unsubscribe() ; }, 30000);
    }
  }

  globalLoad() {
    this.accounts = this.fireSvc.getAccounts() ;
    this.accountTypes = this.fireSvc.getAcctTypes() ;
    this.tranTypes = this.fireSvc.getTranTypes() ;
    this.taxCats = this.fireSvc.getTaxCats() ;
    this.categoryTaxcat = this.fireSvc.getCategoryTaxcat() ;
    this.categoryFolders = this.fireSvc.getCategoryFolders() ;
    this.loadLogging() ;    // Retrieve logging info
    this.globalsLoaded = true
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
  onParmMod(action: string, gType: string, newVal: any, oldVal: any): void {
    let actionCnt = 0 ;  
    let anyArr: any[] ;
    if (action === this.utilSvc.actionTypes.Cancel || action === this.utilSvc.actionTypes.Add) {
      this.newRow = false ;
    }
    let globalNewRow: Globals, globalOldRow: Globals ;  let kval: KeyVal ;  let kStr: string ;
/*    let ruleNewRow: RuleData, ruleOldRow: RuleData ;
    let newHouseRow: House, oldHouseRow: House ;
    let newMortgageRow: Mortgage, oldMortgageRow: Mortgage ;
    let newLeaseRow: Lease, oldLeaseRow: Lease ;
    let newResidentRow: Resident, oldResidentRow: Resident ; */
    switch (gType) {  // All editable globals are rkey/rval pairs
      case this.utilSvc.globalTypes.Accounts:
      case this.utilSvc.globalTypes.TaxCats:
      case this.utilSvc.globalTypes.CategoryTaxcats:
        kval = newVal as KeyVal ;    
        globalNewRow = new Globals(this.cid, gType, kval.RKey, kval.RVal) ;
        kval = oldVal as KeyVal ;
        globalOldRow = new Globals(this.cid, gType, kval.RKey, kval.RVal) ;
        [actionCnt, this.statusMsg] = this.globSvc.onGlobalMod(action, gType, globalNewRow,
          globalOldRow, this.fbGlobals, this.accountTypes, this.tranTypes, this.accounts,
          this.categoryFolders, this.categoryTaxcat, this.taxCats, this.cid)
        break ;
      case this.utilSvc.globalTypes.RuleData:
        anyArr = this.tranRules ;
        [actionCnt, this.statusMsg] = this.globSvc.genGlobMod(action, gType, newVal,
          oldVal, anyArr) ;  break ;
      case this.utilSvc.globalTypes.Houses:
        anyArr = this.houses ;
        [actionCnt, this.statusMsg] = this.globSvc.genGlobMod(action, gType, newVal,
          oldVal, anyArr) ;  break ;
      case this.utilSvc.globalTypes.Mortgages:
        anyArr = this.mortgages ;
        [actionCnt, this.statusMsg] = this.globSvc.genGlobMod(action, gType, newVal,
          oldVal, anyArr) ;  break ;
      case this.utilSvc.globalTypes.Leases:
        anyArr = this.leases ;
        [actionCnt, this.statusMsg] = this.globSvc.genGlobMod(action, gType, newVal,
          oldVal, anyArr) ;  break ;
      case this.utilSvc.globalTypes.Residents:
        anyArr = this.residents ;
        [actionCnt, this.statusMsg] = this.globSvc.genGlobMod(action, gType, newVal,
          oldVal, anyArr) ;  break ;
      default:
        this.utilSvc.cWarn(this.CLASSNAME, 'Invalid parm type: %O', newVal) ;
    }
    this.actionCounts += actionCnt
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

  leasePostProcess(action: string, gType: string, newRow: objwCid, oldRow: objwCid,
    objArr: objwCid[]) : boolean {
    console.log('Came into postProcess for %s', gType ) ;
    if ((action === this.utilSvc.actionTypes.Add && newRow['currentFlag'] === 'true') ||
        (action === this.utilSvc.actionTypes.Update && newRow['currentFlag'] === 'true' &&
        oldRow['currentFlag'] === 'false')) {   // If new and current or updated to current
      const oldCurrent = objArr.filter(obj => obj['House'] === newRow['House'] &&
        obj['currentFlag'] === 'true' && obj['LeaseId'] !== newRow['LeaseId'])
      if (oldCurrent && oldCurrent.length > 0) {
        for (const oldLease of oldCurrent) {
          const origLease = {...oldLease} ;
          oldLease['currentFlag'] = 'false' ;   // drive update process
          this.fireSvc.updtGenGlob(origLease, oldLease, 'Leases', 'LeaseId') ;
        }
      }
      console.log('Added %s', newRow.Cid ) ;
      this.statusMsg = 'Added ' + newRow.Cid ;
    } else if (action === this.utilSvc.actionTypes.Update) {
      console.log('Updated %s', newRow.Cid ) ;
      this.statusMsg = 'Updated ' + newRow.Cid ;
    } else if (action === this.utilSvc.actionTypes.Delete) {
      console.log('Deleted %s', newRow.Cid ) ;
      this.statusMsg = 'Deleted ' + newRow.Cid ;
    }
    return true;
  }

  canDeactivate(): boolean {this
    console.log('Admin called canDeactivate')
    return true ;
  }

  ngOnDestroy() {
    this.utilSvc.cDebug(this.CLASSNAME, 'Desroy admin component w/actionCnt: %d',this.actionCounts) ;
    if (this.action$) this.action$.unsubscribe() ;
    if (this.actionCounts > 0) {
      this.fireSvc.setGlobals(this.fbGlobals) ;   // returning array w/mods
      this.fireSvc.processGVals() ;   // Make global chgs visible thru service
    }
  }
}
