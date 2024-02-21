import { cUser } from './../../models/cUser.model';
import { AuthService } from './../../services/auth.service';
import { Reconciliation } from './../../models/reconciliation.model';
import { Project } from './../../models/project.model';
import { TranRec } from './../../models/tranRec.model';
import { FirebaseService } from '../../services/firebase.service';
import { Component, OnInit } from '@angular/core';
import { Globals } from './../../models/globals.model';
import { deleteField } from '@angular/fire/firestore';
import { KeyVal } from './../../models/keyval.model';
import { RuleData } from './../../models/ruledata.model';
import { House } from './../../models/house.model';
import { UserRec } from './../../models/UserRec.model';

interface DbMeta {
  Cid: string,
  dbPrefix: string ;
}

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'app-clonedb',
  templateUrl: './clonedb.component.html',
  styleUrls: ['./clonedb.component.css']
})

export class ClonedbComponent implements OnInit {
  statusMsg = '' ;
  completedActions = 0 ;  isProjComplete = false ;  isReconComplete = false ;
  projectIdXref: KeyVal[] = new Array<KeyVal>() ;
  reconIdXref: KeyVal[] = new Array<KeyVal>() ;
  sourceCid = '' ;  sourceDbPrefix = '' ;  savedCid = '' ;  savedDbP = '' ;
  startDt = '' ;  endDt = '' ;
  destCid = '' ;  destDbPrefix = '' ;
  actions = [ 'addUser', 'removeUser', 'handleUserActions', 'resetPassword',
    'Remove DB', 'clearGlobals', 'analyzeCidByTrans', 'analyzeCidDBByUsers',
    'clearTrans', 'clearProjects', 'clearRecons', 'rmvGlobalByType',
    'addGlobalByType', 'loadTranProjRecon', 'addName2Rules',
    'listTrans', 'listGlobals', 'cre8SqlDDL', 'cloneGlobals',
    'fixNameInGlobals', 'addTestTrans'] ;
  needSourceCid = [ 'Remove DB', 'listGlobals', 'listTrans', 'cloneGlobals',
    'clearGlobals', 'fixNameInGlobals', 'addName2Rules',
    'clearTrans', 'clearProjects', 'clearRecons', 'rmvGlobalByType',
    'addGlobalByType', 'analyzeCidByTrans' ] ;
  needGlobTypes = [ 'rmvGlobalByType', 'addGlobalByType' ]
  needDestCid = [ 'cloneGlobals', 'loadTranProjRecon', 'addUser', 'addTestTrans' ] ;
  needDateRange = ['listTrans', 'clearTrans', 'clearProjects', 'clearRecons' ]
  needTranFilters = ['listTrans', 'clearTrans']
  needUUidInfo = ['addUser', 'removeUser', 'resetPassword'] ; getUUidInfo = false ;  lUUid = '' ;
    lRole = 'Admin' ;   roleNames = ['User', 'Admin', 'globalAdmin']
    eMail = '' ; pw = '' ; cName = '' ; phone = ''
    custActions: UserRec[] = new Array<UserRec>() ;
    uRecSelected: UserRec = new UserRec('action', 'cid', 'cName', 'dateAdded', 'dbPref',
      'eMail', 'phone', 'role', 'uuid')
  cidPrefixList: DbMeta[] = [{Cid: 'CastleOperations', dbPrefix: ''},
    {Cid: 'CastleOp', dbPrefix: ''}, {Cid: 'YahooOperations', dbPrefix: ''}]
  selectedAction = '' ;  globalTypes = {} ;
  globalTypeArr: string[] = [ '' ] ; selectedGlobalTypes: string[] = [''] ;
  projects: Project[] = new Array<Project>() ;
  reconciliations: Reconciliation[] = new Array<Reconciliation>() ;
  globals: Globals[] = new Array<Globals>() ;
  transactions: TranRec[] = new Array<TranRec>() ;
  getSourceCid = false ;  getDestCid = false ;  getGlobalTypes = false ;  getDateRange = false ;
  getTranFilters = false ;  tfAcct = '' ;  tfDesc = '' ; tfTranType = '' ;
    tfTaxCat = '' ;  tfHouse = '' ;
  fullHouses: House[] = new Array<House>() ;   accounts: KeyVal[] = new Array<KeyVal>() ;
  accountTypes: string[] = new Array<string>() ;  tranTypes: string[] = new Array<string>() ;
  descripTaxcat: KeyVal[] = new Array<KeyVal>() ;
  descripCategories: KeyVal[] = new Array<KeyVal>() ;
  categoryTaxcat: KeyVal[] = new Array<KeyVal>() ;
  categoryFolder: KeyVal[] = new Array<KeyVal>() ;
  taxCats: KeyVal[] = new Array<KeyVal>() ;  taxCatTime = 0 ;
  ruleAdmin: RuleData[] = new Array<RuleData>() ;  haveGlobals = false ;

  constructor(private fireSvc: FirebaseService, private authSvc: AuthService) { }

  /** ****************************************************************************
   * onInit
   ***************************************************************************** */
  ngOnInit(): void {
    this.globalTypes = this.fireSvc.globalTypes
    this.globalTypeArr = Object.values(this.fireSvc.globalTypes) ;
    console.log('globalTypes: ', this.globalTypeArr)
  }

  /** ****************************************************************************
   * Call function corresponding to selection
   ***************************************************************************** */
  doAction() {
    switch(this.selectedAction) {
      case 'addUser':   this.addUserGeneric() ; break ;
      case 'removeUser':  this.removeUser() ; break ;
      case 'resetPassword': this.sendPasswordResetEMail() ; break ;
      case 'handleUserActions':  this.handleUserActions() ; break ;
      case 'fixNameInGlobals':     this.fixNameInGlobals() ; break ;
      case 'analyzeCidDBByUsers':  this.analyzeCidDBByUsers() ; break ;
      case 'analyzeCidByTrans':    this.analyzeCidByTrans() ; break ;
      case 'addName2Rules':   this.addName2Rules() ; break ;
      case 'Remove DB':     this.removeDB() ; break ;
      case 'listGlobals':   this.listGlobals() ; break ;
      case 'listTrans':     this.listTrans() ; break ;
      case 'cloneGlobals':  this.cloneGlobals() ; break ;
      case 'clearGlobals':  this.clearGlobals() ; break ;
      case 'clearTrans':     this.clearTrans() ; break ;
      case 'clearProjects':     this.clearProjects() ; break ;
      case 'clearRecons':     this.clearRecons() ; break ;
      case 'rmvGlobalByType':     this.rmvGlobalByType() ; break ;
      case 'addGlobalByType':     this.addGlobalByType() ; break ;
      case 'addTestTrans':     this.addTestTrans() ; break ;
      case 'loadTranProjRecon':  this.loadTranProjRecon(); break ;
      case 'cre8SqlDDL': this.cre8SqlDDL() ; break ;
      default:  console.warn('Invalid item selected %s', this.selectedAction) ;
    }
    this.selectedAction = '' ; this.getSourceCid = false ; this.getDestCid = false ;
    this.getGlobalTypes = false ;
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
    this.getUUidInfo = (this.needUUidInfo.indexOf(this.selectedAction) > -1)
    if (this.selectedAction === 'handleUserActions') this.getUserActions()
  }

