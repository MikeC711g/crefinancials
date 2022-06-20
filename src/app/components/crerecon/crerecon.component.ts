import { ReturnState } from './../../models/returnState.model';
import { Reconciliations } from './../../models/reconciliations.model';
import { DescripInfo } from './../../models/descripInfo.model';
import { RecordService } from '../../services/record.service';
import { Subscription } from 'rxjs';
import { MsgInfo } from '../../models/MsgInfo.model';
import { TranRec } from './../../models/TranRec.model';
import { Project } from '../../models/project.model';
import { Component, OnInit } from '@angular/core';

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
export class CrereconComponent implements OnInit {

  houses: string[] = new Array<string>() ;
  accounts: string[] = new Array<string>() ;
  projects: Project[] = new Array<Project>() ;
  csvTranRecs: TranRec[] = new Array<TranRec>() ;
  debitTranRecs: TranRec[] = new Array<TranRec>() ;
  creditTranRecs: TranRec[] = new Array<TranRec>() ;
  hiddenTranRecs: TranRec[] = new Array<TranRec>() ;
  debitTotals = 0.0 ;  creditTotals = 0.0 ;  hiddenTotals = 0.0 ;
  beginBal = 0.0;   endBal = 0.0 ;  deltaAmt = 0.0 ;
  expandDebits = false ;    expandCredits = false ;  expandHidden = false ;
  completeActions = 0 ;
  startDt = '' ;  endDt = '' ;   account = '' ; // Current query parms

  tranDB = true ;   // Is tran in Database (true) or from CSV (false)
  newRow = false ;  // Are we inserting a new row
  statusMsg = '' ;
  msgInfo: MsgInfo = new MsgInfo('', '') ;
  msgSubscription: Subscription = new Subscription() ;
  homesSubscription: Subscription = new Subscription() ;
  projectsSubscription: Subscription = new Subscription() ;
  parmsSubscription: Subscription = new Subscription() ;

  constructor(private recordService: RecordService) { }

  ngOnInit(): void {    // Assume this not needed but have a button if we need original DB stuff
    this.houses = this.recordService.getHomes() ;
    this.accounts = this.recordService.getAccounts() ;
    const bDate = '2017-01-01' ;  // Right now projects ignores parm dates and grabs all
    const eDate = '2028-12-31' ;
    this.projects = this.recordService.getProjects(bDate, eDate) ;
  }

  /*********************************************************************
   Refresh common files (project list, categories, et al)
  ********************************************************************/
   onRefreshParms(psDate: string, peDate: string): void {
    this.homesSubscription = this.recordService.getHomesFromDB().subscribe(
      (response) => {
        this.houses = response ;
        this.recordService.loadHouses(this.houses) ;
        this.statusMsg = 'Got ' + this.houses.length + ' houses' ;
      },
      (error) => { console.log('HouseErr..RecordService: ', error) ; },
      () => { this.completeActions++ ; }
    ) ;
    this.accounts = this.recordService.getAccounts() ;

    const bDate = '2017-01-01' ;  // Right now projects ignores parm dates and grabs all
    const eDate = '2028-12-31' ;
    this.projectsSubscription = this.recordService.getProjectsFromDB(bDate, eDate).subscribe(
      (response) => {
        this.projects = response ;
        this.recordService.loadProjects(this.projects) ;
        this.statusMsg = 'Got ' + this.projects.length + ' projects' ;
      },
      (error) => { console.log('ProjectErr..RecordService: ', error) ; },
      () => { this.completeActions++ ; }
    ) ;
    this.parmsSubscription = this.recordService.getParmsFromDB().subscribe(
      (response) => {
        const allParms: string[] = response ;
        this.processParms(allParms) ;
      },
      (error) => { console.log('Failed to get parms from DB: ', error) ; },
      () => { this.completeActions++ ; }
    ) ;
  }

  /*********************************************************************
     Process the parameters in the data base
   ********************************************************************/
    processParms(inParms: string[]): void {
    const categories: string[] = new Array<string>() ;
    const tranTypes: string[] = new Array<string>() ;
    const taxCats: string[] = new Array<string>() ;
    const descripInfo: DescripInfo[] = new Array<DescripInfo>() ;
    for (const inParm of inParms) {
      const parmParts = inParm.split('::') ;
      if (parmParts.length < 2 || (parmParts[0] == 'descripHints' && parmParts.length < 3)) {
        console.log('Parm string not valid: ', parmParts) ;
      }
      switch(parmParts[0]) {
        case('worktype'):
          categories.push(parmParts[1]) ; break ;
        case('trantype'):
          tranTypes.push(parmParts[1]) ; break ;
        case('accounts'):
          this.accounts.push(parmParts[1]) ; break ;
        case('descripHints'):
          descripInfo.push({description: parmParts[1], taxCat: parmParts[2]}) ; break ;
        case('taxCats'):
          taxCats.push(parmParts[1]) ;  break ;
        default:
          console.log('Invalid parm 0: ',parmParts[0], ' And 1: ', parmParts[1]) ;
      }
    }
    this.recordService.loadCategories(categories) ;
    this.recordService.loadTranTypes(tranTypes) ;
    this.recordService.loadAccounts(this.accounts) ;
    this.recordService.loadDescripInfo(descripInfo) ;
    this.recordService.loadTaxCats(taxCats) ;
  }

