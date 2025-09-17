import { FirebaseService } from './../../services/firebase.service';
import { FormsModule } from '@angular/forms';
import { AsyncPipe } from '@angular/common';
import { RuleData } from './../../models/ruledata.model';
import { House, Lease, Mortgage, Resident } from './../../models/house.model';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { AdmhousesComponent } from './admhouses/admhouses.component';
import { AdmkvComponent } from './admkv/admkv.component';
import { AdmcategoryComponent } from './admcategory/admcategory.component';
import { AdmruledataComponent } from './admruledata/admruledata.component';
import { AdmleaseComponent } from './admlease/admlease.component';
import { AdmresidentComponent } from './admresident/admresident.component';
import { AdmmortgageComponent } from './admmortgage/admmortgage.component';
import { AdmbaladjComponent } from './admbaladj/admbaladj.component';
import { AdmloggingComponent } from './admlogging/admlogging.component';
import { GenutilsService } from './../../services/genutils.service';
import { Globals, objwCid, KeyVal } from './../../models/globals.model';
import { DeactivatableComponent } from './../../interfaces/deactivatableComponent.interface';
import { GlobalModsService } from './../../services/globalMods.service';
import { NavigationEnd, Router } from '@angular/router';
import { BehaviorSubject, Observable, Subject, Subscription } from 'rxjs';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [AdmhousesComponent, AdmkvComponent, AdmcategoryComponent, AdmruledataComponent, AdmleaseComponent, 
    AdmresidentComponent, AdmmortgageComponent, AdmbaladjComponent, AdmloggingComponent, FormsModule, AsyncPipe],
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
  houses: House[] = new Array<House>() ;  houseSubj = new Observable<House[]>() ;
  accounts: KeyVal[] = new Array<KeyVal>() ;  // label: accounts
  accountTypes: string[] = new Array<string>() ; // label: accounttypes
  tranTypes: string[] = new Array<string>() ; // label: trantypes
  taxCats: KeyVal[] = new Array<KeyVal>() ;   // label: taxcats
  categoryTaxcat: KeyVal[] = new Array<KeyVal>() ; // label: categoryTaxcat
  categoryFolders: KeyVal[] = new Array<KeyVal>() ; // label: categoryFolders
  tranRules: RuleData[] = new Array<RuleData>() ; // label: tranRules
  mortgages: Mortgage[] = new Array<Mortgage>() ;
  leases: Lease[] = new Array<Lease>() ;  leaseSubj = new Observable<Lease[]>() ;
  residents: Resident[] = new Array<Resident>() ;
  selectedType = '' ;   completeActions = 0 ;  newRow = false ;
  newRule = false ;  newHouse = false ;  newAccounts = false ;
  newTranTypes = false ;  newAccountTypes = false ;  newTaxCats = false ;
  statusMsg = '' ;
  actionCounts = 0 ;  globalsLoaded$ = new Subject<boolean>() ;  parmLoadCnt = 0 ;
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
    const admTypes = Object.values(this.utilSvc.globalTypes) ;
    this.admTypes = admTypes.filter((admTp) => !this.utilSvc.noAdminGlobalTypes.includes(admTp)) ;
    this.cid = this.fireSvc.getCid() ;
    this.parmLoadCnt = 0 ;
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

    const rule$ = this.fireSvc.getTranRuleDB().subscribe({
      next: (rules) => {
        this.tranRules = rules as RuleData[] ;
        this.fireSvc.setTranRules(this.tranRules) ;
      }
    })
    setTimeout(() => { rule$.unsubscribe() ; }, 30000);

    this.houseSubj = this.fireSvc.getHouseDB() ;
    const house$ = this.houseSubj.subscribe({
      next: (houses) => {
        this.houses = this.fireSvc.setHouses(houses as House[]) ;
      }, error: (error) => {
        this.utilSvc.cWarn(this.CLASSNAME, 'Error retrieving houses: ', error) ;
      }
    })
    setTimeout(() => {   house$.unsubscribe() ; }, 30000);

    const mortgage$ = this.fireSvc.getMortgageDB().subscribe({
      next: (mortgages) => {
        this.mortgages = this.fireSvc.setMortgages(mortgages as Mortgage[]) ;
        console.log('admin mortgages thru subscribe: ', this.mortgages)
      }, error: (error) => {
        this.utilSvc.cWarn(this.CLASSNAME, 'Error retrieving mortgages: ', error) ;
      }
    })
    setTimeout(() => { mortgage$.unsubscribe() ; }, 30000);

    this.leaseSubj = this.fireSvc.getLeaseDB() ;
    const lease$ = this.leaseSubj.subscribe({
      next: (leases) => {
        this.leases = this.fireSvc.setLeases(leases as Lease[]) ;
      }, error: (error) => {
        this.utilSvc.cWarn(this.CLASSNAME, 'Error retrieving leases: ', error) ;
      }
    })
    setTimeout(() => { lease$.unsubscribe() ; }, 30000);

    const resident$ = this.fireSvc.getResidentDB().subscribe({
      next: (residents) => {
        this.residents = this.fireSvc.setResidents(residents as Resident[]) ;
      }, error: (error) => {
        this.utilSvc.cWarn(this.CLASSNAME, 'Error retrieving residents: ', error) ;
      }
    })
    setTimeout(() => { resident$.unsubscribe() ; }, 30000);
  }

  globalLoad() {
    this.accounts = this.fireSvc.getAccounts() ;
    this.accountTypes = this.fireSvc.getAcctTypes() ;
    this.tranTypes = this.fireSvc.getTranTypes() ;
    this.taxCats = this.fireSvc.getTaxCats() ;
    this.categoryTaxcat = this.fireSvc.getCategoryTaxcat() ;
    this.categoryFolders = this.fireSvc.getCategoryFolders() ;
    this.loadLogging() ;    // Retrieve logging info
    console.log(`Admin loaded with ${this.houses.length} houses, and ${this.leases.length} leases` )
    this.globalsLoaded$.next(true) ;   // Notify that globals are loaded
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
          oldVal, anyArr) ;
        this.tranRules = this.fireSvc.setTranRules(this.tranRules)  ; break ;
      case this.utilSvc.globalTypes.Houses:
        anyArr = this.houses ;
        [actionCnt, this.statusMsg] = this.globSvc.genGlobMod(action, gType, newVal,
          oldVal, anyArr) ;
        this.houses = this.fireSvc.setHouses(this.houses);  break ;
      case this.utilSvc.globalTypes.Mortgages:
        anyArr = this.mortgages ;
        [actionCnt, this.statusMsg] = this.globSvc.genGlobMod(action, gType, newVal,
          oldVal, anyArr) ;
        this.mortgages = this.fireSvc.setMortgages(this.mortgages) ;  break ;
      case this.utilSvc.globalTypes.Leases:
        anyArr = this.leases ;
        [actionCnt, this.statusMsg] = this.globSvc.genGlobMod(action, gType, newVal,
          oldVal, anyArr) ;
        this.leases = this.fireSvc.setLeases(this.leases);  break ;
      case this.utilSvc.globalTypes.Residents:
        anyArr = this.residents ;
        [actionCnt, this.statusMsg] = this.globSvc.genGlobMod(action, gType, newVal,
          oldVal, anyArr) ;
        this.residents = this.fireSvc.setResidents(this.residents) ;  break ;
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
