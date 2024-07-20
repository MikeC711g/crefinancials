import { Component, OnInit } from '@angular/core';
import { FirebaseService } from '../../services/firebase.service';
import { GenutilsService } from '../../services/genutils.service';
import { KeyVal } from '../../models/keyval.model';
import { Project } from '../../models/project.model';
import { Reconciliation } from '../../models/reconciliation.model';
import { Globals } from '../../models/globals.model';
import { TranRec } from '../../models/tranRec.model';
import { CommonFuncsService } from '../../services/common-funcs.service';
import { House } from '../../models/house.model';
import { RuleData } from '../../models/ruledata.model';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'crefinancials-load',
  templateUrl: './load.component.html',
  styleUrl: './load.component.css'
})
export class LoadComponent  implements OnInit {
  loadUnloadActions = ['removedb', 'clearglobals', 'cleartrans', 'clearprojects', 'clearrecons',
    'rmvglobalbytype', 'addglobals', 'loadtranprojrecon', 'listtrans', 'listglobals',
    'cloneglobals'] // 11
  needSourceCid = [ 'removedb', 'listglobals', 'listtrans', 'cloneglobals',
    'clearglobals', 'cleartrans', 'clearprojects', 'clearrecons', 'rmvglobalbytype' ]
  needGlobTypes = [ 'rmvglobalbytype' ]
  needDestCid = [ 'cloneglobals', 'loadtranprojrecon', 'addglobals' ] ;
  needDateRange = ['listtrans', 'cleartrans', 'clearprojects', 'clearrecons' ]
  needTranFilters = ['listtrans', 'cleartrans'] ;  haveGlobals = false ;
  sourceCid = '' ;  sourceDbPrefix = '' ; destCid = '' ;  destDbPrefix = '' ;
    startDt = '' ;  endDt = '' ;
    funcDone: boolean[] = [] ; funcStarted: boolean[] = []
    labelStr:string[] = [] ;  loadedGlobals: Globals[] = [] ; 
  projectIdXref: KeyVal[] = new Array<KeyVal>() ;
  reconIdXref: KeyVal[] = new Array<KeyVal>() ;
  projects: Project[] = new Array<Project>() ;
  reconciliations: Reconciliation[] = new Array<Reconciliation>() ;
  globals: Globals[] = new Array<Globals>() ;
  transactions: TranRec[] = new Array<TranRec>() ;
  getTranFilters = false ;  tfAcct = '' ;  tfDesc = '' ; tfTranType = '' ;
    tfTaxCat = '' ;  tfHouse = '' ;
  selectedAction = '' ;  selectedGlobalType = '' ;
  getSourceCid = false ;  getDestCid = false ;  getGlobalTypes = false ;  getDateRange = false ;
  houses: House[] = new Array<House>() ;   accounts: KeyVal[] = new Array<KeyVal>() ;
  accountTypes: string[] = new Array<string>() ;  tranTypes: string[] = new Array<string>() ;
  descripTaxcat: KeyVal[] = new Array<KeyVal>() ;
  descripCategories: KeyVal[] = new Array<KeyVal>() ;
  categoryTaxcat: KeyVal[] = new Array<KeyVal>() ;
  categoryFolder: KeyVal[] = new Array<KeyVal>() ;
  taxCats: KeyVal[] = new Array<KeyVal>() ;  taxCatTime = 0 ;
  ruleAdmin: RuleData[] = new Array<RuleData>()
  globalTypeArr: string[] = [ '' ] ; statusMsg = '' ; title = 'DBMaint Action'
  action$: Subscription = new Subscription() ;

  constructor(private fireSvc: FirebaseService, private utilSvc: GenutilsService,
    private commons: CommonFuncsService, private route: Router) {
      this.action$ = route.events.subscribe((routeUrl) => {
        if (routeUrl instanceof NavigationEnd) {
          const urlParts = routeUrl.url.split('/') ;
          const lastPart = urlParts[urlParts.length-1]
          this.selectedAction = (this.loadUnloadActions.indexOf(lastPart) > -1) ?
            lastPart : 'listglobals' 
          this.getActionInputs()
          console.log('constructor selectedAction: %s', this.selectedAction)
        }
      })
    }

  /** ****************************************************************************
   * onInit
   ***************************************************************************** */
  ngOnInit(): void {
    this.globalTypeArr = Object.values(this.utilSvc.globalTypes) ;
    console.log('globalTypes: ', this.globalTypeArr)
  }

