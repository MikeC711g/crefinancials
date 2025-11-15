import { Globals, KeyVal, globInfo, objwCid, genHelpers } from './../models/globals.model';
import { Injectable } from '@angular/core';
import { GenutilsService } from './genutils.service';
import { FirebaseService } from './firebase.service';
import { BalAdjust, Lease } from '../models/house.model';
import { TranQ, TranRec } from '../models/TranRec.model';

// TODO: Create interface for function to call for each type. Interface should include
// action, gtype, newrow, oldrow, locArray, fbglobals. Take as optional and only call if there.
// With this, look at possibly dropping onGlobalMod and doing all through genGlobMod (new name?)
// Same API, but 2 functions, one PRE firestore and one post.
// Obviously also do the balAdj in here
@Injectable({
  providedIn: 'root'
})

/**
 * Service used often by administrative components to handle common or complex logic that is dependent ONLY
 * on genutils or firebase services.  Similar to genUtils but with firebase dependencies.
 */
export class GlobalModsService {
  CLASSNAME = 'globalMods'
  globInfoMap: Map<string, globInfo> = new Map<string, globInfo>() ;
  leases: Lease[] = new Array<Lease>() ;  
  
  constructor(private utilSvc: GenutilsService, private fireSvc: FirebaseService) {
    this.globInfoMap.set(utilSvc.globalTypes.RuleData, new globInfo('TranRules', 'RuleId', 'ruleName',
      ['Annotation', 'Category', 'TaxCat', 'House', 'TranExtra', 'TranType'])) ;
    this.globInfoMap.set(this.utilSvc.globalTypes.Houses, new globInfo('Houses', 'HouseId', 'name')) ;
    this.globInfoMap.set(this.utilSvc.globalTypes.Mortgages, new globInfo('Mortgages', 'MortgageId', 'house')) ;
    this.globInfoMap.set(this.utilSvc.globalTypes.Leases, new globInfo('Leases', 'LeaseId', 'House')) ;
    this.globInfoMap.set(this.utilSvc.globalTypes.Residents, new globInfo('Residents', 'ResidentId', 'LName')) ;
  }

  genCategoryMap(catFolders: KeyVal[], catTaxcat: KeyVal[]): Map<string, KeyVal[]> {
    const curMap: Map<string, KeyVal[]> = new Map<string, KeyVal[]>() ;
    for (const catFolder of catFolders) {
      curMap.set(catFolder.RKey, catTaxcat.filter((dt) => catFolder.RVal.includes(dt.RKey)))
    }
    this.utilSvc.cLog(this.CLASSNAME, 'genCategoryMap w/map: %O', curMap)
    return curMap ;
  }

  leaseDateVerify(lease: Lease): boolean {
    const leases = this.fireSvc.getLeases() ;
      // List of nonCancelled leases for this house that have a date conflict with current lease
    const problemLeases = leases.filter(l => (l.StartDt <= lease.StartDt && l.EndDt >= lease.StartDt) ||
      (l.StartDt <= lease.EndDt && l.EndDt >= lease.EndDt) && !l.cancelled)
    if (problemLeases.length > 0) {
      const msg = `${problemLeases.length} leases found that overlap with this lease's dates, terminate those leases?` ;
      const cutLeases = confirm(msg) ;
      if (cutLeases) {
        const cancelDt = new Date().toISOString().substring(0,10) ;
        for (const pLease of problemLeases) {
          pLease.cancelled = true ;
          pLease.cancelDt = cancelDt
          const leaseAny: any = pLease as any ;    const leaseObj = leaseAny as objwCid ;
          this.fireSvc.updtGenGlob(leaseObj, leaseObj, 'Leases', 'LeaseId') ;
        }
        return true ;
      } else return false ;
    } else return true ;
  }

