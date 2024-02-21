import { FirebaseService } from './../../services/firebase.service';
import { Project } from '../../models/project.model';
import { TranRec } from './../../models/TranRec.model';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { GenutilsService } from './../../services/genutils.service';
import { KeyVal } from './../../models/keyval.model';
import { House } from './../../models/house.model';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'app-cretranall',
  templateUrl: './cretranall.component.html',
  styleUrls: ['./cretranall.component.css']
})
export class CretranallComponent  implements OnInit, OnDestroy {

  @Input() tranRec: TranRec = new TranRec( '', '', '', '', '', 0.0, '', '', '', '', '', '', '')
  @Input() isParent = false ;
  @Input() isChild = false ;
  @Input() hideLabel = '' ;
  @Input() newExpand = true ;
  @Output() tranMod = new EventEmitter<{action: string, tranRec: TranRec}>() ;
//  @ViewChild('recordForm', { static: false })
//  recordForm!: NgForm;
  editMode = false ;  newRow = false ;   newProj = false ; isDirty = false ; isInDB = false ;
  accounts: KeyVal[] = new Array<KeyVal>() ;
  tranTypes: string[] = new Array<string>() ;
  taxCats: KeyVal[] = new Array<KeyVal>() ;  curTaxCat: KeyVal = new KeyVal('', '');
  categoryTaxcat: KeyVal[] = new Array<KeyVal>() ;
  houses: House[] = new Array<House>() ;
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
  deltaAmt = 0 ;      // Amount difference between parent tran and sum of child trans
  expandedView = false ;        // Showing list or expanded detail
  childExpand = true ;
  addProj = false ;   // Can be used to dynamically add a project from here
  isGlobalAdmin = this.fireSvc.isUserGlobalAdmin() ;
  CLASSNAME = 'cretranall' ;

  constructor(private fireSvc: FirebaseService, private utilSvc: GenutilsService) { }

  ngOnInit(): void {
    this.isInDB = this.utilSvc.isTranDB(this.tranRec) ;
    this.utilSvc.cDebug(this.CLASSNAME, 'inTranAll isinDB: %s isParent: %s  isChild: %s  TranId: %s',
      this.isInDB, this.isParent, this.isChild, this.tranRec.TranId)
    if (!this.tranRec.TranId) {
      this.newRow = true ;
      this.expandedView = (this.isChild) ? this.newExpand : true ;
      this.tranRec.TranDate = new Date().toISOString().slice(0, 10) ;
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
      [this.allocdAmt, this.deltaAmt] = this.calcSplitAmount(this.splitChildren, this.useSplitChild) ;
      if (this.deltaAmt !== 0) {    // Older splits 0'd out amount, this should fix that
        if (this.tranRec.Amount === 0) {
          this.tranRec.Amount = this.allocdAmt
          this.fireSvc.updateTran(this.tranRec, this.tranRec).
            then(() => {
              this.utilSvc.cDebug(this.CLASSNAME, 'Fixed amt for Tran: %s to amt: %d', this.tranRec.TranId, this.tranRec.Amount)
              this.deltaAmt = this.tranRec.Amount - this.allocdAmt
              this.tranMod.emit({ action: this.utilSvc.actionTypes.Update, tranRec: this.tranRec }) ;
            }).catch(error => {
              this.utilSvc.cWarn(this.CLASSNAME, 'UpdtTranErr..RecordService: %s', error) ;
              this.dispMsgs.push('Error updating parent record to inflate amount to match children') ;
            }) ;
          }
        else this.dispMsgs.push('TranAmount of parent does not match that of children')
      }
    }
    this.accounts = this.fireSvc.getAccounts() ;
    this.tranTypes = this.fireSvc.getTranTypes() ;
    const projRtn = this.fireSvc.getProjects(false, 90) ; // Simplest to meet by parent call
    if (Array.isArray(projRtn)) {
      this.projects = projRtn ;
    } else {
      this.utilSvc.cWarn(this.CLASSNAME, 'Odd that tranEdit had to retrieve projects from DB') ;
      this.projectq$ = projRtn.subscribe({
        next: (response) => {
          this.projects = response ;
          this.fireSvc.project$.next(this.projects) ;
          this.utilSvc.cDebug(this.CLASSNAME, 'Got %d projects from subscrip', this.projects.length) ;
        }, error: (error) => {
          this.utilSvc.cWarn(this.CLASSNAME, 'TranEdit Err..FireService: %s', error) ;
        }
      }) ;
    }
    this.project$ = this.fireSvc.project$.subscribe(proj => {
      this.projects = proj ;
      this.onFilterProjects() ;
    })

    this.taxCats = this.fireSvc.getTaxCats() ;
    this.categoryTaxcat = this.fireSvc.getCategoryTaxcat() ;
    for (const curProj of this.projects) {
      this.filteredProjects.push(curProj) ;
    }
    // this.filteredProjects = this.projects ;
    this.houses = this.fireSvc.getFullHouses() ;
    this.utilSvc.cDebug(this.CLASSNAME, 'Parent %s editMd: %s  childCnt: %d  tranAmt: %d', this.isParent, this.editMode,
        this.splitChildren.length, this.tranRec.Amount) ;
  }

