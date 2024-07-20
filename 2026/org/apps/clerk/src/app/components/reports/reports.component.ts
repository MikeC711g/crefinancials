import { Reconciliations } from './../../models/reconciliations.model';
import { Project } from './../../models/project.model';
import { TranRec } from './../../models/TranRec.model';
import { FirebaseService } from '../../services/firebase.service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Globals } from './../../models/globals.model';
import { KeyVal } from './../../models/keyval.model';
import { House } from './../../models/house.model';
import { TranQ } from './../../models/TranQ.model';
import { GenutilsService } from './../../services/genutils.service';
import { Subscription } from 'rxjs';
import { NavigationEnd, Router } from '@angular/router';

interface RptInfo {   // Data for the running of each report
  name: string,
  url: string,
  dateList: KeyVal[],
  acctList: boolean,
  moreData: boolean
}

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.css']
})
/**
 * Class gets all crucial data for the Cid for a Date Range ... then runs reports as needed
 * without going back to the DB
 * When we parlay this into component in primary app, need ability to verify dates are within
 * existing dates
 */
export class ReportsComponent implements OnInit, OnDestroy {
  dispMsgs: string[] = new Array<string>() ;
        // Different options for date selection
  dateOptsReport: KeyVal[] = [ new KeyVal('Prior Month', 'pmth'), new KeyVal('Prior Quarter', 'pqtr'),
    new KeyVal('Trailing 12 months', 'ttm'), new KeyVal('Prior year', 'pyr'),
    new KeyVal('Custom Dates', '-1')]
  dateOptsData: KeyVal[] = [ new KeyVal('30 days', '30'), new KeyVal('90 days', '90'),
    new KeyVal('6 months', '180'), new KeyVal('Custom Dates', '-1')]
  noDateOpts: KeyVal[] = [] ;
        // List of reports and control info
  reportList: RptInfo[] = [
    { name: 'Profit and Loss', url: 'profitnloss', dateList: this.dateOptsReport,
      acctList: false, moreData: true},
    { name: 'Rent Status', url: 'rentstat', dateList: this.dateOptsReport,
      acctList: true, moreData: true},
    { name: 'Expense By Project', url: 'expbyproj', dateList: this.dateOptsReport,
      acctList: true, moreData: true},
    { name: 'Dump of Globals', url: 'dumpglobals', dateList: this.noDateOpts,
      acctList: false, moreData: true},
    { name: 'Dump of Projects', url: 'dumpprojects', dateList: this.dateOptsData,
      acctList: false, moreData: true},
    { name: 'Dump of Reconciliations', url: 'dumprecons', dateList: this.dateOptsData,
      acctList: true, moreData: false},
    { name: 'Dump of Transactions', url: 'dumptrans', dateList: this.dateOptsData,
      acctList: true, moreData: true} ]
         // Generic report parms and info
  startDt = '' ;  endDt = '' ;  reportReady = false ;  screenDisplay = false ;
  selectedReport = '' ;  selectedType = '' ;  selectedHouse = '' ;
  selectedHouseArr: string[] = new Array<string>() ;
  reportInfo: RptInfo = { name: '', url: '', dateList: this.noDateOpts, acctList: false, moreData: false } ;
  completedActions = 0 ;    // List of global types
  reportArr: string[] = new Array<string>() ;
        // House I&E
  // rentIncome: TranRec[] = [] ; houseExp: TranRec[] = [] ; projExp: TranRec[] = [] ;
  // riLast = 0 ; riTot = 0 ; heLast = 0 ; heTot = 0 ; peLast = 0 ; peTot = 0 ;
        // And the rest
  projects: Project[] = new Array<Project>() ;  project$: Subscription = new Subscription() ;
  projStrtDt = '' ;  projEndDt = '' ;   // Dates when projects last retrieved
  filtProj: Project[] = new Array<Project>() ;   projIdArr: string[] = new Array<string>() ;
  reconciliations: Reconciliations[] = new Array<Reconciliations>() ;
  filtRecon: Reconciliations[] = new Array<Reconciliations>() ;
  globals: Globals[] = new Array<Globals>() ;
  filtGlob: Globals[] = new Array<Globals>() ;
  transactions: TranRec[] = new Array<TranRec>() ;
  admTypes: string[] = [] ;
  accountArr = [''] ;  maxAmount = 0.0 ;
  reconQ: Reconciliations = new Reconciliations('', '', '', '', 0, 0, 0, 0, 0, '') ;
  forceGlobals = false ;
  fullHouses: House[] = new Array<House>() ;
  accounts: KeyVal[] = new Array<KeyVal>() ;
  accountTypes: string[] = new Array<string>() ;
  tranTypes: string[] = new Array<string>() ;
  categoryTaxcat: KeyVal[] = new Array<KeyVal>() ;
  categoryFolders: KeyVal[] = new Array<KeyVal>() ;
  taxCats: KeyVal[] = new Array<KeyVal>() ;  taxCatTime = 0 ;
  report$: Subscription = new Subscription() ;
  CLASSNAME = 'reports' ;