  /**
   * Takes prior lease, retrieves payment/charge info, calculates late fees, and handles all up through
   * last day of prior lease.  Assumes home rented to same resident(s) with no changes in rent/fees. If
   * there are changes, those need to be handled manually.
   * @param lease Prior lease with startBal, startDt, and house all populated
   * @returns Calculated balance as of endDt of prior lease
   */
  calcLeaseBeginBal(lease: Lease): Promise<number> { // Future efficiency is let queries run in parallel
    return new Promise<number>((resolve) => {
      const tq = new TranQ(lease.StartDt, lease.EndDt) ;  tq.House = [ lease.House ] ;
      tq.Category = [ 'Rent Income' ] ;
      const tran$ = this.fireSvc.getTransFromDB(tq, false).subscribe({
        next: (trans) => {
          const balAdj$ = this.fireSvc.getBalAdj4House(lease.House).subscribe({
            next: (adjustments) => {
              resolve(this.calcBeginBal(lease, trans, adjustments)) ;
            }
          })
          setTimeout(() => { balAdj$.unsubscribe }, 15000);
        }
      })
      setTimeout(() => { tran$.unsubscribe }, 30000);
    })
  }

  setLeases(leases: Lease[]) { this.leases = leases ; }

  /**
   * A date was changed on a lease. If it causes an overlap with another lease for the same house, offer to
   * adjust the other lease to eliminate the overlap. If offer declined, return false and revert date
   * @param newLease current lease including modified date
   * @param isStart is start date or end date what we are checking
   * @param idx Which idx in array is current lease (ignore self when checking)
   * @returns boolean true if no overlap or overlap adjusted, false if overlap and not adjusted
   */
  checkLeaseOverlap(newLease: Lease, isStart: boolean, idx: number): boolean {
    const filtLeases = this.leases.filter( l => l.House === newLease.House) ;
    for (let i = 0 ; i < filtLeases.length; i++ ) {
      if (i === idx) continue ;  // Skip self
      const lse = filtLeases[i] ;
      if (isStart) {
        if ((newLease.StartDt >= lse.StartDt && newLease.StartDt < lse.EndDt && !lse.cancelled)) {
          if (confirm('Start Date overlaps with existing lease, adjust dates on other lease?')) {
            console.log('Would adjust date on lease: %O because startDt %s', lse, newLease.StartDt);
            lse.EndDt = newLease.StartDt ;
            this.updtLease(lse) ;
          } else return false ;
        }
      } else {
        if ((newLease.EndDt > lse.StartDt && newLease.EndDt <= lse.EndDt && !lse.cancelled)) {
          if (confirm('End Date overlaps with existing lease, adjust dates on other lease?')) {
            console.log('Would adjust date on lease: %O because endDt %s', lse, newLease.EndDt);
            lse.StartDt = newLease.EndDt ;
            this.updtLease(lse) ;
          } else return false ;
        }
      }
    }
    return true ;
  }

  /**
   * If date change on lease would cause an overlap, adjust other lease to eliminate overlap
   * @param lease 
   * @returns Promise
   */
  updtLease(lease: Lease): Promise<string> {
    const leaseAny: any = lease as any ;    const leaseObj = leaseAny as objwCid ;
    return this.fireSvc.updtGenGlob(leaseObj, leaseObj, 'Leases', 'LeaseId') ;
  }

  // Identify if lease ends between 6 months ago and 6 mopnths from now
  isLeaseCurrent(lease: Lease): boolean {
    if (lease.cancelled) return false ;
    const currDt = new Date() ;
    const oldDt =this.utilSvc.getDate(currDt, -180) ;
    const newDt = this.utilSvc.getDate(currDt, 180) ;
    return (lease.EndDt >= oldDt && lease.EndDt <= newDt);
  }