  addNewChildren() {
    this.splitChildren = new Array<TranRec>() ;
    if (this.tranRec.Category === 'Mortgage Payment') { // Mtg pmt has predefined split
      this.onAddSplitChild('Mortgage Principal') ;
      this.onAddSplitChild('Mortgage Escrow') ;
      this.onAddSplitChild('Mortgage Interest') ;
    } else {      // Create 2 generic children for them to start with
      this.onAddSplitChild() ;
      this.onAddSplitChild() ;
    }
    this.childExpand = false ;    // Don't expand multiple new rows, only on one add
    [this.allocdAmt, this.deltaAmt] = this.calcSplitAmount(this.splitChildren, this.useSplitChild) ;
  }

  /** ********************************************************************
   * Go through child transactions and set the amount currently allocated
   * @param tranRecs
   * @param useList
   * @returns
  ********************************************************************* */
  calcSplitAmount(tranRecs: TranRec[], useList: string[]): [number, number] {
    let curAmt = 0 ;
    for (let i = 0; i < tranRecs.length; i++) {
      if (tranRecs[i].TranId ||   // If row in DB or action is Add or update
        useList[i] === this.utilSvc.actionTypes.Add || useList[i] === this.utilSvc.actionTypes.Update) {
        curAmt += tranRecs[i].Amount ;
      }
    }
    return [this.utilSvc.fixAmt(curAmt), this.utilSvc.fixAmt(this.tranRec.Amount - curAmt)] ;
  }

  chgData() {
    if (!this.isDirty) {
      this.isDirty = true ;
      this.utilSvc.dirtyTranUpdt(true, this.tranRec.TranId!)
    }
  }

  /** ****************************************************************************
   * Add a child into the array of children for this parent being split.  Nothing
   * in DB until parent is processed
   * hereiam ... need to consider taking existing DB tran and splitting it
   ***************************************************************************** */
  onAddSplitChild(category?: string) {   // May want new category
    if (!category) { category = '' ; }
    this.childInDb = false ;
    const newChild = new TranRec(this.tranRec.Cid, this.tranRec.TranDate, this.tranRec.Account,
      category, '', 0, '', '', '', '', '', this.tranRec.ReconKey, '', this.utilSvc.generateGuid(), '')
    this.splitChildren.push(newChild)
    this.useSplitChild.push('') ;
    this.childExpand = true ;
    this.utilSvc.cDebug(this.CLASSNAME, 'added child %O to parent: %O Child array len %d',
      newChild, this.tranRec, this.splitChildren.length) ;
  }