  doAction() {
    switch(this.selectedAction) {
      case 'removedb':     this.removeDB() ; break ;
      case 'listglobals':   this.listGlobals() ; break ;
      case 'listtrans':     this.listTrans() ; break ;
      case 'cloneglobals':  this.cloneGlobals() ; break ;
      case 'clearglobals':  this.commons.clearGlobals(this.sourceCid, this.sourceDbPrefix) ; break ;
      case 'cleartrans':     this.commons.clearTrans(this.sourceCid, this.sourceDbPrefix,
        this.startDt, this.endDt) ; break ;
      case 'clearprojects':     this.commons.clearProjects(this.sourceCid, this.sourceDbPrefix,
        this.startDt, this.endDt) ; break ;
      case 'clearrecons':     this.commons.clearRecons(this.sourceCid, this.sourceDbPrefix,
        this.startDt, this.endDt) ; break ;
      case 'rmvglobalbytype':     this.rmvGlobalByType() ; break ;
      case 'addglobals':     this.addGlobals() ; break ;
      case 'loadtranprojrecon':  this.loadTranProjRecon(); break ;
      default:  console.warn('Invalid item selected %s', this.selectedAction) ;
    }
    this.selectedAction = '' ; this.getSourceCid = false ; this.getDestCid = false ;
    this.getGlobalTypes = false ;
  }

  onChgCid() {
    this.commons.onChgCid(this.sourceCid, this.sourceDbPrefix).then((globals) => {
      this.loadedGlobals = globals  ; this.haveGlobals = true ;
      console.log('onChgCid globalLen: %d', this.loadedGlobals.length)
      this.getAllGlobals()
    })
  }

  getAllGlobals() {
    this.ruleAdmin = this.utilSvc.getRuleData()
    this.tranTypes = this.utilSvc.getTranTypes()
    this.houses = this.utilSvc.getHouses()
    this.accountTypes = this.utilSvc.getAccountTypes()
    this.accounts = this.utilSvc.getAccounts()
    this.descripTaxcat = this.utilSvc.getDescripTaxcats()
    this.descripCategories = this.utilSvc.getDescripCategories()
    this.taxCats = this.utilSvc.getTaxcats()
  }

  /** ****************************************************************************
   * Based on function to run, retrieve appropriate info
   ***************************************************************************** */
  getActionInputs() {
    this.getSourceCid = (this.needSourceCid.indexOf(this.selectedAction) > -1)
    this.getDestCid = (this.needDestCid.indexOf(this.selectedAction) > -1)
    this.getGlobalTypes = (this.needGlobTypes.indexOf(this.selectedAction) > -1)
    this.getDateRange = (this.needDateRange.indexOf(this.selectedAction) > -1)
    this.getTranFilters = (this.needTranFilters.indexOf(this.selectedAction) > -1)
  }

  /** ****************************************************************************
   * Remove a DB (CID) from the data base
   * Always save to json for restoration if needed
   ***************************************************************************** */
  removeDB() {
    console.log('Doing remove of prefix %s  cid %s', this.sourceDbPrefix, this.sourceCid)
    this.commons.clearProjects(this.sourceCid, this.sourceDbPrefix, this.startDt, this.endDt)
    this.commons.clearGlobals(this.sourceCid, this.sourceDbPrefix)
    this.commons.clearRecons(this.sourceCid, this.sourceDbPrefix, this.startDt, this.endDt)
    this.commons.clearTrans(this.sourceCid, this.sourceDbPrefix, this.startDt, this.endDt)
  }

  /** ****************************************************************************
   * Retrieve all globals and print them to console
   ***************************************************************************** */
  listGlobals() {
    if (this.haveGlobals) console.dir(this.loadedGlobals)
    else {
      const globSub = this.fireSvc.getAllGlobals(this.sourceCid, this.sourceDbPrefix).subscribe(dbRef => {
        this.loadedGlobals = dbRef ;
        this.haveGlobals = true
        console.dir(this.globals)
      })
      setTimeout(() => {    // Wait 5 seconds, then clear subscription
        globSub.unsubscribe() ;
      }, 10000);
      }
  }

