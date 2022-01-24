import { Observable } from 'rxjs';
import { TranRec } from './../models/TranRec.model';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CsvService {
  splitStr = ',' ;    trimRec = false ;

  /****************************************************************************
  * Static maps for transforming csv values to data base values
  *****************************************************************************/
  static cfcuggMap : {[key: string]: string } = {
  "Dining Out": "Restaurant", "Consumer Goods": "Supplies",
	"Other Income": "XIn", "Loan Payments": "Mortgage Payment",
	"Credit Card Payments": "Credit Card Payment", Dividends: "Dividends"
  }
  static chaseMap: {[key: string]: string } = {
    "Bills & Utilities": "Utilities", "Repair & Maintenance": "Supplies",
    "Merchandise & Inventory": "Supplies", "Food & Drink": "Restaurant",
    "Professional Services": "Utilities", Travel: "Recreation",
    "AUTOMATIC PAYMENT - THANK": "Credit Card Payment"
  }
  static bbtTypeMap : {[key: string]: string } = { Deposit: "Dep", Credit: "Dep", Debit: "Chg"}
  static bbtDescripMap  : {[key: string]: string } = {
    "Apartments.com": "Rent Income", "A2A.TRANFR": "Xfer to cfcu",
    "UTILITY BOGUE": "Beach Rental Utilities", "HARRIS MANAGEMENT": "CRE Admin",
    "Cozy Services": "Rent Income", "Premium MANHATTANLIFE": "Insurance"
  }
  static bbtHouseList : {[key: string]: string } = {    // apartments.com records
    Olsen: "189NP", Hicks: "187NP", Carlisle: "805PB", Naegelen: "8416SC", Jasinski: "395WW",
    Upchurch: "259PB", Anderson: "502WD", New: "414HP", Lewandowsk: "414HP", Mathews: "502S13",
    Prince: "251PB"
  }
  static samsMap  : {[key: string]: string } = {
    "AUTOMATIC PAYMENT": "Payment", WALMART: "Supplies", "HANNAH CREEK": "Veterinary",
    BP: "Gas", REALO: "Pharmacy", PUBLIX: "Groceries", FOOD: "Groceries",
    EXXON: "Gas", HEALTHSHARE: "Insurance", AMAZON: "Supplies",
    "CONSUMER CELLULAR": "CRE Admin", CVS: "Pharmacy", WALGREENS: "Pharmacy",
    CHEWY: "Groceries", "HARRIS TEETER": "Groceries"
  }

  /****************************************************************************
  * Control logic for reading the local csv file
  *****************************************************************************/
   readCSV($event: any, account: string): Observable<TranRec[]> {
    // let files = $event.srcElement.files ;
      const getRecs = new Observable<TranRec[]>((observer) => {
      let records: TranRec[] = new Array<TranRec>() ;
      let input = $event.target ;
      let reader = new FileReader() ;
      console.log(input.files[0]) ;
      reader.readAsText(input.files[0]) ;
      reader.onload = () => {
        let csvData = reader.result;
        let csvRecordsArray: string[]  = (<string>csvData).split(/\r\n|\n/);

        let headersRow = this.getHeaderArray(csvRecordsArray);

        records = this.getDataRecordsArrayFromCSVFile(csvRecordsArray, account, headersRow.length);
        observer.next(records) ;
      };

      reader.onerror = function () {
        console.log('error is occured while reading file!');
        observer.error('Error reading file') ;
      };
    }) ;
    return getRecs ;
  }

  /****************************************************************************
  * Retrieve headers from csv file
  *****************************************************************************/
   getHeaderArray(csvRecordsArr: string[]) {
    if (csvRecordsArr[0].slice(0, 1) == '"') {    // If quotes on flds, split w/"," and trim
      this.splitStr = '","' ;  this.trimRec = true ;
      csvRecordsArr[0] = csvRecordsArr[0].slice(1, -1) ;
    } else {
      this.splitStr = ',' ;  this.trimRec = false ;
    }
    let headers: string[] = csvRecordsArr[0].split(this.splitStr);
    let headerArray: string[] = [];
    for (let j = 0; j < headers.length; j++) {
      headerArray.push(headers[j]);
    }
    console.log(headerArray) ;
    return headerArray;
  }

  /****************************************************************************
  * For each record in csv, create a tranRec with logic unique to each account
  *****************************************************************************/
   getDataRecordsArrayFromCSVFile(csvRecordsArray: string[], account: string, headerLength: number): TranRec[] {
    let csvArr = new Array<TranRec>() ;
    let colCntFail = 0 ;

    for (let i = 1; i < csvRecordsArray.length; i++) {
      let tranRec: TranRec = new TranRec('', '', '', '', '', 0.0, '', '', '', '', '', '')
          // If CSV has vals in quotes, use quotes in split and rmv first and last quote
      if (this.trimRec) { csvRecordsArray[i] = csvRecordsArray[i].slice(1, -1) ; }
      let currentRecord: string[] = csvRecordsArray[i].split(this.splitStr);
      if (currentRecord.length == headerLength) {   // # cols should be same
        tranRec.TranId = this.generateGuid() ;    // Fill vals that are common to all recs
        tranRec.Account = account ;
        let rtnVal = {tranRec: tranRec, err: ''} ;

        switch (account) {    // Select proper handler for the record
          case 'sams':
            rtnVal = this.samsHandler(tranRec, currentRecord) ;
            break ;
          case 'chase':
            rtnVal = this.chaseHandler(tranRec, currentRecord) ;
            break ;
          case 'bbt9723':
          case 'bbt9312':
            rtnVal = this.bbtHandler(tranRec, currentRecord) ;
            break ;
          case 'cfcugg':
            rtnVal = this.cfcuggHandler(tranRec, currentRecord) ;
            break ;
          case 'lowes':
            rtnVal = this.lowesHandler(tranRec, currentRecord) ;
            break ;
          default:
        }
        if (rtnVal.err === '') {
          csvArr.push(rtnVal.tranRec) ; // If record processed OK, add it to array
        }
      } else {
        if (currentRecord.length > 1) {   // rows w/1 is usually just tied to EOF
          colCntFail++ ;    // Different # cols than header row
          console.log('ColCntFail. Need ', headerLength, ' Got: ', currentRecord.length,
            ' Details: ', currentRecord) ;
        }
      }
    }
    if (colCntFail > 0) { console.log(colCntFail, " Records did not have ", headerLength, ' cols')}
    return csvArr;        // Return the array to caller
  }

  /****************************************************************************
  * Specific logic for sams club mastercard
  *****************************************************************************/
  samsHandler(tranRec: TranRec, curMap: string[]): any {
    let curErr = '' ;
    tranRec.TranDate = this.cvt2Date(curMap[0]) ;
        // Look to where funds went and see if we can identify type of tran
    tranRec.Description = this.ckContains(CsvService.samsMap, curMap[4], "Groceries") ;
    tranRec.Amount = parseFloat(curMap[3]) ;      // Parse amount into number
    tranRec.TranType = (tranRec.Amount < 0) ? "Chg" : "Credit" ;
    tranRec.TranExtra = curMap[4] ;
    return { tranRec: tranRec, err: curErr } ;
  }

  /****************************************************************************
  * Specific logic for chase business VISA card
  *****************************************************************************/
   chaseHandler(tranRec: TranRec, curMap: string[]): any {
    let curErr = '' ;
    tranRec.TranDate = this.cvt2Date(curMap[1]) ;
    tranRec.Description = (curMap[4] in CsvService.chaseMap) ?
      CsvService.chaseMap[curMap[4]] : curMap[4] ;    // Cvt expense type to DB
    tranRec.Amount = parseFloat(curMap[6]) ;
    tranRec.TranType = (tranRec.Amount > 0) ? 'Credit' : 'Chg' ;
    tranRec.TranExtra = curMap[3] ;
    return { tranRec: tranRec, err: curErr } ;
  }

  /****************************************************************************
  * Specific logic for BB&T/Truist Business and Personal accounts
  *****************************************************************************/
   bbtHandler(tranRec: TranRec, curMap: string[]): any {
    let curErr = '' ;
    let dfltDesc = (tranRec.Account === 'bbt9723') ? 'Contractor' : 'Groceries' ;
    tranRec.TranDate = this.cvt2Date(curMap[0]) ;
    tranRec.TranType = (curMap[1] in CsvService.bbtTypeMap) ?
      CsvService.bbtTypeMap[curMap[1]] : curMap[1] ;    // Cvt csv type to DB type
          // Try to correlate target of expense to a category
    tranRec.Description = this.ckContains(CsvService.bbtDescripMap, curMap[3], dfltDesc) ;
    if (tranRec.Description === 'Rent Income') {
      tranRec.TranType = 'Rent' ;
      const rentNm = curMap[3].split(' ')[0] ;
      if (rentNm in CsvService.bbtHouseList) { tranRec.House = CsvService.bbtHouseList[rentNm] ; }
    }
    if (curMap[2] === "" || curMap[2] === "0") {
      tranRec.TranExtra = this.truncStr(curMap[3], 30) ;
    } else {
      tranRec.TranExtra = curMap[2] ;
      tranRec.Annotation = this.truncStr(curMap[3], 30) ;
    }
    let tmpStr = curMap[4].replace('$', '') ;   // Handle negative from csv
    const goNeg = (tmpStr.includes('(')) ;
    if (goNeg) {
      tmpStr = tmpStr.replace('(', '') ;
      tmpStr = tmpStr.replace(')', '') ;
    }
    tranRec.Amount = parseFloat(tmpStr) ;
    if (goNeg) { tranRec.Amount *= -1 ; }
    return { tranRec: tranRec, err: curErr } ;
  }

  /****************************************************************************
  * Specific logic for BB&T/Truist Business and Personal accounts
  *****************************************************************************/
   cfcuggHandler(tranRec: TranRec, curMap: string[]): any {
    let curErr = '' ;
    tranRec.TranDate = this.cvt2Date(curMap[0]) ;
    tranRec.Description = (curMap[6] in CsvService.cfcuggMap) ?
      CsvService.cfcuggMap[curMap[6]] : curMap[6] ;
    let tmpStr = curMap[4].replace('$', '') ;  tmpStr = tmpStr.replace(',', '') ;
    tranRec.Amount = parseFloat(tmpStr) ;
    if (curMap[3] == '') {
      tranRec.TranExtra = this.truncStr(curMap[1], 30) ;
    } else {
      tranRec.TranExtra = curMap[3] ;
      tranRec.Annotation = this.truncStr(curMap[1], 30) ;
    }
    if (tranRec.Amount > 0) {
      tranRec.TranType = 'Credit' ;
    } else {
      tranRec.TranType = (curMap[3] === '') ? 'Chg' : 'Check' ;
    }
    if (tranRec.Description.toUpperCase().includes('PAYMENT') ||
      curMap[1].toUpperCase().includes('PAYMENT')) { tranRec.TranType = 'Pmt' ; }
    if (tranRec.Description === 'XIn') {
      tranRec.TranType = 'Xin' ;  tranRec.Description = 'Xfer from bbt' ;
    }

    return { tranRec: tranRec, err: curErr } ;
  }

  /****************************************************************************
  * Specific logic for Lowes Amex account
  *****************************************************************************/
   lowesHandler(tranRec: TranRec, curMap: string[]): any {
    let curErr = '' ;
    tranRec.TranDate = this.cvt2Date(curMap[0]) ;
    tranRec.Amount = parseFloat(curMap[5]) ;
    tranRec.Amount *= -1 ;
    tranRec.TranType = (tranRec.Amount < 0) ? 'Chg' : 'Credit' ;
    tranRec.Description = 'Supplies' ;
    tranRec.TranExtra = (curMap[2].slice(0,4) === 'LOWE') ? curMap[4] : this.truncStr(curMap[2], 15) ;
    return { tranRec: tranRec, err: curErr } ;
  }

  /****************************************************************************
  * Specific logic for BB&T/Truist Business and Personal accounts
  *****************************************************************************/
   generateGuid() : string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0,
        v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /****************************************************************************
  * Specific logic for BB&T/Truist Business and Personal accounts
  *****************************************************************************/
   ckYear(inYear: string) : string {
    if (inYear.length < 4) { return '20'+inYear ; }
    return inYear ;
  }

  /****************************************************************************
  * Specific logic for BB&T/Truist Business and Personal accounts
  *****************************************************************************/
   padDate(inPart: string) : string {
    if (inPart.length < 2) { return '0'+inPart ;}
    return inPart ;
  }

  /****************************************************************************
  * Specific logic for BB&T/Truist Business and Personal accounts
  *****************************************************************************/
   cvt2Date(inDate: string): string {
    let dtParts: string[] = inDate.split('/') ;
    return this.ckYear(dtParts[2])+'-'+this.padDate(dtParts[0])+'-'+this.padDate(dtParts[1]) ;
  }

  /****************************************************************************
  * Specific logic for BB&T/Truist Business and Personal accounts
  *****************************************************************************/
   ckContains(inMap: any, srchTarg: string, dfltRtn: string) : string {
    for (const pKey in inMap) {
      if (srchTarg.includes(pKey)) {
        return inMap[pKey] ;
      }
    }
    return dfltRtn ;
  }

  /****************************************************************************
  * Specific logic for BB&T/Truist Business and Personal accounts
  *****************************************************************************/
   truncStr(inStr: string, truncLen: number): string {
    return (inStr.length > truncLen) ? inStr.slice(0, truncLen) : inStr ;
  }
}
