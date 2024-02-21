import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { TranRec } from '../models/TranRec.model';
import { RuleData } from '../models/ruleData.model';
import { GenutilsService } from './genutils.service';

@Injectable({
  providedIn: 'root'
})
export class QfxService {
  tranStringCount = 0 ;
  CLASSNAME = 'qfxService' ;
  ruleMap: Map<string, RuleData[]> = new Map<string, RuleData[]>() ;

  constructor(private utilSvc: GenutilsService) { }

  setRuleMap(inMap: Map<string, RuleData[]>) {
    this.ruleMap = inMap ;
  }

  cleanFinal(xmlArr: string[]) {    // Looking for anything left behind
    for (let i = 0; i < xmlArr.length; i++) {
      if (xmlArr[i].startsWith('<')) {
        this.utilSvc.cWarn(this.CLASSNAME, 'Unprocessed/unclosed row %s', xmlArr[i]) ;
      }
    }
  }

  closeTags(xmlArr: string[], closeIdx: number, openIdx: number, tag: string) {
    this.utilSvc.cDebug(this.CLASSNAME, 'closeTags close: %d  open: %d  tag: %s', closeIdx, openIdx, tag) ;
    let combineStr = '  ' + xmlArr[openIdx] ;   // Indent to avoid future finds
    for (let i = openIdx+1; i < closeIdx; i++) {    // Close interim rows
      if (xmlArr[i].startsWith('<')) {    // If not already handled row
        const closeBrack = xmlArr[i].indexOf('>') ;   // Construct closing tag
        const closeTag = '</' + xmlArr[i].substring(1, closeBrack+1) ;
        combineStr += ' ' + xmlArr[i] + ' ' + closeTag    // Add this to combined element
        this.utilSvc.cDebug(this.CLASSNAME,'Added %s to close row %d  so combined now %s',
          closeTag, i, combineStr) ;
      } else {
        combineStr += ' ' + xmlArr[i]
      }
    }
    combineStr += ' ' + xmlArr[closeIdx] ;
    xmlArr[openIdx] = combineStr ;      // Stash combined into open element
    // Now rmv older rows. So now 1 row, all items closed, row indented to avoid srches
    xmlArr.splice(openIdx+1, closeIdx - openIdx) ;
  }

  findClosers(xmlArr: string[]): boolean {
    for (let i = 1; i < xmlArr.length; i++) {   // Look for closers and match
      if (xmlArr[i].startsWith('</')) {
        const posClose = xmlArr[i].indexOf('>') ;
        const srchStr = '<' + xmlArr[i].substring(2, posClose+1) ;
        this.utilSvc.cDebug(this.CLASSNAME, 'i: %d  pos: %d  Str: %s', i, posClose, srchStr) ;
        for (let j = i-1; j >= 0; j--) {    // Go back to find open tag
          if (xmlArr[j].startsWith(srchStr)) {
            this.closeTags(xmlArr, i, j, srchStr) ;
            return true ;
          }
        }
        this.utilSvc.cWarn(this.CLASSNAME,'Got close for %s but did not find open', srchStr) ;
        xmlArr[i] = '  ' + xmlArr[i] ;      // Indent so not picked up again
      }
    }
    return false ;      // No closing tags found
  }

  tagSplit(brokenXML: string): string[] {
    // brokenXML = brokenXML.replaceAll('\n', '') ;
    brokenXML = brokenXML.split('\n').join('') ;
    brokenXML = brokenXML.split('\t').join('') ;
    brokenXML = brokenXML.split('\r').join('') ;
    const tagCatcher = /(<.[^(><)]+>[^<]*)/g ;
    const outTokens = brokenXML.match(tagCatcher) ;
    return outTokens! ;
  }

  getCount(inString: string, str2Find: string): number {
    let curPos = inString.indexOf(str2Find) ;
    let curCount = 0 ;
    while (curPos >= 0) {
      curCount++ ;
      curPos = inString.indexOf(str2Find, curPos+1) ;
    }
    return curCount ;
  }

  repairXML(qfxData: string): string {
    const xmlTokens: string[] = this.tagSplit(qfxData) ;
    this.utilSvc.cDebug(this.CLASSNAME,'xmlTokens: %O', xmlTokens) ;
    let tags2Go = true ;
    while (tags2Go) {       // While we have more tags to close
        tags2Go = this.findClosers(xmlTokens)
    }
    this.cleanFinal(xmlTokens) ;
    let finalStr: string = xmlTokens.join(' ') ;
    finalStr = this.utilSvc.fixString(finalStr, '&', '&amp;') ;  // quotes seem OK and <> looks near impossible
    this.tranStringCount = this.getCount(finalStr, '<STMTTRN>') ;
    return finalStr ;
  }

