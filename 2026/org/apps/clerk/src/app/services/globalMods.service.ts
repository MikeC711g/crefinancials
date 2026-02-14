import { Observable, Subject } from 'rxjs';
import { Globals, KeyVal, globInfo, objwCid } from './../models/globals.model';
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
  leases: Lease[] = new Array<Lease>() ;   balAdjs: BalAdjust[] = new Array<BalAdjust>() ;
  isFutureLease = false ;  balanceList: number[] = [] ;

  constructor(private utilSvc: GenutilsService, private fireSvc: FirebaseService) {
    this.globInfoMap.set(utilSvc.globalTypes.RuleData, new globInfo('TranRules', 'RuleId', 'ruleName',
      ['Annotation', 'Category', 'TaxCat', 'House', 'TranExtra', 'TranType'])) ;
    this.globInfoMap.set(this.utilSvc.globalTypes.Houses, new globInfo('Houses', 'HouseId', 'name')) ;
    this.globInfoMap.set(this.utilSvc.globalTypes.Mortgages, new globInfo('Mortgages', 'MortgageId', 'house')) ;
    this.globInfoMap.set(this.utilSvc.globalTypes.Leases, new globInfo('Leases', 'LeaseId', 'House')) ;
    this.globInfoMap.set(this.utilSvc.globalTypes.Residents, new globInfo('Residents', 'ResidentId', 'LName')) ;
    this.globInfoMap.set(this.utilSvc.globalTypes.Projects, new globInfo('Projects', 'ProjectId', 'StartDt')) ;
    this.globInfoMap.set(this.utilSvc.globalTypes.BalAdjust, new globInfo('BalAdjust', 'BalAdjId', 'ADate',
      ['deletedDate','Comment'] )) ;
  }

  /******************************************************************************************
   * Generate map of categories, taxCats, and catFolders
   * @param catFolders List of category folders including folder name and list of categories
   * @param catTaxcat list of categories including category name and tax cat for that category
   * @returns Map of category folder name and list of categories w/taxcats
   *****************************************************************************************/
  genCategoryMap(catFolders: KeyVal[], catTaxcat: KeyVal[]): Map<string, KeyVal[]> {
    const curMap: Map<string, KeyVal[]> = new Map<string, KeyVal[]>() ;
    for (const catFolder of catFolders) {
      curMap.set(catFolder.RKey, catTaxcat.filter((dt) => catFolder.RVal.includes(dt.RKey)))
    }
    this.utilSvc.cLog(this.CLASSNAME, 'genCategoryMap w/map: %O', curMap)
    return curMap ;
  }

  /******************************************************************************************
   * @param lease
   * @returns
   *****************************************************************************************/
  leaseDateVerify(lease: Lease): boolean {
    const leases = this.fireSvc.getLeases() ;
      // List of nonCancelled leases for this house that have a date conflict with current lease
    const problemLeases = leases.filter(l => (l.StartDt <= lease.StartDt && l.EndDt >= lease.StartDt) ||
      (l.StartDt <= lease.EndDt && l.EndDt >= lease.EndDt) && l.cancelDt === '')
    if (problemLeases.length > 0) {
      const msg = `${problemLeases.length} leases found that overlap with this lease's dates, terminate those leases?` ;
      const cutLeases = confirm(msg) ;
      if (cutLeases) {
        const cancelDt = new Date().toISOString().substring(0,10) ;
        for (const pLease of problemLeases) {
          pLease.cancelDt = cancelDt
          const leaseAny: any = pLease as any ;    const leaseObj = leaseAny as objwCid ;
          this.fireSvc.updtGenGlob(leaseObj, leaseObj, 'Leases', 'LeaseId') ;
        }
        return true ;
      } else return false ;
    } else return true ;
  }

  getCategoryForDates(house: string, startDt: string, endDt: string, category: string): Observable<TranRec[]> {
    const tranQ = new TranQ(startDt, endDt) ;  tranQ.House = [ house ] ;
    tranQ.Category = [ category ] ;
    return this.fireSvc.getTransFromDB(tranQ, false) ;
  }

  /**
   * Takes prior lease, retrieves payment/charge info, calculates late fees, and handles all up through
   * last day of prior lease.  Assumes home rented to same resident(s) with no changes in rent/fees. If
   * there are changes, those need to be handled manually.
   * @param lease Prior lease with startBal, startDt, and house all populated
   * @returns Calculated balance as of endDt of prior lease
   */
  getBalAdjustList(tranRecs: TranRec[], date: string): BalAdjust[] {
    const curLease = this.leases[(this.isFutureLease) ? 1 : 0] ;
    if (!curLease || curLease.StartDt > date || curLease.cancelDt !== '' || curLease.EndDt < date) {
      this.utilSvc.cWarn(this.CLASSNAME,'calcHouseBal called with invalid lease: %O  date: %s', curLease, date)
      return [] ;
    }   // Filter adjustments outside of date range, then add in lease start and rent oncome entries
    const filtBalAdj = this.balAdjs.filter( ba => ba.ADate >= curLease.StartDt && ba.ADate <= date) ;
    for (const tr of tranRecs) {
      filtBalAdj.push(new BalAdjust(tr.Cid, tr.TranDate, tr.House, 'Rent Income', tr.Amount )) ;
    }
    filtBalAdj.sort((a, b) => a.ADate.localeCompare(b.ADate)) ;
    filtBalAdj.splice(0, 0, new BalAdjust(curLease.Cid, curLease.StartDt, curLease.House, 'Beginning Balance', curLease.StartBal) ) ;
    this.addLateFees(filtBalAdj, curLease, date) ;
    return filtBalAdj ;
  }

  /**
   * Take proper list of balance adjustements + lease, get date of all late fees between lease
   * start and specified date, then at each date, determine if balance is negative. If so, add a
   * late fee to the list.  Other balance adjustments do NOT impact late fees. That is, an added
   * bill (say for landlord buying propane) does not cause a late fee.  Late fees are based only
   * on rent, rent due, and other late fees.  Late fees do not automatically go away if a payment
   * is added after the fact, but can be manually deleted by entering the delete date.
   * @param balAdjusts results of getBalAdjustList
   * @param lease
   * @param date End date through which to generate late fees (if any)
   */
  addLateFees(balAdjusts: BalAdjust[], lease: Lease, date: string) {
    const lateFeeDates = this.utilSvc.getLateFeeDates(lease).filter( dt => dt <= date ) ;
    let tmpDt = new Date(lease.StartDt) ;   let curBal = 0 ;
    tmpDt.setDate(tmpDt.getDate() -1 ) ;  // Move back 1 day since loop increments by 1
    for (let i = 0; i < lateFeeDates.length; i++) {   // For every late fee in lease period up to date
      tmpDt.setDate(tmpDt.getDate() +1 ) ;    // This moves date to 1 past last late fee date processed
      const lfDtStr = lateFeeDates[i] ;
      const startDt = tmpDt.toISOString().substring(0,10) ;
        // Find date rent is due and add rent due to array (not to BalAdjust DB)
      const lfDate = new Date(lfDtStr) ;   lfDate.setDate(lease.RentDueDom) ; // Add rent due to array
      const rdDate = lfDate.toISOString().substring(0,10) ;
      balAdjusts.push(new BalAdjust(lease.Cid, rdDate, lease.House, 'Rent Due', lease.Rent*-1)) ;
        // Filter all badadjust trans for this period (including rent due and rent income)
      const curAdjusts = balAdjusts.filter( ba => ba.ADate >= startDt && ba.ADate <= lfDtStr &&
        (ba.AType === 'Rent Due' || ba.AType === 'Rent Income' || ba.AType === 'Late Fee')
       ) ;    // For determmining new late fees, only rent (in/out) and late fees are counted
        // See if late fee already applied for the period and calculate balance at end of period
      const isFeeDone = (curAdjusts.find( ba => ba.AType === "Late Fee" ) !== undefined) ? true : false ;
      curBal  += curAdjusts.reduce((sum, ba) => sum + ((ba.deletedDate !== '') ? ba.Amount : 0), 0) ;
      if (curBal < 0 && !isFeeDone) {   // If balance due, add late fee to array and DB
        const newRow = new BalAdjust(lease.Cid, lfDtStr, lease.House, 'Late Fee', lease.LateFee * -1) ;
        balAdjusts.push(newRow) ;
        delete newRow.deletedDate ;  delete newRow.Comment ;  delete newRow.BalAdjId ;
        console.log('NewRow w/lateFee: %O', newRow) ;
        const anyRow: any = newRow as any ;    const globRow = anyRow as objwCid ;
        this.fireSvc.addGenGlob(globRow, this.utilSvc.tblNames.BalAdjust, 'BalAdjId', []).
          then(docRef => {    // Row pushed w/out id to catch sort, so now update in array
            const inRow = balAdjusts.find( ba => ba.ADate === newRow.ADate && ba.AType === newRow.AType) ;
            if (inRow) inRow.BalAdjId = docRef?.id ;
            else this.utilSvc.cWarn(this.CLASSNAME, 'Could not find newly added BalAdjust in array to set BalAdjId: %O', newRow) ;
            console.log('NewRow: %O  InRow: %O', newRow, inRow) ;
          }).catch(error => {
            this.utilSvc.cWarn(this.CLASSNAME, 'Failed to add BalAdjust Late Fee  Val: %O  err: %s', newRow, error) ;
          }) ;
        curBal += newRow.Amount ;
      }
      tmpDt = new Date(lfDtStr) ;
    }
    balAdjusts.sort((a, b) => a.ADate.localeCompare(b.ADate)) ;   // reSort array after additions
  }

  getBalanceArray(balAdjusts: BalAdjust[]): number[] {
    let runTot = 0 ;
    const balArray: number[] = [] ;
    for (const ba of balAdjusts) {
      runTot += (ba.deletedDate !== '') ? ba.Amount : 0 ;   balArray.push(runTot) ;
    }
    return balArray ;
  }

  renewLease (lease: Lease): Lease {
    const newLease = { ...lease } ;
    const eDt = new Date(lease.EndDt) ;
    newLease.StartDt = this.utilSvc.getDate(eDt, 1) ;
    const newEndYr = eDt.getFullYear() + 1 ;  eDt.setFullYear(newEndYr) ;
    newLease.EndDt = eDt.toISOString().substring(0,10) ;
    newLease.LeaseId = '' ;
    return newLease ;
  }

          // These so that lease edits can refer to other leases and adjustments
  setLeases(leases: Lease[]) {
    this.leases = leases ;
    const curDate = new Date().toISOString().substring(0,10) ;
    this.isFutureLease = leases[0].StartDt > curDate ;
  }

  setBalAdjs(balAdjs: BalAdjust[]) { this.balAdjs = balAdjs ; }
  getBalanceList(): number[] { return this.balanceList ; }

  /**
   * A date was changed on a lease. If it causes an overlap with another lease for the same house, offer to
   * adjust the other lease to eliminate the overlap. If offer declined, return false and revert date
   * @param newLease current lease including modified date
   * @param isStart is start date or end date what we are checking
   * @param idx Which idx in array is current lease (ignore self when checking)
   * @returns boolean true if no overlap or overlap adjusted, false if overlap and not adjusted
   */
  checkLeaseOverlap(newLease: Lease, isStart: boolean, idx: number): boolean {
    for (let i = 0 ; i < this.leases.length; i++ ) {
      if (i === idx) continue ;  // Skip self
      const lse = this.leases[i] ;
      if (isStart) {
        if ((newLease.StartDt >= lse.StartDt && newLease.StartDt < lse.EndDt && lse.cancelDt === '')) {
          if (confirm('Start Date overlaps with existing lease, adjust dates on other lease?')) {
            console.log('Would adjust date on lease: %O because startDt %s', lse, newLease.StartDt);
            lse.EndDt = newLease.StartDt ;
            this.updtLease(lse) ;
          } else return false ;
        }
      } else {
        if ((newLease.EndDt > lse.StartDt && newLease.EndDt <= lse.EndDt && lse.cancelDt === '')) {
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

  /******************************************************************************************
   * If date change on lease would cause an overlap, adjust other lease to eliminate overlap
   * @param lease with dates to be updated
   * @returns Promise
   *****************************************************************************************/
  updtLease(lease: Lease): Promise<string> {
    const leaseAny: any = lease as any ;    const leaseObj = leaseAny as objwCid ;
    return this.fireSvc.updtGenGlob(leaseObj, leaseObj, 'Leases', 'LeaseId') ;
  }

  // Identify lease active now or most recent and ended w/in last 3 months
  isLeaseCurrent(lease: Lease, idx: number): boolean {
    if (lease.cancelDt !== '') return false ;
    const curDate = new Date() ;
    const dateStr = curDate.toISOString().substring(0,10) ;
    if  (lease.EndDt >= dateStr && lease.StartDt <= dateStr) return true ;
    else {
      if (dateStr > lease.EndDt && idx === 0) {   // Not current, but is most recent lease, see if within 3 months
        curDate.setMonth(curDate.getMonth() -3) ;
        return (lease.EndDt >= curDate.toISOString().substring(0,10)) ;
      }  else  return false ;
    }
  }

  getBalAdjForLease(lease: Lease, house: string, balAdjProcSubj: Subject<BalAdjust[]>) {
    if (lease.House !== '')  house = lease.House ;
    const balAdjSubj = this.fireSvc.getBalAdj4House(house) ;
    const balAdj$ = balAdjSubj.subscribe({
      next: (balAdj) => {
        this.balAdjs = this.fireSvc.setBalAdj(balAdj as BalAdjust[]) ;
        console.log(`baladjLen: ${this.balAdjs.length}  curLease: %O`, lease) ;
        let startDt = '' ;
        const today = new Date() ;  const endDt = today.toISOString().substring(0,10) ;
        if (lease.House) {    // Have curLease
          startDt = lease.StartDt ;
        } else {
          today.setFullYear(today.getFullYear() -1) ;
          startDt = today.toISOString().substring(0,10) ; // 1 year lease
        }
        console.log(`getBalAdj StartDt: ${startDt}  EndDt: ${endDt}`) ;
        const tranSubj = this.getCategoryForDates(house, startDt, endDt, 'Rent Income') ;
        const transObj = tranSubj.subscribe({
          next: (tranRecs) => {
            console.log(`getBalAdj retrieved ${tranRecs.length} tranRecs`) ;
            const tranRecArr = tranRecs as TranRec[] ;
            this.balAdjs = this.getBalAdjustList(tranRecArr, endDt) ;
            this.balanceList = this.getBalanceArray(this.balAdjs) ;
            console.log('About to next balAdjProcSub') ;
            balAdjProcSubj.next(this.balAdjs) ;     // Done with bal adjust processing
          }
        })
        setTimeout(() => {
          balAdj$.unsubscribe() ; transObj.unsubscribe() ; balAdj$.unsubscribe() }, 30000);
      }, error: (error) => {
        this.utilSvc.cWarn(this.CLASSNAME, 'Error retrieving balances: ', error) ;
      }
    })
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
    let actionCnt = 0 ;  let statusMsg = ''
    let isErr = false ;
    let updResp: string | Promise<any> ;    let delResp: string | Promise<any> ;
    actionCnt++ ;   // Unless cancel, this is an added action
    const globInfo = this.globInfoMap.get(gType) ;
    if (!globInfo) { console.log('oh crumbs')
    } else {
      // Pre processing here
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
