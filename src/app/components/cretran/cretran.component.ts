import { CsvService } from './../../services/csv.service';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { DescripInfo } from './../../models/descripInfo.model';
import { RecordService } from '../../services/record.service';
import { Subscription, Observable, subscribeOn } from 'rxjs';
import { TranRec } from './../../models/TranRec.model';
import { Project } from '../../models/project.model';

@Component({
  selector: 'app-cretran',
  templateUrl: './cretran.component.html',
  styleUrls: ['./cretran.component.css']
})

export class CretranComponent implements OnInit {
  csvFiles: string[] = new Array<string>() ;
  houses: string[] = new Array<string>() ;
  accounts: string[] = new Array<string>() ;
  projects: Project[] = new Array<Project>() ;
  csvTranRecs: TranRec[] = new Array<TranRec>() ;
  debitTranRecs: TranRec[] = new Array<TranRec>() ;
  creditTranRecs: TranRec[] = new Array<TranRec>() ;
  debitTotals = 0.0 ;  creditTotals = 0.0 ;
  expandDebits = false ;    expandCredits = false ;
  completeActions = 0 ;
  startDt = '' ;  endDt = '' ;   account = '' ; // Current query parms
  splitStr = ',' ;  trimRec = false ;     // For splitting CSV files
  tranDB = true ;   // Is tran in Database (true) or from CSV (false)
  newRow = false ;  // Are we inserting a new row
  statusMsg = '' ;
  msgSubscription: Subscription = new Subscription() ;
  homesSubscription: Subscription = new Subscription() ;
  projectsSubscription: Subscription = new Subscription() ;
  parmsSubscription: Subscription = new Subscription() ;
  csvSubscription: Subscription = new Subscription() ;

  constructor(private recordService: RecordService, private csvService: CsvService) { }

  ngOnInit(): void {
    this.onRefreshParms('2017-01-01', '2028-12-31') ;
  }

  /*********************************************************************
   Refresh common files (project list, categories, et al)
  ********************************************************************/
   onRefreshParms(psDate: string, peDate: string): void {
    this.homesSubscription = this.recordService.getHomesFromDB().subscribe({
      next: (response) => {
        this.houses = response ;
        this.recordService.loadHouses(this.houses) ;
        this.statusMsg = 'Got ' + this.houses.length + ' houses' ;
      },
      error: (error) => { console.log('HouseErr..RecordService: ', error) ; },
      complete: () => { this.completeActions++ ; }
    }) ;
    this.accounts = this.recordService.getAccounts() ;

    const bDate = '2017-01-01' ;  // Right now projects ignores parm dates and grabs all
    const eDate = '2028-12-31' ;
    this.projectsSubscription = this.recordService.getProjectsFromDB(bDate, eDate).subscribe({
      next: (response) => {
        this.projects = response ;
        this.recordService.loadProjects(this.projects) ;
        this.statusMsg = 'Got ' + this.projects.length + ' projects' ;
      },
      error: (error) => { console.log('ProjectErr..RecordService: ', error) ; },
      complete: () => { this.completeActions++ ; }
    }) ;
    this.parmsSubscription = this.recordService.getParmsFromDB().subscribe({
      next: (response) => {
        const allParms: string[] = response ;
        this.processParms(allParms) ;
      },
      error: (error) => { console.log('Failed to get parms from DB: ', error) ; },
      complete: () => { this.completeActions++ ; }
    }) ;
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
  onQueryDates(startDate: string, endDate: string, account: string): void {
    this.recordService.getTransFromDB(startDate, endDate, account, '', '', '').subscribe({
      next: (transIn) => {
        this.expandCredits = false ;   this.expandDebits = false ;
        this.csvTranRecs = transIn ;
        this.recordService.loadTrans(this.csvTranRecs) ;
        this.tranDB = true ;
        this.statusMsg = 'Got ' + this.csvTranRecs.length + ' Transactions' ;
        this.repopArrays() ;
        this.reCalcTotals() ;
      },
      error: (error) => { console.log('QueryDates Err: ', error) ; },
      complete: () => { this.completeActions++ ; }
    }) ;
    this.startDt = startDate ;
    this.endDt = endDate ;
    this.account = account ;
  }

  /*****************************************************************************
     Read selected CSV files and return TranRecs
       Call to readCSV returns Observable<TranRec[]> . I can create that as an
       object:  let obs: Observable<TranRec[]> = this.csvService.readCSV(...) ;
       Then could subscribe to that. But I save a subscription by subscribing directly
   *****************************************************************************/
  csvRead($event: any, account: string): void {
    this.csvSubscription = this.csvService.readCSV($event, account).subscribe({
      next: (tranRecs) => {
        this.csvTranRecs = tranRecs ;
        console.log('csvTranRecs: ', this.csvTranRecs.length) ;
        this.expandCredits = false ;   this.expandDebits = false ;
          // this.csvTranRecs = transIn ;
        this.tranDB = false ;
        this.recordService.loadTrans(this.csvTranRecs) ;
        this.statusMsg = 'Got ' + this.csvTranRecs.length + ' Trans from CSV' ;
        this.repopArrays() ;
        this.reCalcTotals() ;
      },
      error: (error) => { console.log('Error getting CSV records: ', error) ; },
      complete: () => { this.completeActions++ ; }
    }) ;
              // After 7 seconds, release subscription
    setTimeout(() => {this.csvSubscription.unsubscribe() ; }, 7000) ;
  }

  /*****************************************************************************
     Split total trans into debits and credits. Only done up front lest hide actions be lost
   *****************************************************************************/
  repopArrays(): void {
    this.creditTranRecs = [] ; this.debitTranRecs = [] ;   // Clear arrays
    for (const curTran of this.csvTranRecs) {
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
    this.creditTotals = this.debitTotals = 0.0 ;      // Clear sum totals
    for (const curTran of this.debitTranRecs) {
      this.debitTotals += curTran.Amount ;
    }
    for (const curTran of this.creditTranRecs) {
      this.creditTotals += curTran.Amount ;
    }
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
      case 'cancel':
        this.statusMsg = 'Cancelled operation on row' ;
        if (this.newRow)  { this.newRow = false ; }
        break ;
      default: this.statusMsg = 'Invalid action notification of: ' + action ;
    }
    console.log('Newrow: ', this.newRow) ;
  }

  /*****************************************************************************
     Remove a tran from the list
   *****************************************************************************/
  rmvTranFromList(tranId: string): void {
    this.csvTranRecs.forEach((tran, idx, _) => {
      if (tranId === tran.TranId) {
        this.csvTranRecs.splice(idx, 1) ;
        return ;
      }
    }) ;
  }

  /*****************************************************************************
   Clear subscriptions
  *****************************************************************************/
  ngOnDestroy() {
    this.msgSubscription.unsubscribe() ;
    this.homesSubscription.unsubscribe() ;
    this.projectsSubscription.unsubscribe() ;
    this.parmsSubscription.unsubscribe() ;
    this.csvSubscription.unsubscribe() ;
  }
}