  tempLoadForLeaseTest() {
    const leases: Lease[] = [] ;
    leases.push(new Lease('test1', '111PR', true, false, '', '2022-10-01', '2023-09-30', 1200, 0, 1, 60, 5, 1200,
      0, 0, ['43v65kB313Y9jhfCSnDt', '60qZqs7CTbHWUeJc2c7S']))
    leases.push(new Lease('test1', '111PR', true, false, '', '2023-10-01', '2024-09-30', 1210, 0, 1, 60, 5, 1210,
      0, 0, ['43v65kB313Y9jhfCSnDt', '60qZqs7CTbHWUeJc2c7S']))
    leases.push(new Lease('test1', '111PR', true, false, '', '2024-10-01', '2025-09-30', 1220, 0, 1, 60, 5, 1220,
      0, 0, ['43v65kB313Y9jhfCSnDt', '60qZqs7CTbHWUeJc2c7S']))
    for (const lease of leases) {
      const objAny: any = lease as any ;   const leaseObj = objAny as objwCid ;
      this.fireSvc.addGenGlob(leaseObj, 'Leases', 'LeaseId', []) ;
    }
    const trans: TranRec[] = [] ;
    trans.push(new TranRec('test1', '2024-10-02', 'phChecking', 'Rent Income', 'Deposit', 1220, '', 'BI',
      '111PR', '', '', '', 'Fit123')) ;
    trans.push(new TranRec('test1', '2024-11-02', 'phChecking', 'Rent Income', 'Deposit', 1220, '', 'BI',
      '111PR', '', '', '', 'Fit124')) ;
    trans.push(new TranRec('test1', '2024-12-02', 'phChecking', 'Rent Income', 'Deposit', 1220, '', 'BI',
      '111PR', '', '', '', 'Fit125')) ;
    trans.push(new TranRec('test1', '2025-01-02', 'phChecking', 'Rent Income', 'Deposit', 1220, '', 'BI',
      '111PR', '', '', '', 'Fit126')) ;
    trans.push(new TranRec('test1', '2025-02-02', 'phChecking', 'Rent Income', 'Deposit', 1200, '', 'BI',
      '111PR', '', '', '', 'Fit127')) ;
    trans.push(new TranRec('test1', '2025-03-02', 'phChecking', 'Rent Income', 'Deposit', 1220, '', 'BI',
      '111PR', '', '', '', 'Fit128')) ;
    trans.push(new TranRec('test1', '2025-04-02', 'phChecking', 'Rent Income', 'Deposit', 1100, '', 'BI',
      '111PR', '', '', '', 'Fit129')) ;
    trans.push(new TranRec('test1', '2025-05-02', 'phChecking', 'Rent Income', 'Deposit', 1820, '', 'BI',
      '111PR', '', '', '', 'Fit130')) ;
    trans.push(new TranRec('test1', '2025-06-02', 'phChecking', 'Rent Income', 'Deposit', 1220, '', 'BI',
      '111PR', '', '', '', 'Fit131')) ;
    trans.push(new TranRec('test1', '2025-07-02', 'phChecking', 'Rent Income', 'Deposit', 1220, '', 'BI',
      '111PR', '', '', '', 'Fit132')) ;
    trans.push(new TranRec('test1', '2025-08-02', 'phChecking', 'Rent Income', 'Deposit', 1220, '', 'BI',
      '111PR', '', '', '', 'Fit133')) ;
    trans.push(new TranRec('test1', '2025-09-02', 'phChecking', 'Rent Income', 'Deposit', 1220, '', 'BI',
      '111PR', '', '', '', 'Fit134')) ;
    trans.push(new TranRec('test1', 'tdate', 'acct', 'cat', 'ttype', 100, 'textra', 'tcat', 'house', 
      'proj', 'annot', 'reconk', 'fitid', 'tranid', 'splitpar'))
    for (const ctran of trans) {
      delete ctran.SplitParent ;
      this.fireSvc.addTrans(ctran, false)
    }
    const balAdjusts: BalAdjust[] = [] ;
    balAdjusts.push(new BalAdjust('test1', '2025-01-15', '111PR', 'lateFee', 50)) ;
    balAdjusts.push(new BalAdjust('test1', '2025-02-11', '111PR', 'newBill', 30)) ;
    balAdjusts.push(new BalAdjust('test1', '2025-03-15', '111PR', 'lateFee', 50)) ;
    for (const adj of balAdjusts) {
      const adjAny: any = adj as any ;   const adjObj = adjAny as objwCid ;
      this.fireSvc.addGenGlob(adjObj, 'BalAdjust', 'BalAdjId', ['deletedDate', 'Comment']) ;
    }
  }

