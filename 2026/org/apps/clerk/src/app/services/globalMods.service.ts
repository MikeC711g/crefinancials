import { Globals, KeyVal, globInfo, objwCid, genHelpers } from './../models/globals.model';
import { Injectable } from '@angular/core';
import { GenutilsService } from './genutils.service';
import { FirebaseService } from './firebase.service';
import { Subject } from 'rxjs';
import { Lease } from '../models/house.model';

// TODO: Create interface for function to call for each type. Interface should include
// action, gtype, newrow, oldrow, locArray, fbglobals. Take as optional and only call if there.
// With this, look at possibly dropping onGlobalMod and doing all through genGlobMod (new name?)
// Same API, but 2 functions, one PRE firestore and one post.
// Obviously also do the balAdj in here
@Injectable({
  providedIn: 'root'
})

export class GlobalModsService {
  CLASSNAME = 'globalMods'
  updtNotice: Subject<genHelpers> = new Subject<genHelpers>() ;
  globInfoMap: Map<string, globInfo> = new Map<string, globInfo>() ;
  
  constructor(private utilSvc: GenutilsService, private fireSvc: FirebaseService) {
    this.globInfoMap.set(utilSvc.globalTypes.RuleData, new globInfo('TranRules', 'RuleId', 'ruleName',
      ['Annotation', 'Category', 'TaxCat', 'House', 'TranExtra', 'TranType'])) ;
    this.globInfoMap.set(this.utilSvc.globalTypes.Houses, new globInfo('Houses', 'HouseId', 'name')) ;
    this.globInfoMap.set(this.utilSvc.globalTypes.Mortgages, new globInfo('Mortgages', 'MortgageId', 'house')) ;
    this.globInfoMap.set(this.utilSvc.globalTypes.Leases, new globInfo('Leases', 'LeaseId', 'House')) ;
    this.globInfoMap.set(this.utilSvc.globalTypes.Residents, new globInfo('Residents', 'ResidentId', 'LName')) ;
    this.updtNotice.subscribe((helpers: genHelpers) => {
      if (!helpers.isPreProc && helpers.gType === this.utilSvc.globalTypes.Leases) {
        this.leasePostProc(helpers);
      }
    })
  }

  genCategoryMap(catFolders: KeyVal[], catTaxcat: KeyVal[]): Map<string, KeyVal[]> {
    const curMap: Map<string, KeyVal[]> = new Map<string, KeyVal[]>() ;
    for (const catFolder of catFolders) {
      curMap.set(catFolder.RKey, catTaxcat.filter((dt) => catFolder.RVal.includes(dt.RKey)))
    }
    this.utilSvc.cLog(this.CLASSNAME, 'genCategoryMap w/map: %O', curMap)
    return curMap ;
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
    if (!globInfo) { console.log('oh crums') 
    } else {
      this.updtNotice.next(helper) ;
      helper.isPreProc = false ;
      switch (action) {
        case this.utilSvc.actionTypes.Add:
          this.fireSvc.addGenGlob(newRow, globInfo.collectNm, globInfo.idVar, globInfo.flds2Del).
          then(docRef => {
            newRow[globInfo.idVar] = docRef?.id ;
            statusMsg = `Successfully added ${gType}` ;
            this.updtNotice.next(helper) ;
            if (entArr.length === 0 || newRow[globInfo.sortVar] > entArr[entArr.length - 1][globInfo.sortVar]) {
              entArr.push(newRow) ;   // First or highest key so just add to end
            } else {
              const idx = entArr.findIndex(ent => ent[globInfo.sortVar].localeCompare(newRow[globInfo.sortVar]) > 0) ;
              entArr.splice(idx, 0, newRow) ;   // Should sort here or insert into sorted array
            }
          }).catch(error => {
            statusMsg = `Failed to add ${gType}` ;
            this.utilSvc.cWarn(this.CLASSNAME, 'Failed to add %s  Val: %O  err: %s', gType, newRow, error) ;
            isErr = true ;
          })
          break ;
        case this.utilSvc.actionTypes.Update:
          updResp = this.fireSvc.updtGenGlob(oldRow, newRow, globInfo.collectNm, oldRow[globInfo.idVar])
          if (typeof updResp === 'string') {
            statusMsg = `Failed to update ${gType}`
            this.utilSvc.cWarn(this.CLASSNAME,'Failed to update %s Val: %O  Error: %s', gType, newRow, updResp) ;
            isErr = true ;
          } else {
            updResp.then(() => {
              statusMsg = `Successfully updated ${gType}` ;
              this.updtNotice.next(helper) ;
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
              statusMsg = `Failed to update ${gType}` ;
              this.utilSvc.cWarn(this.CLASSNAME,'Failed to update %s Old: %O New: %O  Err: %s', gType, oldRow, newRow, error) ;
              isErr = true ;
            })
          }
          break ;
        case this.utilSvc.actionTypes.Delete:
          delResp = this.fireSvc.deleteGenGlob(oldRow, globInfo.collectNm, oldRow[globInfo.idVar]) ;
          if (typeof delResp === 'string') {
            statusMsg = `Failed to delete ${gType}` ;
            this.utilSvc.cWarn(this.CLASSNAME, 'Failed to delete %s  Val: %O  error: %s', gType, oldRow, delResp) ;
            isErr = true ;
          } else {
            delResp.then(() => {
              statusMsg = `Successfully deleted ${gType}` ;
              this.updtNotice.next(helper) ;
              const idx = entArr.findIndex(ent => ent[globInfo.idVar].localeCompare(oldRow[globInfo.idVar]) === 0) ;
              entArr.splice(idx, 1) ;
            }).catch(error => {
              statusMsg = `Failed to delete ${gType}` ;
              this.utilSvc.cWarn(this.CLASSNAME,'Failed to delete %s Val: %O  Err: %s', gType, oldRow, error) ;
              isErr = true ;
            })
          }
          break ;
        case this.utilSvc.actionTypes.Cancel:
          this.updtNotice.next(helper) ;
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

  leasePostProc(helper: genHelpers): boolean {   // Verify this is correct
    if (helper.gType !== this.utilSvc.globalTypes.Leases || helper.isPreProc) return false ;
    console.log('leasePostProc with helper: %O', helper) ;
    let anyLease: any = helper.newRow ; const newLease = anyLease as Lease ;
    anyLease = helper.oldRow ; const oldLease = anyLease as Lease ;
    const anyArr: any = helper.objArr ; const leaseArr = anyArr as Lease[] ;
    if ((helper.action === this.utilSvc.actionTypes.Add && newLease.currentFlag === true) ||
      (helper.action === this.utilSvc.actionTypes.Update && newLease.currentFlag === true)) {
        // Find all other rows for this house that are set to current
      const priorLeases = leaseArr.filter(lease => lease.currentFlag === true &&
        lease.House === newLease.House && lease.LeaseId !== newLease.LeaseId) ;
      console.log('Found prior leases %O', priorLeases) ;
      for (const priorLease of priorLeases) {
        priorLease.currentFlag = false ;
        anyLease = priorLease ;
        console.log('anyLease: %O  priorLease: %O', anyLease, priorLease) ;
        this.fireSvc.updtGenGlob(anyLease, anyLease, 'Leases', priorLease.LeaseId!) 
          .then(() => { console.log('Updated prior lease %O', priorLease) ; })
          .catch(error => {
            this.utilSvc.cWarn(this.CLASSNAME, 'Failed to update lease %O: %s', priorLease, error) ;
          });
      }
      return true ; 
    } else return false ;
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
