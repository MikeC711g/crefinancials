import { FirebaseService } from './../../services/firebase.service';
import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef} from '@angular/core';
import { Subscription, Subject } from 'rxjs';
import { TranRec } from './../../models/TranRec.model';
import { Project } from '../../models/project.model';
import { TranQ } from './../../models/TranQ.model';
import { QfxService } from './../../services/qfx.service';
import { Globals } from './../../models/globals.model';
import { GenutilsService } from './../../services/genutils.service';
import { KeyVal } from './../../models/keyval.model';
import { DeactivatableComponent } from './../../interfaces/deactivatableComponent.interface';
import { House } from './../../models/house.model';
import { NavigationEnd, Router } from '@angular/router';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'app-cretran',
  templateUrl: './cretran.component.html',
  styleUrls: ['./cretran.component.css']
})

export class CretranComponent implements OnInit, AfterViewInit, OnDestroy, DeactivatableComponent {
  codeVersion = '1.0.0.3' ;   action = '' 
  accounts: KeyVal[] = new Array<KeyVal>() ;
  tranTypes: string[] = new Array<string>() ;
  categoryTaxcat: KeyVal[] = new Array<KeyVal>() ;
  taxCats: KeyVal[] = new Array<KeyVal>() ;
  fullHouses: House[] = new Array<House>() ;
  projects: Project[] = new Array<Project>() ;
  csvTranRecs: TranRec[] = new Array<TranRec>() ;
  qfxPreProcdTrans: TranRec[] = new Array<TranRec>() ;    // These trans already processed
  accountArr: string[] = new Array<string>() ;   accountOne: string = '' ;
  childMap: Map<string, TranRec[]> = new Map<string, TranRec[]>() ;
  debitTranRecs: TranRec[] = new Array<TranRec>() ;
  creditTranRecs: TranRec[] = new Array<TranRec>() ;
  debitTotals = 0.0 ;  creditTotals = 0.0 ;
  expandDebits = false ;    expandCredits = false ;
  completeActions = 0 ;
  dateOpts: KeyVal[] = [ new KeyVal('30 days', '30'), new KeyVal('90 days', '90'),
    new KeyVal('6 months', '180'), new KeyVal('Custom Dates', '-1')]
  numDays = -1 ;  startDt = '' ;  endDt = '' ; // Current query parms
  splitStr = ',' ;  trimRec = false ;     // For splitting CSV files
  tranDB = true ;   // Is tran in Database (true) or from OFX (false)
  newRow = false ;  // Are we inserting a new row
  dispMsgs: string[] = new Array<string>() ;
  project$: Subscription = new Subscription() ;
  global$: Subject<Globals[]> = new Subject() ;
  tran$: Subscription = new Subscription() ;
  action$: Subscription = new Subscription() ;
  advancedSrch = { isOn: false } ;    // Advanced data base query or not
  CLASSNAME = 'cretran' ;

  constructor(private qfxService: QfxService,
    private fireSvc: FirebaseService, private utilSvc: GenutilsService,
    private elementRef: ElementRef, private route: Router) {
    this.action$ = route.events.subscribe((routeUrl) => {
      if (routeUrl instanceof NavigationEnd) {
        const urlParts = routeUrl.url.split('/') ;
        const lastPart = urlParts[urlParts.length-1]
        this.action = (['loadfile', 'createtran', 'search'].indexOf(lastPart) > -1) ?
          lastPart : 'search' 
        if (this.action == 'createtran')  this.newRow = true ;
        utilSvc.cDebug(this.CLASSNAME, 'Into url chg with action: ', this.action)
      }
    })
  }

  ngOnInit(): void {
    const curDt = new Date() ;
    this.endDt = curDt.toISOString().slice(0, 10)
    this.startDt = this.utilSvc.getDate(curDt, -45) ;
    this.onRefreshParms(this.startDt, this.endDt) ;
    const idx = this.utilSvc.dirtyTrans.length ;
    if (idx > 0) this.utilSvc.dirtyTrans.splice(0, idx)
  }

  reInit() {    // When URL changes (different subMenu)
    this.csvTranRecs.splice(0) ;  this.qfxPreProcdTrans.splice(0) ;
    this.accountArr.splice(0) ;   this.debitTranRecs.splice(0) ;
    this.creditTranRecs.splice(0) ;   this.expandCredits = false ;
    this.expandDebits = false ;
  }