  /*****************************************************************************
     Query the transaction data base for trans between the dates
   *****************************************************************************/
    onReconcile(startDate: string, endDate: string, account: string, beginStr: string,
      endStr: string): void {
    this.recordService.getTransFromDB(startDate, endDate, account, '', '', '').subscribe(
      (transIn) => {
        this.expandCredits = false ;    this.expandDebits = false ;  this.expandHidden = false ;
        this.csvTranRecs = transIn ;
        this.recordService.loadTrans(this.csvTranRecs) ;
        this.tranDB = true ;
        this.statusMsg = 'Got ' + this.csvTranRecs.length + ' Transactions' ;
        this.repopArrays() ;
        this.reCalcTotals() ;
        this.beginBal = parseFloat(beginStr) ;
        this.endBal = parseFloat(endStr) ;
        if (account === 'chase' || account === 'sams' || account === 'lowes') {
          this.beginBal *= -1 ;   this.endBal *= -1 ;   // Credit bals are negative
        }
          // Add all as debits are negative
        this.deltaAmt = this.endBal - (this.beginBal + this.debitTotals + this.creditTotals) ;
      },
      (error) => { console.log('QueryDates Err: ', error) ; },
      () => { this.completeActions++ ; }
    ) ;
    this.startDt = startDate ;    this.endDt = endDate ;    this.account = account ;
  }

  /*****************************************************************************
     Split total trans into debits and credits. Only done up front lest hide actions be lost
   *****************************************************************************/
  repopArrays(): void {
    this.creditTranRecs = [] ; this.debitTranRecs = [] ;   this.hiddenTranRecs = [] ;// Clear arrays
    for (const curTran of this.csvTranRecs) {
      console.log('curTran: ', curTran) ;
      if (curTran.ReconKey !== '') { continue ; }   // This tram in another reconciliation
      if (curTran.Amount <= 0) {
        this.debitTranRecs.push(curTran) ;
      } else {
        this.creditTranRecs.push(curTran) ;
      }
    }
    console.log('TotalRecs: ' + this.csvTranRecs.length + ' deb: ' + this.debitTranRecs.length +
      ' credit: ' + this.creditTranRecs.length) ;
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
    this.deltaAmt = this.endBal - (this.beginBal + this.debitTotals + this.creditTotals) ;
  }

  /*****************************************************************************
     Event occurred to a row in child component cretranedit
   *****************************************************************************/
    isrtRow(tranRec: TranRec, inArr: TranRec[]): void {
    for (let i = 0; i < inArr.length; i++) {
      if (tranRec.TranDate < inArr[i].TranDate) {
        inArr.splice(i, 0, tranRec) ;     // Splice in before this row
        return ;
      }
    }
    inArr.push(tranRec) ;   // Higher than highest in array, so add to end
  }

  /*****************************************************************************
     Return the tranId of in array.  Return -1 if not found
    *****************************************************************************/
  findTranId(tranId: string, inArr: TranRec[]): number {
    for (let i = 0; i < inArr.length; i++) {
      if (tranId === inArr[i].TranId) { return i ; }
    }
    return -1 ;
  }

