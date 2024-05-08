import { Component } from '@angular/core';
import { FirebaseService } from '../../services/firebase.service';
import { GenutilsService } from '../../services/genutils.service';
import { Globals } from '../../models/globals.model';
import { RuleData } from '../../models/ruledata.model';
import { deleteField } from '@angular/fire/firestore';
import { CommonFuncsService } from '../../services/common-funcs.service';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { KeyVal } from '../../models/keyval.model';
import { TranRec } from '../../models/tranRec.model';

interface KVGlobal {
  curGlob: Globals,
  curKv: KeyVal
}

@Component({
  selector: 'crefinancials-repair',
  templateUrl: './repair.component.html',
  styleUrl: './repair.component.css'
})
export class RepairComponent {
  sourceCid = '' ;  sourceDbPrefix = '' ;  savedCid = '' ;  savedDbP = '' ;
  repairActions = [' addname2rules', 'fixnameinglobals', 'modcategories']
  needSourceCid = [ 'addname2rules', 'fixnameinglobals' ]
  selectedAction = '' ;  title = 'Repair Action'
  getSourceCid = false ;   statusMsg = ''
  action$: Subscription = new Subscription() ;

  constructor(private fireSvc: FirebaseService, private utilSvc: GenutilsService,
    private commons: CommonFuncsService, private route: Router) {
      this.action$ = route.events.subscribe((routeUrl) => {
        if (routeUrl instanceof NavigationEnd) {
          const urlParts = routeUrl.url.split('/') ;
          const lastPart = urlParts[urlParts.length-1]
          this.selectedAction = (this.repairActions.indexOf(lastPart) > -1) ?
            lastPart : 'addname2rules' 
          this.getActionInputs()
          console.log('constructor selectedAction: %s', this.selectedAction)
        }
      })
    }

  /** ****************************************************************************
   * Call function corresponding to selection
   ***************************************************************************** */
  doAction() {
    switch(this.selectedAction) {
      case 'fixnameinglobals':     this.fixNameInGlobals() ; break ;
      case 'addname2rules':   this.addName2Rules() ; break ;
      case 'modcategories':   this.modifyCategories() ; break ;
      default:  console.warn('Invalid item selected %s', this.selectedAction) ;
    }
    this.selectedAction = '' ; this.getSourceCid = false
  }

  /** ****************************************************************************
   * When CID is changed, get globals. If not chgd, globals are good
   ***************************************************************************** */
  onChgCid() {
    this.commons.onChgCid(this.sourceCid, this.sourceDbPrefix).then((globals) => {
      console.log('Got globals len: %d', globals.length)
    })
  }