  /**
   * Using the data, determine what current balance is at closing of lease
   * @param lease Lease prior to new lease being created/renewed
   * @param trans 
   * @param balAdjusts 
   */
  calcBeginBal(lease: Lease, trans: TranRec[], balAdjusts: BalAdjust[]): number {
    let newBal = 0 ;  let newAdjusts: BalAdjust[] = [] ;
    [newBal, newAdjusts] = this.utilSvc.calcLateFees(lease, trans, balAdjusts) ;
    for (const adj of newAdjusts) {
      const adjAny: any = adj as any ;   const adjObj = adjAny as objwCid ;
      this.fireSvc.addGenGlob(adjObj, 'BalAdjust', 'BalAdjId', ['deletedDate', 'Comment']) ;
    }   // Not catching promise as we don't need to fill in new ID here
    return newBal ;
  }

  // This function handles persisting all globals that are in the globals collection
  onGlobalMod(action: string, gType: string, newGlob: Globals, oldGlob: Globals, fbGlobals: Globals[],
    accountTypes: string[], tranTypes: string[], accounts: KeyVal[], categorFolders: KeyVal[],
    categoryTaxcat: KeyVal[], taxCats: KeyVal[], cid: string): [number, string] {
    let actionCnt = 0 ;  let statusMsg = ''
    let globalId = (action === this.utilSvc.actionTypes.Add ||
      action === this.utilSvc.actionTypes.Cancel) ? '' :
      this.getKId4Global(gType, newGlob, oldGlob, fbGlobals) ;  // If existing row, get GID
    this.utilSvc.cLog(this.CLASSNAME, 'into onParmMod w/action: %s  Tp: %s  new: %O  old: %O  gid: %s', action,
      gType, newGlob, oldGlob, globalId) ;
    if (globalId === this.utilSvc.noGid) {
      this.utilSvc.cWarn(this.CLASSNAME,'Did not find GID so cannot process request')
      return [0, 'Failed to update category folder, found no key'];
    }
    let isErr = false ;
    let updResp: string | Promise<any> ;    let delResp: string | Promise<any> ;
    actionCnt++ ;   // Unless cancel, this is an added action
    switch (action) {
      case this.utilSvc.actionTypes.Add:
        this.fireSvc.addGlobal(newGlob).then(docRef => {
          globalId = docRef?.id ;
          newGlob.GlobalId = globalId ;
          this.utilSvc.cDebug(this.CLASSNAME,'onGlobalMod called addGlobal. globalId: %s cid %s', globalId, cid)
          statusMsg = 'Successfully added: ' + gType ;
          this.modGlobalArr(action, globalId, gType, newGlob, fbGlobals, cid) ;
        }).catch(error => {
          statusMsg = 'Failed to add: ' + gType ;
          this.utilSvc.cWarn(this.CLASSNAME, 'Failed to add: %s  Val: %O  err: %s', gType, newGlob, error) ;
          isErr = true ;
        })
        break ;
      case this.utilSvc.actionTypes.Update:
        this.utilSvc.cLog(this.CLASSNAME, 'update parmTp: %s old: %O new: %O gid: %s', gType, oldGlob, newGlob, globalId) ;
        updResp = this.fireSvc.updateGlobal(gType, oldGlob, newGlob, globalId) ;
        if (typeof updResp === 'string') {
          statusMsg = 'Failed to update: ' + gType ;
          this.utilSvc.cWarn(this.CLASSNAME,'Failed to update: %s  Val: %O  Failed to find GId', gType, newGlob) ;
          isErr = true ;
        } else {
          updResp.then(() => {
            this.utilSvc.cLog(this.CLASSNAME,'Successfully updated global id: %s newRow: %O', globalId, newGlob) ;
            statusMsg = 'Successfully updated: ' + gType ;
            this.modGlobalArr(action, globalId, gType, newGlob, fbGlobals, cid) ;
          }).catch(error => {
            statusMsg = 'Failed to udpate: ' + gType ;
            this.utilSvc.cWarn(this.CLASSNAME,'Failed to update: %s  Val: %O  Err: %s', gType, newGlob, error) ;
            isErr = true ;
          })
        }
        break ;
      case this.utilSvc.actionTypes.Delete:
        delResp = this.fireSvc.deleteGlobal(gType, newGlob, globalId) ;
        if (typeof delResp === 'string') {
          statusMsg = 'Failed to delete: ' + gType ;
          this.utilSvc.cWarn(this.CLASSNAME, 'Failed to delete: %s  Val: %O  Failed to find GID', gType, newGlob) ;
          isErr = true ;
        } else {
          delResp.then(() => {
            statusMsg = 'Successfully deleted: ' + gType ;
            this.modGlobalArr(action, globalId, gType, newGlob, fbGlobals, cid) ;
          }).catch(error => {
            statusMsg = 'Failed to delete: ' + gType ;
            this.utilSvc.cWarn(this.CLASSNAME,'Failed to delete: %s  Val: %O  Err: %s', gType, newGlob, error) ;
            isErr = true ;
          })
        }
        break ;
      case this.utilSvc.actionTypes.Cancel:
        actionCnt-- ; break ;
      default:
        this.utilSvc.cWarn(this.CLASSNAME,'Invalid actionx: %s', action)
    }

    let kvNew: KeyVal, kvOld: KeyVal ;
    switch (gType) {
      // case this.utilSvc.globalTypes.AccountTypes:
      // case this.utilSvc.globalTypes.TranTypes:
        // this.modSingles(action, gType, globalId, newGlob.RKey, oldGlob.RKey, accountTypes, tranTypes) ;  break ;
      case this.utilSvc.globalTypes.CategoryTaxcats:
      case this.utilSvc.globalTypes.CategoryFolders:
      case this.utilSvc.globalTypes.Accounts:
      case this.utilSvc.globalTypes.TaxCats:
        kvNew = new KeyVal(newGlob.RKey, newGlob.RVal!) ;
        kvOld = new KeyVal(oldGlob.RKey, oldGlob.RVal!) ;
        this.modKv(action, gType, globalId, kvNew, kvOld, categorFolders, categoryTaxcat,
          taxCats, accounts) ; break ;
      default:
        this.utilSvc.cWarn(this.CLASSNAME, 'Invalid type: %s', gType) ;
    }
    return [actionCnt, statusMsg]
  }