  /** ****************************************************************************
   * When CID is changed, get globals. If not chgd, globals are good
   ***************************************************************************** */
  onChgCid() {
    console.log('onChgCid new cid: %s  saved cid: %s', this.sourceCid, this.savedCid)
    if (this.sourceCid && this.sourceCid !== this.savedCid) {
      this.haveGlobals = false ;
      this.fireSvc.getAllGlobals(this.sourceCid, this.sourceDbPrefix).subscribe({
        next: (globalRef) => {
          this.globals = globalRef ;
          console.log('# of globals: %d', this.globals.length)
          this.processGVals()
          this.haveGlobals = true ;
        }, error: (error) => {
          console.warn('Failed to get globals, error: ', error) ;
        }
      })
      this.savedCid = this.sourceCid ;  this.savedDbP = this.sourceDbPrefix
    }
  }

  processGVals() {
    this.tranTypes.splice(0, this.tranTypes.length) ; // Clear arrays
    this.fullHouses.splice(0, this.fullHouses.length) ;
    this.accountTypes.splice(0, this.accountTypes.length) ;
    this.accounts.splice(0, this.accounts.length) ;
    this.descripTaxcat.splice(0, this.descripTaxcat.length) ;
    this.descripCategories.splice(0, this.descripCategories.length) ;
    this.taxCats.splice(0, this.taxCats.length) ;
    this.ruleAdmin.splice(0, this.ruleAdmin.length) ;
    const ruleAdmin: RuleData[] = [] ;
    const descripTaxcats: KeyVal[] = [] ;
    const descripCategories: KeyVal[] = [] ;
    const tranTypes: string[] = [] ;    const accountTypes: string[] = [] ;
    const fullHouses: House[] = [] ;
    const accounts: KeyVal[] = [] ;     const taxCats: KeyVal[] = [] ;
    let tmpHouse: any ;  let houseInfo: House ;
    let tmpRD: any ;   let ruleO : RuleData ;
    for (const inGlobal of this.globals) {
      switch(inGlobal.RKey) {
        case(this.fireSvc.globalTypes['TranType']): tranTypes.push(inGlobal.RVal) ; break ;
        case(this.fireSvc.globalTypes['Houses']):
          tmpHouse = inGlobal.RVal ;   houseInfo = tmpHouse ;
          fullHouses.push(houseInfo) ;     break ;
        case(this.fireSvc.globalTypes['AccountType']):  accountTypes.push(inGlobal.RVal) ; break ;
        case(this.fireSvc.globalTypes['Accounts']):   accounts.push(this.getKV(inGlobal.RVal)) ; break ;
        case(this.fireSvc.globalTypes['CategoryTaxcats']):
          descripTaxcats.push(this.getKV(inGlobal.RVal)) ; break ;
        case(this.fireSvc.globalTypes['TaxCats']):   taxCats.push(this.getKV(inGlobal.RVal)) ; break ;
        case(this.fireSvc.globalTypes['CategoryFolders']):
          descripCategories.push(this.getKV(inGlobal.RVal)) ; break ;
        case(this.fireSvc.globalTypes['RuleData']):
          tmpRD = inGlobal.RVal ;    ruleO = tmpRD ;
          ruleAdmin.push(ruleO) ;    break ;
      }
    }
    this.descripTaxcat = descripTaxcats.sort((a, b) => a.RKey.localeCompare(b.RKey)) ;
    this.descripCategories = descripCategories.sort((a, b) => a.RKey.localeCompare(b.RKey)) ;
    this.tranTypes = tranTypes.sort((a, b) => a.localeCompare(b)) ;
    this.fullHouses = fullHouses.sort((a, b) => a.name.localeCompare(b.name)) ;
    this.accounts = accounts.sort((a, b) => a.RKey.localeCompare(b.RKey)) ;
    this.accountTypes = accountTypes.sort((a, b) => a.localeCompare(b)) ;
    this.taxCats = taxCats.sort((a, b) => a.RKey.localeCompare(b.RKey)) ;
  }

  getKV(inVal: any): KeyVal {
    const tmpKv: KeyVal = inVal ;
    return tmpKv ;
  }

  getUserActions() {
    this.custActions.splice(0)
    this.fireSvc.altCustActions().then(qSnap => {
      qSnap.forEach(urDoc => {
        const uRec = urDoc.data() as UserRec
        uRec.uuid = urDoc.id
        this.custActions.push(uRec)
      })
    })
    console.log('CustActions: %O', this.custActions)
    // this.fireSvc.getAllCustActions().subscribe({
    //   next: (custActs) => {
    //     this.custActions = custActs
    //     console.log('Customer actions: ', this.custActions) ;
    //   }, error: (error) => {
    //     console.warn('Error %s getting userActions', error)
    //   }
    // })
  }

  selectURec() {
    this.uRecSelected = this.custActions.find(ca => ca.uuid === this.lUUid)!
  }

    // Grab globals and pass to actual addUser
  addUserGeneric() {
    this.addUser(this.lUUid, this.destCid, this.destDbPrefix, this.cName, this.lRole,
      this.eMail, this.phone)
  }

  /** ****************************************************************************
   * 1. Add a Users record in firebase database
   * 2. Load initial globals (required and sample)
   * Assumes user did a signup or that admin did it via console.  On user signup,
   * need a separate table w/easy create access (no read and if they click signup,
   * same auth component asks for eMail, pw, and company name and writes email,
   * company name, and uuid to this file.  Maybe I then read the file over here
   * and feed this function based on selecting the row and saying GO.
   ***************************************************************************** */
  // 2do: newCustomer table NOT userRec as action and date are extra
  // Verify this in all interactions w/the table
  addUser(lUUid: string, cid: string, dbPrefix: string, cName: string, role: string,
    eMail: string, phone: string) {
    console.log('luuid %s  lRole: %s  destCid: %s  destDBPref: %s  email: %s',
      lUUid, role, cid, dbPrefix, eMail)
    if (!lUUid)  console.log('If user already added, provide UUID in input')
    else {
      const todayDate = new Date().toISOString().slice(0, 10)
      const userRec: UserRec = new UserRec('add', cid, cName, todayDate, dbPrefix,
        eMail, phone, role, lUUid )
      this.fireSvc.addUsers(cid, dbPrefix, userRec).then(urow => {
        console.log('Successfully added %O', userRec)
        this.statusMsg = 'Successfully added user ' + userRec.uuid
      }).catch(error => {
        console.warn('Error %s adding users row %O', error, userRec)
        this.statusMsg = 'Failed to add user ', userRec.uuid
      })
      this.addGlobals(cid, dbPrefix)
    }
  }

