import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GenutilsService } from '../../../services/genutils.service';

@Component({
  selector: 'crefinancials-datarpt',
  standalone: true,
  imports: [ FormsModule],
  templateUrl: './datarpt.component.html',
  styleUrl: './datarpt.component.css'
})
export class DatarptComponent implements OnInit {
  @Input() fName = 'xxx' ;
  @Input() contentArray: any[] = [] ;
  screenDisplay = false ;
  jsonFName = '' ;  csvFName = '' ;
  CLASSNAME = 'DatarptComponent' ;

  constructor(private utilSvc: GenutilsService) { }

  ngOnInit(): void {
    this.jsonFName = this.fName + '.json' ;
    this.csvFName = this.fName + '.csv' ;
  }

  /** ************************************************************************
   * So html can stringify w/out changing source arrays
   * @param inStr 
   * @returns 
   *************************************************************************/
  jsonStr(inStr: any): string {   
    return JSON.stringify(inStr)
  }

  /** ************************************************************************
   * Process a CSV file by working thru headers, columns, etc..
   * @param inArr 
   * @param fName 
   ************************************************************************ */
  writeGenericCsv(inArr: any[], fName: string) {
    let outCsv = this.jsonArr2CsvStr(inArr) ;
    // outCsv = outCsv.replaceAll('#', 'lb;')
    outCsv = outCsv.replace(/#/g, 'lb;')
    this.utilSvc.cDebug(this.CLASSNAME, 'outcsv len: ', outCsv.length) ;
    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + outCsv) ;
    // window.open(encodedUri);
    this.utilSvc.writeFile(encodedUri, fName) ;
  }

  /** ************************************************************************
   * Generic processor of JSON for db dumps
   * @param inArr 
   * @param fName 
   *************************************************************************/
  writeGenericJson(inArr: any[], fName: string) {
    this.utilSvc.cDebug(this.CLASSNAME, 'writeGenericJson w/arr: %O  nm: %s', inArr, fName)
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(inArr))
    this.utilSvc.writeFile(dataStr, fName)
  }

  /** ************************************************************************
   * Creating a CSV string from a JSON array
   * @param inArr 
   * @returns 
   ************************************************************************ */
  jsonArr2Html(inArr: any[]): string {
    let outStr = '<table border="1"> <tr> ';
    const fldNames: string[] = Object.keys(inArr[0])
    const sortNames = fldNames.sort((a, b) =>  a.localeCompare(b))
    for (const fldNm of sortNames) {
      outStr += '<th border="1">' + fldNm + '</th>' ;
    }
    outStr += '</tr>'
    this.utilSvc.cDebug(this.CLASSNAME,'inarr len: ', inArr.length) ;
    for (const anyObj of inArr) {
      for (const fldNm of sortNames) {
        let curObj = anyObj[fldNm]
        if (typeof curObj === 'object') { curObj = JSON.stringify(curObj) }
        outStr += '<td border="1">' + curObj + '</td>' ;
      }
      outStr += '</tr>'
    }
    outStr += '</table>' ;
    return outStr ;
  }

  /** ************************************************************************
   * Creating a CSV string from a JSON array
   * @param inArr 
   * @returns 
   ************************************************************************ */
  jsonArr2CsvStr(inArr: any[]): string {
    let outStr = ''
    const fldNames: string[] = Object.keys(inArr[0])
    const sortNames = fldNames.sort((a, b) =>  a.localeCompare(b))
    let hdrLine = '' ;  let cma = '' ;
    for (const fldNm of sortNames) {
      hdrLine += cma + fldNm
      cma = ','
    }
    outStr += hdrLine + '\r\n'
    this.utilSvc.cDebug(this.CLASSNAME,'inarr len: ', inArr.length) ;
    for (const anyObj of inArr) {
      let line = '' ; cma = '' ;
      for (const fldNm of sortNames) {
        let curObj = anyObj[fldNm]
        if (typeof curObj === 'object') { curObj = JSON.stringify(curObj) }
        if (typeof curObj === 'string') {
          if (curObj.includes(',')) {curObj = '"' +curObj + '"'}
        }
        line += cma + curObj
        cma = ','
      }
      outStr += line + '\r\n' ;
    }
    return outStr ;
  }

}