  // genGlobMod is a generic mod for globals with their own tables. As of this comment, it
  // includes rules/houses/mortgages/leases/residents.  It calls generic(ish) firestore funcs
  genGlobMod(action: string, gType: string, newRow: objwCid, oldRow: objwCid, entArr: objwCid[]):
     [number, string] {
    const helper: genHelpers = { action: action, gType: gType, newRow: newRow, oldRow: oldRow,
      objArr: entArr, isPreProc: true } ;
    let actionCnt = 0 ;  let statusMsg = ''
    let isErr = false ;
    let updResp: string | Promise<any> ;    let delResp: string | Promise<any> ;
    actionCnt++ ;   // Unless cancel, this is an added action
    const globInfo = this.globInfoMap.get(gType) ;
    if (!globInfo) { console.log('oh crumbs') 
    } else {
      // Pre processing here
      helper.isPreProc = false ;
      switch (action) {
        case this.utilSvc.actionTypes.Add:
          this.fireSvc.addGenGlob(newRow, globInfo.collectNm, globInfo.idVar, globInfo.flds2Del).
          then(docRef => {
            newRow[globInfo.idVar] = docRef?.id ;
            statusMsg = `Successfully added ${gType}` ;
            // post processing here
            if (entArr.length === 0 || newRow[globInfo.sortVar] > entArr[entArr.length - 1][globInfo.sortVar]) {
              entArr.push(newRow) ;   // First or highest key so just add to end
            } else {
              const idx = entArr.findIndex(ent => ent[globInfo.sortVar].localeCompare(newRow[globInfo.sortVar]) > 0) ;
              entArr.splice(idx, 0, newRow) ;   // Should sort here or insert into sorted array
            }
          }).catch(error => {
            statusMsg = `Failed to add ${gType}` ;  actionCnt-- ;
            this.utilSvc.cWarn(this.CLASSNAME, 'Failed to add %s  Val: %O  err: %s', gType, newRow, error) ;
            isErr = true ;
          })
          break ;
        case this.utilSvc.actionTypes.Update:
          updResp = this.fireSvc.updtGenGlob(oldRow, newRow, globInfo.collectNm, oldRow[globInfo.idVar])
          if (typeof updResp === 'string') {
            statusMsg = `Failed to update ${gType}` ;  actionCnt-- ;
            this.utilSvc.cWarn(this.CLASSNAME,'Failed to update %s Val: %O  Error: %s', gType, newRow, updResp) ;
            isErr = true ;
          } else {
            updResp.then(() => {
              statusMsg = `Successfully updated ${gType}` ;
              // pre or post processing here
              if (oldRow[globInfo.sortVar] !== newRow[globInfo.sortVar]) {  // Key flds modified, move row in array
                  // Array key modified, but needs to be moved to proper spot in array. So find, rmv, insert
                const idx = entArr.findIndex(ent => ent[globInfo.sortVar].localeCompare(oldRow[globInfo.sortVar]) === 0) ;
                entArr.splice(idx, 1) ;   // Remove old row from array
                if (newRow[globInfo.sortVar] > entArr[entArr.length - 1][globInfo.sortVar]) {
                  entArr.push(newRow) ;   // new highest key so just add to end
                } else {
                  const nidx = entArr.findIndex(ent => ent[globInfo.sortVar].localeCompare(newRow[globInfo.sortVar]) > 0) ;
                  entArr.splice(nidx, 0, newRow) ;
                }
              }
            }).catch(error => {
              statusMsg = `Failed to update ${gType}` ;  actionCnt-- ;
              this.utilSvc.cWarn(this.CLASSNAME,'Failed to update %s Old: %O New: %O  Err: %s', gType, oldRow, newRow, error) ;
              isErr = true ;
            })
          }
          break ;
        case this.utilSvc.actionTypes.Delete:
          delResp = this.fireSvc.deleteGenGlob(oldRow, globInfo.collectNm, oldRow[globInfo.idVar]) ;
          if (typeof delResp === 'string') {
            statusMsg = `Failed to delete ${gType}` ;  actionCnt-- ;
            this.utilSvc.cWarn(this.CLASSNAME, 'Failed to delete %s  Val: %O  error: %s', gType, oldRow, delResp) ;
            isErr = true ;
          } else {
            delResp.then(() => {
              statusMsg = `Successfully deleted ${gType}` ;
              // pre or post processing here
              const idx = entArr.findIndex(ent => ent[globInfo.idVar].localeCompare(oldRow[globInfo.idVar]) === 0) ;
              entArr.splice(idx, 1) ;
            }).catch(error => {
              statusMsg = `Failed to delete ${gType}` ;  actionCnt-- ;
              this.utilSvc.cWarn(this.CLASSNAME,'Failed to delete %s Val: %O  Err: %s', gType, oldRow, error) ;
              isErr = true ;
            })
          }
          break ;
        case this.utilSvc.actionTypes.Cancel:
          // pre or post processing here
          actionCnt-- ; break ;
        default:
          this.utilSvc.cWarn(this.CLASSNAME,'Invalid actionx: %s', action)
      }
    }
    return [actionCnt, statusMsg]
  }
  
