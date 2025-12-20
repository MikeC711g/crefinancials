import { Reconciliations } from './../../models/reconciliations.model';
import { FormsModule } from '@angular/forms';
import { Project } from './../../models/project.model';
import { TranRec, TranQ } from './../../models/TranRec.model';
import { FirebaseService } from '../../services/firebase.service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Globals, KeyVal } from './../../models/globals.model';
import { DateselComponent } from '../datesel/datesel.component';
import { PnlReportComponent } from './pnl-report/pnl-report.component';
import { Exp2projreportComponent } from './exp2projreport/exp2projreport.component';
import { RentstatreportComponent } from './rentstatreport/rentstatreport.component';
import { TransrchComponent } from '../transrch/transrch.component';
import { CremessagesComponent } from '../cremessages/cremessages.component';
import { BalAdjust, House, Lease, Mortgage, Resident } from './../../models/house.model';
import { GenutilsService } from './../../services/genutils.service';
import { Subscription } from 'rxjs';
import { NavigationEnd, Router } from '@angular/router';
import { RuleData } from '../../models/ruledata.model';
import { DatarptComponent } from "./datarpt/datarpt.component";

interface RptInfo {   // Data for the running of each report
  name: string,
  url: string,
  dateList: KeyVal[],
  acctOne: boolean,
  acctMulti: boolean,
  houseOne: boolean,
  houseMulti: boolean,
  moreData: boolean
}

