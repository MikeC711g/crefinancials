import { cUser } from '../../models/cUser.model';
import { TranRec } from '../../models/tranRec.model';
import { FirebaseService } from '../../services/firebase.service';
import { Component, OnInit } from '@angular/core';
import { Globals } from '../../models/globals.model';
import { KeyVal } from '../../models/keyval.model';
import { RuleData } from '../../models/ruledata.model';
import { House } from '../../models/house.model';
import { UserRec } from '../../models/UserRec.model';
import { GenutilsService } from '../../services/genutils.service';
import { CommonFuncsService } from '../../services/common-funcs.service';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';


@Component({
  selector: 'app-useractions',
  templateUrl: './useractions.component.html',
  styleUrls: ['./useractions.component.css']
})

export class UseractionsComponent implements OnInit {
  statusMsg = '' ; title = 'User Actions'
  sourceCid = '' ;  sourceDbPrefix = '' ;  savedCid = '' ;  savedDbP = '' ;
    // For loads from JSON which use dynamic callbacks
  destCid = '' ;  destDbPrefix = '' ;
  userActions = [ 'adduser', 'removeuser', 'resetpw', 'handleuseractions',
    'analyzecidbytrans', 'analyzeciddbbyusers'] // 6
  needSourceCid = [ 'analyzecidbytrans' ] ;
  needDestCid = [ 'adduser' ] ;
  needUUidInfo = ['adduser', 'removeuser', 'resetpw'] ; getUUidInfo = false ;  lUUid = '' ;
    lRole = 'Admin' ;   roleNames = ['User', 'Admin', 'globalAdmin']
    eMail = '' ; pw = '' ; cName = '' ; phone = ''
    custActions: UserRec[] = new Array<UserRec>() ;
    uRecSelected: UserRec = new UserRec('action', 'cid', 'cName', 'dateAdded', 'dbPref',
      'eMail', 'phone', 'role', false,  'uuid')
  getSourceCid = false ;  getDestCid = false
  houses: House[] = new Array<House>() ;   accounts: KeyVal[] = new Array<KeyVal>() ;
  accountTypes: string[] = new Array<string>() ;  tranTypes: string[] = new Array<string>() ;
  descripTaxcat: KeyVal[] = new Array<KeyVal>() ;
  descripCategories: KeyVal[] = new Array<KeyVal>() ;
  categoryTaxcat: KeyVal[] = new Array<KeyVal>() ;
  categoryFolder: KeyVal[] = new Array<KeyVal>() ;
  taxCats: KeyVal[] = new Array<KeyVal>() ;  taxCatTime = 0 ;
  ruleAdmin: RuleData[] = new Array<RuleData>() ;  haveGlobals = false ;
  globals: Globals[] = []
    // For dynamic callbacks (no this context) ... to handle 
  selectedAction = '' ; action$: Subscription = new Subscription() ;  action = ''

  constructor(private fireSvc: FirebaseService, private utilSvc: GenutilsService,
    private commons: CommonFuncsService, private route: Router) {
      this.action$ = route.events.subscribe((routeUrl) => {
        if (routeUrl instanceof NavigationEnd) {
          const urlParts = routeUrl.url.split('/') ;
          const lastPart = urlParts[urlParts.length-1]
          this.selectedAction = (this.userActions.indexOf(lastPart) > -1) ?
            lastPart : 'adduser' 
          this.getActionInputs()
          console.log('constructor selectedAction: %s', this.selectedAction)
          }
      })
    }

  /** ****************************************************************************
   * onInit
   ***************************************************************************** */
  ngOnInit(): void { console.log('oninit') }

  /** ****************************************************************************
   * Call function corresponding to selection
   ***************************************************************************** */
  doAction() {
    switch(this.selectedAction) {
      case 'adduser':   this.addUserGeneric() ; break ;
      case 'removeuser':  this.removeUser() ; break ;
      case 'resetpw': this.sendPasswordResetEMail() ; break ;
      case 'handleuseractions':  this.handleUserActions() ; break ;
      case 'analyzeciddbbyusers':  this.analyzeCidDBByUsers() ; break ;
      case 'analyzecidbytrans':    this.analyzeCidByTrans() ; break ;
      default:  console.warn('Invalid item selected %s', this.selectedAction) ;
    }
    this.selectedAction = '' ; this.getSourceCid = false ; this.getDestCid = false ;
  }

  /** ****************************************************************************
   * Based on function to run, retrieve appropriate info
   ***************************************************************************** */
  getActionInputs() {
    this.getSourceCid = (this.needSourceCid.indexOf(this.selectedAction) > -1)
    this.getDestCid = (this.needDestCid.indexOf(this.selectedAction) > -1)
    this.getUUidInfo = (this.needUUidInfo.indexOf(this.selectedAction) > -1)
    if (this.selectedAction === 'handleuseractions') this.getUserActions()
  }

  /** ****************************************************************************
   * When CID is changed, get globals. If not chgd, globals are good
   ***************************************************************************** */
  onChgCid() {
    this.commons.onChgCid(this.sourceCid, this.sourceDbPrefix).then((globals) => {
      this.globals = globals
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

  getUserActions() {
    this.custActions.splice(0)
    this.fireSvc.altCustActions().then(qSnap => {
      qSnap.forEach(urDoc => {
        const uRec = urDoc.data() as UserRec
        uRec.uuid = urDoc.id
        console.log('getUserActions w/urec: %O', uRec)
        this.custActions.push(uRec)
      })
    })
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
        eMail, phone, role, false, lUUid )
      this.fireSvc.addUsers(cid, dbPrefix, userRec).then(urow => {
        userRec.uuid = lUUid
        console.log('Successfully added %O', userRec)
        this.statusMsg = 'Successfully added user ' + userRec.uuid
        this.addGlobals(cid, dbPrefix)
      }).catch(error => {
        console.warn('Error %s adding users row %O', error, userRec)
        this.statusMsg = 'Failed to add user ', userRec.uuid
      })
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

  addGlobals(cid: string, dbPref: string) {
    const srcCid = 'globalBase' ; const srcDbPref = ''   // PseudoCid/DBPref where default globals are stored
    this.fireSvc.getAllGlobals(srcCid, srcDbPref).subscribe({
      next: (globRef) => {
        const globals: Globals[] = globRef
        this.statusMsg = this.commons.addGlobals(cid, dbPref, globals)
      }, error: (error) => {
        console.log('Err getting %s globals to load new globals, Error: %s', srcCid, error)
      }
    })
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
      this.commons.clearGlobals(userRec.cid, userRec.dbPrefix)
      this.commons.clearProjects(userRec.cid, userRec.dbPrefix, '2015-01-01', '2035-12-31')
      this.commons.clearRecons(userRec.cid, userRec.dbPrefix, '2015-01-01', '2035-12-31')
      this.commons.clearTrans(userRec.cid, userRec.dbPrefix, '2015-01-01', '2035-12-31')
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
    if (this.uRecSelected.uuid === 'uuid')  this.statusMsg = 'Must select an action to handle'
    else {
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
  }
}
