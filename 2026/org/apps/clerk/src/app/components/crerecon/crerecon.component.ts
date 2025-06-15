import { FirebaseService } from './../../services/firebase.service';
import { Reconciliations } from './../../models/reconciliations.model';
import { Globals, MsgInfo, KeyVal } from './../../models/globals.model';
import { Subscription } from 'rxjs';
import { TranRec, TranQ } from './../../models/TranRec.model';
import { Project } from '../../models/project.model';
import { DeactivatableComponent } from '../../interfaces/deactivatableComponent.interface' ;
import { Component, OnDestroy, OnInit } from '@angular/core';
import { GenutilsService } from './../../services/genutils.service';

/*************************************************************************************
 Reconcile a statement. Trans can only be in one reconciliation, so a new reconciliation
 will only see trans that are not already in a saved reconciliation.  If a tran is valie
 but not in this reconciliation (ie: in next month's) it can be hidden so it is not
 calculated or recorded in this reconciliation

 2Do:
  If tranDB = false (csv) ... after add, can go back ... then it is tranDB = true. May all
    be contained in tranedit component since component still there ... just reset trandb local
  ReDo projects to NOT use routing

  Get rid of childMsg stuff in cretran and service
  Work through the formatting gorp (just numbers at this point)
  See if ngx-logger workable in Ivy engine, if not, build own logging and parms
  Build a Settings component which allows editing of all that is currently in listtable (new tables)
  Work out booleans for whether sql calls are made and return the observable OR the list. Called
   component will return DB call if not made or real data. Then nobody calls DB directly,
   just ask service for data (do have to load it back I guess ... or since calls are quick, do
   I allow serialization for that time? Or some type of first call to make all calls and not
   block?
 *************************************************************************************/

@Component({
  selector: 'app-crerecon',
  templateUrl: './crerecon.component.html',
  styleUrls: ['./crerecon.component.css']
})
export class CrereconComponent implements OnInit, OnDestroy, DeactivatableComponent {

  recons: Reconciliations[] = new Array<Reconciliations>() ;
  // houses: string[] = new Array<string>() ;
  accounts: KeyVal[] = new Array<KeyVal>() ;
  projects: Project[] = new Array<Project>() ;
  csvTranRecs: TranRec[] = new Array<TranRec>() ;
  childMap: Map<string, TranRec[]> = new Map<string, TranRec[]>() ;
  debitTranRecs: TranRec[] = new Array<TranRec>() ;
  creditTranRecs: TranRec[] = new Array<TranRec>() ;
  hiddenTranRecs: TranRec[] = new Array<TranRec>() ;
  debitTotals = 0.0 ;  creditTotals = 0.0 ;  hiddenTotals = 0.0 ;
  beginBal = 0.0;   endBal = 0.0 ;  deltaAmt = 0.0 ;  beginBalStr = '' ;   endBalStr = '' ;
  expandDebits = false ;    expandCredits = false ;  expandHidden = false ;
  completeActions = 0 ;  work2Commit = false ;
  startDt = '' ;  endDt = '' ;   account = '' ; // Current query parms

  tranDB = true ;   // Is tran in Database (true) or from CSV (false)
  newRow = false ;  // Are we inserting a new row
  dispMsgs: string[] = new Array<string>() ;
  msgInfo: MsgInfo = new MsgInfo('', '') ;
  project$: Subscription = new Subscription() ;
  global$: Subscription = new Subscription() ;
  tran$: Subscription = new Subscription() ;
  CLASSNAME = 'crerecon' ;

  constructor(private fireSvc: FirebaseService, public utilSvc: GenutilsService) { }

  ngOnInit(): void {    // Assume this not needed but have a button if we need original DB stuff
    this.onRefreshParms('2017-01-01', '2028-12-31') ;
  }

  /*********************************************************************
   Refresh common files (project list, categories, et al)
  *******************************************************************/
   onRefreshParms(psDate: string, peDate: string): void {
    const globRtn = this.fireSvc.getGlobals(false) ;
    if (Array.isArray(globRtn)) {
      this.globalLoad() ;
    } else {
      globRtn.subscribe({
        next: (fbGlobals) => {
          const globArr = fbGlobals as Globals[] ;
          this.fireSvc.setGlobals(globArr) ;
          this.globalLoad() ;
        }, error: (error) => {
          this.utilSvc.cWarn(this.CLASSNAME,'Error retrieving globals: %s', error) ;
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
          this.fireSvc.project$.next(this.projects) ;
          this.utilSvc.cDebug(this.CLASSNAME, 'Got: %d projects', this.projects.length) ;
        }, error: (error) => {
          this.utilSvc.cWarn(this.CLASSNAME,'ProjectErr..FireService: %s', error) ;
        }, complete: () => { this.completeActions++ ; }
      }) ;
    }
  }

