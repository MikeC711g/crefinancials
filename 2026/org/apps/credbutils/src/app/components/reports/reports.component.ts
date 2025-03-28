import { Reconciliation } from './../../models/reconciliation.model';
import { Project } from './../../models/project.model';
import { TranRec } from './../../models/tranRec.model';
import { FirebaseService } from '../../services/firebase.service';
import { Component, OnInit } from '@angular/core';
import { Globals } from '../../models/Globals.model';
import { KeyVal } from '../../models/keyval.model';
import { RuleData } from '../../models/ruledata.model';
import { House } from '../../models/house.model';
import { GenutilsService } from '../../services/genutils.service';

interface DbMeta {
  Cid: string,
  dbPrefix: string ;
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
export class ReportsComponent implements OnInit {

  statusMsg = '' ;
  completedActions = 0 ;
  sourceCid = '' ;  sourceDbPrefix = '' ;
  destCid = '' ;  destDbPrefix = '' ;
  tables = [ 'GlobalVars', 'Projects', 'Reconciliations', 'Transactions' ] ;
  cidPrefixList: DbMeta[] = [{Cid: 'CastleOperations', dbPrefix: ''},
    {Cid: 'CastleOp', dbPrefix: ''}, {Cid: 'cloneDB', dbPrefix: ''}]
  selectedTable = '' ;
  projects: Project[] = new Array<Project>() ;
  filtProj: Project[] = new Array<Project>() ;
  reconciliations: Reconciliation[] = new Array<Reconciliation>() ;
  filtRecon: Reconciliation[] = new Array<Reconciliation>() ;
  globals: Globals[] = new Array<Globals>() ;
  filtGlob: Globals[] = new Array<Globals>() ;
  transactions: TranRec[] = new Array<TranRec>() ;
  filtTrans: TranRec[] = new Array<TranRec>() ;
  globalTypes = { RuleData: 'ruleData', TaxCats: 'taxCats', DescripHints: 'descripHints',
    Houses: 'houses', TranType: 'tranType', Accounts: 'accounts', AccountType: 'accountType'} ;
  gtArray: string[] = [] ;
  idxMap: Map<string, string[]> = new Map<string, string[]>() ;
  colMap: Map<string, string[]> = new Map<string, string[]>() ;
  colList: string[] = new Array<string>() ;
  tranQ: TranRec = new TranRec('', '', '', '', '', 0, '', '', '', '', '', '', '', '') ;
  minDate = '' ;  maxDate = '' ;  accountArr = [''] ;  maxAmount = 0.0 ;
  tTypeArr: string[] = new Array<string>() ;  houseArr: string[] = new Array<string>() ;
  reconQ: Reconciliation = new Reconciliation('', '', '', '', 0, 0, 0, 0, 0, '') ;
  globalQ: Globals = new Globals('', '', '', '') ;
  globLab1 = '' ;  globLab2 = '' ;  globVal1 = '' ;  globVal2 = '' ;
  projectQ: Project = new Project('', '', '', '', '', '') ;
  tableNames = { GlobalVars: 'GlobalVars', Projects: 'Projects',
    Reconciliations: 'Reconciliations', Transactions: 'Transactions' }
  houses: string[] = new Array<string>() ;    fullHouses: House[] = new Array<House>() ;
  accounts: KeyVal[] = new Array<KeyVal>() ;
  accountTypes: string[] = new Array<string>() ;
  tranTypes: string[] = new Array<string>() ;
  descripInfo: KeyVal[] = new Array<KeyVal>() ;
  taxCats: KeyVal[] = new Array<KeyVal>() ;  taxCatTime = 0 ;
  ruleMap: Map<string, RuleData[]> = new Map<string, RuleData[]>() ;
  fldList: string[] = new Array<string>() ;

  constructor(private fireSvc: FirebaseService, private utilSvc: GenutilsService) { }

  ngOnInit(): void {
    this.idxMap.set(this.tableNames.GlobalVars, ['Cid', 'RKey']) ;
    this.idxMap.set(this.tableNames.Projects, ['Cid', 'EndDt']) ;
    this.idxMap.set(this.tableNames.Reconciliations, ['Cid', 'Account', 'EndDt']) ;
    this.idxMap.set(this.tableNames.Transactions, ['Cid', 'Account', 'TranDate']) ;
    this.gtArray = Object.values(this.globalTypes) ;
  }

  getGlobals() {
    this.fireSvc.getAllGlobals(this.sourceCid).subscribe(
      (globalRef) => {
        this.globals = globalRef ;
        console.log('Got %d globals from DB', this.globals.length) ;
        this.utilSvc.processGVals(this.globals) ;
      }, (error) => {
        console.warn('Error retrieving globals: ', error) ;
      })
  }