  ngAfterViewInit() {
    this.elementRef.nativeElement.ownerDocument.body.style.backgroundColor = '#ffffff';
  }

  /*********************************************************************
   Refresh common files (project list, categories, et al)
  ********************************************************************/
   onRefreshParms(psDate: string, peDate: string): void {
    const globSubj = this.fireSvc.getGlobals(false) ;
    this.utilSvc.cDebug(this.CLASSNAME,'Into tran onRefreshParms called getGlobals') ;
    if (typeof globSubj === 'boolean') {
      this.utilSvc.cDebug(this.CLASSNAME, 'Came back as array, so calling globalLoad')
      this.globalLoad() ;
    } else {
      this.global$ = globSubj ;
      this.utilSvc.cDebug(this.CLASSNAME, 'Came back as subScrib so subscribing')
      this.global$.subscribe({
        next: () => {
          this.utilSvc.cDebug(this.CLASSNAME,'Subscrib returned so calling globalLoad now') ;
          this.globalLoad() ;
        }, error: (error) => {
          this.utilSvc.cWarn(this.CLASSNAME, 'Error getting globals: %s', error) ;
        }
      })
    }

    const projRtn = this.fireSvc.getProjects(false, 180) ;
    if (Array.isArray(projRtn)) {
      this.projects = projRtn ;
    } else {
      this.project$ = projRtn.subscribe({
        next: (response) => {
          this.projects = response ;
          this.fireSvc.project$.next(this.projects)
          this.utilSvc.cDebug(this.CLASSNAME, 'Got %d projects', this.projects.length) ;
        }, error: (error) => {
          this.utilSvc.cWarn(this.CLASSNAME, 'ProjectErr..FireService: %s', error) ;
        }, complete: () => {
          this.utilSvc.cDebug(this.CLASSNAME, 'projSubs complete') ;
          this.completeActions++ ;
        }
      }) ;
    }
  }

  globalLoad() {
    this.accounts = this.fireSvc.getAccounts() ;
    this.utilSvc.cDebug(this.CLASSNAME, 'Into globalLoad and loaded %d accounts', this.accounts.length) ;
    this.tranTypes = this.fireSvc.getTranTypes() ;
    this.fullHouses = this.fireSvc.getFullHouses() ;
    this.categoryTaxcat = this.fireSvc.getCategoryTaxcat() ;
    this.taxCats = this.fireSvc.getTaxCats() ;
    const ruleMap = this.fireSvc.getRuleMap() ;
    this.qfxService.setRuleMap(ruleMap) ;
    this.utilSvc.cDebug(this.CLASSNAME, 'Accounts: %O', this.accounts) ;
  }

  multiSelAll() {   // action on option did not work well, so onto select
    if (this.accountArr.includes('selectAll')) {
      this.accountArr = [] ;
      for (const curAcct of this.accounts) { this.accountArr.push(curAcct.RKey ) }
    }
  }

  /*****************************************************************************
     Handling date select component output
   *****************************************************************************/
  onDateMod(numDays: number, startDt: string, endDt: string): void {
    this.utilSvc.cDebug(this.CLASSNAME, 'onDtMd adv: %s', this.advancedSrch.isOn)
    this.numDays = numDays ;  this.startDt = startDt ;  this.endDt = endDt ;
    if (!this.advancedSrch.isOn)  this.onQueryDates(startDt, endDt) ;
  }

  // Might be issue if dates not selected when other items are
  onTranSrch(action: string, category: string[], tranType: string[], house: string[],
    project: string, taxCat: string[], annotationRegEx: string, minAmt: number, maxAmt: number) {
      // Do some date logic preConstructor. accountArr in TQ?  Amounts in details,
      //  TranExtra and Annotation to include REs
    const tranQ: TranQ = new TranQ(this.startDt, this.endDt, '', this.accountArr, category,
      tranType, minAmt, maxAmt, taxCat, house, project, annotationRegEx)
    this.utilSvc.cLog(this.CLASSNAME,'onTranSrch action: %s  category: %O  tranType: %O  house: %O  project: %s  taxCat: %O',
      action, category, tranType, house, project, taxCat) ;
    this.onQueryDates('', '', tranQ)
    this.advancedSrch.isOn = false ;
    // Update html for advanced and add tranSrch app calling here
    // Debug some from reports some from here to make sure all good
  }