  constructor(private fireSvc: FirebaseService, private utilSvc: GenutilsService,
    private route: Router) {
    for (const rinfo of this.reportList) { this.reportArr.push(rinfo.url) }
    this.report$ = route.events.subscribe((routeUrl) => { // Determine menu item selected
      if (routeUrl instanceof NavigationEnd) {
        const urlParts = routeUrl.url.split('/') ;
        const lastPart = urlParts[urlParts.length-1]
        this.selectedReport = (this.reportArr.indexOf(lastPart) > -1) ?
          lastPart : 'profitnloss' 
        this.onSelectRpt() ; this.dispMsgs.splice(0, this.dispMsgs.length)
        utilSvc.cDebug(this.CLASSNAME, 'Into url chg with report: ', this.selectedReport)
      }
    })
  }

  ngOnInit(): void {
    const admTypes = Object.values(this.utilSvc.globalTypes) ;
    this.admTypes = admTypes.filter((admTp) => !this.utilSvc.noAdminGlobalTypes.includes(admTp)) ;
      this.getGlobals() ;
  }

  /** ************************************************************************
   * Start determining what to do for selected report
   ************************************************************************ */
  onSelectRpt() {   
    this.reportInfo = this.reportList.find((rl) => rl.url === this.selectedReport)! ;
    this.selectedReport = this.reportInfo.name ;    // Go to long version of report
    console.log('selRpt: %s  rptInfo: %O', this.selectedReport, this.reportInfo)
    this.reportReady = false ; this.screenDisplay = false ;
    this.startDt = '' ;  this.endDt = '' ;
    if (this.reportInfo.dateList.length < 1 && !this.reportInfo.acctList &&
      !this.reportInfo.moreData) {
      console.log('selRpt calling runRpt')
      this.runReport(this.reportInfo.name) ;
    } else {
      console.log('selRpt setting vars and waiting for input')
      this.startDt = '' ; this.endDt = '' ; this.accountArr = [] ; this.reportReady = false
    }
  }

  /** ************************************************************************
   * Run the logic to create the data structures for the selected report
   * @param report2Run - selected report
   ************************************************************************ */
  runReport(report2Run: string) {
    console.log('Came into runReport w/report: ', report2Run)
    this.reportReady = false ;   this.screenDisplay = false ;
    switch (report2Run) {
      case 'Profit and Loss': this.profitNLoss() ; break ;
      case 'Rent Status': this.rentStatus() ; break ;
      case 'Expense By Project': this.expByProject() ; break ;
      case 'Dump of Globals': this.dumpGlobal() ; break ;
      case 'Dump of Projects': this.dumpProject() ; break ;
      case 'Dump of Reconciliations': this.dumpRecon() ; break ;
      case 'Dump of Transactions':  this.dumpTran() ;
    }
  }