  /** ****************************************************************************
   * Retrieve all trans, projects, and recons and print them to console
   *  Filters can be applied to tran list
   ***************************************************************************** */
  listTrans(cid?: string, dbPref?: string, startDt?: string, endDt?: string) {
    if (!cid) cid = this.sourceCid ;  if (!dbPref) dbPref = this.sourceDbPrefix
    if (!startDt) startDt = this.startDt ;  if (!endDt) endDt = this.endDt
    this.fireSvc.getTransForDateRange(cid, dbPref, startDt, endDt, []).subscribe({
      next: (tranRef) => {
        this.transactions = tranRef ;
        const filtTrans = this.utilSvc.filterTrans(this.transactions, this.tfAcct, this.tfDesc,
          this.tfTranType, this.tfHouse, this.tfTaxCat)
        console.dir(filtTrans) ;
      }, error: (error) => {
        console.warn('Failed to get trans w/err: ', error) ;
      }
    })
    this.fireSvc.getProjectsForDateRange(cid, dbPref, startDt, endDt).subscribe({
      next: (projRec) => {
        this.projects = projRec ;
        console.dir(this.projects) ;
      }, error: (error) => {
        console.warn('Failed to get projects w/err:', error) ;
      }
    })
    this.fireSvc.getReconciliationsForDateRange(cid, dbPref, startDt, endDt, []).subscribe({
      next: (reconRec) => {
        this.reconciliations = reconRec ;
        console.dir(this.reconciliations) ;
      }, error: (error) => {
        console.warn('Failed to get reconciliations w/err:', error) ;
      }
    })
  }

  /** ****************************************************************************
   * Clone globals from one DB to another
   ***************************************************************************** */
  cloneGlobals(cid?: string, dbPref?: string, destCid?: string, destDbPref?: string) {
    if (!cid) cid = this.sourceCid ;  if (!dbPref)  dbPref = this.sourceDbPrefix
    if (!destCid) destCid = this.destCid ;  if (!destDbPref)  destDbPref = this.destDbPrefix
    const globSub = this.fireSvc.getAllGlobals(cid, dbPref).subscribe(dbRef => {
      this.loadedGlobals = dbRef ;
      this.commons.addGlobals(destCid!, destDbPref!, this.loadedGlobals)
    })
    setTimeout(() => {    // Wait 5 seconds, then clear subscription
      globSub.unsubscribe() ;
    }, 5000);
  }


  /** ****************************************************************************
   * Remove all globals of a particular type
   ***************************************************************************** */
  rmvGlobalByType(cid?: string, dbPref?: string) {
    if (!cid)  cid = this.sourceCid ;  if (!dbPref)  dbPref = this.sourceDbPrefix
    let rmvCnt = 0 ;
    console.log('rmvGlobByType Selected globals: ', this.selectedGlobalType)
    this.fireSvc.getGlobalType(cid, dbPref, this.selectedGlobalType).subscribe({
      next: (globRef) => {
        const locGlobs: Globals[] = globRef ;  const globLen = locGlobs.length
        console.log(this.selectedGlobalType, ': ', locGlobs) ;
        for (const curGlobal of locGlobs) {
          this.fireSvc.delGlobals(cid!, dbPref!, curGlobal).
            then(() => {
              if (rmvCnt++ % 40 === 0) console.log('Removed %d globals, curTp: %s',
                rmvCnt, this.selectedGlobalType)
              if (rmvCnt >= globLen) console.log('Deleted all %d globs of type: %s', rmvCnt, this.selectedGlobalType)
            }).catch((error) => {
              console.warn('Err rmving global single row: ', curGlobal, ' Err: ', error) ;
            })
          }
        }, error: (error) => {
          console.warn('Error getting ', this.selectedGlobalType, ' Globals: ', error)
        }
    })
  }

  runLoad(idx: number) {
    console.log('runLoad idx: %d', idx)
    switch (this.labelStr[idx]) {
      case 'Transaction': // Took out len > 0 as sometimes there are none of some type
        this.funcStarted[idx] = true ;
        if (this.transactions.length > 0)  this.loadTrans() ;
        this.funcDone[idx] = true ; break
      case 'Project':
        this.funcStarted[idx] = true ;
        if (this.projects.length > 0) this.loadProjects() ;
        this.funcDone[idx] = true ; break 
      case 'Reconciliation':  
        this.funcStarted[idx] = true ;
        if (this.reconciliations.length > 0)  this.loadRecons() ;
        this.funcDone[idx] = true ;  break ;
      case 'Globals':
        if (this.loadedGlobals.length > 0) {
          this.funcStarted[idx] = true ; this.loadGlobals() ; this.funcDone[idx] = true
        } break 
    }
    if (idx >= this.labelStr.length-1)  this.labelStr = []    // Clear html
  }

  dependentOK(label: string, labelStr: string[]) {
    const idx = labelStr.findIndex(ls => ls === label)
    console.log('dOK label: %s  labelStr: %O, idx: %d', label, labelStr, idx)
    if (idx === 0 || this.funcDone[idx-1]) {    // First el, or prior dependency done
      this.runLoad(idx)    // Vfy loads don't need parms
      if (labelStr.length > 1 && idx === labelStr.length-1) // Keep cking until all run
        this.ckLateRunners([1000, 4000, 10000, 30000, 60000, 180000, 300000], 0)
    }
  }