  analyzeCidByTrans() {
    const tCidMap: Map<string, number> = new Map<string, number>()
    this.fireSvc.loadAllTrans(this.sourceDbPrefix).then(qSnap => {
      const docSz = qSnap.size  ; const rptSz = Math.trunc(docSz / 20)
      let curCnt = 0 ;
      qSnap.forEach(urDoc => {
        const tranRec = urDoc.data() as TranRec
        this.add2Map(tranRec.Cid, tCidMap)
        if (curCnt++ % rptSz === 0)  console.log('Processed %d trans out of %d', curCnt, docSz)
        if (curCnt >= docSz)  console.log('TranCidMap: %O', tCidMap)
      })
    })
  }

  analyzeCidDBByUsers() {
    const cidArray: string[] = [] ;  const dbPrefArr: string[] = []
    this.fireSvc.loadAllUsers().then(qSnap => {
      const docSz = qSnap.size  ;  let curCnt = 0 ;
      qSnap.forEach(urDoc => {
        const tUser = urDoc.data() as cUser
        this.add2Arr(tUser.cid, cidArray)
        this.add2Arr(tUser.dbPrefix, dbPrefArr)
        if (curCnt++ % 10 === 0)  console.log('%d of %d users done', curCnt, docSz)
        if (curCnt >= docSz)  console.log('User Cid Array: %O  DBPref Array: %O', cidArray, dbPrefArr)
      })
    })
  }

  add2Map(mKey: string, tMap: Map<string, number>) {
    if (tMap.has(mKey)) {
      let tNum = tMap.get(mKey)!
      tMap.set(mKey, ++tNum)
    } else  tMap.set(mKey, 1)
  }

  add2Arr(mKey: string, sArr: string[]) {
    if (sArr.findIndex(sa => sa === mKey) < 0)  sArr.push(mKey)
  }

  addName2Rules() {
    this.fireSvc.getGlobalType(this.sourceCid, this.sourceDbPrefix, 'ruleData').subscribe({
      next: (cRule) => {
        const rules: Globals[] = cRule ;
        let curCnt = 0 ;  const ruleSz = rules.length ;  const dispSz = Math.trunc(ruleSz / 10)
        console.log('Got %d rules', ruleSz)
        for (const inGlobal of rules) {
          const tmpRD: any = inGlobal.RVal ;   const rule0 : RuleData = tmpRD
          if (!rule0.ruleName)  rule0.ruleName = (rule0.srchStr) ?
            rule0.srchStr : 'SrchAmt '+rule0.srchAmt.toString()
          const globObj = { 'RVal.ruleName': rule0.ruleName }
          this.fireSvc.updtGlobFld(this.sourceDbPrefix, inGlobal.GlobalId!, globObj).then(() => {
            if (curCnt++ % dispSz === 0)  console.log('Finished %d rules of %d', curCnt, rules.length)
            if (curCnt >= ruleSz) console.log('Completed processing rules')
          }).catch(err => {
            console.log('Err %s updating rule: %O', err, inGlobal)
          })
        }
      }, error: (error) => {
        console.warn('Err %s retrieving rules for cid %s dbpref %s',
          error, this.sourceCid, this.sourceDbPrefix)
      }
    })
  }

  addGlobals(cid: string, dbPref: string) {
    let globData ;
    globData = require('apps/credbutils/src/data/globalBase.json') ;
    const globList: Globals[] = globData ;    globData = null ;   // Format & rmv orig
    let isrtCnt = 0 ;  const globCnt = globList.length
    for (const curGlob of globList) {
      const globMulti = (curGlob.RKey === this.fireSvc.globalTypes.TranType ||
        curGlob.RKey === this.fireSvc.globalTypes.AccountType) ? false : true
      if (globMulti) {
        this.fireSvc.addGlobalMultFld(cid, dbPref, curGlob.RKey, curGlob.RVal).
          then(() => {
            if (isrtCnt++ % 20 === 0) console.log('Inserted %d of %d', isrtCnt, globCnt)
            if (isrtCnt >= globCnt)  this.statusMsg = 'Added all globals for user'
        }).catch(error => {
          console.warn('Error %O adding multiFld global %O', error, curGlob)
        })
      } else {
        this.fireSvc.addGlobal(cid, dbPref, curGlob).then(() => {
          if (isrtCnt++ % 20 === 0) console.log('Inserted %d of %d', isrtCnt, globCnt)
          if (isrtCnt >= globCnt)  this.statusMsg = 'Added all globals for user'
        }).catch(error => {
          console.warn('Error %O adding singleFld global %O', error, curGlob)
        })
      }
    }
  }

  /** ****************************************************************************
   * Hard remove a user and remove all data tied to their cid
   ***************************************************************************** */
  removeUser() {
    console.log('rmvUser luuid %s  lRole: %s  srceCid: %s  srceDBPref: %s',
      this.lUUid, this.lRole, this.sourceCid, this.sourceDbPrefix)
    let userRec: UserRec
    this.fireSvc.getUser(this.lUUid).then(userRow => {
      userRec = userRow.data() as UserRec
      console.log('userRec: %O', userRec)
      this.fireSvc.delUser(this.lUUid).then(() => {
        console.log('Deleted userRec: %O', userRec)
      }).catch(error => {
        console.warn('Error %s deleting user row: %O', error, userRec)
      })
      this.clearGlobals(userRec.cid, userRec.dbPrefix)
      this.clearProjects(userRec.cid, userRec.dbPrefix, '2015-01-01', '2035-12-31')
      this.clearRecons(userRec.cid, userRec.dbPrefix, '2015-01-01', '2035-12-31')
      this.clearTrans(userRec.cid, userRec.dbPrefix, '2015-01-01', '2035-12-31')
    }).catch(error => {
      console.log('Error %s deleting row for uid: %s', error, this.lUUid)
    })
  }

  sendPasswordResetEMail() {
    console.log('pwResetEMail luuid %s  lRole: %s  srceCid: %s  srceDBPref: %s',
      this.lUUid, this.lRole, this.sourceCid, this.sourceDbPrefix)
  }