  /** ************************************************************************
   * onDateMod used by datesel component for date selection
   * @param numDays Number of days from current selected
   * @param startDt Actual start date
   * @param endDt Actual end date
   ************************************************************************ */
  onDateMod(numDays: number, startDt: string, endDt: string): void {
    this.reportReady = false
    this.startDt = startDt ;  this.endDt = endDt ;
    this.utilSvc.cDebug(this.CLASSNAME,'onDateMod w start: %s  end: %s', startDt, endDt) ;
    if (this.projects.length === 0 || startDt < this.projStrtDt || endDt > this.projEndDt) {
      this.utilSvc.cDebug(this.CLASSNAME,'getProjects projLen: %d  projStrt: %s  projEnd: %s',
        this.projects.length, this.projStrtDt, this.projEndDt) ;
      this.getProjects()
    }
    if ((!this.reportInfo.acctList || this.accountArr.length > 0) && !this.reportInfo.moreData)
     {  this.runReport(this.selectedReport) ;  }
  }

  /** ************************************************************************
   * On advanced tran search, this takes parms and makes call for complex query
   * @param action 
   * @param category 
   * @param tranType 
   * @param house 
   * @param project 
   * @param taxCat 
   * @param annotationRegEx 
   * @param minAmt 
   * @param maxAmt 
   ************************************************************************ */
  onTranSrch(action: string, category: string[], tranType: string[], house: string[],
    project: string, taxCat: string[], annotationRegEx: string, minAmt: number, maxAmt: number) {
    const tranQ = new TranQ(this.startDt, this.endDt, '', this.accountArr, category, tranType,
      minAmt, maxAmt, taxCat, house, project, annotationRegEx)
    this.utilSvc.cLog(this.CLASSNAME,'onTranSrch action: %s  category: %s  tranType: %s  house: %s  project: %s  taxCat: %s',
      action, category, tranType, house, project, taxCat) ;
    this.dumpTran(tranQ) ;
  }

  /** ************************************************************************
   * SelectAll was hit on account so this selects all entries in select widget
   ************************************************************************ */
  accountSelAll() {   // action on option did not work well, so onto select
    if (this.accountArr.includes('selectAll')) {
      this.accountArr = [] ;
      for (const curAcct of this.accounts) { this.accountArr.push(curAcct.RKey ) }
    }   // If we need date and have it AND we have accounts AND we don't need more, run report
    if ((this.reportInfo.dateList.length < 1 || (this.startDt && this.endDt) &&
      this.accountArr.length > 0 && !this.reportInfo.moreData)) {
        this.runReport(this.selectedReport) ;
      }
  }

  /** ************************************************************************
   * Select all houses via SelectAll option
   ************************************************************************ */
  houseSelAll() {   // action on option did not work well, so onto select
    // todo: Need to handle no house selection. May be OK as you wouldn't come here ...
    if (this.selectedHouseArr.includes('selectAll')) {
      this.selectedHouseArr = [] ;
      for (const curHouse of this.fullHouses) { this.selectedHouseArr.push(curHouse.name ) }
    }   // If we need date and have it AND we have accounts AND we don't need more, run report
    if ((this.reportInfo.dateList.length < 1 || (this.startDt && this.endDt) &&
      this.selectedHouseArr.length > 0 && !this.reportInfo.moreData)) {
        this.runReport(this.selectedReport) ;
      }
  }

  profitNLoss() {
    this.utilSvc.cLog(this.CLASSNAME,'P&L startDt: %s  endDt: %s  houseArr: %O',
      this.startDt, this.endDt, this.selectedHouseArr) ;
    const tranQ = new TranQ(this.startDt, this.endDt, '', [], [], [], 0, 0, [], this.selectedHouseArr)
    this.fireSvc.getTransFromDB(tranQ, false).subscribe({
      next: (tranRecs) => {
        this.transactions = tranRecs ;
        this.reportReady = true ;
      }, error: (error) => {
        this.utilSvc.cWarn(this.CLASSNAME,'Error getting trans for P&L: %s', error)
      }
    })
  }