  preNPostProc(helper: genHelpers, globalInfo: globInfo): [boolean, string] {
    if (helper.isPreProc && helper.gType === this.utilSvc.globalTypes.Leases) { // Before DB work for a lease
      // Pull current flag out of lease (can just check date vs current date)
      // Pull other leases for house and make sure no date overlaps. If overlap, alert.
      // Back in ADD ... provide "renew" function to copy old and calculate balance forward
      // In updates, check for valid dates
      // So method here takes a lease and a date and calculates current balance considering
      // Start w/lease startBal, BalAdj (adding late fees as needed after checking), up to that date
      // SubFunc takes elements from lease + baladj array + rent income pmts from trans between dates and
      // calculates and adds late fees.  SubFunc that gets rent income tran array and BalAdjust (after late
      // fees calc'd) and returns balance on that closing date. Start date implied by start date on rent
      // Back to lease, remove generic Add lease and, like BalAdj, choose house first.
      // Then filter lease arr for that house.  Arranged in reverse order. First, if current (not ended)
      // can be renewed which carries all over.  If changing residents, no renew.  If renew: Bring forth:
      // Cid, house, Rent, AdlMthlyFees, RentDueDom, LateFee, GracePeriod, SecurityDeposit, AdlStartupFees,
      // ResidentArr. Then calc and supply StartDt, EndDt, StartBal.  If NOT renewing: Cid, House, StartBal=0,
      // startDt is next 1st and endDt is 364 days later (365 on leap).  On change of dates ... only allow back
      // 1 yr for start and check for overlap with prior. If overlap, alert to end prior lease ahead.
      // Remove currentFlag and consider a cancel flag or date/reason. Maybe have button for New, Renew, Cancel
      // on first lease. No options for others.

      return [true, ''] ;
    }
    return [true, ''] ;
  }
  