  getSubEls(xmlEl: Element, tagNames: string[]) : string[] {
    const xmlVals: string[] = [] ;
    for (const tagName of tagNames) {
      const childEl = xmlEl.querySelector(tagName) ;
      const tmpText = (childEl) ? childEl.textContent : '' ;
      this.utilSvc.cDebug(this.CLASSNAME,'tag %s  val %s', tagName, tmpText) ;
      xmlVals.push(tmpText!.trim()) ;
    }
    return xmlVals ;
  }

  readQFX($event: any, account: string): Observable<TranRec[]> {
    // let files = $event.srcElement.files ;
    const tranRecs: TranRec[] = new Array<TranRec>() ;
    const ruleData: RuleData[] = this.ruleMap.get(account)! ;
    this.utilSvc.cDebug(this.CLASSNAME,'qfxSvc readqfx account: %s  RuleData: %O', account, ruleData) ;
    const getRecs = new Observable<TranRec[]>((observer) => {
      const input = $event.target ;
      const reader = new FileReader() ;
      this.utilSvc.cDebug(this.CLASSNAME, 'Input File: %O', input.files[0]) ;
      reader.readAsText(input.files[0]) ;
      reader.onload = () => {
        const csvData = reader.result;
        const xmlString = this.repairXML(<string>csvData) ;
        this.utilSvc.cDebug(this.CLASSNAME, 'XmlString: %s', xmlString) ;
        const xmlDoc = new DOMParser().parseFromString(xmlString, "text/xml") ;
        const trans = xmlDoc.querySelectorAll('STMTTRN') ;
        if (trans.length !== this.tranStringCount) {
          this.utilSvc.cWarn(this.CLASSNAME, 'Trans in XML of %d different than string check of: %s',
            trans.length, this.tranStringCount)
        } else {
          this.utilSvc.cDebug(this.CLASSNAME,'Agreement from string and XML of %d trans', trans.length) ;
        }
        this.utilSvc.cDebug(this.CLASSNAME, trans) ;
        for (let i = 0; i < trans.length; i++) {  // Could not do x of y?
          let trnType: string, dtPosted: string, trnAmt: string, tName: string,
            tMemo: string, checkNum: string, fitId: string ;
          // eslint-disable-next-line prefer-const
          [trnType, dtPosted, trnAmt, checkNum, tName, tMemo, fitId] =
            this.getSubEls(trans[i], ['TRNTYPE', 'DTPOSTED', 'TRNAMT', 'CHECKNUM',
              'NAME', 'MEMO', 'FITID']) ;
          this.utilSvc.cDebug(this.CLASSNAME, 'i %d  trnTp: %s  dtPost: %s  trnAmt: %s  checkNum: %s  nm: %s  memo: %s, fitId: %s',
            i, trnType, dtPosted, trnAmt, checkNum, tName, tMemo, fitId) ;
          const tranExtra = (tName.endsWith(tMemo)) ? tName : tName+tMemo ; // catch check# in both
          const tranRec = new TranRec('', this.cvt2Date(dtPosted), account, '', trnType,
            parseFloat(trnAmt), tranExtra, 'NT', '', '', '', '', fitId, this.utilSvc.generateGuid()) ;
            this.utilSvc.cDebug(this.CLASSNAME, 'tranRec: %O  Acct: %s tNm: %s  Memo: %s', tranRec, account, tName, tMemo) ;
          if (ruleData !== undefined) {
            this.utilSvc.prefillDoc(tranRec.TranExtra, tranRec.Amount, ruleData, tranRec) ;
          }
          tranRecs.push(tranRec) ;
        }
        observer.next(tranRecs) ;
      };
      reader.onerror = function () {
        console.warn('error occurred while reading qfx file!');
        observer.error('Error reading file') ;
      };
    }) ;
    return getRecs ;
  }

  cvt2Date(ofxDate: string): string {
    const dbDate = ofxDate.substring(0,4) + '-' + ofxDate.substring(4,6) + '-' + ofxDate.substring(6,8) ;
    return dbDate ;
  }

}
