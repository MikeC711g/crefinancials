import { FirebaseService } from './../../services/firebase.service';
import { FormsModule } from '@angular/forms';
import { AsyncPipe } from '@angular/common';
import { RuleData } from './../../models/ruledata.model';
import { BalAdjust, House, Lease, Mortgage, Resident } from './../../models/house.model';
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
import { Observable, Subject, Subscription } from 'rxjs';
import { TranRec } from '../../models/TranRec.model';

/***************************************************************************************
 * Admin component to manage global parameters. Plays the high level/list function for all of the
 * components that need it.
 ***************************************************************************************/
@Component({
  selector: 'crefinancials-admin',
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
  needHouse = false ;  selectedHouse = '' ;
  accounts: KeyVal[] = new Array<KeyVal>() ;  // label: accounts
  accountTypes: string[] = new Array<string>() ; // label: accounttypes
  tranTypes: string[] = new Array<string>() ; // label: trantypes
  taxCats: KeyVal[] = new Array<KeyVal>() ;   // label: taxcats
  categoryTaxcat: KeyVal[] = new Array<KeyVal>() ; // label: categoryTaxcat
  categoryFolders: KeyVal[] = new Array<KeyVal>() ; // label: categoryFolders
  tranRules: RuleData[] = new Array<RuleData>() ;   ruleSubj = new Observable<RuleData[]>() ;
  mortgages: Mortgage[] = new Array<Mortgage>() ;   mortgageSubj = new Observable<Mortgage[]>() ;
  leases: Lease[] = new Array<Lease>() ;            leaseSubj = new Observable<Lease[]>() ;
  curLease: Lease = new Lease('', '', false, '', '', '', 0, 0, 0, 0, 0, 0, 0, 0, []) ;
  newLease: Lease = new Lease('', '', false, '', '', '', 0, 0, 0, 0, 0, 0, 0, 0, []) ;
  residents: Resident[] = new Array<Resident>() ;   residentSubj = new Observable<Resident[]>() ;
  balAdjust: BalAdjust[] = new Array<BalAdjust>() ;
  balAdjProcSub$ = new Subject<BalAdjust[]>() ;    // Processing of balAdjustments done
  balanceList: number[] = new Array<number>() ;
  selectedType = '' ;   completeActions = 0 ;  newRow = false ;
  newRule = false ;  newHouse = false ;  newAccounts = false ;
  newTranTypes = false ;  newAccountTypes = false ;  newTaxCats = false ;
  statusMsg = '' ;  tranSubj = new Observable<TranRec[]>() ;
  actionCounts = 0 ;  globalsLoaded$ = new Subject<boolean>() ;  parmLoadCnt = 0 ;
  fbGlobals: Globals[] = new Array<Globals>() ;
  admTypes: string[] = [] ;  action$: Subscription = new Subscription() ;
  cid = 'noCid' ;     noGid = 'noGid' ;
  CLASSNAME = 'admin' ;

/***************************************************************************************
 * get Services and subscribe to URL change events to determine selected admin type
 * selectedType:  houses  accountType  accounts  tranType  taxCats  categoryTaxcat  ruleData  logging
 *   mortgages leases balAdjust residents
 ***************************************************************************************/
  constructor(private fireSvc: FirebaseService, private utilSvc: GenutilsService,
    private globSvc: GlobalModsService, private route: Router) {
    const admTypes = Object.values(this.utilSvc.globalTypes) ;
    this.admTypes = admTypes.filter((admTp) => !this.utilSvc.noAdminGlobalTypes.includes(admTp)) ;
    this.action$ = route.events.subscribe((routeUrl) => {
      if (routeUrl instanceof NavigationEnd) {
        const urlParts = routeUrl.url.split('/') ;
        const lastPart = urlParts[urlParts.length-1]
        this.selectedType = (this.admTypes.indexOf(lastPart) > -1) ?
          lastPart : 'ruleData' ;
        this.needHouse = ([ "leases", "mortgages", "balAdjust"].includes(this.selectedType)) ;
        if (this.needHouse)  this.selectedHouse = '' ;
        if (this.selectedType === 'ruleData') {
          this.getRules() ;
        } else if (this.selectedType === 'residents') {
          this.getResidents() ;
        }
        utilSvc.cLog(this.CLASSNAME, 'Into url chg with admin: ', this.selectedType)
      }
    })
  }

/***************************************************************************************
 * Inits and retrieve globals and houses
 ***************************************************************************************/
  ngOnInit(): void {
    this.logLevels = Object.values(this.utilSvc.msgLvls) ;
    this.cid = this.fireSvc.getCid() ;
    this.parmLoadCnt = 0 ;
    const global$ = this.fireSvc.getGlobals(true).subscribe({
      next: (globals) => {
        this.fbGlobals = globals as Globals[] ;
        this.fireSvc.setGlobals(this.fbGlobals) ;
        this.globalLoad() ;
      }, error: (error) => {
        this.utilSvc.cWarn(this.CLASSNAME, 'Error retrieving globals: ', error) ;
      }
    })

    this.houseSubj = this.fireSvc.getHouseDB() ;    // For html timing
    const house$ = this.houseSubj.subscribe({
      next: (houses) => {
        this.houses = this.fireSvc.setHouses(houses as House[]) ;
      }, error: (error) => {
        this.utilSvc.cWarn(this.CLASSNAME, 'Error retrieving houses: ', error) ;
      }
    })
    setTimeout(() => { global$.unsubscribe() ;     house$.unsubscribe() ;  }, 30000);
  }

/***************************************************************************************
 * Populate arrays from globals and notify loaded
 ***************************************************************************************/
  globalLoad() {
    this.accounts = this.fireSvc.getAccounts() ;
    this.accountTypes = this.fireSvc.getAcctTypes() ;
    this.tranTypes = this.fireSvc.getTranTypes() ;
    this.taxCats = this.fireSvc.getTaxCats() ;
    this.categoryTaxcat = this.fireSvc.getCategoryTaxcat() ;
    this.categoryFolders = this.fireSvc.getCategoryFolders() ;
    this.loadLogging() ;    // Retrieve logging info
    console.log(`Admin loaded with ${this.houses.length} houses` )
    this.globalsLoaded$.next(true) ;   // Notify that globals are loaded
  }

/***************************************************************************************
 * House selected, so get relevant data. Slight delay on type to refresh html template
 ***************************************************************************************/
  selHouse(selectedHouse: string): void {
    console.log(`selHouse called with house: ${selectedHouse}  type: ${this.selectedType}`) ;
    const locType = this.selectedType ;
    this.selectedType = '' ;   // Force reInit of html template
    this.selectedHouse = selectedHouse ;
    if (locType === 'mortgages') {
      this.getMortgages(selectedHouse) ;
    } else if (locType === 'leases') {
      this.getLeases(selectedHouse) ;
      this.getResidents() ;
    } else if (locType === 'balAdjust') {
      this.getLeases(selectedHouse) ;
      this.getBalAdjust(selectedHouse) ;    // Additional related work here to populate list
    }
    this.selectedType = locType ;
    // setTimeout(() => {  this.selectedType = locType ;  }, 100); // reinit html template
  }

/***************************************************************************************
 * Retrieve tranRules or Hints if needed
 ***************************************************************************************/
  getRules() {
    this.ruleSubj = this.fireSvc.getTranRuleDB() ;
    const rule$ = this.ruleSubj.subscribe({
      next: (rules) => {
        this.tranRules = rules as RuleData[] ;
        this.fireSvc.setTranRules(this.tranRules) ;
        setTimeout(() => { rule$.unsubscribe() ; }, 30000);
      }
    })
  }

/***************************************************************************************
 * Retrieve mortgages for selected house
 ***************************************************************************************/
  getMortgages(house: string) {
    this.mortgageSubj = this.fireSvc.getMortgageDB(house) ;
    const mortgage$ = this.mortgageSubj.subscribe({
      next: (mortgages) => {
        this.mortgages = this.fireSvc.setMortgages(mortgages as Mortgage[]) ;
        this.fireSvc.setMortgages(this.mortgages) ;
        setTimeout(() => { mortgage$.unsubscribe() ; }, 30000);
      }, error: (error) => {
        this.utilSvc.cWarn(this.CLASSNAME, 'Error retrieving mortgages: ', error) ;
      }
    })
  }

/***************************************************************************************
 * Retrieve leases for selected house
 ***************************************************************************************/
  getLeases(house: string) {
    this.curLease = new Lease('', '', false, '', '', '', 0, 0, 0, 0, 0, 0, 0, 0, []) ;
    this.leaseSubj = this.fireSvc.getLeaseDB(house) ;  // For html timing
    const lease$ = this.leaseSubj.subscribe({
      next: (leases) => {
        console.log('In leaseSubj so that one must have hit') ;
        this.leases = this.fireSvc.setLeases(leases as Lease[]) ;
        this.globSvc.setLeases(this.leases) ;
        this.curLease = (this.globSvc.isFutureLease) ? this.leases[1] : this.leases[0] ;
        setTimeout(() => { lease$.unsubscribe() ; }, 30000);
      }, error: (error) => {
        this.utilSvc.cWarn(this.CLASSNAME, 'Error retrieving leases: ', error) ;
      }
    })
  }

/***************************************************************************************
 * Retrieve residents
 ***************************************************************************************/
  getResidents() {
    this.residentSubj = this.fireSvc.getResidentDB() ;
    const resident$ = this.residentSubj.subscribe({
      next: (residents) => {
        this.residents = this.fireSvc.setResidents(residents as Resident[]) ;
        this.fireSvc.setResidents(this.residents) ;
        setTimeout(() => { resident$.unsubscribe() ; }, 30000);
      }, error: (error) => {
        this.utilSvc.cWarn(this.CLASSNAME, 'Error retrieving residents: ', error) ;
      }
    })
  }

/***************************************************************************************
 * Retrieve balance adjustments for selected house
 ***************************************************************************************/
  getBalAdjust(house: string) {
    this.globSvc.getBalAdjForLease(this.curLease, house, this.balAdjProcSub$) ;
    const balAdjProc$ = this.balAdjProcSub$.subscribe({
      next: (balAdjusts) => {
        this.balAdjust = balAdjusts ;
        this.balanceList = this.globSvc.getBalanceArray(this.balAdjust) ;
        setTimeout(() => { balAdjProc$.unsubscribe() ; }, 30000);
      }, error: (error) => {
        this.utilSvc.cWarn(this.CLASSNAME, 'Error retrieving balances: ', error) ;
      }
    })
  }

/***************************************************************************************
 * Logging helpers
 ***************************************************************************************/
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
    let globalNewRow: Globals, globalOldRow: Globals ;  let kval: KeyVal ;
    let balArrObs: Subscription = new Subscription() ;
      // HereIam ToDo: Async update of firebase may make set of arrays out of sync (too soon)
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
        if (action === this.utilSvc.actionTypes.Renew) {
          this.newLease = this.globSvc.renewLease(newVal as Lease) ;
          this.getBalAdjust(this.newLease.House) ;   // Refresh balance adjustments for new lease
          balArrObs = this.balAdjProcSub$.subscribe({
            next: () => {
              setTimeout(() => {
                this.newLease.StartBal = this.balanceList[this.balanceList.length - 1] ;
                this.newRow = true ;
              } , 100) ;
              setTimeout(() => { balArrObs.unsubscribe() ; }, 30000);
            }
          })
        } else {
          anyArr = this.leases ;
          [actionCnt, this.statusMsg] = this.globSvc.genGlobMod(action, gType, newVal,
            oldVal, anyArr) ;
          this.leases = this.fireSvc.setLeases(this.leases);    // Don't think I want renew in fb list yet
        }
        break ;
      case this.utilSvc.globalTypes.BalAdjust:
        anyArr = this.balAdjust ;
        [actionCnt, this.statusMsg] = this.globSvc.genGlobMod(action, gType, newVal,
          oldVal, anyArr) ;
        this.balAdjust = this.fireSvc.setBalAdj(this.balAdjust);    // Don't think I want renew in fb list yet
        this.balanceList = this.globSvc.getBalanceArray(this.balAdjust) ;    // Refresh balance list
        break ;
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

  canDeactivate(): boolean {
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
