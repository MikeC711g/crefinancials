import { Component } from '@angular/core';
import { FirebaseService } from '../../services/firebase.service';
import { GenutilsService } from '../../services/genutils.service';
import { Globals } from '../../models/Globals.model';
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
      // case 'modcategories':   this.modifyCategories() ; break ;
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
    this.fireSvc.getGlobalType(this.sourceCid, 'ruleData').subscribe({
      next: (cRule) => {
        const rules: Globals[] = cRule ;
        let curCnt = 0 ;  const ruleSz = rules.length ;  const dispSz = Math.trunc(ruleSz / 10)
        console.log('Got %d rules', ruleSz)
        for (const inGlobal of rules) {
          const tmpRD: any = inGlobal.RVal ;   const rule0 : RuleData = tmpRD
          if (!rule0.ruleName)  rule0.ruleName = (rule0.srchStr) ?
            rule0.srchStr : 'SrchAmt '+rule0.srchAmt.toString()
          const globObj = { 'RVal.ruleName': rule0.ruleName }
          this.fireSvc.updtGlobFld(inGlobal.GlobalId!, globObj).then(() => {
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
    this.fireSvc.getGlobalType(this.sourceCid, gtp1).subscribe({
      next: (descripTaxcat) => {
        const dtc: Globals[] = descripTaxcat ;
        console.log('Got %d %s', dtc.length, gtp1)
        const globObj = { RKey: 'categoryTaxcat' }
        let dtcCnt = 0 ;
        for (const dt of dtc) {
          this.fireSvc.updtGlobFld(dt.GlobalId!, globObj).then(() => {
            if (dtcCnt++ % 50 === 0)  console.log('Finished %d %s', dtcCnt, gtp1)
          }).catch(err => {
            console.log('Err %s updating %s: %O', err, gtp1, dt)
          })
        }
      }, error: (error) => {
        console.warn('Err %s retrieving globs for cid %s RKey %s',
          error, this.sourceCid, gtp1)
      }
    })
    const gtp2 = 'descripCategories'
    this.fireSvc.getGlobalType(this.sourceCid, gtp2).subscribe({
      next: (descripCat) => {
        const dcat: Globals[] = descripCat ;
        console.log('Got %d %s', dcat.length, gtp2)
        const globObj = { RKey: 'categoryFolders' }
        let dcatCnt = 0 ;
        for (const dc of dcat) {
          this.fireSvc.updtGlobFld(dc.GlobalId!, globObj).then(() => {
            if (dcatCnt++ % 50 === 0)  console.log('Finished %d %s', dcatCnt, gtp2)
          }).catch(err => {
            console.log('Err %s updating %s: %O', err, gtp2, dc)
          })
        }
      }, error: (error) => {
        console.warn('Err %s retrieving globs for cid %s RKey %s',
          error, this.sourceCid, gtp2)
      }
    })
    const gtp3 = 'ruleData'
    this.fireSvc.getGlobalType(this.sourceCid, gtp3).subscribe({
      next: (ruleData) => {
        const ruled: Globals[] = ruleData ;
        console.log('Got %d %s', ruled.length, gtp3)
        let ruleCnt = 0 ;
        for (const rd of ruled) {
          const rdAny: any = rd.RVal ;
          const rdRud: RuleData = rdAny
          if (rdRud.Category) {
            const globObj = { 'RVal.Description': deleteField(), 'RVal.Category': rdRud.Category }
            this.fireSvc.updtGlobFld(rd.GlobalId!, globObj).then(() => {
              if (ruleCnt++ % 50 === 0)  console.log('Finished %d %s', ruleCnt, gtp3)
            }).catch(err => {
              console.log('Err %s updating %s: %O', err, gtp3, rdRud)
            })
          }
        }
      }, error: (error) => {
        console.warn('Err %s retrieving globs for cid %s RKey %s',
          error, this.sourceCid, gtp3)
      }
    })
  }
}