  /** ************************************************************************
   * Main logic for expenses by project
   ************************************************************************ */
  expByProject() {
    this.utilSvc.cLog(this.CLASSNAME,'expBP startDt: %s  endDt: %s  houseArr: %O',
      this.startDt, this.endDt, this.selectedHouseArr) ;
    const tranQ = new TranQ(this.startDt, this.endDt, '', this.accountArr, [], [], 0, 0, [], this.selectedHouseArr)
    this.fireSvc.getTransFromDB(tranQ, false).subscribe({
      next: (tranRecs) => {   // Filter recs w/out house or filter then sort house/proj/dt
        this.transactions = tranRecs ;
        this.reportReady = true ;
      }, error: (error) => {
        this.utilSvc.cWarn(this.CLASSNAME,'Error getting trans for P&L: %s', error)
      }
    })
  }

  rentStatus() {
    this.utilSvc.cLog(this.CLASSNAME,'RentStat startDt: %s  endDt: %s  houseArr: %O',
      this.startDt, this.endDt, this.selectedHouseArr) ;
    const tranQ = new TranQ(this.startDt, this.endDt, '', this.accountArr, ['Rent Income'], [],
      0, 0, [], [this.selectedHouse ])
    this.fireSvc.getTransFromDB(tranQ, false).subscribe({
      next: (tranRecs) => {
        this.transactions = tranRecs ;
        this.reportReady = true ;
      }, error: (error) => {
        this.utilSvc.cWarn(this.CLASSNAME,'Error getting trans for P&L: %s', error)
      }
    })
  }

  /** ************************************************************************
   * Dump the globals ... all globals or globals of a particular type
   ************************************************************************ */
  dumpGlobal() {
    this.utilSvc.cDebug(this.CLASSNAME, 'Into dumpGlobal selType: %s', this.selectedType)
    this.filtGlob =  (this.selectedType) ?
      this.globals.filter((glob) => glob.RKey === this.selectedType) : this.globals
    this.reportReady = true
  }

  /** ************************************************************************
   * So html can stringify w/out changing source arrays
   * @param inStr 
   * @returns 
   *************************************************************************/
  jsonStr(inStr: any): string {   
    return JSON.stringify(inStr)
  }

  /** ************************************************************************
   * Dump projects for csv or json
   ************************************************************************ */
  dumpProject() {
    this.utilSvc.cDebug(this.CLASSNAME, 'Into dumpProj sDt: %s  eDt: %s', this.startDt, this.endDt)
    this.filtProj = this.projects.filter((proj) => {
      if (proj.StartDt > this.endDt) return false ;
      if (proj.EndDt < this.startDt) return false ;
      if (this.selectedHouse && proj.House !== this.selectedHouse)  return false ;
      return true ;
    })
    this.reportReady = true ;
  }

  /** ************************************************************************
   * Dump reconciliations for csv or json
   ************************************************************************ */
  dumpRecon() {
    this.utilSvc.cDebug(this.CLASSNAME,'dumpRecon w/startDt: %s  endDt: %s  accountArr: %O',
      this.startDt, this.endDt, this.accountArr) ;
    this.fireSvc.getReconciliations(this.startDt, this.endDt, this.accountArr).subscribe({
      next: (recons) => {
        this.reconciliations = recons ;
        this.filtRecon = this.reconciliations ; // No filter beyond what db did
        this.reportReady = true ;
      }, error: (error) => {
        this.utilSvc.cWarn(this.CLASSNAME,'Error getting Recons for ReconDump startDt: %s  endDt: %s  err: %s ',
          this.startDt, this.endDt, error)
      }
    })
  }

