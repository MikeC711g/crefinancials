import { Reconciliations } from './../../models/reconciliations.model';
import { Project } from './../../models/project.model';
import { TranRec } from './../../models/TranRec.model';
import { FirebaseService } from '../../services/firebase.service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Globals } from './../../models/globals.model';
import { KeyVal } from './../../models/keyval.model';
import { RuleData } from './../../models/ruleData.model';
import { House } from './../../models/house.model';
import { TranQ } from './../../models/TranQ.model';
import { GenutilsService } from './../../services/genutils.service';
import { Subscription } from 'rxjs';
import { NavigationEnd, Router } from '@angular/router';

interface RptInfo {
  name: string,
  url: string,
  dateList: KeyVal[],
  acctList: boolean,
  moreData: boolean
}

interface PnlData {
  category: string,
  taxCat: string,
  totBal: number
}

interface MapVal {
  pnlData: PnlData[],
  totBal: number
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
      acctList: false, moreData: false},
    { name: 'House I & E', url: 'xxx', dateList: this.dateOptsReport,
       acctList: false, moreData: false},
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
  reportInfo: RptInfo = { name: '', url: '', dateList: this.noDateOpts, acctList: false, moreData: false } ;
  completedActions = 0 ;    // List of global types
  reportArr: string[] = new Array<string>() ;
        // Structures for P&L report
  totExpense = 0 ;  totIncome = 0 ;  netIncome = 0 ;
  incomeMap: Map<string, MapVal> = new Map<string, MapVal>() ;
  expenseMap: Map<string, MapVal> = new Map<string, MapVal>() ;
        // House I&E
  rentIncome: TranRec[] = [] ; houseExp: TranRec[] = [] ; projExp: TranRec[] = [] ;
  riLast = 0 ; riTot = 0 ; heLast = 0 ; heTot = 0 ; peLast = 0 ; peTot = 0 ;
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
  ruleMap: Map<string, RuleData[]> = new Map<string, RuleData[]>() ;
  report$: Subscription = new Subscription() ;
  CLASSNAME = 'reports' ;

  constructor(private fireSvc: FirebaseService, private utilSvc: GenutilsService,
    private route: Router) {
    for (const rinfo of this.reportList) { this.reportArr.push(rinfo.url) }
    this.report$ = route.events.subscribe((routeUrl) => {
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

  runReport(report2Run: string) {
    console.log('Came into runReport w/report: ', report2Run)
    this.reportReady = false ;   this.screenDisplay = false ;
    switch (report2Run) {
      case 'Profit and Loss': this.profitNLoss() ; break ;
      case 'House I & E': this.houseInE() ; break ;
      case 'Dump of Globals': this.dumpGlobal() ; break ;
      case 'Dump of Projects': this.dumpProject() ; break ;
      case 'Dump of Reconciliations': this.dumpRecon() ; break ;
      case 'Dump of Transactions':  this.dumpTran() ;
    }
  }

  /**
   * onDateMod used by datesel component for date selection
   * @param numDays
   * @param startDt

  * @param endDt
   */
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

  onTranSrch(action: string, category: string[], tranType: string[], house: string[],
    project: string, taxCat: string[], annotationRegEx: string, minAmt: number, maxAmt: number) {
    const tranQ = new TranQ(this.startDt, this.endDt, '', this.accountArr, category, tranType,
      minAmt, maxAmt, taxCat, house, project, annotationRegEx)
    this.utilSvc.cLog(this.CLASSNAME,'onTranSrch action: %s  category: %s  tranType: %s  house: %s  project: %s  taxCat: %s',
      action, category, tranType, house, project, taxCat) ;
    this.dumpTran(tranQ) ;
  }

  multiSelAll() {   // action on option did not work well, so onto select
    if (this.accountArr.includes('selectAll')) {
      this.accountArr = [] ;
      for (const curAcct of this.accounts) { this.accountArr.push(curAcct.RKey ) }
    }   // If we need date and have it AND we have accounts AND we don't need more, run report
    if ((this.reportInfo.dateList.length < 1 || (this.startDt && this.endDt) &&
      this.accountArr.length > 0 && !this.reportInfo.moreData)) {
        this.runReport(this.selectedReport) ;
      }
  }

  profitNLoss() {
    this.utilSvc.cDebug(this.CLASSNAME,'P&L startDt: %s  endDt: %s', this.startDt, this.endDt) ;
    const tranQ = new TranQ(this.startDt, this.endDt, '', [], [], [], 0, 0, [])
    this.fireSvc.getTransFromDB(tranQ).subscribe({
      next: (tranRecs) => {
        this.transactions = tranRecs ;
        this.utilSvc.cDebug(this.CLASSNAME,'postFilterTranList %O', this.transactions) ;
          // Need object key to map which recognizes exact equality, so cluging an array
        const pnlData: PnlData[] = [] ;
        // let pnlMap: Map<KeyVal, number> = new Map<KeyVal, number>() ;
        // Filter out parent trans and keep only business taxcats.  Filter here to avoid
        //  bringing back and re-uniting split trans.
        const filtTrans = this.transactions.filter(tr =>
          tr.TranType !== 'TPARENT' && ['BE', 'CE', 'BI'].indexOf(tr.TaxCat) > -1)
        for (const curTran of filtTrans) {
          if (curTran.Category === '') {
            this.utilSvc.cWarn(this.CLASSNAME, "Tran had no category: %O", curTran)
            continue 
          }
          const curPnl: PnlData = pnlData.find((pd) =>
            pd.category === curTran.Category && pd.taxCat === curTran.TaxCat)!
          if (curPnl) {
            curPnl.totBal += curTran.Amount ;     // Have this combo, add to total
            curPnl.totBal = this.utilSvc.fixAmt(curPnl.totBal)
          } else {
            pnlData.push({category: curTran.Category, taxCat: curTran.TaxCat,
              totBal: curTran.Amount})
          }
        }
        this.utilSvc.cDebug(this.CLASSNAME,'pnlData %O', pnlData) ;
        this.incomeMap.clear() ;    this.expenseMap.clear() ;
        const incomes: PnlData[] = pnlData.filter((pd) => pd.taxCat === 'BI') ;
        const expenses: PnlData[] = pnlData.filter((pd) => pd.taxCat !== 'BI') ;
        this.totExpense = 0 ;  this.totIncome = 0 ;
        console.log('Incomes: %O  Expenses: %O', incomes, expenses)
        for (const curCat of this.categoryFolders) {
          const catInc = incomes.filter((it) => curCat.RVal.includes(it.category)) ;
          const catExp = expenses.filter((it) => curCat.RVal.includes(it.category)) ;
          console.log('catInc: %O  catExp: %O', catInc, catExp)
          if (catInc.length > 0) {
            const totInc4Cat = this.totArray(catInc)
            this.incomeMap.set(curCat.RKey, {pnlData: catInc, totBal: this.utilSvc.fixAmt(totInc4Cat)})
            this.totIncome += totInc4Cat ;
          }
          if (catExp.length > 0) {
            const totExp4Cat = this.totArray(catExp)
            this.expenseMap.set(curCat.RKey, {pnlData: catExp, totBal: this.utilSvc.fixAmt(totExp4Cat)})
            this.totExpense += totExp4Cat ;
          }
          this.totIncome = this.utilSvc.fixAmt(this.totIncome) ;
          this.totExpense = this.utilSvc.fixAmt(this.totExpense) ;
          this.netIncome = this.utilSvc.fixAmt(this.totExpense + this.totIncome) ;
        }
        this.utilSvc.cDebug(this.CLASSNAME, 'Incomes: %O  Expenses: %O  incomeMap %O expenseMap: %O',
          incomes, expenses, this.incomeMap, this.expenseMap) ;
        this.reportReady = true ;
      }, error: (error) => {
        this.utilSvc.cWarn(this.CLASSNAME,'Error getting trans for P&L: %s', error)
      }
    })
  }

  writePnlRtf() {
    let fStr = '{\\rtf1\\ansi\\deff0\n'+    // Doc header
      '{\\fonttbl {\\f0 Times New Roman;} {\\f1\\fswiss Arial;} {\\f2\\fmodern Courier New;}}\n' +
      '\\f0 {\\pard\\fs50 Profit & Loss \\line\\par}\n' +
      '{\\pard\\fs40 Income \\line\\par}\n' +
      `{\\pard\\fs20 Start Date: ${this.startDt}  End Date: ${this.endDt} \\line\\par}\n`
    let incomeTot = 0 ;   let expenseTot = 0 ;
    console.log('*******Income***********')
    let hdrSpce = ''
    for (const [catGrp, catVal] of this.incomeMap) {
      fStr += `  {\\pard \\fs32${hdrSpce} \\b \\li720 ${catGrp} \\line\\par}\n`
      hdrSpce = '\\sb360 '
      const [rStr, tNum] = this.writeCatGrp(catGrp, catVal, false)
      fStr += rStr ;  incomeTot += tNum ;
      fStr += '   {\\trowd \\trgaph180  \\cellx5760\\cellx8640\n'
      fStr += '    {\\pard\\intbl\\li720 \\cell   \\pard\\intbl\\qr ---------- \\cell} \\row}\n'
      fStr += '   {\\trowd \\trgaph180  \\cellx5760\\cellx8640\n'
      fStr += `    {\\pard\\intbl\\li720\\b Total ${catGrp} \\cell   \\pard\\intbl\\qr\\b ${tNum.toString()} \\cell} \\row}\n`
    }
    incomeTot = this.utilSvc.fixAmt(incomeTot) ;
    fStr += '  {\\trowd \\trgaph180  \\cellx5760\\cellx8640\n'
    fStr += `   {\\pard\\intbl\\li420\\fs32\\sb240\\b Total Income \\cell   \\pard\\intbl\\qr\\fs32\\sb240\\b ${incomeTot} \\cell} \\row}\n`

    fStr += '{\\pard\\fs40\\sb480 Expenses \\line\\par}\n'
    console.log('*******Expense***********')
    hdrSpce = ''
    for (const [catGrp, catVal] of this.expenseMap) {
      fStr += `  {\\pard \\fs32${hdrSpce} \\b \\li720 ${catGrp} \\line\\par}\n`
      hdrSpce = '\\sb360'
      const [rStr, tNum] = this.writeCatGrp(catGrp, catVal, true)
      fStr += rStr ;  expenseTot += tNum ;
      fStr += '   {\\trowd \\trgaph180  \\cellx5760\\cellx8640\n'
      fStr += '    {\\pard\\intbl\\li720 \\cell   \\pard\\intbl\\qr ---------- \\cell} \\row}\n'
      fStr += '   {\\trowd \\trgaph180  \\cellx5760\\cellx8640\n'
      fStr += `    {\\pard\\intbl\\li720\\b Total ${catGrp} \\cell   \\pard\\intbl\\qr\\b ${tNum.toString()} \\cell} \\row}\n`
    }
    expenseTot = this.utilSvc.fixAmt(expenseTot)
    fStr += '  {\\trowd \\trgaph180  \\cellx5760\\cellx8640\n'
    fStr += `   {\\pard\\intbl\\li420\\fs32\\sb240\\b Total Expense \\cell   \\pard\\intbl\\qr\\fs32\\sb240\\b ${expenseTot} \\cell} \\row}\n`

    fStr += '  {\\trowd \\trgaph180  \\cellx5760\\cellx8640\n'
    const netInc = this.utilSvc.fixAmt(incomeTot - expenseTot) ;
    fStr += `  {\\pard\\intbl\\li420\\fs32\\sb240\\b Net Income \\cell   \\pard\\intbl\\qr\\fs32\\sb240\\b ${netInc} \\cell} \\row}\n`
    fStr += '   {\\pard\\fs40\\li720\\sb480\\b Net Income Summary \\line\\par}\n'
    fStr += '   {\\trowd \\trgaph180  \\cellx5760\\cellx8640\n'
    fStr += `   {\\pard\\intbl\\li720 Income \\cell   \\pard\\intbl\\qr ${incomeTot} \\cell} \\row}\n`
    fStr += '   {\\trowd \\trgaph180  \\cellx5760\\cellx8640\n'
    fStr += `   {\\pard\\intbl\\li720 Expense \\cell   \\pard\\intbl\\qr ${this.utilSvc.fixAmt(expenseTot*-1)} \\cell} \\row}\n`
    fStr += '  {\\trowd \\trgaph180  \\cellx5760\\cellx8640\n'
    fStr += `   {\\pard\\intbl\\li720\\sb160\\b Net Income \\cell   \\pard\\intbl\\qr\\sb160\\b ${netInc} \\cell} \\row} }\n`
    console.log('TotIncome: %d  TotExpense: %d', incomeTot, expenseTot)
    const encodedUri = encodeURI("data:text/plain;charset=utf-8," + fStr) ;
    // window.open(encodedUri);
    this.writeFile(encodedUri, 'profitNLoss.rtf') ;
  }

  writeCatGrp(catGrp: string, mapVal: MapVal, isExpense: boolean): [string, number] {
    let locStr = ''
    console.log('catGrp: ', catGrp, ' TotBal: ', mapVal.totBal)
    for (const pnlData of mapVal.pnlData) {
      locStr += '    {\\trowd \\trgaph180  \\cellx5760\\cellx8640\n'
      const pnlTot = (isExpense && pnlData.totBal < 0) ? pnlData.totBal * -1 : pnlData.totBal
      locStr += `     {\\pard\\intbl\\li720 ${pnlData.category} \\cell   \\pard\\intbl\\qr ${pnlTot.toString()} \\cell} \\row}\n`
      console.log('category: %s  tc: %s  bal: %d: ', pnlData.category, pnlData.taxCat, pnlData.totBal)
    }
    const mapTot = (isExpense && mapVal.totBal < 0) ? mapVal.totBal *= -1 : mapVal.totBal ;
    return [locStr, mapTot] ;
  }

  totArray(pnlData: PnlData[]): number {
    let totBal = 0
    for (const curData of pnlData) { totBal += curData.totBal }
    return this.utilSvc.fixAmt(totBal) ;
  }

  houseInE() {
    this.utilSvc.cDebug(this.CLASSNAME,'I&E startDt: %s  endDt: %s', this.startDt, this.endDt) ;
    const tranQ: TranQ = new TranQ(this.startDt, this.endDt, '', []) ;
    this.fireSvc.getTransFromDB(tranQ).subscribe({
      next: (tranRecs) => {
        this.transactions = tranRecs ;
        const houseRecs = this.transactions.filter(trn => trn.House !== '').sort((a, b) => {
          const curReturn = a.House.localeCompare(b.House) ;
          return (curReturn === 0) ? a.TranDate.localeCompare(b.TranDate) : curReturn ;
        }) ;
        // have to create sep arrays for each to catch group breaks and subTotals
        this.rentIncome = houseRecs.filter(hr => hr.Category === 'Rent Income') ;
        [this.riLast, this.riTot] = this.handleArray(this.rentIncome, false,
          'newHouse', 'rentIncome.csv')
        this.utilSvc.cLog(this.CLASSNAME,'HouseRecs %O  rentInc: %O', houseRecs, this.rentIncome)

        this.houseExp = houseRecs.filter(hr => hr.Amount < 0) ;
        [this.heLast, this.heTot] = this.handleArray(this.houseExp, false,
          'newHouse', 'houseExpenses.csv')

        const projExp = houseRecs.filter(hr => hr.Project !== '')
        this.utilSvc.cLog(this.CLASSNAME, 'houseExp %O  projExp: %O', this.houseExp, projExp)
        this.fireSvc.getProjectsFromDB(0, this.startDt, this.endDt).subscribe({
          next: (projRecs) => {   // Get project descriptions from keys
            this.projects = projRecs ;
            this.utilSvc.cDebug(this.CLASSNAME,'I&E startDt: %s  endDt: %s', this.startDt, this.endDt) ;
            for (const curProj of projExp) {    // Cvt project key to project description
              const fullProj = this.projects.find(proj => proj.ProjectId === curProj.Project)
              if (fullProj)  curProj.Project = fullProj.Description
              curProj.Project = curProj.House + ' ' + curProj.Project   // House in report
            }
            // let curReturn = a.House.localeCompare(b.House) ;
            // return (curReturn === 0) ? a.TranDate.localeCompare(b.TranDate) : curReturn ;

            this.projExp = projExp.sort((a, b) => {
              const curReturn = a.Project.localeCompare(b.Project) ;
              return (curReturn === 0) ? a.TranDate.localeCompare(b.TranDate) : curReturn ;
            }) ;
            [this.peLast, this.peTot] = this.handleArray(this.projExp, true,
              'newProj', 'projectExp.csv')

            this.reportReady = true ;
          }, error: (projErr) => {
            this.utilSvc.cWarn(this.CLASSNAME,'Error getting projects for I&E: %s', projErr)
          }
        })
      }, error: (error) => {
        this.utilSvc.cWarn(this.CLASSNAME, 'Error getting trans for P&L: %s', error)
      }
    })
  }

  // Use unused fields so html can show it well, also write CSV and RTF
  handleArray(curArr: TranRec[], useProject: boolean, indicatorMsg: string,
    fName: string): [number, number] {
    let lastGrpAmt = 0 ; let totAmt = 0 ;  let grpFld: string ;
    let lastGroup = '' ; let curTot = 0 ;  let csvStr = ''
    for (const curTran of curArr) {
      grpFld = (useProject) ? curTran.Project : curTran.House ;
      if (grpFld !== lastGroup) {  // use fitid to identify first row for house
        curTran.FitID = indicatorMsg  ;
        curTran.Annotation = this.utilSvc.fixAmt(curTot).toString() ; totAmt += curTot ;
        if (curTot !== 0)
          csvStr += lastGroup + ', SubTot:,' + this.utilSvc.fixAmt(curTot).toString() + '\n\n'
        csvStr += grpFld + '\n'
        curTot = 0 ;  lastGroup = grpFld
      }
      curTot += curTran.Amount ;
      csvStr += curTran.TranDate + ', ' + curTran.Category + ', ' +
        curTran.Amount.toString() + '\n' ;
    }
    lastGrpAmt = this.utilSvc.fixAmt(curTot) ;   totAmt += curTot ;
    if (curTot !== 0)
      csvStr += lastGroup + ', SubTot:,' + this.utilSvc.fixAmt(curTot).toString() + '\n\n'
    csvStr += 'Total: ,,,' + this.utilSvc.fixAmt(totAmt).toString() ;
    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvStr) ;
    this.writeFile(encodedUri, fName) ;
    return [lastGrpAmt, this.utilSvc.fixAmt(totAmt) ] ;
  }

  dumpGlobal() {
    this.utilSvc.cDebug(this.CLASSNAME, 'Into dumpGlobal selType: %s', this.selectedType)
    this.filtGlob =  (this.selectedType) ?
      this.globals.filter((glob) => glob.RKey === this.selectedType) : this.globals
    this.reportReady = true
  }

  jsonStr(inStr: any): string {   // So html can stringify w/out changing source arrays
    return JSON.stringify(inStr)
  }

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

  dumpTran(tranQ?: TranQ) {
    // Removed re-use logic since tq too complex to make it accurate, just requery
    if (!tranQ) tranQ = new TranQ(this.startDt, this.endDt, '', this.accountArr)
    this.fireSvc.getTransFromDB(tranQ).subscribe({
      next: (tranRecs) => {
        this.transactions = tranRecs ;
        this.showTranResults(this.transactions)
      }, error: (error) => {
        this.utilSvc.cWarn(this.CLASSNAME,'Error getting trans for TranDump TranQ %O  err: %s: ', tranQ, error)
      }
    })
    this.utilSvc.cDebug(this.CLASSNAME,'TranQ: %O  accountArr: %O  tranCnt: %d', tranQ, this.accountArr, this.transactions.length)
  }

  showTranResults(tranRecs: TranRec[]) {
    this.reportReady = true ;
  }

  writeCsv(reportNm: string) {
    switch (reportNm) {
      case 'Dump of Globals': this.writeGenericCsv(this.filtGlob, 'globals.csv') ; break ;
      case 'Dump of Projects': this.writeGenericCsv(this.filtProj, 'projects.csv') ; break ;
      case 'Dump of Reconciliations': this.writeGenericCsv(this.filtRecon, 'recons.csv') ; break ;
      case 'Dump of Transactions':  this.writeGenericCsv(this.transactions, 'transactions.csv') ;
    }
  }

  writeJson(reportNm: string) {
    switch (reportNm) {
      case 'Dump of Globals': this.writeGenericJson(this.filtGlob, 'globals.json') ; break ;
      case 'Dump of Projects': this.writeGenericJson(this.filtProj, 'projects.json') ; break ;
      case 'Dump of Reconciliations': this.writeGenericJson(this.filtRecon, 'recons.json') ; break ;
      case 'Dump of Transactions':  this.writeGenericJson(this.transactions, 'transactions.json') ;
    }
  }

  writeGenericCsv(inArr: any[], fName: string) {
    let outCsv = this.jsonArr2CsvStr(inArr) ;
    // outCsv = outCsv.replaceAll('#', 'lb;')
    outCsv = outCsv.replace(/#/g, 'lb;')
    this.utilSvc.cDebug(this.CLASSNAME, 'outcsv len: ', outCsv.length) ;
    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + outCsv) ;
    // window.open(encodedUri);
    this.writeFile(encodedUri, fName) ;
  }

  writeGenericJson(inArr: any[], fName: string) {
    this.utilSvc.cDebug(this.CLASSNAME, 'writeGenericJson w/arr: %O  nm: %s', inArr, fName)
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(inArr))
    this.writeFile(dataStr, fName)
  }

  writeFile(encodedData: string, fileName: string) {
    const dlAnchor = document.createElement('a')
    dlAnchor.setAttribute("href", encodedData)
    dlAnchor.setAttribute("download", fileName)
    dlAnchor.setAttribute("dataType", "rtf")
    dlAnchor.setAttribute("Content-Disposition", "attachment")
    document.body.appendChild(dlAnchor)
    dlAnchor.click()
    dlAnchor.remove()
  }

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

  getGlobals() {
    const globalSubj = this.fireSvc.getGlobals(this.forceGlobals) ;
    if (typeof globalSubj === 'boolean') {
      this.utilSvc.cDebug(this.CLASSNAME, 'Boolean response from getGlobals') ;
      this.globalLoad() ;
    } else {
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
  }

  globalLoad() {
    this.globals = this.fireSvc.retrieveGlobals() ;
    this.tranTypes = this.fireSvc.getTranTypes() ;
    this.fullHouses = this.fireSvc.getFullHouses() ;
    this.accountTypes = this.fireSvc.getAcctTypes() ;
    this.accounts = this.fireSvc.getAccounts() ;
    this.categoryTaxcat = this.fireSvc.getCategoryTaxcat() ;
    this.categoryFolders = this.fireSvc.getCategoryFolders() ;
    this.taxCats = this.fireSvc.getTaxCats() ;
    this.ruleMap = this.fireSvc.getRuleMap() ;
    this.forceGlobals = false ;
    this.utilSvc.cDebug(this.CLASSNAME,'Globals loaded, counts: tranTypes: %d  actTypes: %d  accts: %d',
      this.tranTypes.length, this.accountTypes.length, this.accounts.length)
      this.utilSvc.cDebug(this.CLASSNAME, 'catTC: %d  taxCat: %d', this.categoryTaxcat.length, this.taxCats.length)
  }

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

  onMsgDel(idx: number, msg: string) {
    this.dispMsgs.splice(idx, 1) ;
  }

  ngOnDestroy() {
    this.project$.unsubscribe() ;
    this.report$.unsubscribe() ;
  }
}