  // Use urecselected to drive addUser then null urecsselected and confirm/delete newCust row
  handleUserActions() {
    console.log('urecSelected: ', this.uRecSelected)
    this.addUser(this.uRecSelected.uuid!, this.uRecSelected.cid, this.uRecSelected.dbPrefix,
      this.uRecSelected.cName, this.uRecSelected.role, this.uRecSelected.eMail,
      this.uRecSelected.phone)
    if (confirm('Ready to remove action row from collection?')) {
      this.fireSvc.delCustActions(this.uRecSelected.uuid!).then(() => {
        console.log('Deleted row from calling table for uid: ', this.uRecSelected.uuid)
      }).catch(error => {
        console.log('Error %s deleting newCustomer row for uid: %s', error, this.uRecSelected.uuid)
      })
    } else {
      console.log('Left newCustomer row for uid %s in place', this.uRecSelected.uuid)
    }
  }

  fixNameInGlobals() {
    const gtp1 = 'descripTaxcats'
    this.fireSvc.getGlobalType(this.sourceCid, this.sourceDbPrefix, gtp1).subscribe({
      next: (descripTaxcat) => {
        const dtc: Globals[] = descripTaxcat ;
        console.log('Got %d %s', dtc.length, gtp1)
        const globObj = { RKey: 'categoryTaxcat' }
        let dtcCnt = 0 ;
        for (const dt of dtc) {
          this.fireSvc.updtGlobFld(this.sourceDbPrefix, dt.GlobalId!, globObj).then(() => {
            if (dtcCnt++ % 50 === 0)  console.log('Finished %d %s', dtcCnt, gtp1)
          }).catch(err => {
            console.log('Err %s updating %s: %O', err, gtp1, dt)
          })
        }
      }, error: (error) => {
        console.warn('Err %s retrieving globs for cid %s dbpref %s RKey %s',
          error, this.sourceCid, this.sourceDbPrefix, gtp1)
      }
    })
    const gtp2 = 'descripCategories'
    this.fireSvc.getGlobalType(this.sourceCid, this.sourceDbPrefix, gtp2).subscribe({
      next: (descripCat) => {
        const dcat: Globals[] = descripCat ;
        console.log('Got %d %s', dcat.length, gtp2)
        const globObj = { RKey: 'categoryFolders' }
        let dcatCnt = 0 ;
        for (const dc of dcat) {
          this.fireSvc.updtGlobFld(this.sourceDbPrefix, dc.GlobalId!, globObj).then(() => {
            if (dcatCnt++ % 50 === 0)  console.log('Finished %d %s', dcatCnt, gtp2)
          }).catch(err => {
            console.log('Err %s updating %s: %O', err, gtp2, dc)
          })
        }
      }, error: (error) => {
        console.warn('Err %s retrieving globs for cid %s dbpref %s RKey %s',
          error, this.sourceCid, this.sourceDbPrefix, gtp2)
      }
    })
    const gtp3 = 'ruleData'
    this.fireSvc.getGlobalType(this.sourceCid, this.sourceDbPrefix, gtp3).subscribe({
      next: (ruleData) => {
        const ruled: Globals[] = ruleData ;
        console.log('Got %d %s', ruled.length, gtp3)
        let ruleCnt = 0 ;
        for (const rd of ruled) {
          const rdAny: any = rd.RVal ;
          const rdRud: RuleData = rdAny
          if (rdRud.Category) {
            const globObj = { 'RVal.Description': deleteField(), 'RVal.Category': rdRud.Category }
            this.fireSvc.updtGlobFld(this.sourceDbPrefix, rd.GlobalId!, globObj).then(() => {
              if (ruleCnt++ % 50 === 0)  console.log('Finished %d %s', ruleCnt, gtp3)
            }).catch(err => {
              console.log('Err %s updating %s: %O', err, gtp3, rdRud)
            })
          }
        }
      }, error: (error) => {
        console.warn('Err %s retrieving globs for cid %s dbpref %s RKey %s',
          error, this.sourceCid, this.sourceDbPrefix, gtp3)
      }
    })
  }

  /** ****************************************************************************
   * Add reconciliations to the DB, and populate the XRef array from old ID to new
   ***************************************************************************** */
  getReconciliations() {
    this.fireSvc.getAllReconciliations(this.sourceCid, this.sourceDbPrefix).subscribe({
      next: (reconRef) => {
        this.reconciliations = reconRef ;
        console.log('# of reconciiiations: %d', this.reconciliations.length) ;
        let reconCnt = 0 ;
        for (let i = 0; i < this.reconciliations.length; i++) {
          if (this.reconciliations[i].ReconKey) {
            this.reconIdXref.push(new KeyVal(this.reconciliations[i].ReconKey!, '')) ;
            this.fireSvc.addReconciliations(this.destCid, this.destDbPrefix, this.reconciliations[i]).
              then(dbRef => {
                this.reconIdXref[i].RVal = dbRef.id ;
                if (reconCnt++ % 20 === 0) console.log('Added %d recons', reconCnt)
              }).catch(error => {
                console.warn('Error adding reconciliation: ', this.reconciliations[i],
                  ' Err: ', error)
              })
          } else {
            console.warn('Failed to get id from recon Row: ', this.reconciliations[i])
          }
        }
        console.dir(this.reconIdXref)
        this.getGlobals() ;
      }, error: (error) => {
        console.warn('Failed to retrieve recons for cid %s  dbPrefix %s  error: %s',
          this.sourceCid, this.sourceDbPrefix, error)
      }
    })
  }

  /** ****************************************************************************
   * Retrieve globals from source DB and populate the destination DB
   ***************************************************************************** */
  getGlobals() {
    console.log('Called into get globals')
    if (!this.haveGlobals) {    // Wait 10 seconds and try it or fail
      setTimeout(() => {
        if (!this.haveGlobals) console.log('Did not get globals') ;
        else this.procGetGlobals() ;
      }, 10000);  // Wait 10 seconds and go
    } else this.procGetGlobals() ;
  }

  procGetGlobals() {
    let globalCnt = 0 ;
    console.log('# of globals: %d', this.globals.length)
    for (let i = 0; i < this.globals.length; i++) {
      if (this.globals[i].GlobalId) {
        this.fireSvc.addGlobal(this.destCid, this.destDbPrefix, this.globals[i]).
          then(() => {
            if (globalCnt++ % 40 === 0) console.log('Added %d globals', globalCnt) ;
          }).catch(error => {
            console.warn('Error adding globalRow: ', this.globals[i], ' Err: ', error)
          })
      } else {
        console.warn('Did not get globalId from global row: ', this.globals[i])
      }
    }
    this.getTrans() ;
  }