  /** ************************************************************************
   * Dump transactions for CSV or JSON
   * @param tranQ 
   ************************************************************************ */
  dumpTran(tranQ?: TranQ) {
    // Removed re-use logic since tq too complex to make it accurate, just requery
    if (!tranQ) tranQ = new TranQ(this.startDt, this.endDt, '', this.accountArr)
    this.fireSvc.getTransFromDB(tranQ, true).subscribe({
      next: (tranRecs) => {
        this.transactions = tranRecs ;
        this.showTranResults(this.transactions)
      }, error: (error) => {
        this.utilSvc.cWarn(this.CLASSNAME,'Error getting trans for TranDump TranQ %O  err: %s: ', tranQ, error)
      }
    })
    this.utilSvc.cDebug(this.CLASSNAME,'TranQ: %O  accountArr: %O  tranCnt: %d', tranQ, this.accountArr, this.transactions.length)
  }

  /** ************************************************************************
   * Func callable from html and ts to identify report ready
   * @param tranRecs 
   ************************************************************************ */
  showTranResults(tranRecs: TranRec[]) {
    this.reportReady = true ;
  }

  /** ************************************************************************
   * Write out CSV for the appropriate dump
   * @param reportNm 
   ************************************************************************ */
  writeCsv(reportNm: string) {
    switch (reportNm) {
      case 'Dump of Globals': this.writeGenericCsv(this.filtGlob, 'globals.csv') ; break ;
      case 'Dump of Projects': this.writeGenericCsv(this.filtProj, 'projects.csv') ; break ;
      case 'Dump of Reconciliations': this.writeGenericCsv(this.filtRecon, 'recons.csv') ; break ;
      case 'Dump of Transactions':  this.writeGenericCsv(this.transactions, 'transactions.csv') ;
    }
  }

  /** ************************************************************************
   * Writing the JSON file for the dump of data base
   * @param reportNm 
   ************************************************************************ */
  writeJson(reportNm: string) {
    switch (reportNm) {
      case 'Dump of Globals': this.writeGenericJson(this.filtGlob, 'globals.json') ; break ;
      case 'Dump of Projects': this.writeGenericJson(this.filtProj, 'projects.json') ; break ;
      case 'Dump of Reconciliations': this.writeGenericJson(this.filtRecon, 'recons.json') ; break ;
      case 'Dump of Transactions':  this.writeGenericJson(this.transactions, 'transactions.json') ;
    }
  }

  /** ************************************************************************
   * Process a CSV file by working thru headers, columns, etc..
   * @param inArr 
   * @param fName 
   ************************************************************************ */
  writeGenericCsv(inArr: any[], fName: string) {
    let outCsv = this.jsonArr2CsvStr(inArr) ;
    // outCsv = outCsv.replaceAll('#', 'lb;')
    outCsv = outCsv.replace(/#/g, 'lb;')
    this.utilSvc.cDebug(this.CLASSNAME, 'outcsv len: ', outCsv.length) ;
    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + outCsv) ;
    // window.open(encodedUri);
    this.utilSvc.writeFile(encodedUri, fName) ;
  }