  globalLoad() {
    this.accounts = this.fireSvc.getAccounts() ;
    console.log('AccountCnt: ', this.accounts.length)
  }

  onAcctChange() {
    this.utilSvc.cDebug(this.CLASSNAME,'onAcctChg acct: %s', this.account) ;
    const recon$ = this.fireSvc.getLatestRecon4Acct(-360, this.account).subscribe({
      next: (response) => {
        this.recons = response ;
        if (this.recons.length > 0) {
          this.utilSvc.cDebug(this.CLASSNAME, 'Latest recon: %O', this.recons[0]) ;
          this.startDt = this.recons[0].EndDt ;
          this.endDt = this.utilSvc.getDate(new Date(this.startDt), 31) ;
          this.beginBalStr = this.recons[0].EndBal.toFixed(2) ;
        } else {
          this.dispMsgs.push('No reconciliations found in last year for account: ' + this.account)
        }
      }, error: (error) => {
        this.utilSvc.cWarn(this.CLASSNAME, 'Error: %s retrieving latest reconciliation for account: %s', error, this.account) ;
      }
    }) ;
    this.endBalStr = '' ;
    this.creditTotals = this.debitTotals = 0.0 ;  this.hiddenTotals = 0.0 ;
    this.creditTranRecs.splice(0) ;  this.debitTranRecs.splice(0) ; this.hiddenTranRecs.splice(0) ;
    setTimeout(() => {   recon$.unsubscribe() ;  }, 10000);
  }

  /*****************************************************************************
     Query the transaction data base for trans between the dates
   *****************************************************************************/
  onReconcile(startDate: string, endDate: string, beginStr: string, endStr: string): void {
    const tq: TranQ = new TranQ(startDate, endDate, '', [this.account]) ;
    this.tran$ = this.fireSvc.getTransFromDB(tq, false).subscribe({
      next: (transIn) => {
        this.calcRecon(transIn, beginStr, endStr) ;
      }, error: (error) => {
        this.utilSvc.cWarn(this.CLASSNAME,'QueryDates Err: %s', error) ;
      }, complete: () => { this.completeActions++ ; }
    }) ;
    this.startDt = startDate ;    this.endDt = endDate ;  this.work2Commit = true ;
  }

  calcRecon(transIn: TranRec[], beginStr: string, endStr: string): void {
    this.expandCredits = false ;    this.expandDebits = false ;  this.expandHidden = false ;
    this.csvTranRecs = transIn ;
    this.utilSvc.splitChildren(this.csvTranRecs, this.childMap, true) ;
    this.fireSvc.loadTrans(this.csvTranRecs, this.childMap) ;
    this.tranDB = true ;
    this.dispMsgs.push('Got ' + this.csvTranRecs.length + ' Transactions')
    this.utilSvc.repopArrays(this.csvTranRecs, this.creditTranRecs,
      this.debitTranRecs, this.hiddenTranRecs, true) ;
    this.reCalcTotals() ;
    this.beginBal = parseFloat(beginStr) ;
    this.endBal = parseFloat(endStr) ;
    const acctRow: KeyVal = this.accounts.find(acct => acct.RKey === this.account)! ;
    this.utilSvc.cDebug(this.CLASSNAME, 'Found acct: %O  PreStartBal: %d', acctRow, this.beginBal) ;
    if (acctRow) {
      if (acctRow.RVal === 'credit') {
        if (this.beginBal > 0 || this.endBal > 0) {
          const msg = `Credit card balances, ${beginStr} and ${endStr} normally negative,` +
            ' should I make them negative?' ;
          if (confirm(msg)) {
            if (this.beginBal > 0) {
              this.beginBal *= -1 ;
              this.beginBalStr = this.beginBal.toString() ;
            }
            if (this.endBal > 0) {
              this.endBal *= -1 ;
              this.endBalStr = this.endBal.toString() ;
            }
          }
        }
      } else {
        if (this.beginBal < 0 || this.endBal < 0) {
          const msg = `Checking/Saving balances, ${beginStr} and ${endStr} normally` +
            ' positive, should I make them positive?' ;
          if (confirm(msg)) {
            if (this.beginBal < 0) {
              this.beginBal *= -1 ;
              this.beginBalStr = this.beginBal.toString() ;
            }
            if (this.endBal < 0) {
              this.endBal *= -1 ;
              this.endBalStr = this.endBal.toString() ;
            }
          }
        }
      }
    }
      // Add all as debits are negative
    this.deltaAmt = this.utilSvc.fixAmt(this.endBal - (this.beginBal + this.debitTotals + this.creditTotals)) ;
  }