  /** *********************************************************************************
   * Check for up to 5 minutes to make sure all finishes and slow dependencies OK
   ********************************************************************************* */
  ckLateRunners(timeArr: number[], curTest: number) {
        // If we have more possible test times AND there are files not loaded yet
    if (curTest < timeArr.length && this.funcDone[this.funcDone.length-1] === false) {
      setTimeout(() => {    // Delay for however long
        for (let iter = 1 ; iter < this.labelStr.length ; iter++) {
          if (!this.funcStarted[iter] && this.funcDone[iter-1]) {    // This load not run but ready
            switch (this.labelStr[iter]) {    // If file is loaded, run this one
              case 'Transaction':  if (this.transactions.length > 0)  this.runLoad(iter) ; break 
              case 'Project':  if (this.projects.length > 0)  this.runLoad(iter) ; break 
              case 'Reconciliation':  if (this.reconciliations.length > 0)  this.runLoad(iter) ; break 
              case 'Globals':  if (this.loadedGlobals.length > 0)  this.runLoad(iter) ; break 
            }
          }
        }
        this.ckLateRunners(timeArr, ++curTest)
      }, timeArr[curTest]);
    }
  }

  loadFromJson(label: string, jsonData: string) {
    console.log('lfj label: %s  strLen: %d', label, jsonData.length)
    switch (label) {
      case 'Transaction': 
        this.transactions = JSON.parse(jsonData) ; this.dependentOK(label, this.labelStr) ;   break
      case 'Project': 
        this.projects = JSON.parse(jsonData) ; this.dependentOK(label, this.labelStr) ; break
      case 'Reconciliation':
        this.reconciliations = JSON.parse(jsonData) ; this.dependentOK(label, this.labelStr) ; break
      case 'Globals': 
        this.loadedGlobals = JSON.parse(jsonData) ; this.dependentOK(label, this.labelStr) ; break
      default: console.warn('Invalid table label: %s', label)
    }
    console.log('lfj trnCnt: %d  prjCnt: %d  recnCnt: %d  globCnt: %d', this.transactions.length,
      this.projects.length, this.reconciliations.length, this.loadedGlobals.length)
  }