  /** ****************************************************************************
   * Based on function to run, retrieve appropriate info
   ***************************************************************************** */
  getActionInputs() {
    this.getSourceCid = (this.needSourceCid.indexOf(this.selectedAction) > -1)
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

  // hereiam ... Set this back up and put sep action to delete dup phones
  modifyCategories() {    // Don't forget to fix json that we load from as well
    const kvGlobal: KVGlobal[] = [] ;    let anyVal: any ;  let keyVal: KeyVal
    this.fireSvc.loadAllGlobals().then(qGlob => {
      const gLen = qGlob.size ;  let gCnt = 0
      console.log('Got %d globals', gLen)
      qGlob.forEach(gDoc => { // Keep array of correct types so I can sort by cid
        const globRow = gDoc.data() as Globals
        if (['categoryFolders', 'categoryTaxcat'].indexOf(globRow.RKey) > -1) {
          globRow.GlobalId = gDoc.id ;  anyVal = globRow.RVal ;  keyVal = anyVal
          kvGlobal.push({curGlob: globRow, curKv: keyVal})
        }
        if (++gCnt >= gLen)  this.modCat2(kvGlobal)
      })
    })
  }

  modCat2(kvGlobal: KVGlobal[]) {
    kvGlobal = kvGlobal.sort((a, b) => a.curGlob.Cid.localeCompare(b.curGlob.Cid))
    console.log('Into modCat2 w/kvGlobal: %O', kvGlobal)
    const curPhones = kvGlobal.filter(kv => kv.curGlob.RKey === 'categoryTaxcat' && kv.curKv.RKey === 'Phone')
    const phoneTot = curPhones.length ;  let phoneCnt = 0
    console.log('Currently %d phone records', phoneTot)
    if (phoneTot === 0)  this.modCat3(kvGlobal)
    else {
      for (const curPhone of curPhones) {   // Delete all phones created (many dups due to sort issue)
        this.fireSvc.delGlobals(curPhone.curGlob.Cid, '', curPhone.curGlob).then(delInfo => {
          if (++phoneCnt % 5 === 0) console.log('Removed %d dup phone rows: %O', phoneCnt, curPhone)
          if (phoneCnt >= phoneTot) {
            console.log('Removed all %d phones, now going thru changes again')
            this.modCat3(kvGlobal)
          }
        }).catch(error => {
          console.log('Error %s deleting global: %O', error, curPhone)
        })
      }
    }
  }

  modCat3(kvGlobal: KVGlobal[]) {
      // Now start from scratch to fix categoryNames (and folder refs) and create correct phones
    const cats2Find = ['Education and Dev', 'Gen Tool and Supply']
    const cats2Repl = ['Education and Development', 'Tools and Supplies']
    const newCat = new KeyVal('Phone', 'BE')  // Insert Phone row first
    let curCid = ''
    for (const globKv of kvGlobal) {    
      if (curCid !== globKv.curGlob.Cid) {    // If this is a new CID, create the phone
        curCid = globKv.curGlob.Cid
        this.fireSvc.addGlobalMultFld(curCid, '', 'categoryTaxcat', newCat).then(newRow => {
          console.log('Added categoryTaxcat row: %O w/ID %s cid: %s', newCat, newRow.id, curCid)
        }).catch(error => {
          console.log('Error %s adding phone categoryTaxcat: %O', error, newCat)
        })
      }
            // Now update folders
      if (globKv.curGlob.RKey === 'categoryFolders') {
        // this.fireSvc.updtGlobFld(this.sourceDbPrefix, inGlobal.GlobalId!, globObj).then(() => {
        const oldList = globKv.curKv.RVal
            // In case already run here, ck for srch and repl. If repl, don't reReplace
        const cfIdx = cats2Find.findIndex(cf => oldList.includes(cf))
        const crIdx = cats2Repl.findIndex(cr => oldList.includes(cr))
        if (cfIdx > -1 && crIdx === -1) {   // Has srchStr and not also replaceStr
          globKv.curKv.RVal = oldList.replace(cats2Find[cfIdx], cats2Repl[cfIdx])
          if (globKv.curKv.RKey === 'Office & Business Expense') { // This has a hit AND an add
            globKv.curKv.RVal = 'Phone|$|' + globKv.curKv.RVal
          }
          const globObj = { 'RVal.RVal': globKv.curKv.RVal}
          this.fireSvc.updtGlobFld('', globKv.curGlob.GlobalId!, globObj).then(upRow => {
            console.log('Success updating catFolder %s  to Val: %s  for Cid: %s  for id: %s',
              globKv.curKv.RKey, globKv.curKv.RVal, curCid, globKv.curGlob.GlobalId)
          }).catch(error => {
            console.log('Error: %s updating id: %s  cid: %s w/obj: %O', error, globKv.curGlob.GlobalId,
              curCid, globObj)
          })
          console.log('catFold chg old: %s to new: %s  obj: %O', oldList, globKv.curKv.RVal, globObj)
        }
        console.log('catFold id: %s  cid: %s  key: %s  val: %s  hit: %s', globKv.curGlob.GlobalId,
          globKv.curGlob.Cid, globKv.curKv.RKey, globKv.curKv.RVal, (cfIdx > -1))
      } else {     // Now update categoryTaxcat
        if (globKv.curGlob.RKey === 'categoryTaxcat') { // Add Phone BE
          const ctIdx = cats2Find.indexOf(globKv.curKv.RKey)
          const crIdx = cats2Repl.indexOf(globKv.curKv.RKey)
          if (ctIdx > -1 && crIdx === -1) {   // Found srchStr and NOT repl str
            const globObj = { 'RVal.RKey': cats2Repl[ctIdx]}
            this.fireSvc.updtGlobFld('', globKv.curGlob.GlobalId!, globObj).then(upRow => {
              console.log('Success upd catTC %s  to: %s  id: %s  cid: %s  obj: %O', globKv.curKv.RKey,
                cats2Repl[ctIdx], globKv.curGlob.GlobalId, curCid, globObj)
            }).catch(error => {
              console.log('Error: %s  updating tc for: %s  w/obj: %O', error, globKv.curGlob.GlobalId, globObj)
            })
            console.log('catTc repl %s w/%s via obj: %O', globKv.curKv.RKey, cats2Repl[ctIdx], globObj)
          }
          console.log('catTaxcat id: %s  cid: %s  key: %s  val: %s  hit: %s', globKv.curGlob.GlobalId,
            globKv.curGlob.Cid, globKv.curKv.RKey, globKv.curKv.RVal, (ctIdx > -1))
        }
      }
      this.fireSvc.loadAllTrans('').then(qTran => { // Add some trans w/these cats
        console.log('For Trans, got size: %d', qTran.size)
        qTran.forEach(tDoc => {
          const curTran = tDoc.data() as TranRec
          const idx = cats2Find.indexOf(curTran.Category)
          if (idx > -1) {
            curTran.TranId = tDoc.id
            const tranObj = { 'Category' : cats2Repl[idx]}
            this.fireSvc.updtTranFld('', curTran.TranId, tranObj).then(updRow => {
              console.log('Success upd tran to cat %s w/obj: %O', cats2Repl[idx], tranObj)
            }).catch(error => {
              console.log('Error %s updating tran %O w/obj: %O', error, curTran, tranObj)
            })
            console.log('For Tid %s  Cid: %s  repl %s  with %s via obj: %O', curTran.TranId, curTran.Cid,
              cats2Find[idx], cats2Repl[idx], tranObj)
          }
        })
      })
    }
  }
}
