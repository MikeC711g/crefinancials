import { Injectable } from '@angular/core';
import { GenutilsService } from './genutils.service';
import { FirebaseService } from './firebase.service';
import { Globals } from '../models/globals.model';
import { TranRec } from '../models/tranRec.model';
import { Project } from '../models/project.model';
import { Reconciliation } from '../models/reconciliation.model';

@Injectable({
  providedIn: 'root'
})
export class CommonFuncsService {
  saveCid = '' ;  saveDbPref = '' ; haveGlobals = false ;  globals: Globals[] = []

  constructor(private fireSvc: FirebaseService, private utilSvc: GenutilsService) { }

  /** ****************************************************************************
   * When CID is changed, get globals. If not chgd, globals are good
   ***************************************************************************** */
  onChgCid(cid: string, dbPref: string): Promise<Globals[]> {
    console.log('onChgCid new cid: %s  new dbPref %s  saveCid: %s  saveDb: %s', cid, dbPref, this.saveCid, this.saveDbPref)
    return new Promise<Globals[]>(( resolve, reject ) => {
      if (cid && (cid !== this.saveCid || !this.haveGlobals)) {
        this.fireSvc.getAllGlobals(cid, dbPref).subscribe({
          next: (globalRef) => {
            this.haveGlobals = true ;
            this.globals = globalRef
            console.log('Got %d globals', this.globals.length)
            this.utilSvc.processGVals(this.globals)
            resolve(this.globals) ;
          }, error: (error) => {
            reject('Failed to get globals w/err: ' + error)
            console.warn('Failed to get globals, error: ', error) ;
          }
        })
        this.saveCid = cid ;  this.saveDbPref = dbPref
      } else resolve(this.globals)
    })
  }

  /** ****************************************************************************
   * Remove all globals for a DB
   ***************************************************************************** */
  clearGlobals(cid: string, dbPref: string) {
    const globSub = this.fireSvc.getAllGlobals(cid, dbPref).subscribe(dbRef => {
        const globals: Globals[] = dbRef
        setTimeout(() => {
          this.utilSvc.writeGenericJson(globals, 'globals.'+cid+'.json') // Save to json file first
        }, 10);
        let globCnt = 0 ;  const globLen = globals.length
        for (const globRow of globals) {
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
  clearTrans(cid: string, dbPref: string, startDt: string, endDt: string, tfAcct?: string,
    tfDesc?: string, tfTranType?: string, tfHouse?: string, tfTaxCat?: string) {
    console.log('Called into clearTrans')
    this.fireSvc.getTransForDateRange(cid, dbPref, startDt, endDt, []).subscribe({
      next: (tranRef) => {
        const transactions: TranRec[] = tranRef
        const filtTrans = (tfAcct || tfDesc || tfTranType || tfHouse || tfTaxCat) ?
          this.utilSvc.filterTrans(transactions, tfAcct, tfDesc, tfTranType, tfHouse, tfTaxCat) :
          transactions
        setTimeout(() => {
          this.utilSvc.writeGenericJson(filtTrans, 'transactions.'+cid+'.json') // Save to json file first
        }, 10);
        let tranCnt = 0 ;  const tranLen = filtTrans.length
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
  clearProjects(cid: string, dbPref: string, startDt: string, endDt: string) {
    console.log('clearProj w/cid: %s  dbp: %s  sDt: %s  eDt: %s', cid, dbPref, startDt, endDt)
    this.fireSvc.getProjectsForDateRange(cid, dbPref, startDt, endDt).subscribe({
      next: (projRef) => {
        const projects: Project[] = projRef ;
        setTimeout(() => {
          this.utilSvc.writeGenericJson(projects, 'projects.'+cid+'.json') // Save to json file first
        }, 10);
        let projCnt = 0 ;  const projLen = projects.length
        console.log('Got %d projects', projLen)
        for (const curProj of projects) {
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
  clearRecons(cid: string, dbPref: string, startDt: string, endDt: string) {
    console.log('Called into clearRecons')
    this.fireSvc.getReconciliationsForDateRange(cid, dbPref, startDt, endDt, []).subscribe({
      next: (reconRef) => {
        const recons: Reconciliation[] = reconRef
        setTimeout(() => {
          this.utilSvc.writeGenericJson(recons, 'recons.'+cid+'.json') // Save to json file first
        }, 10);
        let reconCnt = 0 ; const reconLen = recons.length
        console.log('Got %d reconciliations', reconLen)
        for (const curRecon of recons) {
          this.fireSvc.delRecons(cid, dbPref, curRecon).
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

  addGlobals(cid: string, dbPref: string, inGlobs: Globals[]): string {
    let isrtCnt = 0 ;  const globCnt = inGlobs.length ; let statusMsg = ''
    for (const curGlob of inGlobs) {
      if (curGlob.Cid !== cid)  curGlob.Cid = cid   // Make sure cid set correctly
      const globMulti = (curGlob.RKey === this.utilSvc.globalTypes.TranType ||
        curGlob.RKey === this.utilSvc.globalTypes.AccountType) ? false : true
      if (globMulti) {
        this.fireSvc.addGlobalMultFld(cid, dbPref, curGlob.RKey, curGlob.RVal).
          then(() => {
            if (isrtCnt++ % 20 === 0) console.log('Inserted %d of %d', isrtCnt, globCnt)
            if (isrtCnt >= globCnt)  statusMsg = 'Added all globals for user'
        }).catch(error => {
          console.warn('Error %O adding multiFld global %O', error, curGlob)
        })
      } else {
        this.fireSvc.addGlobal(cid, dbPref, curGlob).then(() => {
          if (isrtCnt++ % 20 === 0) console.log('Inserted %d of %d', isrtCnt, globCnt)
          if (isrtCnt >= globCnt)  statusMsg = 'Added all globals for user'
        }).catch(error => {
          console.warn('Error %O adding singleFld global %O', error, curGlob)
        })
      }
    }
    return statusMsg
  }
}