@Component({
  selector: 'crefinancials-reports',
  standalone: true,
  imports: [DateselComponent, PnlReportComponent, Exp2projreportComponent,
    RentstatreportComponent, TransrchComponent, CremessagesComponent, FormsModule, DatarptComponent],
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
      acctOne: false, acctMulti: false, houseOne: false, houseMulti: true, moreData: false},
    { name: 'Personal Profit and Loss', url: 'perspnl', dateList: this.dateOptsReport,
      acctOne: false, acctMulti: false, houseOne: false, houseMulti: true, moreData: false},
    { name: 'Rent Status', url: 'rentstat', dateList: this.dateOptsReport,
      acctOne: false, acctMulti: false, houseOne: true, houseMulti: false, moreData: true},
    { name: 'Expense By Project', url: 'expbyproj', dateList: this.dateOptsReport,
      acctOne: false, acctMulti: true, houseOne: false, houseMulti: true, moreData: false},
    { name: 'Dump of Globals', url: 'dumpglobals', dateList: this.noDateOpts,
      acctOne: false, acctMulti: false, houseOne: false, houseMulti: false, moreData: true},
    { name: 'Dump of Projects', url: 'dumpprojects', dateList: this.dateOptsData,
      acctOne: false, acctMulti: false, houseOne: true, houseMulti: false, moreData: false},
    { name: 'Dump of Reconciliations', url: 'dumprecons', dateList: this.dateOptsData,
      acctOne: false, acctMulti: true, houseOne: false, houseMulti: false, moreData: false},
    { name: 'Dump of Transactions', url: 'dumptrans', dateList: this.dateOptsReport,
      acctOne: false, acctMulti: true, houseOne: false, houseMulti: false, moreData: true},
    { name: 'Dump of Houses', url: 'dumphouses', dateList: this.noDateOpts,
      acctOne: false, acctMulti: false, houseOne: false, houseMulti: false, moreData: false},
    { name: 'Dump of Rules', url: 'dumprules', dateList: this.noDateOpts,
      acctOne: false, acctMulti: false, houseOne: false, houseMulti: false, moreData: false},
    { name: 'Dump of Mortgages', url: 'dumpmortgages', dateList: this.noDateOpts,
      acctOne: false, acctMulti: false, houseOne: false, houseMulti: true, moreData: false},
    { name: 'Dump of Leases', url: 'dumpleases', dateList: this.dateOptsData,
      acctOne: false, acctMulti: false, houseOne: false, houseMulti: true, moreData: false},
    { name: 'Dump of Residents', url: 'dumpresidents', dateList: this.noDateOpts,
      acctOne: false, acctMulti: false, houseOne: false, houseMulti: false, moreData: false},
    { name: 'Dump of Balance Adjustments', url: 'dumpbaladj', dateList: this.dateOptsData,
      acctOne: false, acctMulti: false, houseOne: false, houseMulti: true, moreData: false}   ]
         // Generic report parms and info
  startDt = '' ;  endDt = '' ;  reportReady = false ;  screenDisplay = false ;
  selectedReport = '' ;  selectedType = '' ;  selectedHouse = '' ;
  selectedHouseArr: string[] = new Array<string>() ;
  reportInfo: RptInfo = { name: '', url: '', dateList: this.noDateOpts, acctOne: false,
    acctMulti: false, houseOne: false, houseMulti: false, moreData: false } ;
  completedActions = 0 ;    // List of global types
  reportArr: string[] = new Array<string>() ;
  expCats = ['BE', 'CE'] ;  // Expense categories
  incCats = ['BI'] ;  // Income categories
  title = 'Profit & Loss' ;
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
  accountArr = [''] ;  maxAmount = 0.0 ;  selectedAccount = '' ;
  reconQ: Reconciliations = new Reconciliations('', '', '', '', 0, 0, 0, 0, 0, '') ;
  forceGlobals = false ;
  houses: House[] = new Array<House>() ;
  accounts: KeyVal[] = new Array<KeyVal>() ;
  tranRules: RuleData[] = new Array<RuleData>() ;
  mortgages: Mortgage[] = new Array<Mortgage>() ;
  leases: Lease[] = new Array<Lease>() ;
  residents: Resident[] = new Array<Resident>() ;
  balanceAdjustments: BalAdjust[] = new Array<BalAdjust>() ;
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
          // Clear reportInfo so subElements re-initialized
        this.reportInfo = { name: '', url: '', dateList: this.noDateOpts, acctOne: false,
          acctMulti: false, houseOne: false, houseMulti: false, moreData: false } ;
        const urlParts = routeUrl.url.split('/') ;
        const lastPart = urlParts[urlParts.length-1]
        this.selectedReport = (this.reportArr.indexOf(lastPart) > -1) ?
          lastPart : 'profitnloss' 
        setTimeout(() => {    // Give html to re-init to blank reportInfo
          this.onSelectRpt() ; this.dispMsgs.splice(0, this.dispMsgs.length)
        }, 250);
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
    if (this.reportInfo.dateList.length < 1 && !this.reportInfo.acctOne &&
      !this.reportInfo.acctMulti && !this.reportInfo.houseOne && !this.reportInfo.houseMulti &&
      !this.reportInfo.moreData) {
      console.log('selRpt calling runRpt')
      this.runReport(this.reportInfo.name) ;
    } else {
      console.log('selRpt setting vars and waiting for input')
    }
  }

  /** ************************************************************************
   * Run the logic to create the data structures for the selected report
   * @param report2Run - selected report
   ************************************************************************ */
  runReport(report2Run: string) {
    this.reportReady = false ;   this.screenDisplay = false ;
    switch (report2Run) {
      case 'Profit and Loss': this.profitNLoss(this.startDt, this.endDt, this.selectedHouseArr) ; break ;
      case 'Personal Profit and Loss': this.expCats = ['PE'] ;  this.incCats = ['PI'] ;
        this.title = report2Run ; this.profitNLoss(this.startDt, this.endDt, this.selectedHouseArr) ; break ;
      case 'Rent Status': this.rentStatus(this.startDt, this.endDt, this.selectedHouseArr) ; break ;
      case 'Expense By Project': this.expByProject(this.startDt, this.endDt, this.selectedHouseArr) ; break ;
      case 'Dump of Globals': this.dumpGlobal() ; break ;
      case 'Dump of Projects': this.dumpProject(this.startDt, this.endDt, this.selectedHouse) ; break ;
      case 'Dump of Reconciliations': this.dumpRecon(this.startDt, this.endDt, this.accountArr) ; break ;
      case 'Dump of Transactions':  this.dumpTran() ; break ;
      case 'Dump of Houses':  this.dumpHouse() ; break ;
      case 'Dump of Rules':  this.dumpRule() ; break ;
      case 'Dump of Mortgages':  this.dumpMortgage(this.selectedHouseArr) ; break ;
      case 'Dump of Leases':  this.dumpLeases(this.startDt, this.endDt, this.selectedHouseArr) ; break ;
      case 'Dump of Residents':  this.dumpResidents() ; break ;
      case 'Dump of Balance Adjustments':  this.dumpBalAdj(this.startDt, this.endDt, this.selectedHouseArr) ; break ;
    }
    this.accountArr = [] ; this.selectedAccount = '' ; this.selectedHouseArr = [] ; this.selectedHouse = '' ;
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
    if ((!this.reportInfo.acctMulti || this.accountArr.length > 0) && !this.reportInfo.moreData
      && (!this.reportInfo.acctOne || this.selectedAccount) &&
      (!this.reportInfo.houseMulti || this.houses.length > 0) &&
      (!this.reportInfo.houseOne || this.selectedHouse))
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
      for (const curHouse of this.houses) { this.selectedHouseArr.push(curHouse.name ) }
    }   // If we need date and have it AND we have accounts AND we don't need more, run report
    if ((this.reportInfo.dateList.length < 1 || (this.startDt && this.endDt) &&
      this.selectedHouseArr.length > 0 && !this.reportInfo.moreData)) {
        this.runReport(this.selectedReport) ;
      }
  }

  profitNLoss(startDt: string, endDt: string, houseArr: string[]) {
    this.utilSvc.cLog(this.CLASSNAME,'P&L startDt: %s  endDt: %s  houseArr: %O', startDt, endDt, houseArr) ;
    const tranQ = new TranQ(startDt, endDt, '', [], [], [], 0, 0, [], houseArr)
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
  expByProject(startDt: string, endDt: string, houseArr: string[]) {
    this.utilSvc.cLog(this.CLASSNAME,'expBP startDt: %s  endDt: %s  houseArr: %O',
      startDt, endDt, houseArr) ;
    const tranQ = new TranQ(startDt, endDt, '', this.accountArr, [], [], 0, 0, [], houseArr)
    this.fireSvc.getTransFromDB(tranQ, false).subscribe({
      next: (tranRecs) => {   // Filter recs w/out house or filter then sort house/proj/dt
        this.transactions = tranRecs ;
        this.reportReady = true ;
      }, error: (error) => {
        this.utilSvc.cWarn(this.CLASSNAME,'Error getting trans for P&L: %s', error)
      }
    })
  }

  rentStatus(startDt: string, endDt: string, houseArr: string[]) {
    this.utilSvc.cLog(this.CLASSNAME,'RentStat startDt: %s  endDt: %s  houseArr: %O',
      startDt, endDt, houseArr) ;
    const tranQ = new TranQ(startDt, endDt, '', this.accountArr, ['Rent Income'], [],
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
    this.reportReady = false ;
    this.utilSvc.cDebug(this.CLASSNAME, 'Into dumpGlobal selType: %s', this.selectedType)
    this.filtGlob =  (this.selectedType) ?
      this.globals.filter((glob) => glob.GType === this.selectedType) : 
      this.globals.sort((a, b) => {
        const comp1 = a.GType.localeCompare(b.GType) ;
        if (comp1 !== 0) return comp1 ;
        return a.RKey.localeCompare(b.RKey) ;
      })
    this.reportReady = true
  }

  /** ************************************************************************
   * Dump projects for csv or json
   ************************************************************************ */
  dumpProject(startDt: string, endDt: string, house: string) {
    this.utilSvc.cDebug(this.CLASSNAME, 'Into dumpProj sDt: %s  eDt: %s', startDt, endDt)
    const tProj = this.projects.filter((proj) => {
      if (proj.StartDt > endDt) return false ;
      if (proj.EndDt < startDt) return false ;
      if (house && proj.House !== house)  return false ;
      return true ;
    })
    this.filtProj = tProj.sort((a, b) => {
      const houseComp = a.House.localeCompare(b.House) ;
      if (houseComp !== 0) return houseComp ;
      return a.StartDt.localeCompare(b.StartDt) ;
    }) ;
    this.reportReady = true ;
  }

  /** ************************************************************************
   * Dump reconciliations for csv or json
   ************************************************************************ */
  dumpRecon(startDt: string, endDt: string, accountArr: string[]) {
    this.utilSvc.cDebug(this.CLASSNAME,'dumpRecon w/startDt: %s  endDt: %s  accountArr: %O',
      startDt, endDt, accountArr) ;
    this.reportReady = false ;
    this.fireSvc.getReconciliations(startDt, endDt, accountArr).subscribe({
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
    this.reportReady = false ;
    if (!tranQ) tranQ = new TranQ(this.startDt, this.endDt, '', this.accountArr)
    this.fireSvc.getTransFromDB(tranQ, true).subscribe({
      next: (tranRecs) => {
        this.transactions = tranRecs ;
        this.reportReady = true ;
      }, error: (error) => {
        this.utilSvc.cWarn(this.CLASSNAME,'Error getting trans for TranDump TranQ %O  err: %s: ', tranQ, error)
      }
    })
    this.utilSvc.cDebug(this.CLASSNAME,'TranQ: %O  accountArr: %O  tranCnt: %d', tranQ, this.accountArr, this.transactions.length)
  }

  /** ************************************************************************
   * Dump transactions for CSV or JSON
   * @param tranQ 
   ************************************************************************ */
  dumpHouse() {
    this.reportReady = false ;
    const house$ = this.fireSvc.getHouseDB().subscribe({
      next: (houseRecs) => {
        this.houses = this.fireSvc.setHouses(houseRecs) ;
        this.reportReady = true ;
      }, error: (error) => {
        this.utilSvc.cWarn(this.CLASSNAME,'Error getting houses for HouseDump err: %s: ', error)
      }
    })
    setTimeout(() => {   house$.unsubscribe() ; }, 30000);
    this.utilSvc.cDebug(this.CLASSNAME,'houseCnt: %d', this.houses.length)
  }

  /** ************************************************************************
   * Dump transactions for CSV or JSON
   * @param tranQ 
   ************************************************************************ */
  dumpRule() {
    this.reportReady = false ;
    const tranRule$ = this.fireSvc.getTranRuleDB().subscribe({
      next: (ruleRecs) => {
        this.tranRules = ruleRecs ;
        this.reportReady = true ;
      }, error: (error) => {
        this.utilSvc.cWarn(this.CLASSNAME,'Error getting rules for RuleDump  err: %s: ', error)
      }
    })
    setTimeout(() => {   tranRule$.unsubscribe() ; }, 30000);
    this.utilSvc.cDebug(this.CLASSNAME,'ruleCnt: %d', this.tranRules.length)
  }

  /** ************************************************************************
   * Dump Mortgages for CSV or JSON
   ************************************************************************ */
  dumpMortgage(houseArr: string[]) {
    this.reportReady = false ; 
    const mortgage$ = this.fireSvc.getMortgageDB().subscribe({
      next: (mortRecs) => {
        this.mortgages = mortRecs.filter(mort => houseArr.length === 0 || houseArr.includes(mort.house)) ;
        this.reportReady = true ;
      }, error: (error) => {
        this.utilSvc.cWarn(this.CLASSNAME,'Error getting mortgages for MortDump  err: %s: ', error)
      }
    })
    setTimeout(() => {   mortgage$.unsubscribe() ; }, 30000);
    this.utilSvc.cDebug(this.CLASSNAME,'mortgageCnt: %d', this.mortgages.length)
  }

  /** ************************************************************************
   * Dump Leases for CSV or JSON
   * @param startDt
   ************************************************************************ */
  dumpLeases(startDt: string, endDt: string, houseArr: string[]) {
    this.reportReady = false ;
    const lease$ = this.fireSvc.getLeaseDB().subscribe({
      next: (leaseRecs) => {
        this.leases = leaseRecs.filter(lease => {
          if (houseArr.length > 0 && !houseArr.includes(lease.House)) return false ;
          if (lease.EndDt < startDt) return false ;
          if (lease.StartDt > endDt) return false ;
          return true ;
        })
        // this.leases = (!startDt) ? leaseRecs : leaseRecs.filter(lease => lease.StartDt >= startDt);
        this.reportReady = true ;
      }, error: (error) => {
        this.utilSvc.cWarn(this.CLASSNAME,'Error getting leases for LeaseDump  err: %s: ', error)
      }
    })
    setTimeout(() => {   lease$.unsubscribe() ; }, 30000);
    this.utilSvc.cDebug(this.CLASSNAME,'leaseCnt: %d', this.leases.length)
  }

  /** ************************************************************************
   * Dump Leases for CSV or JSON
   * @param startDt
   ************************************************************************ */
  dumpResidents() {
    this.reportReady = false ;
    const resident$ = this.fireSvc.getResidentDB().subscribe({
      next: (residentRecs) => {
        this.residents = residentRecs ;
        this.reportReady = true ;
      }, error: (error) => {
        this.utilSvc.cWarn(this.CLASSNAME,'Error getting residents for ResidentDump  err: %s: ', error)
      }
    })
    setTimeout(() => {   resident$.unsubscribe() ; }, 30000);
    this.utilSvc.cDebug(this.CLASSNAME,'residentCnt: %d', this.residents.length)
  }

  /** ************************************************************************
   * Dump Leases for CSV or JSON
   * @param startDt
   ************************************************************************ */
  dumpBalAdj(startDt: string, endDt: string, houseArr: string[]) {
    this.reportReady = false ;
    const baladj$ = this.fireSvc.getBalAdj4House().subscribe({
      next: (balAdjData) => {
        this.balanceAdjustments = balAdjData.filter(adj => {
          if (houseArr.length > 0 && !houseArr.includes(adj.House)) return false ;
          if (adj.ADate < startDt) return false ;
          if (adj.ADate > endDt) return false ;
          return true ;
        })
        this.reportReady = true ;
      }, error: (error) => {
        this.utilSvc.cWarn(this.CLASSNAME,'Error getting balAdjust for BalAdjDump  err: %s: ', error)
      }
    })
    setTimeout(() => {   baladj$.unsubscribe() ; }, 30000);
    this.utilSvc.cDebug(this.CLASSNAME,'balAdjCnt: %d', this.balanceAdjustments.length)
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
      case 'Dump of Transactions':  this.writeGenericCsv(this.transactions, 'transactions.csv') ; break ;
      case 'Dump of Houses': this.writeGenericCsv(this.houses, 'houses.csv') ; break ;
      case 'Dump of Rules': this.writeGenericCsv(this.tranRules, 'rules.csv') ; break ;
      case 'Dump of Mortgages': this.writeGenericCsv(this.mortgages, 'mortgages.csv') ; break ;
      case 'Dump of Leases': this.writeGenericCsv(this.leases, 'leases.csv') ; break ;
      case 'Dump of Residents': this.writeGenericCsv(this.residents, 'residents.csv') ; break ;
      case 'Dump of Balance Adjustments': this.writeGenericCsv(this.balanceAdjustments, 'balanceAdjustments.csv') ; break ;
      default: this.utilSvc.cWarn(this.CLASSNAME, 'writeCsv unknown report: %s', reportNm) ;
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
      case 'Dump of Transactions':  this.writeGenericJson(this.transactions, 'transactions.json') ; break ;
      case 'Dump of Houses': this.writeGenericJson(this.houses, 'houses.json') ; break ;
      case 'Dump of Rules': this.writeGenericJson(this.tranRules, 'rules.json') ; break ;
      case 'Dump of Mortgages': this.writeGenericJson(this.mortgages, 'mortgages.json') ; break ;
      case 'Dump of Leases': this.writeGenericJson(this.leases, 'leases.json') ; break ;
      case 'Dump of Residents': this.writeGenericJson(this.residents, 'residents.json') ; break ;
      case 'Dump of Balance Adjustments': this.writeGenericJson(this.balanceAdjustments, 'balanceAdjustments.json') ; break ;
      default: this.utilSvc.cWarn(this.CLASSNAME, 'writeJson unknown report: %s', reportNm) ;
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
  jsonArr2Html(inArr: any[]): string {
    let outStr = '<table border="1"> <tr> ';
    const fldNames: string[] = Object.keys(inArr[0])
    const sortNames = fldNames.sort((a, b) =>  a.localeCompare(b))
    for (const fldNm of sortNames) {
      outStr += '<th>' + fldNm + '</th>' ;
    }
    outStr += '</tr>'
    this.utilSvc.cDebug(this.CLASSNAME,'inarr len: ', inArr.length) ;
    for (const anyObj of inArr) {
      for (const fldNm of sortNames) {
        let curObj = anyObj[fldNm]
        if (typeof curObj === 'object') { curObj = JSON.stringify(curObj) }
        outStr += '<td>' + curObj + '</td>' ;
      }
      outStr += '</tr>'
    }
    outStr += '</table>' ;
    return outStr ;
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
    const globRtn = this.fireSvc.getGlobals(this.forceGlobals) ;
    if (Array.isArray(globRtn)) {
      this.globalLoad() ;
    } else {
      globRtn.subscribe({
        next: (globals) => {
          const fbGlobals = globals as Globals[] ;
          this.fireSvc.setGlobals(fbGlobals) ;
          this.globalLoad() ;
        }, error: (error) => {
          this.utilSvc.cWarn(this.CLASSNAME,'Error getting globals: %s', error) ;
        }
      })
    }
    const house$ = this.fireSvc.getHouseDB().subscribe({
      next: (houses) => {
        this.houses = this.fireSvc.setHouses(houses) ;
      }, error: (error) => {
        this.utilSvc.cWarn(this.CLASSNAME,'Error getting houses: %s', error) ;
      }
    })
    setTimeout(() => {   house$.unsubscribe() ; }, 30000);
  }

  /** ************************************************************************
   * Now that globals are available, retrieve each global data type needed
   ************************************************************************ */
  globalLoad() {
    this.globals = this.fireSvc.retrieveGlobals() ;
    this.tranTypes = this.fireSvc.getTranTypes() ;
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