  /** ************************************************************************
   * Generic processor of JSON for db dumps
   * @param inArr 
   * @param fName 
   *************************************************************************/
  writeGenericJson(inArr: any[], fName: string) {
    this.utilSvc.cDebug(this.CLASSNAME, 'writeGenericJson w/arr: %O  nm: %s', inArr, fName)
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(inArr))
    this.utilSvc.writeFile(dataStr, fName)
  }

  /** ************************************************************************
   * Creating a CSV string from a JSON array
   * @param inArr 
   * @returns 
   ************************************************************************ */
  jsonArr2CsvStr(inArr: any[]): string {
    let outStr = ''
    const fldNames: string[] = Object.keys(inArr[0])
    const sortNames = fldNames.sort((a, b) =>  a.localeCompare(b))
    let hdrLine = '' ;  let cma = '' ;
    for (const fldNm of sortNames) {
      hdrLine += cma + fldNm
      cma = ','
    }
    outStr += hdrLine + '\r\n'
    this.utilSvc.cDebug(this.CLASSNAME,'inarr len: ', inArr.length) ;
    for (const anyObj of inArr) {
      let line = '' ; cma = '' ;
      for (const fldNm of sortNames) {
        let curObj = anyObj[fldNm]
        if (typeof curObj === 'object') { curObj = JSON.stringify(curObj) }
        if (typeof curObj === 'string') {
          if (curObj.includes(',')) {curObj = '"' +curObj + '"'}
        }
        line += cma + curObj
        cma = ','
      }
      outStr += line + '\r\n' ;
    }
    return outStr ;
  }

  /** ************************************************************************
   * Retrieve globals from the data base via fireService
   ************************************************************************ */
  getGlobals() {
    const globalSubj = this.fireSvc.getGlobals(this.forceGlobals) ;
    globalSubj.subscribe({
      next: () => {
        this.utilSvc.cDebug(this.CLASSNAME, 'Subscription came back in nginit.getGlobals')
        this.globalLoad() ;
        globalSubj.unsubscribe() ;
      }, error: (error) => {
        this.utilSvc.cWarn(this.CLASSNAME,'Error getting globals: %s', error) ;
        globalSubj.unsubscribe() ;
      }
    })
  }

  /** ************************************************************************
   * Now that globals are available, retrieve each global data type needed
   ************************************************************************ */
  globalLoad() {
    this.globals = this.fireSvc.retrieveGlobals() ;
    this.tranTypes = this.fireSvc.getTranTypes() ;
    this.fullHouses = this.fireSvc.getFullHouses() ;
    this.accountTypes = this.fireSvc.getAcctTypes() ;
    this.accounts = this.fireSvc.getAccounts() ;
    this.categoryTaxcat = this.fireSvc.getCategoryTaxcat() ;
    this.categoryFolders = this.fireSvc.getCategoryFolders() ;
    this.taxCats = this.fireSvc.getTaxCats() ;
    this.forceGlobals = false ;
    this.utilSvc.cDebug(this.CLASSNAME,'Globals loaded, counts: tranTypes: %d  actTypes: %d  accts: %d',
      this.tranTypes.length, this.accountTypes.length, this.accounts.length)
      this.utilSvc.cDebug(this.CLASSNAME, 'catTC: %d  taxCat: %d', this.categoryTaxcat.length, this.taxCats.length)
  }

  /** ************************************************************************
   * Retrieve projects from firebase service
   ************************************************************************ */
  getProjects() {
    this.projStrtDt = this.startDt ;  this.projEndDt = this.endDt ;
    const projRtn = this.fireSvc.getProjects(false, 0, this.startDt, this.endDt) ;
    if (Array.isArray(projRtn)) {
      this.projects = projRtn ;
      this.dispMsgs.push('Got ' + this.projects.length + ' projects')
    } else {
      this.project$ = projRtn.subscribe({
        next: (response) => {
          this.projects = response ;
          this.fireSvc.project$.next(this.projects) ;
          this.dispMsgs.push('Got ' + this.projects.length + ' projects')
        }, error: (error) => {
          this.utilSvc.cWarn(this.CLASSNAME,'ProjectErr..FireService: %s', error) ;
        }, complete: () => {
          this.utilSvc.cDebug(this.CLASSNAME,'projSubs complete') ;
          this.completedActions++ ;
        }
      }) ;
    }
  }

  /** ************************************************************************
   * Delete a message selected for deletion
   * @param idx 
   * @param msg 
   ************************************************************************ */
  onMsgDel(idx: number, msg: string) {
    this.dispMsgs.splice(idx, 1) ;
  }

  ngOnDestroy() {
    this.project$.unsubscribe() ;
    this.report$.unsubscribe() ;
  }
}