  /*****************************************************************************
     Event occurred to a row in child component cretranedit
      When I go to array service, will call from here to service passing arrays
      as well and if the 3rd array (hidden) is null, then hide case will be
      considered an error. Will need to drive reCalcTotals, check newRow status,
      and if added row should show up in array (dates and trandb)
    *****************************************************************************/
  onTranMod(action: string, tranRec: TranRec): void {
    console.log('Action: ' + action + ' on tranId: ' + tranRec.TranId ) ;
    let destArr = (tranRec.Amount >= 0) ? this.creditTranRecs : this.debitTranRecs ;
    let idx = 0 ;
    switch (action) {
      case 'addKeep':
      case 'add':
      // If arrays are of rows in DB (vs CVS) AND date is between begin and end date, add 2 arr
        if (this.tranDB && tranRec.TranDate >= this.startDt &&
          tranRec.TranDate <= this.endDt && tranRec.Account === this.account) {
          this.isrtRow(tranRec, destArr) ;
          this.reCalcTotals() ;
        }
        this.statusMsg = 'Added row w/tranId; ' + tranRec.TranId ;
        if (action === 'add') { this.newRow = false ; }   // Clear this "new" section
        break ;
      case 'update':    // Update, tricky as amount could have switched sides of 0
        idx = this.findTranId(tranRec.TranId, destArr) ;
        if (idx >= 0) {
          destArr[idx] = tranRec ;      // Update row in array
          this.statusMsg = 'Updated row w/Tranid: ' + tranRec.TranId ;
        } else {                        // Amount may have changed
          let srcArr = (tranRec.Amount < 0) ? this.creditTranRecs : this.debitTranRecs ;
          idx = this.findTranId(tranRec.TranId, srcArr) ;
          if (idx < 0) {      // Not found anywhere
            this.statusMsg =  'Update to tranid: ' + tranRec.TranId + ' failed as not found' ;
          } else {      // Must delete from where it is and isrt to other array
            srcArr.splice(idx, 1) ;     // Rmv from where it is
            this.isrtRow(tranRec, destArr) ;  // Add to where it isn't (yet)
            this.statusMsg = 'Updated row and switched debit/credit status' ;
          }
        }
        this.reCalcTotals() ;
        break ;
      case 'delete':
        idx = this.findTranId(tranRec.TranId, destArr) ;
        if (idx < 0) {
          this.statusMsg = 'Tranid: ' + tranRec.TranId + ' Not found, cannot delete' ;
        } else {
          destArr.splice(idx, 1) ;
          this.statusMsg = 'Deleted row w/Tranid: ' + tranRec.TranId ;
        }
        this.reCalcTotals() ;
        break ;
      case 'Hide':
      case 'Unhide':
        let srcArr = destArr ;      // Credit or debit array may be source
        if (action === 'Hide') {
          destArr = this.hiddenTranRecs ;     // Hide means move to hidden
        } else { // Unhide
          srcArr = this.hiddenTranRecs ;      // Unhide moves from hidden
        }
        idx = this.findTranId(tranRec.TranId, srcArr) ;
        srcArr.splice(idx, 1) ;
        this.isrtRow(tranRec, destArr) ;
        this.statusMsg = 'Moved row w/Tranid: ' + tranRec.TranId ;
        this.reCalcTotals() ;
        break ;
      case 'cancel':
        this.statusMsg = 'Cancelled operation on row' ;
        if (this.newRow)  { this.newRow = false ; }
        break ;
      default: this.statusMsg = 'Invalid action notification of: ' + action ;
    }
    console.log('Newrow: ', this.newRow) ;
  }

  onSaveReconcile() {
    console.log('Called save reconcile') ;
    const reconciliation: Reconciliations = new Reconciliations('', this.account, this.startDt,
      this.endDt, this.creditTotals, this.debitTotals, this.beginBal*-1, this.endBal*-1, this.deltaAmt) ;
    this.recordService.createReconciliation(reconciliation).subscribe(
      (response) => {
        const returnState: ReturnState = response ;
        reconciliation.ReconKey = returnState.Message.split(' ')[0] ; // Capture new tranId
        this.statusMsg = 'Successfully added Reconciliation key: ' + reconciliation.ReconKey ;
        const tranIds: string[] = new Array<string>() ;
        for (const curTran of this.creditTranRecs) {
          tranIds.push(curTran.TranId) ;
        }
        for (const curTran of this.debitTranRecs) {
          tranIds.push(curTran.TranId) ;
        }
        this.recordService.reconcileTrans(reconciliation.ReconKey, tranIds).subscribe(
          (response) => {
            const reconRtn: ReturnState = response ;
            this.statusMsg = 'Marked: ' + tranIds.length + ' Trans for Reconciliation: ' +
              reconciliation.ReconKey ;
          },
          (error) => {
            console.log('Recon Error marking trans: ', error) ;
            this.statusMsg = 'Error marking trans for reconciliation' ;
          },
          () => {}
        ) ;
      },
      (error) => {
        console.log('ReconErr..RecordService: ', error) ;
        this.statusMsg = 'Error adding Reconciliation: ' ;
      },
      () => { }
    ) ;
  }

  /*****************************************************************************
   Clear subscriptions
  *****************************************************************************/
   ngOnDestroy() {
    this.msgSubscription.unsubscribe() ;
    this.homesSubscription.unsubscribe() ;
    this.projectsSubscription.unsubscribe() ;
    this.parmsSubscription.unsubscribe() ;
  }

}