  /*****************************************************************************
     Query the transaction data base for trans between the dates
   ****************************************************************************/
  onQueryDates(startDate: string, endDate: string, inTranQ?: TranQ): void {
    const tq = (inTranQ) ? inTranQ : new TranQ(startDate, endDate, '', this.accountArr) ;
    const tranQ$ = this.fireSvc.getTransFromDB(tq) ;
    this.tran$ = tranQ$.subscribe({
      next: (response => {
        this.utilSvc.cLog(this.CLASSNAME, 'Success back in on QueryDates tranq: %O', tq)
        this.expandCredits = false ;   this.expandDebits = false ;
        this.csvTranRecs = response ;
        this.utilSvc.cDebug(this.CLASSNAME,'#Trans from onQueryDates: %d', this.csvTranRecs.length) ;
        this.childMap.clear() ;
        this.utilSvc.splitChildren(this.csvTranRecs, this.childMap) ;
        this.fireSvc.loadTrans(this.csvTranRecs, this.childMap) ;
        this.tranDB = true ;
        this.dispMsgs.push('Got ' + this.csvTranRecs.length + ' Transactions')
        this.utilSvc.repopArrays(this.csvTranRecs, this.creditTranRecs,
          this.debitTranRecs, new Array<TranRec>(), false) ;
        this.reCalcTotals() ;
      }), error: (error => {
        this.utilSvc.cWarn(this.CLASSNAME, 'Err from fb query: %s', error) ;
      }), complete: () => {
        this.utilSvc.cDebug(this.CLASSNAME, 'onQD complete') ;
        this.completeActions++ ;
      }
    })
    if (startDate) this.startDt = startDate ;
    if (endDate) this.endDt = endDate ;
  }

  qfxRead($event: any): void {
    this.utilSvc.cDebug(this.CLASSNAME, 'Calling qfxRead w/accountOne: %s', this.accountOne) ;
    const qfxSubscrip = this.qfxService.readQFX($event, this.accountOne).subscribe({
      next: (tranRecs) => {
        this.utilSvc.cLog(this.CLASSNAME, 'QFX returned %d trans', tranRecs.length)
        this.csvTranRecs = tranRecs ;
        this.childMap.clear() ;
        this.expandCredits = false ;   this.expandDebits = false ;
        this.tranDB = false ;
        this.findPreProcdTrans() ;
        this.dispMsgs.push('Got ' + this.csvTranRecs.length + ' Trans from file')
      }, error: (error) => {
        this.utilSvc.cWarn(this.CLASSNAME, 'Error getting qfx records: %s', error) ;
      }, complete: () => {
        this.utilSvc.cDebug(this.CLASSNAME, 'qfxRead completed') ;
        this.completeActions++
      }
    }) ;
              // After 7 seconds, release subscription
    setTimeout(() => {qfxSubscrip.unsubscribe() ; }, 7000) ;
  }

  isTranDB(tranRec: TranRec): boolean {  return this.utilSvc.isTranDB(tranRec) ; }

  /*****************************************************************************
     ReCalculate debit and credit totals (with any tran add/update/delete)
   *****************************************************************************/
  reCalcTotals(): void {    // recalculate total debits and credits
    this.creditTotals = this.debitTotals = 0.0 ;      // Clear sum totals
    for (const curTran of this.debitTranRecs) {
      this.debitTotals += curTran.Amount ;
    }
    for (const curTran of this.creditTranRecs) {
      this.creditTotals += curTran.Amount ;
    }
    this.debitTotals = this.utilSvc.fixAmt(this.debitTotals)
    this.creditTotals = this.utilSvc.fixAmt(this.creditTotals)
  }