  /** ****************************************************************************
   * Retrieve all trans from source, use XRefs to populate keys appropriately
   ***************************************************************************** */
  getTrans() {
    console.log('Called into get trans')
    let transCnt = 0 ;
    this.fireSvc.getAllTrans(this.sourceCid, this.sourceDbPrefix).subscribe({
      next: (tranRef) => {
        this.transactions = tranRef ;
        console.log('Got %d transactions', this.transactions.length)
        for (const curTran of this.transactions) {
          if (curTran.Project !== '') {
            curTran.Project = this.getNewIdx(curTran.Project, this.projectIdXref, 'Project') ;
          }
          if (curTran.ReconKey !== '') {
            curTran.ReconKey = this.getNewIdx(curTran.ReconKey, this.reconIdXref, 'Recon') ;
          }
          this.fireSvc.addTrans(this.destCid, this.destDbPrefix, curTran).
            then(() => {
              if (transCnt++ % 50 === 0) console.log('Added %d trans', transCnt)
            }).catch(error => {
              console.warn('Error adding tran: ', curTran, ' Error: ', error) ;
            })
        }
      }, error: (error) => {
        console.warn('Error retrieving trans from cid %s  dbprefix %s', this.sourceCid, this.sourceDbPrefix)
        console.warn('Error: ', error) ;
      }
    })
  }

  /** ****************************************************************************
   * Remove a DB (CID) from the data base
   * Always save to json for restoration if needed
   ***************************************************************************** */
  removeDB() {
    console.log('Doing remove of prefix %s  cid %s', this.sourceDbPrefix, this.sourceCid)
    this.clearProjects()
    this.clearGlobals()
    this.clearRecons()
    this.clearTrans()
  }

  /** ****************************************************************************
   * Retrieve all globals and print them to console
   ***************************************************************************** */
  listGlobals() {
    if (!this.haveGlobals) {    // Wait 10 seconds and try it or fail
      setTimeout(() => {
        if (!this.haveGlobals) console.log('Did not get globals') ;
        else console.dir(this.globals) ;
      }, 10000);    // Wait 10 seconds and go
    } else console.dir(this.globals)
  }

  /** ****************************************************************************
   * Retrieve all trans, projects, and recons and print them to console
   *  Filters can be applied to tran list
   ***************************************************************************** */
  listTrans() {
    this.fireSvc.getTransForDateRange(this.sourceCid, this.sourceDbPrefix, this.startDt,
      this.endDt, []).subscribe({
      next: (tranRef) => {
        this.transactions = tranRef ;
        const filtTrans = this.filterTrans(this.transactions)
        console.dir(filtTrans) ;
      }, error: (error) => {
        console.warn('Failed to get trans w/err: ', error) ;
      }
    })
    this.fireSvc.getProjectsForDateRange(this.sourceCid, this.sourceDbPrefix, this.startDt,
      this.endDt).subscribe({
      next: (projRec) => {
        this.projects = projRec ;
        console.dir(this.projects) ;
      }, error: (error) => {
        console.warn('Failed to get projects w/err:', error) ;
      }
    })
    this.fireSvc.getReconciliationsForDateRange(this.sourceCid, this.sourceDbPrefix,
      this.startDt, this.endDt, []).subscribe({
      next: (reconRec) => {
        this.reconciliations = reconRec ;
        console.dir(this.reconciliations) ;
      }, error: (error) => {
        console.warn('Failed to get reconciliations w/err:', error) ;
      }
    })
  }

  filterTrans(inTrans: TranRec[]): TranRec[] {
    const origLen = inTrans.length
    const filtTrans = inTrans.filter(cTran => {
      if (this.tfAcct && cTran.Account !== this.tfAcct) return false ;
      if (this.tfDesc && cTran.Category !== this.tfDesc) return false ;
      if (this.tfTranType && cTran.TranType !== this.tfTranType) return false ;
      if (this.tfHouse && cTran.House !== this.tfHouse) return false ;
      if (this.tfTaxCat && cTran.TaxCat !== this.tfTaxCat) return false ;
      return true ;
    })
    console.log('Filtered %d trans down to %d', origLen, filtTrans.length)
    return filtTrans ;
  }

  /** ****************************************************************************
   * Clone globals from one DB to another
   ***************************************************************************** */
  cloneGlobals() {
    const globSub = this.fireSvc.getAllGlobals(this.sourceCid, this.sourceDbPrefix).
      subscribe(dbRef => {
        this.globals = dbRef ;
        let rowCnt = 0 ;
        for (const globRow of this.globals) {
          let cloneRow = true ;
               // First find out if we are interested at all
          if (Object.values(this.fireSvc.globalTypes).indexOf(globRow.RKey) > -1) {
            cloneRow = true ;
            if (cloneRow) {
              this.fireSvc.addGlobal(this.destCid, this.destDbPrefix, globRow).
                then(() => {
                  console.debug('Successfully added global row') ;
                  if (rowCnt++ % 40 === 0) console.log('Added %d globals', rowCnt)
                }).catch(error => {
                  console.warn('Error inserting global row: ', error, ' Row: ', globRow)
                })
            }
          }
        }
      })
    setTimeout(() => {    // Wait 5 seconds, then clear subscription
      globSub.unsubscribe() ;
    }, 5000);
  }

  /** ****************************************************************************
   * Remove all globals for a DB
   ***************************************************************************** */
  clearGlobals(cid?: string, dbPref?: string) {
    if (!cid) cid = this.sourceCid ;  if (!dbPref) dbPref = this.sourceDbPrefix
    const globSub = this.fireSvc.getAllGlobals(cid, dbPref).
      subscribe(dbRef => {
        this.globals = dbRef ;
        setTimeout(() => {
          this.writeGenericJson(this.globals, 'globals.'+cid+'.json') // Save to json file first
        }, 10);
        let globCnt = 0 ;  const globLen = this.globals.length
        for (const globRow of this.globals) {
          this.fireSvc.delGlobals(cid!, dbPref!, globRow).then(() => {
              if (globCnt++ % 50 === 0)  console.log('Deleted %d globals', globCnt);
              if (globCnt >= globLen) console.log('Deleted all %d globals', globCnt)
            }).catch(error => {
              console.warn('Error %s deleting global %O: ', error, globRow) ;
            })
        }
      })
    setTimeout(() => {    // Wait 5 seconds, then clear subscription
      globSub.unsubscribe() ;
    }, 5000);
  }