  /**
   * getKId4Global searches current global array to find ID for DB from original array since
   * this value is NOT included in subArrays for components which do not need it.  Only admin
   * needs it. Note for arrays we use nrval (new) as array is updated in place ... for strings,
   * we use rval (old) since globals won't have been updated.
   * @param gType : Type of global
   * @param newGlobal : New value (if not available, dup old val) for items that get modified
   * like array items and such
   * @param oldGlobal : Old or original value
   * @returns : Global ID for row in DB or string noGid if not found
   */
  getKId4Global(gType: string, newGlobal: Globals, oldGlobal: Globals, fbGlobals: Globals[]): string {
    const tGlob = fbGlobals.find(fbGlobal => fbGlobal.GType == gType && fbGlobal.RKey === oldGlobal.RKey);
    return (tGlob) ? tGlob.GlobalId! : this.utilSvc.noGid ;
  }

  // To avoid extra refreshing of globals from FB during mass editing of globals
  modGlobalArr(action: string, gid: string, rKey: string, newGlob: Globals, fbGlobals: Globals[], cid: string) {
    this.utilSvc.cDebug(this.CLASSNAME, 'modGlobalArr with action: %s gid: %s  and key: %s  rVal: %O', action, gid, rKey, newGlob) ;
    let idx = -1 ;
    if (action === this.utilSvc.actionTypes.Delete || action === this.utilSvc.actionTypes.Update) {
      idx = fbGlobals.findIndex(gVal => gVal.GlobalId === gid) ;
    }
    switch (action) {
      case this.utilSvc.actionTypes.Delete:
        fbGlobals.splice(idx, 1) ; break ;
      case this.utilSvc.actionTypes.Update:
        newGlob.GlobalId = gid ;    fbGlobals[idx] = newGlob ;
        break ;
      case this.utilSvc.actionTypes.Add:
        fbGlobals.push(newGlob) ;
        break ;
      default:
        this.utilSvc.cWarn(this.CLASSNAME, 'Invalid action in modGlobalArr: %s', action)
    }
  }

  modKv(action: string, parmType: string, gId: string, newVal: KeyVal, oldVal: KeyVal,
    categoryFolders: KeyVal[], categoryTaxcat: KeyVal[], taxCats: KeyVal[], accounts: KeyVal[]) {
    let kvArr: KeyVal[] = [] ;
    switch (parmType) {
      case this.utilSvc.globalTypes.CategoryFolders: kvArr = categoryFolders ; break ;
      case this.utilSvc.globalTypes.CategoryTaxcats: kvArr = categoryTaxcat ; break ;
      case this.utilSvc.globalTypes.TaxCats: kvArr = taxCats ; break ;
      case this.utilSvc.globalTypes.Accounts: kvArr = accounts ; break ;
    }
    let idx: number ;
    switch (action) {   // Hereiam: Do I need to find and replace or is kv updtd prior
      case this.utilSvc.actionTypes.Update:
        if (newVal.RKey !== oldVal.RKey) {
          kvArr = kvArr.sort((a, b) => a.RKey.localeCompare(b.RKey)) ;
        }
        break ;
      case this.utilSvc.actionTypes.Delete:
        idx = kvArr.findIndex(rVal => rVal.RKey === newVal.RKey) ;
        if (idx > -1) {
          kvArr.splice(idx, 1) ;
        } else {
          this.utilSvc.cWarn(this.CLASSNAME,'Failed to remove category %s: taxCat %s from categoryTaxcat',
            oldVal.RKey, oldVal.RVal) ;
        }
        break ;
      case this.utilSvc.actionTypes.Add:
        kvArr.push(newVal) ;
        kvArr = kvArr.sort((a, b) => a.RKey.localeCompare(b.RKey)) ;
    }
  }
}