  retrieveMain() {
    this.accountArr.splice(0, this.accountArr.length) ;   // Clear and fill accountarr
    for (let i = 0; i < this.accounts.length; i++) {      // load arrays w/everything
      this.accountArr.push(this.accounts[i].RKey) ;       // allow reports to filter
    }

    this.fireSvc.getTransForDateRange(this.sourceCid, this.sourceDbPrefix,
      this.minDate, this.maxDate, this.accountArr).subscribe(
      (tranRef) => {
        this.transactions = tranRef ;
        console.log('Got %d transactions from DB', this.transactions.length) ;
      }, (error) => {
        console.warn('Error retrieving transactions: ', error) ;
      })
    this.fireSvc.getProjectsForDateRange(this.sourceCid, this.minDate, this.maxDate).subscribe(
      (projRef) => {
        this.projects = projRef ;
        console.log('Got %d projects from DB', this.projects.length) ;
      }, (error) => {
        console.warn('Error fetching projects: ', error) ;
      })

    this.fireSvc.getReconciliationsForDateRange(this.sourceCid,
      this.minDate, this.maxDate, this.accountArr).subscribe(
      (reconRef) => {
        this.reconciliations = reconRef ;
        console.log('Got %d reconciliations from DB', this.reconciliations.length) ;
      }, (error) => {
        console.warn('Error fetching reconciliations: ', error) ;
      })
    setTimeout(() => {
      this.resetFilters() ;   // After calls made, reset filters
    }, 4000);
  }

  deRefCols() {
    console.log('SelectedTable: ', this.selectedTable) ;
    let keyList: string[] ;
    switch (this.selectedTable) {
      case (this.tableNames.GlobalVars):
        keyList = Object.getOwnPropertyNames(this.globalQ) ;
        this.colMap.set(this.selectedTable, keyList) ;
        break ;
      case (this.tableNames.Projects):
        keyList = Object.getOwnPropertyNames(this.projectQ) ;
        this.colMap.set(this.selectedTable, keyList) ;
        break ;
      case (this.tableNames.Reconciliations):
        keyList = Object.getOwnPropertyNames(this.reconQ) ;
        this.colMap.set(this.selectedTable, keyList) ;
        break ;
      case (this.tableNames.Transactions):
        keyList = Object.getOwnPropertyNames(this.tranQ) ;
        this.colMap.set(this.selectedTable, keyList) ;
        break ;
      default:
        console.warn('Invalid table selected') ;
    }
    this.colList = this.colMap.get(this.selectedTable)! ;
  }

  queryGlobals() {
    console.log('Querying globals with globalQ: ', this.globalQ) ;
    console.log(' And Labs: %s and %s with Vals: %s and %s', this.globLab1, this.globLab2,
      this.globVal1, this.globVal2) ;
    this.filtGlob = this.globals.filter(globRec => {
      if (this.globalQ.GType !== globRec.GType) { return false ; }
      if (this.globalQ.RVal && globRec.RVal &&
        globRec.RVal.includes(this.globalQ.RVal)) { return false ; }
      if (this.globalQ.GlobalId !== '' && this.globalQ.GlobalId !== globRec.GlobalId) {
        return false ;
      }
      return true ;
    })
    console.dir(this.filtGlob) ;
  }

  getDerefVal(rVal: any, flds: string[]): string {
    let rsltStr = "" ;  let tmpStr: string ;
    if (typeof rVal === 'string') {
      console.log('RVal was a string') ;
      return rVal ;
    } else {
      for (const fld of flds) {
        tmpStr = rVal[fld] ;
        if (tmpStr && tmpStr !== '') { rsltStr += '  '+fld+': '+rVal[fld] ; }
      }
    }
    return rsltStr ;
  }

  deRefGlobals() {
    console.log('Into deRefGlobals w/rkey: ', this.globalQ.RKey) ;
    this.fldList = [] ;   // No flds, and a ny single val globals will leave this empty
    let kv: KeyVal ;
    switch (this.globalQ.RKey) {
      case (this.globalTypes.Accounts):
      case (this.globalTypes.DescripHints):
      case (this.globalTypes.TaxCats):
        kv = new KeyVal('', '') ;
        this.fldList = Object.getOwnPropertyNames(kv) ;
        break ;
    }
  }

  filterProjectsForHouse() {
    this.projectQ = new Project('', this.tranQ.House, '', '', '', '') ;
    this.filterProjects(false) ;
  }

  resetFilters() {
    this.maxAmount = 0 ;  this.maxDate = '' ;  this.accountArr = [] ;  this.tTypeArr = [] ;
  }