  /** ****************************************************************************
   * Remove trans for a date range
   ***************************************************************************** */
  clearTrans(cid?: string, dbPref?: string, startDt?: string, endDt?: string) {
    if (!cid) cid = this.sourceCid ;  if (!dbPref)  dbPref = this.sourceDbPrefix
    if (!startDt) startDt = this.startDt ;  if (!endDt) endDt = this.endDt
    console.log('Called into clearTrans')
    this.fireSvc.getTransForDateRange(cid, dbPref, startDt, endDt, []).subscribe({
      next: (tranRef) => {
        this.transactions = tranRef ;
        setTimeout(() => {
          this.writeGenericJson(this.transactions, 'transactions.'+cid+'.json') // Save to json file first
        }, 10);
        let tranCnt = 0 ;  const tranLen = this.transactions.length
        const filtTrans = this.filterTrans(this.transactions)
        for (const curTran of filtTrans) {
          this.fireSvc.delTrans(cid!, dbPref!, curTran).
            then(() => {
              if (tranCnt++ % 50 === 0) console.log('Deleted %d trans', tranCnt)
              if (tranCnt >= tranLen) console.log('Deleted all %d trans', tranCnt)
            }).catch(error => {
              console.warn('Error %s deleting Tran: %O ', error, curTran) ;
            })
        }
      }, error: (error) => {
        console.warn('Error %s retrieving trans from cid %s  dbprefix %s', error, cid, dbPref)
      }
    })
  }

  /** ****************************************************************************
   * Remove projects for a date range ... Does not clear trans with these projects
   ***************************************************************************** */
  clearProjects(cid?: string, dbPref?: string, startDt?: string, endDt?: string) {
    if (!cid) cid = this.sourceCid ;  if (!dbPref)  dbPref = this.sourceDbPrefix
    if (!startDt) startDt = this.startDt ;  if (!endDt) endDt = this.endDt
    console.log('dbProj w/cid: %s  dbp: %s  sDt: %s  eDt: %s', cid, dbPref, startDt, endDt)
    this.fireSvc.getProjectsForDateRange(cid, dbPref, startDt, endDt).subscribe({
      next: (projRef) => {
        this.projects = projRef ;
        setTimeout(() => {
          this.writeGenericJson(this.projects, 'projects.'+cid+'.json') // Save to json file first
        }, 10);
        let projCnt = 0 ;  const projLen = this.projects.length
        console.log('Got %d projects', projLen)
        for (const curProj of this.projects) {
          this.fireSvc.delProjects(cid!, dbPref!, curProj).
            then(() => {
              if (projCnt++ % 40 === 0) console.log('Deleted %d projects', projCnt)
              if (projCnt >= projLen) console.log('Deleted all %d projects', projCnt)
            }).catch(error => {
              console.warn('Error %s deleting Proj: %O ', error, curProj) ;
            })
        }
      }, error: (error) => {
        console.warn('Error %s retrieving projects from cid %s  dbprefix %s', error, cid, dbPref)
      }
    })
  }

  /** ****************************************************************************
   * Remove all reconciliations for a date range  Does NOT unreconcile trans with these reconciliations
   ***************************************************************************** */
  clearRecons(cid?: string, dbPref?: string, startDt?: string, endDt?: string) {
    if (!cid) cid = this.sourceCid ;  if (!dbPref)  dbPref = this.sourceDbPrefix
    if (!startDt) startDt = this.startDt ;  if (!endDt) endDt = this.endDt
    console.log('Called into clearRecons')
    this.fireSvc.getReconciliationsForDateRange(cid, dbPref, startDt, endDt, []).subscribe({
      next: (reconRef) => {
        this.reconciliations = reconRef ;
        setTimeout(() => {
          this.writeGenericJson(this.reconciliations, 'recons.'+cid+'.json') // Save to json file first
        }, 10);
        let reconCnt = 0 ; const reconLen = this.reconciliations.length
        console.log('Got %d reconciliations', reconLen)
        for (const curRecon of this.reconciliations) {
          this.fireSvc.delRecons(cid!, dbPref!, curRecon).
            then(() => {
              if (reconCnt++ % 20 === 0) console.log('Deleted %d recons', reconCnt)
              if (reconCnt >= reconLen) console.log('Deleted all %d recons', reconCnt)
            }).catch(error => {
              console.warn('Error %s deleting Recon: ', error, curRecon) ;
            })
        }
      }, error: (error) => {
        console.warn('Error %s retrieving recons from cid %s  dbprefix %s', error, cid, dbPref)
      }
    })
  }

  /** ****************************************************************************
   * Remove all globals of a particular type
   ***************************************************************************** */
  rmvGlobalByType() {
    let rmvCnt = 0 ;
    console.log('rmvGlobByType Selected globals: ', this.selectedGlobalTypes)
    for (const globType of this.selectedGlobalTypes) {
      this.fireSvc.getGlobalType(this.sourceCid, this.sourceDbPrefix, globType).subscribe({
        next: (globRef) => {
          const locGlobs: Globals[] = globRef ;
          console.log(globType, ': ', locGlobs) ;
          for (const curGlobal of locGlobs) {
            this.fireSvc.delGlobals(this.sourceCid, this.sourceDbPrefix, curGlobal).
              then(() => {
                if (rmvCnt++ % 40 === 0) console.log('Removed %d globals, curTp: %s',
                  rmvCnt, globType)
              }).catch((error) => {
                console.warn('Err rmving global single row: ', curGlobal, ' Err: ', error) ;
              })
            }
          }, error: (error) => {
            console.warn('Error getting ', globType, ' Globals: ', error)
          }
      })
    }
  }

