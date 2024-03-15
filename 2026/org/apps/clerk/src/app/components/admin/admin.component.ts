import { FirebaseService } from './../../services/firebase.service';
import { RuleData } from './../../models/ruleData.model';
import { House } from './../../models/house.model';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { GenutilsService } from './../../services/genutils.service';
import { KeyVal } from './../../models/keyval.model';
import { Globals } from './../../models/globals.model';
import { DeactivatableComponent } from './../../interfaces/deactivatableComponent.interface';
import { GlobalModsService } from './../../services/globalMods.service';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';

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
  selectedType = '' ;   completeActions = 0 ;
  newRule = false ;  newHouse = false ;  newAccounts = false ;
  newTranTypes = false ;  newAccountTypes = false ;  newTaxCats = false ;
  statusMsg = '' ;
  actionCounts = 0 ;
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
          lastPart : 'profitnloss' 
        utilSvc.cDebug(this.CLASSNAME, 'Into url chg with report: ', this.selectedType)
      }
    })
  }

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
    let actionCnt: number ;  let newRow = false ;
    [actionCnt, newRow, this.statusMsg] = this.globSvc.onParmMod(action, parmType, newVal,
      oldVal, this.fbGlobals, this.fullHouse, this.accountTypes, this.tranTypes, this.accounts,
      this.categoryFolders, this.categoryTaxcat, this.ruleAdmin, this.taxCats, this.cid)
    this.actionCounts += actionCnt
    switch (parmType) {
      case this.utilSvc.globalTypes.Houses:  this.newHouse = newRow ; break ;
      case this.utilSvc.globalTypes.Accounts:  this.newAccounts = newRow ; break ;
      case this.utilSvc.globalTypes.AccountType:  this.newAccountTypes = newRow ; break ;
      case this.utilSvc.globalTypes.RuleData:  this.newRule = newRow ; break ;
      case this.utilSvc.globalTypes.TaxCats:  this.newTaxCats = newRow ; break ;
      case this.utilSvc.globalTypes.TranType:  this.newTranTypes = newRow ; break ;
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