  /*********************************************************************
    Add the record created to the data base
  ********************************************************************/
 // isChild ... handle child in onAddRecord, onDelete, and onCancel (mostly emits)
  onAddRecord(): void {
    // this.tranRec.ReconKey = '' ;
    this.utilSvc.cDebug(this.CLASSNAME, 'csvrecEd editmd: %s  DB: %s  Tran: %O', this.editMode, this.isInDB, this.tranRec) ;
    if (this.isChild) {
      const locAction = (this.isInDB) ? this.utilSvc.actionTypes.Update : this.utilSvc.actionTypes.Add
      this.tranMod.emit({ action: locAction, tranRec: this.tranRec }) ;
      this.expandedView = false ;     this.newRow = false ;
      return ;
    }
    delete this.tranRec.SplitParent ;   // In case fld got something, move it out
    if (this.isDirty) {
      this.utilSvc.dirtyTranUpdt(false, this.tranRec.TranId!)
      this.isDirty = false ;
    }
    // if (this.isParent)   this.tranRec.Amount = 0 ;  // Clear amount as this is logical tran only
    this.utilSvc.cLog(this.CLASSNAME, 'add isParent: %s  editMd: %s  isindb: %s  amt: %d',
      this.isParent, this.editMode, this.isInDB, this.tranRec.Amount)
    if (!this.editMode || !this.isInDB) {   // New record or record from OFX not yet in DB
      this.editMode = true ;    // Record saved, now can edit
      this.utilSvc.cDebug(this.CLASSNAME, 'tranedit calling addTrans1') ;
      this.fireSvc.addTrans(this.tranRec).
        then(docRef => {
          this.tranRec.TranId = docRef?.id ;
          if (this.isParent) {
            this.storeChildRows(this.tranRec, this.splitChildren, this.useSplitChild) ;
          }
          this.utilSvc.cDebug(this.CLASSNAME, 'Added record: %O', this.tranRec ) ;
          this.dispMsgs.push('Successfully added Record: ' + ++this.recordsAdded) ;
          this.tranMod.emit({ action: this.utilSvc.actionTypes.Add, tranRec: this.tranRec }) ;
        }).catch(error => {
          this.utilSvc.cWarn(this.CLASSNAME, 'Error Adding tran: %s', error) ;
        })
      this.expandedView = false ;     this.newRow = false ;
      if (!this.isInDB)   this.isInDB = true ;
      this.completedActions++ ;
    } else {
      this.fireSvc.updateTran(this.tranRec, this.tranRec).
        then(docRef => {
          this.dispMsgs.push('Update record successful') ;
          this.utilSvc.cDebug(this.CLASSNAME, 'Update success, DocRef id: %s  TranId: %s', docRef?.id, this.tranRec.TranId) ;
          this.expandedView = false ;
          if (this.isParent) {
            this.storeChildRows(this.tranRec, this.splitChildren, this.useSplitChild) ;
          }
          this.tranMod.emit({ action: this.utilSvc.actionTypes.Update, tranRec: this.tranRec }) ;
        }).catch(error => {
          this.utilSvc.cWarn(this.CLASSNAME, 'UpdtTranErr..RecordService: %s', error) ;
          this.dispMsgs.push('Error updating record') ;
        }) ;
      this.completedActions++ ;
    }
  }