  handleJsonData(event: any, label: string) {
    console.log('hJD: label: %s', label)
    const fileList = event.target.files;
    const file = fileList[0] ;
    const reader = new FileReader() ;
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') this.loadFromJson(label, reader.result)
      else console.warn('Non-string returned with reader.result')
    }, false)
    reader.readAsText(file)
  }

  /** ****************************************************************************
   * Add globals of a particular type from the appropriate json file
   ***************************************************************************** */
  addGlobals() {
    this.funcDone = [ false ] ;  this.funcStarted = [ false ] ; this.labelStr = ['Globals']
    console.log('agbt: labelStr: %O', this.labelStr)
  }

  /** ****************************************************************************
   * Load all trans, projects, and recons from JSON files including resolving all
   * XRef key stuff (tran project, tranRecon, childTran splitParent)
   * Note labelStr order implies right dependent on left
   ***************************************************************************** */
  loadTranProjRecon() {
    this.funcDone = [ false, false, false ] ;  this.funcStarted = [ false, false, false ]
    this.labelStr = ['Project', 'Reconciliation', 'Transaction']
    console.log('ltpr: labelStr: %O', this.labelStr)
  }

  loadGlobals(cid?: string, dbPref?: string) {
    if (!cid)  cid = this.destCid ;   if (!dbPref) dbPref = this.destDbPrefix ;
    this.commons.addGlobals(cid, dbPref, this.loadedGlobals)
  }
  
  loadProjects(cid?: string, dbPref?: string) {
    if (!cid)  cid = this.destCid ;   if (!dbPref) dbPref = this.destDbPrefix ;
    const projX = this.projectIdXref ;  const projLen = this.projects.length   // For readability
    if (projX.length > 0) projX.splice(0, projX.length)
    console.log('loadProjects w/projects: %O', this.projects)
    let projAdded = 0
    for (const curProj of this.projects) {
      projX.push(new KeyVal(curProj.ProjectId!, ''))
      this.fireSvc.addProjects(cid, dbPref, curProj).then(dbRef => {
        curProj.ProjectId = dbRef.id ;
        if (projAdded++ % 20 === 0) console.log('Added %d projects', projAdded)
        if (projAdded >= projLen) {
          console.log('Added all %d projects', projAdded)
          for (let i = 0; i < projLen; i++)  projX[i].RVal = this.projects[i].ProjectId! ;
          console.log('projects: %O  projIdXRef: %O', this.projects, projX)
        }
      }).catch(error => {
        console.warn('Failed to insert project: ', curProj, ' Err: ', error)
      })
    }
  }

  loadRecons(cid?: string, dbPref?: string) {
    if (!cid)  cid = this.destCid ;   if (!dbPref) dbPref = this.destDbPrefix ;
    const reconLen = this.reconciliations.length ;  const reconX = this.reconIdXref
    if (reconX.length) reconX.splice(0, reconX.length) // Clear xref
    console.log('loadRecons w/arrLen: %d', reconLen)
    let reconAdded = 0 ;
    for (const curRecon of this.reconciliations) {
      reconX.push(new KeyVal(curRecon.ReconKey!, ''))
      const oldReconKey = curRecon.ReconKey!
      this.fireSvc.addReconciliations(cid, dbPref, curRecon).then(reconRef => {
        curRecon.ReconKey = reconRef.id ;
        if (reconAdded++ % 15 === 0) console.log('Added %d recons', reconAdded)
        if (reconAdded >= reconLen) {
          for (let i = 0; i < reconLen; i++)  reconX[i].RVal = this.reconciliations[i].ReconKey! ;
          console.log('Added all %d recons', reconAdded)
          console.log('reconXRef: %O', reconX)
        }
      }).catch(reconErr => {
        console.warn('Error adding reconciliation: ', curRecon, ' Err: ', reconErr)
      })
    }
  }

  loadTrans(cid?: string, dbPref?: string) {
    if (!cid)  cid = this.destCid ;   if (!dbPref) dbPref = this.destDbPrefix ;
    const parentXRef: KeyVal[] = [] ;
    const tranList = this.transactions
    const parentList = tranList.filter(CTran => CTran.TranType === 'TPARENT')
    const childList = tranList.filter(CTran => CTran.SplitParent)
    const otherList = tranList.filter(cTran => cTran.TranType !== 'TPARENT' && !cTran.SplitParent)
    console.log('TranList Len: %d  parentLen: %d  childLen: %d  otherLen: %d',
      tranList.length, parentList.length, childList.length, otherList.length)
    if (tranList.length < 150)  console.log('Parents: %O  Children: %O  Other: %O',
      parentList, childList, otherList) ;
    this.processTran(cid, dbPref, parentXRef, parentList, 'Parent')
    this.processTran(cid, dbPref, parentXRef, otherList, 'Single')
    setTimeout(() => {  // Give a few seconds to be sure parents done and xref set up
      this.processTran(cid!, dbPref!, parentXRef, childList, 'Child') ;
    }, 10000);
  }

  processTran(cid: string, dbPref: string, parentXRef: KeyVal[], tranList: TranRec[], rowType: string) {
    const getNewIdx = this.utilSvc.getNewIdx
    let tranAdded = 0 ;  const tranLen = tranList.length ;
    const projX = this.projectIdXref ;   const ckProj = projX.length > 0 ;
    const reconX = this.reconIdXref ; const ckRecon = reconX.length > 0 ;
    console.log('projX: %O  reconX: %O  tranLen: %d  rowType: %s', projX, reconX, tranLen, rowType)
    for (const curTran of tranList) {
      if (!curTran)  continue ;
      const oldTid = curTran.TranId!   // Inside loop so should be OK wrt async
      if (ckProj && curTran.Project)
        curTran.Project = getNewIdx(curTran.Project, this.projectIdXref, 'Project')
      if (ckRecon && curTran.ReconKey)
        curTran.ReconKey = getNewIdx(curTran.ReconKey, this.reconIdXref, 'Reconciliation')
      if (curTran.SplitParent)
        curTran.SplitParent = getNewIdx(curTran.SplitParent, parentXRef, 'Parent')
      console.log('RowTp: %s  curTran: %O', rowType, curTran)
      this.fireSvc.addTrans(cid, dbPref, curTran).then(dbRef => {
        curTran.TranId = dbRef.id ;
        if (tranAdded++ % 50 === 0) console.log('%s Added %d trans', rowType, tranAdded)
        if (tranAdded >= tranLen) console.log('%s Added all %d trans', rowType, tranAdded)
        if (curTran.TranType === 'TPARENT') // Create xRef for children to get new parent tranid
          parentXRef.push(new KeyVal(oldTid, curTran.TranId!))
      }).catch(error => {
        console.warn('%s Failed to add tran %O, error: %s', rowType, curTran, error)
      })
    }
  }
}