  /*****************************************************************************
     Event occurred to a row in child component cretranedit
   *****************************************************************************/
  onTranMod(action: string, tranRec: TranRec): void {
    console.log('Into tranMod w/action: %s tranRec: %O', action, tranRec)
    let runRecalc = false ;
    let statusMsg = '' ;
    [statusMsg, this.newRow, runRecalc] = this.utilSvc.onTranMod(action,
      tranRec, this.creditTranRecs, this.debitTranRecs, new Array<TranRec>(),
      false, this.accountArr, this.startDt, this.endDt, this.tranDB, this.newRow) ;
    console.log('TranMod done w/action %s and newRow: %s', this.action, this.newRow)
    if (this.action === 'createtran' && !this.newRow)  {   // Set up for new add
      console.log('ReSetting newRow to true in 2 seconds')
      setTimeout(() => {
        this.newRow = true ;      // Refresh to get a clean add
      }, 4000);
      this.newRow = true ;      // Refresh to get a clean add
    }
    if (statusMsg)  this.dispMsgs.push(statusMsg) ;
    if (runRecalc) { this.reCalcTotals() ; }
  }

  /*****************************************************************************
     Remove a tran from the list (not used?)
   *****************************************************************************/
  rmvTranFromList(tranId: string): void {
    this.csvTranRecs.forEach((tran, idx, _) => {
      if (tranId === tran.TranId) {
        this.csvTranRecs.splice(idx, 1) ;
        return ;
      }
    }) ;
  }

  onMsgDel(idx: number, msg: string) {
    this.dispMsgs.splice(idx, 1) ;
  }

  canDeactivate(): boolean {
    this.utilSvc.cDebug(this.CLASSNAME, 'Trans called canDeactivate') ;
    if (this.utilSvc.dirtyTrans.length > 0)
      this.utilSvc.cLog(this.CLASSNAME, 'tranCanDeact dirty trans: %O', this.utilSvc.dirtyTrans) ;
    return (this.utilSvc.dirtyTrans.length === 0) ? true :
      confirm("There are unsaved changes, exit anyway?") ;
    }

    // hereiam todo ... replace read tran with db tran
  findPreProcdTrans() {   // Find trans from qfx that have already been entered
    const fitIds: string[] = [] ;
    const iters = this.csvTranRecs.length / 25 ;  // How many loops w/25
    let iterCnt = 0 ;
    for (const curTran of this.csvTranRecs)  fitIds.push(curTran.FitID)
    this.utilSvc.cDebug(this.CLASSNAME, 'findPreProcd tranRecs: %O  fitids: %O  iters: %d', this.csvTranRecs, fitIds, iters) ;
    for (let i = 0; i < this.csvTranRecs.length; i += 25) {   // groups of 25 for fb query
      const endIdx = (fitIds.length >= i + 25) ? i + 25 : fitIds.length ;
      const fitidx = fitIds.slice(i, endIdx)
      this.fireSvc.checkFitidArray(fitidx).subscribe({
        next: (tranRecs) => {
          iterCnt++
          const tmpTrans = tranRecs ;
          for (const curTran of tmpTrans) {
            const idx = this.csvTranRecs.findIndex((tran) => tran.FitID === curTran.FitID)
            if (idx >= 0) {
              this.csvTranRecs[idx] = curTran ;   // Replace file info w/db info
            } else {
              this.utilSvc.cWarn(this.CLASSNAME,'DB FitId for %O not found back in qfx read tranRecs', curTran) ;
            }
          }
          if (iterCnt >= iters) {
            this.fireSvc.loadTrans(this.csvTranRecs, this.childMap) ;
            this.utilSvc.repopArrays(this.csvTranRecs, this.creditTranRecs,
              this.debitTranRecs, new Array<TranRec>(), false) ;
            this.reCalcTotals() ;
          }
          this.utilSvc.cDebug(this.CLASSNAME,'i %d  endidx %d  fitidx %O fitIdTranList %O',
            i, endIdx, fitidx, tmpTrans) ;
        }, error: (error) => {
          this.utilSvc.cWarn(this.CLASSNAME, 'Error getting fitid Trans: %s', error)
        }
      })
    }
  }

  /*****************************************************************************
   Clear subscriptions
  *****************************************************************************/
  ngOnDestroy() {
    this.project$.unsubscribe() ;
    this.global$.unsubscribe() ;
    this.action$.unsubscribe() ;
    this.tran$.unsubscribe() ;
    const idx = this.utilSvc.dirtyTrans.length ;
    if (idx > 0) this.utilSvc.dirtyTrans.splice(0, idx)
  }
}