  /** ****************************************************************************
   * Add globals of a particular type from the appropriate json file
   ***************************************************************************** */
  addGlobalByType() {
    let addCnt = 0 ;
    console.log('addGlobByType Selected globals: ', this.selectedGlobalTypes)
    for (const globType of this.selectedGlobalTypes) {
      // const reqName = '../../../assets/json/globals.' + globType + '.json';
      let reqFile ;   // They don't want a var in require ... so had to do it this way
      switch (globType) {
        case 'accounts':
          reqFile = require('../../../assets/json/globals.accounts.json') ; break ;
        case 'accountType':
          reqFile = require('../../../assets/json/globals.accountType.json') ; break ;
        case 'descripCategories':
          reqFile = require('../../../assets/json/globals.descripCategories.json') ; break ;
        case 'descripTaxcats':
          reqFile = require('../../../assets/json/globals.descripTaxcats.json') ; break ;
        case 'houses':
          reqFile = require('../../../assets/json/globals.houses.json') ; break ;
        case 'ruleData':
          reqFile = require('../../../assets/json/globals.ruleData.json') ; break ;
        case 'taxCats':
          reqFile = require('../../../assets/json/globals.taxCats.json') ; break ;
        case 'tranType':
          reqFile = require('../../../assets/json/globals.tranType.json') ; break ;
        default:
          console.warn('Invalid global type: ', globType)
      }
      // let reqFile = require(reqFile) ;
      const globList: Globals[] = reqFile ;
      const globMulti = (globType === this.fireSvc.globalTypes.TranType ||
        globType === this.fireSvc.globalTypes.AccountType) ? false : true
      console.log(globList) ;
      for (const curGlobal of globList) {
        if (curGlobal.Cid != this.sourceCid) { curGlobal.Cid = this.sourceCid ; }
        if (!globMulti) {
          this.fireSvc.addGlobal(this.sourceCid, this.sourceDbPrefix, curGlobal).
            then(() => {
              if (addCnt++ % 40 === 0) console.log('Added %d single globals', addCnt)
            }).catch((error) => {
              console.warn('Err adding global single row: ', curGlobal, ' Err: ', error) ;
            })
        } else {    // object value of RVal
          this.fireSvc.addGlobalMultFld(this.sourceCid, this.sourceDbPrefix,
            curGlobal.RKey, curGlobal.RVal).then(() => {
              if (addCnt++ % 40 === 0) console.log('Added %d multi globals', addCnt)
          }).catch((error) => {
            console.warn('Err adding multi row: ', curGlobal, ' Err: ', error) ;
          })
        }
      }
    }
  }

  /** ****************************************************************************
   * Deprecated ... add a json file of trans, use loadTranProjRecon
   ***************************************************************************** */
  addTestTrans() {
    console.log('addTestTrans')
    let reqFile ;
    reqFile = require('../../../assets/json/pnlTrans.json') ;
    const tranList: TranRec[] = reqFile ;
    this.addTranList(tranList, 'pnlTrans') ;
  }

  /** ****************************************************************************
   * Part of addTestTrans to iterate thru list and add all trans to DB
   ***************************************************************************** */
  addTranList(tranRecs: TranRec[], tranLabel: string) {
    let addCnt = 0
    for (const curTran of tranRecs) {
      if (curTran.Cid != this.destCid) curTran.Cid = this.destCid ;
      this.fireSvc.addTrans(this.destCid, this.destDbPrefix, curTran).
        then(() => {
          if (addCnt++ % 10 === 0)  console.log('%s Loaded %d trans so far', tranLabel, addCnt)
        }).catch((error) => {
          console.warn('Err adding tran: ', curTran, ' Err: ', error) ;
        })
    }
  }

  /** ****************************************************************************
   * Load all trans, projects, and recons from JSON files including resolving all
   * XRef key stuff (tran project, tranRecon, childTran splitParent)
   ***************************************************************************** */
  loadTranProjRecon() {
    const projIdXRef: KeyVal[] = [] ;  const reconIdXRef: KeyVal[] = [] ;
    let projData ;
    projData = require('../../../data/projDump.json')
    const projList: Project[] = projData ;    projData = null ;   // Format & rmv orig
    const projLen = projList.length ; let projAdded = 0 ;
    if (projLen < 1) this.isProjComplete = true ;
    else {
      console.log('Got %d projects from file', projLen)
      for (const curProj of projList) {
        projIdXRef.push(new KeyVal(curProj.ProjectId!, ''))
        this.fireSvc.addProjects(this.destCid, this.destDbPrefix, curProj).
          then(dbRef => {
            projIdXRef[projIdXRef.length-1].RVal = dbRef.id ;
            if (projAdded++ % 20 === 0) console.log('Added %d projects', projAdded)
            if (projAdded >= projLen) {
              this.isProjComplete = true ;
              console.log('Added all %d projects', projAdded)
            }
          }).catch(error => {
            console.warn('Failed to insert project: ', curProj, ' Err: ', error)
          })
      }
    }
    let reconData ;
    reconData = require('../../../data/reconDump.json') ;
    const reconList: Reconciliation[] = reconData ;   reconData = null ;
    const reconLen = reconList.length ;  let reconAdded = 0 ;
    if (reconLen < 1)  this.isReconComplete = true ;
    else {
      console.log('Got %d recons from file', reconLen)
      for (const curRecon of reconList) {
        reconIdXRef.push(new KeyVal(curRecon.ReconKey!, '')) ;
        this.fireSvc.addReconciliations(this.destCid, this.destDbPrefix, curRecon).
          then(reconRef => {
            reconIdXRef[reconIdXRef.length-1].RVal = reconRef.id ;
            if (reconAdded++ % 10 === 0) console.log('Added %d recons', reconAdded)
            if (++reconAdded >= reconLen) {
              this.isReconComplete = true ;
              console.log('Added all %d recons', reconAdded)
            }
          }).catch(reconErr => {
            console.warn('Error adding reconciliation: ', curRecon, ' Err: ', reconErr)
          })
      }
    }
    const timeoutVals = [ 400, 1000, 3000, 5000, 10000, 30000, 60000 ]
    this.check2LoadTrans(0, timeoutVals, projList, reconList, projIdXRef, reconIdXRef) ;
  }

  /** ****************************************************************************
   * Determine if loads of projects and recons are complete so we can load trans
   * and properly deRef the proj and recon keys
   ***************************************************************************** */
  check2LoadTrans(idx: number, delayArr: number[], projList: Project[],
    reconList: Reconciliation[], projIdXRef: KeyVal[], reconIdXRef: KeyVal[]) {
    setTimeout(() => {
      console.log('load intvl: %d  projCmplt: %s  reconCmplt: %s',
        delayArr[idx], this.isProjComplete, this.isReconComplete)
      if (this.isProjComplete && this.isReconComplete) {
        console.log('projXRef: ', projIdXRef, ' ReconXRef: ', reconIdXRef)
        projList.splice(0, projList.length) ;   reconList.splice(0, reconList.length) ; // clear arrays
        this.loadTrans(this.destCid, this.destDbPrefix, projIdXRef, reconIdXRef)
      } else {
        if (++idx < delayArr.length)
          this.check2LoadTrans(idx, delayArr, projList, reconList, projIdXRef, reconIdXRef)
      }
    }, delayArr[idx])
  }