  /*********************************************************************
    Delete current record
  ********************************************************************/
  onDeleteRecord(): void {    // I "think" this is fine for split trans as well
    if (this.isParent && this.tranRec.TranId) {
      for (const curTran of this.splitChildren) {     // For each child
        this.utilSvc.cDebug(this.CLASSNAME, 'Doing child %O', curTran)
        if (curTran.TranId) {    // If child in DB
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
    console.log('DeleteRec TranRec: %O  isChild: %s', this.tranRec, this.isChild)
    if (this.utilSvc.isTranDB(this.tranRec)) {    // Tran is in DB
      const delRtn = this.fireSvc.deleteTran(this.tranRec) ;
      if ( typeof delRtn === 'boolean') { return ;
      } else {
        if (this.isDirty) {
          this.utilSvc.dirtyTranUpdt(false, this.tranRec.TranId!)
          this.isDirty = false ;
        }
        delRtn.then(docRef => {
          this.dispMsgs.push('Successfully deleted Record') ;
          this.utilSvc.cDebug(this.CLASSNAME, 'Delete success, DocRef id %s  TranId: %s', docRef?.id, this.tranRec.TranId) ;
          this.tranMod.emit({ action: this.utilSvc.actionTypes.Delete, tranRec: this.tranRec }) ;
          this.expandedView = false ;
        }).catch(error => {
          this.utilSvc.cWarn(this.CLASSNAME, 'DeleteTranErr: %s', error) ;
          this.dispMsgs.push('Error Deleting transaction') ;
        }) ;
      }
      this.completedActions++ ;
    } else {
      if (this.isChild)     // onChildMod will remove from child arrays
        this.tranMod.emit({ action: this.utilSvc.actionTypes.Delete, tranRec: this.tranRec }) ;
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
    this.utilSvc.cDebug(this.CLASSNAME,'storeChildRows Parent: %O Children: %O  useList: %O ', tranRec, childRows, useList) ;
    this.fireSvc.add2ChildMap(tranRec.TranId!, childRows) ;
    for (let i = 0; i < childRows.length; i++) {
      childRows[i].SplitParent = tranRec.TranId ;
      switch (useList[i]) {
        case this.utilSvc.actionTypes.Update:
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
        case this.utilSvc.actionTypes.Add:
          this.utilSvc.cDebug(this.CLASSNAME, 'tranedit calling addTrans3') ;
          this.fireSvc.addTrans(childRows[i]).
          then(docRef => {
            childRows[i].TranId = docRef?.id ;
            this.utilSvc.cDebug(this.CLASSNAME, 'Back well to cpte w/childRow: %O', childRows[i])
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
    }
  }

  /** **********************************************************************************
   * This is called only on split Trans when a child tran emits event to parent tran.
   * tranRec should match an element of splitChildren array
   * @param action tran action (add, update, delete, cancel)
   * @param tranRec Transaction record
   *********************************************************************************** */
  onChildMod(action: string, tranRec: TranRec) {    // Need child in DB logic, coming
    this.utilSvc.cDebug(this.CLASSNAME, 'Called onChildMod action: %s Tran: %O', action, tranRec) ;
    const idx = this.splitChildren.findIndex((tr) => tr === tranRec) ;
    switch (action) {
      case this.utilSvc.actionTypes.Delete:
        if (idx > -1) {
          this.utilSvc.cDebug(this.CLASSNAME, 'delete on idx %d', idx)
          this.splitChildren.splice(idx, 1) ;   // Remove row from array
          this.useSplitChild.splice(idx, 1) ;
        }
        break ;
      case this.utilSvc.actionTypes.Add:
      case this.utilSvc.actionTypes.Update:
        this.utilSvc.cDebug(this.CLASSNAME, '%s on idx %d', action, idx)
        this.useSplitChild[idx] = action ;        // When processing at end, this row needs DB call
        break ;
      case this.utilSvc.actionTypes.Cancel:
        this.utilSvc.cDebug(this.CLASSNAME, 'cancel on idx %d', idx)
    }
    [this.allocdAmt, this.deltaAmt] = this.calcSplitAmount(this.splitChildren, this.useSplitChild) ;
  }

  /** ****************************************************************************
   * Called when unsplit button clicked.
   ***************************************************************************** */
  unsplitTran() {
    if (confirm('Are you sure you want to unsplit this transaction?  This will' +
      ' lose all data associated with the children')) {
      this.tranRec.TranType = (this.tranRec.Amount > 0) ? 'CREDIT' : 'DEBIT' ;

      this.fireSvc.updateTran(this.tranRec, this.tranRec).
        then(() => {
          this.dispMsgs.push('Unsplit record successful') ;
          this.utilSvc.cDebug(this.CLASSNAME, 'Unsplit Update success, TranId: %s', this.tranRec.TranId) ;
          this.expandedView = false ;
          this.isParent = false ;
          if (this.tranRec.TranId) { this.fireSvc.rmvChildren4Parent(this.tranRec.TranId)}
          for (let i = 0; i < this.splitChildren.length; i++) {
            const curChild = this.splitChildren[i] ;
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
          this.tranMod.emit({ action: this.utilSvc.actionTypes.UnSplit, tranRec: this.tranRec }) ;
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
    if (this.isDirty) {
      this.utilSvc.dirtyTranUpdt(false, this.tranRec.TranId!)
      this.isDirty = false ;
    }
  this.tranMod.emit({ action: this.utilSvc.actionTypes.Cancel, tranRec: this.tranRec }) ;
    this.expandedView = false ;
  }

  /** ****************************************************************************
   * Called when split tran button  is clicked.  Modify so this component changes
   * the way it handles the tran
   ***************************************************************************** */
  parentChange() {
    this.utilSvc.cDebug(this.CLASSNAME, 'parentChg: isParent: %s  tranrec: %O', this.isParent, this.tranRec)
    if (this.isParent)  return this.unsplitTran() ;     // Unsplit if already split
    this.utilSvc.cDebug(this.CLASSNAME, 'Splitting tran %O', this.tranRec) ;
    this.tranRec.TranType = 'TPARENT' ;   this.tranRec.TaxCat = 'NT'  // Set parent fields
    this.isParent = true ;
    if (!this.isInDB) {   // If not in DB, add it to DB for tranid srch ability
          // Add can fail w/no splitParent. So providing it
      if (!this.tranRec.SplitParent) { this.tranRec.SplitParent = '' ; }
      this.utilSvc.cDebug(this.CLASSNAME, 'Parent Change add Tran %O', this.tranRec) ;
        // Add the doc and tell caller it's new as won't be in array
      this.fireSvc.addTrans(this.tranRec).then(docRef => {
        this.tranRec.TranId = docRef.id ;
        this.tranMod.emit({ action: this.utilSvc.actionTypes.SplitNew, tranRec: this.tranRec }) ;
        this.isInDB = true ;   this.editMode = true ;
      }).catch(error => {
        this.utilSvc.cWarn(this.CLASSNAME, 'Adding parent tran %O for split failed w/error: %s', this.tranRec, error) ;
      })
    } else {
      this.tranMod.emit({ action: this.utilSvc.actionTypes.Split, tranRec: this.tranRec }) ;
    }
    this.addNewChildren()
  }

  isBalChg() {
    if (this.isParent && this.splitChildren.length > 0) {
      this.deltaAmt = this.tranRec.Amount - this.allocdAmt
    }
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
    if (['DEBIT', 'CHECK', 'CASH', 'DIRECTDEBIT', 'REPEATPMT', 'FEE', 'SRVCHG'].
      indexOf(this.tranRec.TranType) > -1) {
      if (this.tranRec.Amount > 0) {
        this.tranRec.Amount *= -1 ;
      }
    }
  }

  /*********************************************************************
    Use parameter to see if category defaults to a particular tax category
  ********************************************************************/
  onPreSetTaxcat(): void {
    if (this.tranRec.Project !== '') {
      this.tranRec.TaxCat = 'BE' ;
    } else {
      const curCategory =
        this.categoryTaxcat.find( ({RKey}) => RKey === this.tranRec.Category ) ;
      this.tranRec.TaxCat = (curCategory) ? this.tranRec.TaxCat = curCategory.RVal : '??' ;
    }
  }

  onMsgDel(idx: number, msg: string) {
    this.dispMsgs.splice(idx, 1) ;
  }

  /*****************************************************************************
     Event occurred to a row in child component for adding project dynamically
   *****************************************************************************/
  onProjMod(action: string, project: Project): void {
    let statusMsg = '' ;   this.newProj = false ;
    [statusMsg, this.newRow] = this.utilSvc.onProjMod(action, project) ;
    this.tranRec.Project = project.ProjectId! ;
    if (statusMsg !== '') this.dispMsgs.push(statusMsg)
  }

  ngOnDestroy(): void {
      this.project$.unsubscribe() ;
      this.projectq$.unsubscribe() ;
  }
}
