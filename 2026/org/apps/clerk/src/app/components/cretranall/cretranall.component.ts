import { FirebaseService } from './../../services/firebase.service';
import { FormsModule } from '@angular/forms';
import { Project } from '../../models/project.model';
import { TranRec } from './../../models/TranRec.model';
import { Component, EventEmitter, input, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { GenutilsService } from './../../services/genutils.service';
import { CreprojecteditComponent } from '../creprojects/creprojectedit/creprojectedit.component';
import { AdmruledataComponent } from '../admin/admruledata/admruledata.component';
import { CremessagesComponent } from '../cremessages/cremessages.component';
import { KeyVal } from './../../models/globals.model';
import { House } from './../../models/house.model';
import { RuleData } from '../../models/ruledata.model';
import { GlobalModsService } from '../../services/globalMods.service';

@Component({
  selector: 'crefinancials-cretranall',
  standalone: true,
  imports: [CreprojecteditComponent, AdmruledataComponent, CremessagesComponent, FormsModule],
  templateUrl: './cretranall.component.html',
  styleUrls: ['./cretranall.component.css']
})
export class CretranallComponent  implements OnInit, OnDestroy {

  @Input() tranRec: TranRec = new TranRec( '', '', '', '', '', 0.0, '', '', '', '', '', '', '')
  @Input() isParent = false ;
  @Input() isChild = false ;
  @Input() hideLabel = '' ;
  @Input() newExpand = true ;
  @Input() modeOp = '' ;      // If in createtran ... after add, reset for more
  @Input({required: true}) idx = 1
  @Input() locAction = '' ;
  @Output() tranMod = new EventEmitter<{action: string, tranRec: TranRec}>() ;
//  @ViewChild('recordForm', { static: false })
//  recordForm!: NgForm;
  nmDict = { createTran: 'createtran', tParent: 'TPARENT' } ;
  editMode = false ;  newRow = false ;  isDirty = false ; isInDB = false ;
  newProj = false ;   newRule = false ;  // Controls over adding extra info
  rowStyle = 'font-size: 90%;'
  accounts: KeyVal[] = new Array<KeyVal>() ;
  tranTypes: string[] = new Array<string>() ;
  taxCats: KeyVal[] = new Array<KeyVal>() ;  curTaxCat: KeyVal = new KeyVal('', '');
  categoryTaxcat: KeyVal[] = new Array<KeyVal>() ;
  houses: House[] = new Array<House>() ;
  ruleAdd: RuleData = new RuleData('', '', '', [], 0)
  projects: Project[] = new Array<Project>() ;
  filteredProjects: Project[] = new Array<Project>() ;
  noProj = new Project('None', '', '2015-01-01', '2030-12-31', '', 'Miscellaneous') ;
  completedActions = 0 ;  recordsAdded = 0 ;
  projectq$: Subscription = new Subscription() ;
  project$: Subscription = new Subscription() ;
  dispMsgs: string[] = new Array<string>() ; childInDb = false ;
  splitChildren: TranRec[] = new Array<TranRec>() ;   // Array of child trans
  useSplitChild: string[] = new Array<string>() ;   // Is child ready for DB
  allocdAmt = 0 ;     // Amount of total that is currently allocated to child trans
  savedAmt = 0 ;      // Sum of amounts of saved child trans
  deltaAmt = 0 ;      // Amount difference between parent tran and sum of child trans
  expandedView = false ;        // Showing list or expanded detail
  childExpand = true ;
  isGlobalAdmin = this.fireSvc.isUserGlobalAdmin() ;
  CLASSNAME = 'cretranall' ;

  constructor(private fireSvc: FirebaseService, private utilSvc: GenutilsService,
    private globSvc: GlobalModsService) { }

  ngOnInit(): void {
    const actTp = this.utilSvc.actionTypes ;
    this.isInDB = this.utilSvc.isTranDB(this.tranRec) ;
    this.utilSvc.cDebug(this.CLASSNAME, 'inTranAll isinDB: %s isParent: %s  isChild: %s  TranId: %s',
      this.isInDB, this.isParent, this.isChild, this.tranRec.TranId)
    if (this.idx % 2 !== 0) this.rowStyle += 'background-color: cornflowerblue;' ;
    if (!this.tranRec.TranId) {
      this.newRow = true ;
      this.expandedView = (this.isChild) ? this.newExpand : true ;
      if (!this.tranRec.TranDate) this.tranRec.TranDate = new Date().toISOString().slice(0, 10) ;
      this.tranRec.TranId = this.utilSvc.generateGuid() ;
      if (this.isParent) this.addNewChildren() ;
    } else {
      this.editMode = true ;
      if (this.isParent) {
        this.splitChildren = this.fireSvc.getChildArray(this.tranRec.TranId) ;
        this.utilSvc.cDebug(this.CLASSNAME, 'Existing Parent %s had children: %O', this.tranRec.TranId, this.splitChildren)
        if (!this.splitChildren) { this.addNewChildren() ;
        } else {
          this.childInDb = true ;
          for (let i = 0; i < this.splitChildren.length; i++) {
            // No need to add amount as parent populated when child trans split out in cretran
            this.useSplitChild.push('') ;    // No action yet, so no need to update DB
          }
        }
      }
      this.utilSvc.cDebug(this.CLASSNAME, 'Parent/edit amount: %d  Children: %d', this.tranRec.Amount, this.splitChildren.length)
    }
    if (this.isChild)
      this.utilSvc.cDebug(this.CLASSNAME, 'Child row: newrow: %s  newexp: %s expView: %s  editmd: %s  tranRec: %O',
        this.newRow, this.newExpand, this.expandedView, this.editMode, this.tranRec)
    if (this.isParent) {
      [this.savedAmt, this.allocdAmt, this.deltaAmt] = this.calcSplitAmount(this.splitChildren, this.useSplitChild) ;
      if (this.deltaAmt !== 0) {    // Older splits 0'd out amount, this should fix that
        if (this.tranRec.Amount === 0) {
          this.tranRec.Amount = this.allocdAmt
          this.fireSvc.updateTran(this.tranRec, this.tranRec).
            then(() => {
              this.utilSvc.cDebug(this.CLASSNAME, 'Fixed amt for Tran: %s to amt: %d', this.tranRec.TranId, this.tranRec.Amount)
              this.deltaAmt = this.tranRec.Amount - this.allocdAmt
              this.tranMod.emit({ action: actTp.Update, tranRec: this.tranRec }) ;
            }).catch(error => {
              this.utilSvc.cWarn(this.CLASSNAME, 'UpdtTranErr..RecordService: %s', error) ;
              this.dispMsgs.push('Error updating parent record to inflate amount to match children') ;
            }) ;
        } else this.dispMsgs.push('TranAmount of parent does not match that of children')
      }
    }
    this.accounts = this.fireSvc.getAccounts() ;
    this.tranTypes = this.fireSvc.getTranTypes() ;
      this.utilSvc.cWarn(this.CLASSNAME, 'Odd that tranEdit had to retrieve projects from DB') ;
    const project$ = this.fireSvc.getProjects(false, 90).subscribe({
      next: (response) => {
        this.projects = response ;
        this.utilSvc.cDebug(this.CLASSNAME, 'Got %d projects from subscrip', this.projects.length) ;
      }, error: (error) => {
        this.utilSvc.cWarn(this.CLASSNAME, 'TranEdit Err..FireService: %s', error) ;
      }
    }) ;

    this.taxCats = this.fireSvc.getTaxCats() ;
    this.categoryTaxcat = this.fireSvc.getCategoryTaxcat() ;
    for (const curProj of this.projects) {
      this.filteredProjects.push(curProj) ;
    }
    // this.filteredProjects = this.projects ;
    this.houses = this.fireSvc.getHouses() ;
    this.utilSvc.cDebug(this.CLASSNAME, 'Parent %s editMd: %s  expand: %s  childCnt: %d  tranAmt: %d',
      this.isParent, this.editMode, this.expandedView, this.splitChildren.length, this.tranRec.Amount) ;
  }

  addNewChildren() {
    this.splitChildren = new Array<TranRec>() ;
    console.log('addNewChildren w/tranRec: %O', this.tranRec)
    if (this.tranRec.Category === 'Mortgage Payment') { // Mtg pmt has predefined split
      const mtgTrans = this.utilSvc.genChildTransForMtg(this.tranRec) ;
      for (const mtgChild of mtgTrans) {
        this.onAddSplitChild(mtgChild, 'add') ;
      }
    } else {      // Create 2 generic children for them to start with
      this.onAddSplitChild(new TranRec(this.tranRec.Cid, this.tranRec.TranDate, this.tranRec.Account,
        '', '', 0, '', '', '', '', '', '', '')) ;
      this.onAddSplitChild(new TranRec(this.tranRec.Cid, this.tranRec.TranDate, this.tranRec.Account,
        '', '', 0, '', '', '', '', '', '', '')) ;
    }
    this.childExpand = false ;    // Don't expand multiple new rows, only on one add
    [this.savedAmt, this.allocdAmt, this.deltaAmt] = this.calcSplitAmount(this.splitChildren, this.useSplitChild) ;
  }

  /** ********************************************************************
   * Go through child transactions and set the amount currently allocated
   * hereiam ... look for new button for save all children and then parent
   * @param tranRecs
   * @param useList
   * @returns
  ********************************************************************* */
  calcSplitAmount(tranRecs: TranRec[], useList: string[]): [number, number, number] {
    const actTp = this.utilSvc.actionTypes ;
    let curAmt = 0, savedAmt = 0 ;
    for (let i = 0; i < tranRecs.length; i++) {
      const dbBound = useList[i] === actTp.Add || useList[i] === actTp.Update ;   // Will add to DB
      if (dbBound || this.utilSvc.isTranDB(tranRecs[i]))  savedAmt += tranRecs[i].Amount ;
      // tranid blank (during db add) or real db tranid or add or update action
      if (!tranRecs[i].TranId || this.utilSvc.isTranDB(tranRecs[i]) || dbBound) {
        curAmt += tranRecs[i].Amount ;
      }
    }
    this.utilSvc.cLog(this.CLASSNAME, 'CalcSplitAmt amt %d tranAmt %d', curAmt, this.tranRec.Amount)
    return [this.utilSvc.fixAmt(savedAmt), this.utilSvc.fixAmt(curAmt),
      this.utilSvc.fixAmt(this.tranRec.Amount - curAmt)] ;
  }

  chgData() {
    if (!this.isDirty && this.tranRec.TranId) {
      this.isDirty = true ;
      this.utilSvc.dirtyTranUpdt(true, this.tranRec.TranId)
    }
  }

  cleanData(tranId = this.tranRec.TranId) {   // When data is no longer dirty (saved, deleted, cancelled)
    if (this.isDirty && tranId) {
      if (tranId === this.tranRec.TranId) this.isDirty = false ;
      this.utilSvc.dirtyTranUpdt(false, tranId)
    }
  }

  /** ****************************************************************************
   * Add a child into the array of children for this parent being split.  Nothing
   * in DB until parent is processed
   * hereiam ... need to consider taking existing DB tran and splitting it
   ***************************************************************************** */
  onAddSplitChild(tranRec?: TranRec, action = '') {   // May want new category
    console.log('oasc tranRec: %O', tranRec) ;
    if (!tranRec) {
      tranRec = new TranRec(this.tranRec.Cid, this.tranRec.TranDate, this.tranRec.Account,
        '', '', 0, '', '', '', '', '', '', '') ;
    }
    this.childInDb = false ;
    this.splitChildren.push(tranRec)
    this.useSplitChild.push(action) ;
    this.childExpand = true ;
    this.utilSvc.cDebug(this.CLASSNAME, 'added child %O to parent: %O Child array len %d',
      tranRec, this.tranRec, this.splitChildren.length) ;
  }

  /*********************************************************************
    Add the record created to the data base
  ********************************************************************/
 // isChild ... handle child in onAddRecord, onDelete, and onCancel (mostly emits)
  onAddRecord(): void {
    // this.tranRec.ReconKey = '' ;
    const actTp = this.utilSvc.actionTypes ;
    this.utilSvc.cDebug(this.CLASSNAME, 'csvrecEd editmd: %s  DB: %s  Tran: %O', this.editMode, this.isInDB, this.tranRec) ;
    const locTran = this.utilSvc.cloneTran(this.tranRec)
    if (this.isChild) {
      this.locAction = (this.isInDB) ? actTp.Update :  actTp.Add
      this.tranMod.emit({ action: this.locAction, tranRec: locTran }) ;
      this.cleanData()
      this.expandedView = false ;     this.newRow = false ;
      return ;
    }
    delete locTran.SplitParent ;   // In case fld got something, move it out
    this.cleanData()
    // if (this.isParent)   this.tranRec.Amount = 0 ;  // Clear amount as this is logical tran only
    this.utilSvc.cDebug(this.CLASSNAME, 'add isParent: %s  editMd: %s  isindb: %s  modeOp: %s  amt: %d',
      this.isParent, this.editMode, this.isInDB, this.modeOp, locTran.Amount)
    if (!this.editMode || !this.isInDB) {   // New record or record from OFX not yet in DB
      this.editMode = true ;    // Record saved, now can edit
      this.utilSvc.cDebug(this.CLASSNAME, 'tranedit calling addTrans1') ;
      this.fireSvc.addTrans(locTran).
        then(docRef => {
          locTran.TranId = docRef?.id ;
          this.tranRec.TranId = docRef?.id ;
          console.log('in Add tranRec: %O  isParent: %s', locTran, this.isParent)
          if (this.isParent) {
            console.log('Calling storeChildRows from add')
            this.storeChildRows(locTran, this.splitChildren, this.useSplitChild) ;
          }
          this.utilSvc.cDebug(this.CLASSNAME, 'Added record: %O', locTran ) ;
          this.dispMsgs.push('Successfully added Record: ' + ++this.recordsAdded) ;
          this.tranMod.emit({ action: actTp.Add, tranRec: locTran }) ;
          if (this.modeOp === this.nmDict.createTran && !this.isChild) this.refreshCreate()
        }).catch(error => {
          this.utilSvc.cWarn(this.CLASSNAME, 'Error Adding tran: %s', error) ;
        })
      this.expandedView = false ;     this.newRow = false ;
      if (!this.isInDB)   this.isInDB = true ;
      this.completedActions++ ;
    } else {
      console.log('Came into else/update in addRecord')
      this.fireSvc.updateTran(locTran, locTran).
        then(docRef => {
          this.dispMsgs.push('Update record successful') ;
          this.utilSvc.cLog(this.CLASSNAME, 'Update success, isParent %s TranId: %s', this.isParent, locTran.TranId) ;
          this.expandedView = false ;
          if (this.isParent) {
            console.log('calling storeChildRows from update')
            this.storeChildRows(locTran, this.splitChildren, this.useSplitChild) ;
          }
          this.tranMod.emit({ action: actTp.Update, tranRec: locTran }) ;
          if (this.modeOp === this.nmDict.createTran && !this.isChild) this.refreshCreate()
        }).catch(error => {
          this.utilSvc.cWarn(this.CLASSNAME, 'UpdtTranErr..RecordService: %s', error) ;
          this.dispMsgs.push('Error updating record') ;
        }) ;
      this.completedActions++ ;
    }
  }

  displayList(): boolean {
    // <div class="row" *ngIf="editMode || !expandedView || isChild" [style]="rowStyle">
    if (this.modeOp === this.nmDict.createTran) return false ;
    if (this.editMode || !this.expandedView || this.isChild)  return true ;
    return false ;
  }

  refreshCreate() {
    setTimeout(() => {    // If in create mode, set up to hang around
      if (this.isParent) {
        // this.splitChildren.splice(0, this.splitChildren.length)
        this.isParent = false
      }
      this.expandedView = true ;    this.newRow = true ;    this.isInDB = false ;
      this.editMode = false ;
      this.tranRec = new TranRec( '', this.tranRec.TranDate, this.tranRec.Account, '', '',
        0.0, '', '', '', '', '', '', '')
    }, 500);   // Wait a second for data to be digested above before mods
  }

  /*********************************************************************
    Delete current record
  ********************************************************************/
  onDeleteRecord(): void {    // I "think" this is fine for split trans as well
    const actTp = this.utilSvc.actionTypes ;
    const locTran = this.utilSvc.cloneTran(this.tranRec)
    if (this.isParent && this.utilSvc.isTranDB(locTran)) {
      for (const curTran of this.splitChildren) {     // For each child
        this.utilSvc.cDebug(this.CLASSNAME, 'Doing child %O', curTran)
        this.cleanData(curTran.TranId)
        if (this.utilSvc.isTranDB(curTran)) {    // If child in DB
          const delRtn = this.fireSvc.deleteTran(curTran, false) ;
          if (typeof delRtn === 'boolean') {  return ; }
          delRtn.then(() => {
            this.utilSvc.cDebug(this.CLASSNAME, 'Deleted child of existing parent: %O', curTran) ;
          }).catch(error => {
            this.utilSvc.cWarn(this.CLASSNAME, 'Failed to rmv child tran: %O  err: %s', curTran, error) ;
          })
        }
      }
    }
    console.log('DeleteRec TranRec: %O  isChild: %s', locTran, this.isChild)
    if (this.utilSvc.isTranDB(locTran)) {    // Tran is in DB
      const delRtn = this.fireSvc.deleteTran(locTran) ;
      if ( typeof delRtn === 'boolean') { return ;
      } else {
          this.cleanData()
          delRtn.then(docRef => {
          this.dispMsgs.push('Successfully deleted Record') ;
          this.utilSvc.cDebug(this.CLASSNAME, 'Delete success, DocRef id %s  TranId: %s', docRef?.id, locTran.TranId) ;
          this.tranMod.emit({ action: actTp.Delete, tranRec: locTran }) ;
          this.expandedView = false ;
        }).catch(error => {
          this.utilSvc.cWarn(this.CLASSNAME, 'DeleteTranErr: %s', error) ;
          this.dispMsgs.push('Error Deleting transaction') ;
        }) ;
      }
      this.completedActions++ ;
    } else {
      if (this.isChild)     // onChildMod will remove from child arrays
        this.cleanData()
        this.tranMod.emit({ action: actTp.Delete, tranRec: locTran }) ;
    }
  }

  /** ********************************************************************
   * Store child rows of parent being processed.  Should only be add/update/ or blank in use
   *  Updates must have tranid
   * @param tranRec The parent tran row
   * @param childRows Array of child rows with this tran row
   * @param useList action to take on this row in child array (add, update, or nothing)
  ********************************************************************* */
  storeChildRows(tranRec: TranRec, childRows: TranRec[], useList: string[]) {
    // let lastRow = childRows.length - 1 ;
    const actTp = this.utilSvc.actionTypes ;
    this.utilSvc.cLog(this.CLASSNAME,'storeChildRows Parent: %O Children: %O  useList: %O ', tranRec, childRows, useList) ;
    this.fireSvc.add2ChildMap(tranRec.TranId!, childRows) ;
    for (let i = 0; i < childRows.length; i++) {
      childRows[i].SplitParent = tranRec.TranId ;
      this.cleanData(childRows[i].TranId)
      switch (useList[i]) {
        case actTp.Update:
          this.utilSvc.cDebug(this.CLASSNAME, 'Update on childRow')
          if (childRows[i].TranId) {
            this.fireSvc.updateTran(childRows[i], childRows[i]).  // No ref to old version here
              then(() => {
                this.utilSvc.cDebug(this.CLASSNAME, 'Successfully updated child row: %O ', childRows[i]) ;
              }).catch(error => {
                this.utilSvc.cWarn(this.CLASSNAME, 'Error: %s Updating child row: %O', error, childRows[i]) ;
              })
          } else {
            this.utilSvc.cWarn(this.CLASSNAME, 'Tried to update row: %O but no tranId', childRows[i])
          }
          break ;
        case actTp.Add:
          this.utilSvc.cDebug(this.CLASSNAME, 'tranedit calling addTrans3') ;
          this.fireSvc.addTrans(childRows[i]).
          then(docRef => {
            childRows[i].TranId = docRef?.id ;
            this.utilSvc.cLog(this.CLASSNAME, 'Back well to cpte w/childRow: %O', childRows[i])
          }).catch(error => {
            this.utilSvc.cDebug(this.CLASSNAME, 'Error %s adding %O', error, childRows[i])
          })
          break ;
        case '':
          this.utilSvc.cDebug(this.CLASSNAME, 'No action taken on: %O', childRows[i]) ;
          break ;
        default:
          this.utilSvc.cWarn(this.CLASSNAME, 'Invalid action: %s  on ChileRowI: %O', useList[i], childRows[i]) ;
      }
      useList[i] = ''
    }
  }

  /** **********************************************************************************
  * Customer chose button to take current data and create a rule
  *********************************************************************************** */
  onAddRule() {
    if (this.tranRec.TranType === this.nmDict.tParent)  this.tranRec.TranType = '' ;
    this.ruleAdd = new RuleData(this.tranRec.Cid, this.tranRec.TranExtra, this.tranRec.TranExtra,
      [this.tranRec.Account], 0, this.tranRec.Category, this.tranRec.TranType, '', this.tranRec.TaxCat,
      this.tranRec.House, this.tranRec.Annotation) ;
    this.newRule = true ;
  }

  /*****************************************************************************
     Event occurred to a row in child component
      See if we can modify the arrays to avoid refreshing from DBs so that while
      admin is occurring.  On exit from admin, will refresh all from DB.
   *****************************************************************************/
  onRuleMod(action: string, parmType: string, newVal: any, oldVal: any): void {
    if (action === this.utilSvc.actionTypes.Cancel) {
      this.newRule = false ;
    } else {
      const tranRules = this.fireSvc.getTranRules() ;
      const anyRuless: any[] = tranRules ;

      const [actionCnt, statusMsg] = this.globSvc.genGlobMod(action, this.utilSvc.globalTypes.RuleData, newVal,
        oldVal, anyRuless) ;
      if (actionCnt === 0)
        this.utilSvc.cWarn(this.CLASSNAME, `Failed to add rule with error: ${statusMsg}`) ;
      else {
        this.utilSvc.addRule(newVal) ; this.newRule = false ;
      }
    }
  }

  /** **********************************************************************************
   * This is called only on split Trans when a child tran emits event to parent tran.
   * tranRec should match an element of splitChildren array
   * @param action tran action (add, update, delete, cancel)
   * @param tranRec Transaction record
   *********************************************************************************** */
  onChildMod(action: string, tranRec: TranRec) {    // Need child in DB logic, coming
    const actTp = this.utilSvc.actionTypes ;
    this.utilSvc.cDebug(this.CLASSNAME, 'Called onChildMod action: %s Tran: %O', action, tranRec) ;
    const idx = this.splitChildren.findIndex((tr) => tr.TranId === tranRec.TranId) ;
    switch (action) {
      case actTp.Delete:
        if (idx > -1) {
          this.utilSvc.cDebug(this.CLASSNAME, 'delete on idx %d', idx)
          this.splitChildren.splice(idx, 1) ;   // Remove row from array
          this.useSplitChild.splice(idx, 1) ;
        }
        break ;
      case actTp.Add:
      case actTp.Update:
        this.utilSvc.cDebug(this.CLASSNAME, '%s on idx %d', action, idx)
        this.useSplitChild[idx] = action ;        // When processing at end, this row needs DB call
        break ;
      case actTp.Cancel:
        this.utilSvc.cDebug(this.CLASSNAME, 'cancel on idx %d', idx)
    }
    [this.savedAmt, this.allocdAmt, this.deltaAmt] = this.calcSplitAmount(this.splitChildren, this.useSplitChild) ;
  }

  /** ****************************************************************************
   * Called when unsplit button clicked.
   ***************************************************************************** */
  unsplitTran() {
    if (confirm('Are you sure you want to unsplit this transaction?  This will' +
      ' lose all data associated with the children')) {
      this.tranRec.TranType = (this.tranRec.Amount > 0) ? 'CREDIT' : 'DEBIT' ;
      const locTran = this.utilSvc.cloneTran(this.tranRec)

      this.fireSvc.updateTran(locTran, locTran).
        then(() => {
          this.dispMsgs.push('Unsplit record successful') ;
          this.utilSvc.cDebug(this.CLASSNAME, 'Unsplit Update success, TranId: %s', locTran.TranId) ;
          this.expandedView = false ;
          this.isParent = false ;
          if (locTran.TranId) { this.fireSvc.rmvChildren4Parent(locTran.TranId)}
          for (let i = 0; i < this.splitChildren.length; i++) {
            const curChild = this.splitChildren[i] ;
            this.cleanData(curChild.TranId)
            if (this.utilSvc.isTranDB(curChild)) {  // If tran in DB
              const delRtn = this.fireSvc.deleteTran(curChild, false) ;
              if (typeof delRtn !== 'boolean') {
                delRtn.then(() => {    // Individual splice for future recovery
                  this.splitChildren.splice(i, 1) ;   // Delete from arrays
                  this.useSplitChild.splice(i, 1) ;
                })
              }
            }
          }
          this.tranMod.emit({ action: this.utilSvc.actionTypes.UnSplit, tranRec: locTran }) ;
        }).catch(error => {
          this.utilSvc.cWarn(this.CLASSNAME, 'UpdtTranErr..RecordService: %s', error) ;
          this.dispMsgs.push('Error UnSplitting record') ;
        }) ;
    }
  }

  /*********************************************************************
    Hide a tran from reconciliation (ie: not on this statement)
  ********************************************************************/
  onHideRecord(): void {    // Should not occur with child trans
    this.tranMod.emit({ action: this.hideLabel, tranRec: this.tranRec }) ;
    this.expandedView = false ;
  }

  /*********************************************************************
    Cancel work on current record
  ********************************************************************/
  onCancel(): void {
    console.log('Cancel TranRec: %O', this.tranRec) ;
    this.cleanData()
    if (this.modeOp === this.nmDict.createTran)  this.refreshCreate()
    else {
      this.tranMod.emit({ action: this.utilSvc.actionTypes.Cancel, tranRec: this.tranRec }) ;
      this.expandedView = false ;
     }
  }

  /** ****************************************************************************
   * Called when split tran button  is clicked.  Modify so this component changes
   * the way it handles the tran
   ***************************************************************************** */
  parentChange() {
    this.utilSvc.cDebug(this.CLASSNAME, 'parentChg: isParent: %s  tranrec: %O', this.isParent, this.tranRec)
    if (this.isParent)  return this.unsplitTran() ;     // Unsplit if already split
    this.utilSvc.cDebug(this.CLASSNAME, 'Splitting tran %O', this.tranRec) ;
    this.isParent = true ;
    if (!this.isInDB) {   // If not in DB, add it to DB for tranid srch ability
          // Add can fail w/no splitParent. So providing it
      if (!this.tranRec.SplitParent) { this.tranRec.SplitParent = '' ; }
      this.utilSvc.cDebug(this.CLASSNAME, 'Parent Change add Tran %O', this.tranRec) ;
      this.utilSvc.dirtyTranUpdt(false, this.tranRec.TranId!) // Clean up old tranid ref
        // Add the doc and tell caller it's new as won't be in array
      this.fireSvc.addTrans(this.tranRec).then(docRef => {
        this.tranRec.TranId = docRef.id ;
        this.utilSvc.dirtyTranUpdt(true, this.tranRec.TranId!)  // Now show dirty under new tranid
        this.tranMod.emit({ action: this.utilSvc.actionTypes.SplitNew, tranRec: this.tranRec }) ;
        this.isInDB = true ;   this.editMode = true ;
      }).catch(error => {
        this.utilSvc.cWarn(this.CLASSNAME, 'Adding parent tran %O for split failed w/error: %s', this.tranRec, error) ;
      })
    } else {
      this.tranMod.emit({ action: this.utilSvc.actionTypes.Split, tranRec: this.tranRec }) ;
    }
    this.addNewChildren()
    this.tranRec.TranType = this.nmDict.tParent ;   this.tranRec.TaxCat = 'NT'  // Set parent fields
  }

  /*********************************************************************
    If select house is modified, reFilter projects for that house only
  ********************************************************************/
  onFilterProjects(): void {
    let useHouse = true ;
    this.filteredProjects = this.projects.filter((curProj) => {
      if (this.tranRec.House === '') { useHouse = false ; }
      if (!useHouse || curProj.House === this.tranRec.House) {
        if (curProj.StartDt.localeCompare(this.tranRec.TranDate) <= 0 &&
          curProj.EndDt.localeCompare(this.tranRec.TranDate) >= 0) {
          return true ;
        }
      }
      return false ;
    })
  }

  /*********************************************************************
  * If tranType is negative to balance (or positive for credit card), make amount negative
  * tranTypes: Unknown: POS XFER PAYMENT HOLD OTHER INT ATM
  *  Negatives: DEBIT CHECK CASH DIRECTDEBIT REPEATPMT FEE SRVCHG
  *  Positives: CREDIT DIV DEP DIRECTDEP
  ********************************************************************/
  onCheckValAbs(): void {
    console.log('OnCkValAbs: TType: %s  Amt: %d', this.tranRec.TranType, this.tranRec.Amount)
    if (['DEBIT', 'CHECK', 'CASH', 'DIRECTDEBIT', 'REPEATPMT', 'FEE', 'SRVCHG'].
      indexOf(this.tranRec.TranType) > -1) {
      if (this.tranRec.Amount > 0)  this.tranRec.Amount *= -1 ;
    }
    console.log('onCkValAbs Amt: %d', this.tranRec.Amount)
  }

  /*********************************************************************
    Use parameter to see if category defaults to a particular tax category
  ********************************************************************/
  onPreSetTaxcat(): void {
    this.tranRec.TaxCat = this.utilSvc.getTaxcat(this.tranRec.Category) ;
    if (this.isChild) {
      console.log('onPresetTC child category %s  tc %s', this.tranRec.Category, this.tranRec.TaxCat )
    }
  }

  onMsgDel(idx: number, msg: string) {
    this.dispMsgs.splice(idx, 1) ;
  }

  /*****************************************************************************
     Event occurred to a row in child component for adding project dynamically
   *****************************************************************************/
  onProjMod(action: string, project: Project): void {
    let statusMsg = '' ;
    [statusMsg, this.newProj] = this.utilSvc.onProjMod(action, project) ;
    this.tranRec.Project = project.ProjectId! ;
    if (statusMsg !== '') this.dispMsgs.push(statusMsg)
  }

  ngOnDestroy(): void {
      this.project$.unsubscribe() ;
      this.projectq$.unsubscribe() ;
  }
}