  filterReconsForTran() {
    this.reconQ = new Reconciliation('', '', this.tranQ.TranDate, this.maxDate, 0, 0, 0,
      0, 0, '') ;
    this.filterReconciliations(false) ;
  }

  filterReconciliations(doReset: boolean) {
    this.filtRecon = this.reconciliations.filter(recon => {
      if (this.accountArr.length > 0 && this.accountArr.indexOf(recon.Account) < 0) { return false ; }
      if (this.reconQ.EndDt !== '' && recon.EndDt >= this.reconQ.EndDt) { return false ; }
      if (this.reconQ.StartDt !== '' && recon.StartDt <= this.reconQ.StartDt) { return false ; }
      if (this.reconQ.ReconKey !== '' && recon.ReconKey !== this.reconQ.ReconKey) { return false ; }
      return true ;
    })
    console.log('FR ReconLen: ', this.reconciliations.length, ' FiltR: ', this.filtRecon,
      ' reconQ: ', this.reconQ) ;
    this.reconQ = new Reconciliation('', '', '', '', 0, 0, 0, 0, 0, '') ;
    if (doReset) { this.resetFilters() ; }
  }

  filterTrans(doReset: boolean) {
    console.log('FT tranQ: ', this.tranQ, ' maxDate: ', this.maxDate, ' acctArr: ', this.accountArr)
    console.log('FT2 maxAmt: ', this.maxAmount, ' TTypArr: ', this.tTypeArr)
    this.filtTrans = this.transactions.filter(tran => {
      if (this.tranQ.TranDate !== '') {
        if (this.maxDate !== '') {  // If both entered, then check range, otherwise ==
          if (tran.TranDate <= this.tranQ.TranDate || tran.TranDate >= this.maxDate) {
            return false ;
          }
        } else {    // No maxDate so date equality from tranq
          if (tran.TranDate !== this.tranQ.TranDate) { return false ; }
        }
      }
      if (this.accountArr.length > 0 && this.accountArr.indexOf(tran.Account) < 0) { return false ; }
      if (this.tranQ.Amount != 0) {
        if (this.maxAmount != 0) {
          if (tran.Amount > this.maxAmount || tran.Amount < this.tranQ.Amount) { return false }
        } else {    // Just tran amt, so check for ===
          if (tran.Amount !== this.tranQ.Amount) {  return false ; }
        }
      }
      if (this.tranQ.Category !== '' && !tran.Category.includes(this.tranQ.Category)) {
        return false ;
      }
      // if (this.tranQ.House !== '' && this.tranQ.House !== tran.House) { return false ; }
      if (this.houseArr.length > 0 && this.houseArr.indexOf(tran.House) < 0) { return false ; }
      if (this.tranQ.Project !== '' && this.tranQ.Project !== tran.Project) { return false ; }
      if (this.tranQ.Annotation !== '' && !tran.Annotation.includes(this.tranQ.Annotation)) {
        return false ;
      }
      if (this.tranQ.ReconKey !== '' && this.tranQ.ReconKey !== tran.ReconKey) { return false ; }
      if (this.tranQ.TaxCat !== '' && this.tranQ.TaxCat !== tran.TaxCat) { return false ; }
      console.log('Passed recon and taxcat') ;
      if (this.tranQ.TranExtra !== '' && !tran.TranExtra.includes(this.tranQ.TranExtra)) {
        return false ;
      }
      if (this.tranQ.TranId !== '' && this.tranQ.TranId !== tran.TranId) { return false ; }
      if (this.tTypeArr.length > 0 && this.tTypeArr.indexOf(tran.TranType) < 0) { return false ; }
      return true ;
    })
    if (doReset) { this.resetFilters() ; }
    console.dir(this.filtTrans) ;
  }

  filterProjects(doReset: boolean) {
    console.log('FP: projQ: ', this.projectQ, ' HouseArr: ', this.houseArr, ' MaxDt: ', this.maxDate)
    this.filtProj = this.projects.filter(proj => {
      if (this.projectQ.StartDt !== '') {
        const maxDate = (this.maxDate !== '') ? this.maxDate : this.projectQ.StartDt ;
        if (proj.StartDt >= maxDate || proj.EndDt <= this.projectQ.StartDt) {
            return false ;    // Verify that project live on date or in date range
        }
      }
      if (this.houseArr.length > 0 && this.houseArr.indexOf(proj.House) < 0) { return false ; }
      if (this.projectQ.Description !== '' && !this.projectQ.Description.includes(proj.Description)) {
        return false ;
      }
      if (this.projectQ.ProjectId != '' && this.projectQ.ProjectId != proj.ProjectId) {
        return false ;
      }
      return true ;
    })
    console.log('FP Len: ', this.filtProj.length, ' Projects: ', this.filtProj)
  }
}