  /*****************************************************************************
     ReCalculate debit and credit totals (with any tran add/update/delete)
    *****************************************************************************/
  reCalcTotals(): void {    // recalculate total debits and credits
    this.creditTotals = this.debitTotals = 0.0 ;  this.hiddenTotals = 0.0    // Clear sum totals
    for (const curTran of this.debitTranRecs) {
      this.debitTotals += curTran.Amount ;
    }
    for (const curTran of this.creditTranRecs) {
      this.creditTotals += curTran.Amount ;
    }
    for (const curTran of this.hiddenTranRecs) {
      this.hiddenTotals += curTran.Amount ;
    }
    this.endBal = this.utilSvc.fixAmt(this.endBal) ; this.beginBal = this.utilSvc.fixAmt(this.beginBal)
    this.creditTotals = this.utilSvc.fixAmt(this.creditTotals) ; this.debitTotals = this.utilSvc.fixAmt(this.debitTotals)
    this.hiddenTotals = this.utilSvc.fixAmt(this.hiddenTotals)
    this.deltaAmt = this.utilSvc.fixAmt(this.endBal) - (this.beginBal + this.debitTotals + this.creditTotals) ;
  }

  /*****************************************************************************
     Event occurred to a row in child component cretranedit
      When I go to array service, will call from here to service passing arrays
      as well and if the 3rd array (hidden) is null, then hide case will be
      considered an error. Will need to drive reCalcTotals, check newRow status,
      and if added row should show up in array (dates and trandb)
    *****************************************************************************/
  onTranMod(action: string, tranRec: TranRec): void {
    let runReCalc = false ;
    let statusMsg = ''
    const accountArr = [ this.account ] ;   // Method takes array, so make array of 1 el
    [statusMsg, this.newRow, runReCalc ] = this.utilSvc.onTranMod(action, tranRec, this.creditTranRecs,
      this.debitTranRecs, this.hiddenTranRecs, true, accountArr, this.startDt,
      this.endDt, this.tranDB, this.newRow) ;
    if (statusMsg) this.dispMsgs.push(statusMsg) ;
    if (runReCalc) { this.reCalcTotals() ; }
  }

  onSaveReconTran() {
    this.utilSvc.cDebug(this.CLASSNAME,'Called save reconcile with tran') ;
          // Create reconciliation record
    if (this.deltaAmt !== 0 &&  // If delta not 0 and they don't confirm do it anyway ...
      !confirm('Account is not fully in sync with statement, reconcile anyway?')) return ;
    const reconciliation: Reconciliations = new Reconciliations(this.account, '', this.startDt,
      this.endDt, this.utilSvc.fixAmt(this.creditTotals), this.utilSvc.fixAmt(this.debitTotals),
      this.utilSvc.fixAmt(this.beginBal), this.utilSvc.fixAmt(this.endBal),
      this.utilSvc.fixAmt(this.deltaAmt)) ;
    const tranIds: string[] = new Array<string>() ;
        // Load up all debit and credit trans to be updated with recon key
    for (const curTran of this.creditTranRecs)    tranIds.push(curTran.TranId!) ;
    for (const curTran of this.debitTranRecs)     tranIds.push(curTran.TranId!) ;
    this.fireSvc.reconTrans(reconciliation, tranIds).then(msg => {
      this.dispMsgs.push( msg )
      this.work2Commit = false ;
      this.account = '' ; this.startDt = '' ;  this.endDt = '' ;
      this.beginBalStr = '' ; this.endBalStr = '' ;
      this.deltaAmt = 0 ; this.debitTotals = 0 ; this.creditTotals = 0 ;
      this.creditTranRecs.splice(0, this.creditTranRecs.length) ;
      this.debitTranRecs.splice(0, this.debitTranRecs.length) ;
    }).catch(err => {
      this.dispMsgs.push( err )
    })
  }

  onMsgDel(idx: number, msg: string) {
    this.dispMsgs.splice(idx, 1) ;
  }

  canDeactivate(): boolean {
    console.log('Recon called canDeactivate w/work2Commit: %s', this.work2Commit)
    return (!this.work2Commit || confirm("Reconciliation not saved, exit anyway?")) ? true : false ;
  }

  /*****************************************************************************
   Clear subscriptions
  *****************************************************************************/
   ngOnDestroy() {
    this.global$.unsubscribe() ;
    this.project$.unsubscribe() ;
    this.tran$.unsubscribe() ;
  }
}