  /** ****************************************************************************
   * Load all trans from json file handling all Deref from projects, recons, and
   * parents of split/child trans
   ***************************************************************************** */
  loadTrans(cid: string, dbPref: string, projXRef: KeyVal[], reconXRef: KeyVal[]) {
    const parentXRef: KeyVal[] = [] ;
    let tranData ;
    tranData = require('../../../data/tranDump.json') ;
    const tranList: TranRec[] = tranData ;    tranData = null
    const parentList = tranList.filter(CTran => CTran.TranType === 'TPARENT')
    const childList = tranList.filter(CTran => CTran.SplitParent)
    const otherList = tranList.filter(cTran => cTran.TranType !== 'TPARENT' && !cTran.SplitParent)
    console.log('TranList Len: %d  parentLen: %d  childLen: %d  otherLen: %d',
      tranList.length, parentList.length, childList.length, otherList.length)
    if (tranList.length < 150)  console.log('Parents: %O  Children: %O  Other: %O',
      parentList, childList, otherList) ;
    this.processTrans(cid, dbPref, parentList, projXRef, reconXRef, parentXRef, 'Parent')
    this.processTrans(cid, dbPref, otherList, projXRef, reconXRef, parentXRef, 'Single')
    setTimeout(() => {  // Give a few seconds to be sure parents done and xref set up
      this.processTrans(cid, dbPref, childList, projXRef, reconXRef, parentXRef, 'Child') ;
    }, 10000);
  }

  /** ****************************************************************************
   * RePopulate foreign keys for recon and project and load tran records into firestore
   * Separated and delayed so parents can be inserted and keyed so children have what they need
   ***************************************************************************** */
  processTrans(cid: string, dbPref: string, cTrans: TranRec[], projXRef: KeyVal[],
    reconXRef: KeyVal[], parentXRef: KeyVal[], rowType: string) {
    let tranAdded = 0 ;  const tranLen = cTrans.length ;
    const ckProj = projXRef.length > 0 ;  const ckRecon = reconXRef.length > 0 ;
    for (const curTran of cTrans) {
      const oldTid = curTran.TranId!   // Inside loop so should be OK wrt async
      curTran.Cid = cid
      if (ckProj) curTran.Project = this.getNewIdx(curTran.Project, projXRef, 'Project')
      if (ckRecon) curTran.ReconKey = this.getNewIdx(curTran.ReconKey, reconXRef, 'Reconciliation')
      if (curTran.SplitParent)
        curTran.SplitParent = this.getNewIdx(curTran.SplitParent, parentXRef, 'Parent')
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

  /** ****************************************************************************
   * Retrieve the info from an Xref to replace old TranId with new
   ***************************************************************************** */
  getNewIdx(srceIdx: string, xref: KeyVal[], label: string): string {
    if (srceIdx === '') return '' ;
    const eIdx = xref.findIndex((idx) => idx.RKey === srceIdx)
    if (eIdx < 0) {
      console.warn('%s key %s not found xref len: %d', label, srceIdx, xref.length)
      console.dir(xref) ;
      return '' ;
    } else {
      return xref[eIdx].RVal
    }
  }

  cre8SqlDDL() {    // Going with existing keys so no xref work needed
    console.log('Into cre8SqlDDL')
    let tranData ;
    tranData = require('../../../data/tranDump.json') ;
    const tranList: TranRec[] = tranData ;    tranData = null
    this.writeGenericDDL(tranList, 'transactions.ddl', 'transactions', 50)

    let reconData ;
    reconData = require('../../../data/reconDump.json') ;
    const reconList: Reconciliation[] = reconData ;   reconData = null ;
    if (reconList.length > 0)
      this.writeGenericDDL(reconList, 'reconcile.ddl', 'reconciliations', 40)

    let projData ;
    projData = require('../../../data/projDump.json') ;
    const projList: Project[] = projData ;    projData = null ;   // Format & rmv orig
    if (projList.length > 0)
      this.writeGenericDDL(projList, 'project.ddl', 'projects', 50)
  }

  writeGenericJson(inArr: any[], fName: string) {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(inArr))
    this.writeFile(dataStr, fName)
  }

  writeGenericDDL(inArr: any[], fName: string, tblName: string, numRows: number) {
    console.log('Into writeGenericDDL arrLen: %d  fName: %s  tblNm: %s  numRow: %d',
      inArr.length, fName, tblName, numRows)
    let outDDL = this.jsonArr2DDLStr(inArr, tblName, numRows) ;
    outDDL = outDDL.replace(/#/g, 'lb;')
    outDDL = outDDL.replace(/&/g, 'amp;')
    console.log('outddl len: ', outDDL.length)

    const encodedUri = encodeURI("data:text/plain;charset=utf-8," + outDDL) ;
    // window.open(encodedUri);
    this.writeFile(encodedUri, fName) ;
  }

  writeFile(encodedData: string, fileName: string) {
    console.log('into writeFile w/fname: ', fileName)
    const dlAnchor = document.createElement('a')
    dlAnchor.setAttribute("href", encodedData)
    dlAnchor.setAttribute("download", fileName)
    document.body.appendChild(dlAnchor)
    dlAnchor.click()
    dlAnchor.remove()
  }

  jsonArr2DDLStr(inArr: any[], tblName: string, isrtNum: number): string {
    console.log('into jsonArr2DDLStr w/arr[0] %O  tblNm: %s  isrtNum: %d',
      inArr[0], tblName, isrtNum)
    let outStr = '' ;
    const fldNames: string[] = Object.keys(inArr[0])
    const sortNames = fldNames.sort((a, b) =>  a.localeCompare(b))
    outStr += this.writeHeader(sortNames, tblName)
    console.log('inarr len: ', inArr.length)
    let rowCnt = 0 ;
    let lcma = ''   // Start line with a comma?
    for (const anyObj of inArr) {
      outStr += this.writeLine(sortNames, anyObj, lcma) ; lcma = ','
      if (rowCnt++ > isrtNum) {
        outStr += '; \r\n' + this.writeHeader(sortNames, tblName)
        rowCnt = 0 ;  lcma = ''
      }
    }
    return outStr ;
  }

  writeHeader(sortNames: string[], tblName: string): string {
    let hdrLine = `insert into ${tblName} ( ` ;  let cma = '' ;
    for (const fldNm of sortNames) {
      hdrLine += cma + fldNm
      cma = ', '
    }
    return hdrLine + ' ) values \r\n'
  }

  writeLine(sortNames: string[], anyObj: any, lcma: string): string {
    let line = lcma + '( ' ; let cma = '' ;
    for (const fldNm of sortNames) {
      const curObj = anyObj[fldNm]
      const isQuoted = (isNaN(curObj) || curObj === '')   // Do we need to quote string
      let curStr = '' + curObj ;   // Convert to string for replace function
      curStr = curStr.replace(/'/g, '')   // Replace quotes inside string
      if (isQuoted)  curStr =  "'" + curStr + "'"
      line += cma + curStr
      cma = ', '
    }
    return line + ') \r\n'
  }
}
