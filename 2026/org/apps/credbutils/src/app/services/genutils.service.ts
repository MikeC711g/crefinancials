import { Injectable } from '@angular/core';
import { KeyVal } from '../models/keyval.model';
import { RuleData } from '../models/ruledata.model';
import { House } from '../models/house.model';
import { Globals } from '../models/globals.model'
import { TranRec } from '../models/tranRec.model';

@Injectable({
  providedIn: 'root'
})
export class GenutilsService {
  globalTypes = { RuleData: 'ruleData', TaxCats: 'taxCats', CategoryTaxcats: 'categoryTaxcat',
    Houses: 'houses', TranType: 'tranType', Accounts: 'accounts', AccountType: 'accountType',
    CategoryFolders: 'categoryFolders', Logging: 'logging' } ;
  ruleData: RuleData[] = [] ;  tranTypes: string[] = [] ;  houses: House[] = []
  accountTypes: string[] = [] ; accounts: KeyVal[] = [] ; descripTaxcats: KeyVal[] = []
  descripCategories: KeyVal[] = [] ;  taxCats: KeyVal[] = []

  // constructor() { }

  getNewIdx(srceIdx: string, xref: KeyVal[], label: string): string {
    console.log('getNewIdx src: %s  label: %s', srceIdx, label)
    if (srceIdx === '') return '' ;
    const eIdx = xref.findIndex((idx) => idx.RKey === srceIdx)
    if (eIdx < 0) {
      console.warn('%s key %s not found xrefs %O', label, srceIdx, xref)
      return '' ;
    } else {
      return xref[eIdx].RVal
    }
  }    // End of getnewidx function def


  processGVals(globals: Globals[]) {
    const ruleAdmin: RuleData[] = [] ;    const tranTypes: string[] = []
    const houses: House[] = [] ;      const accountTypes: string[] = [] ;
    const accounts: KeyVal[] = [] ;       const descripTaxcats: KeyVal[] = [] ;
    const descripCategories: KeyVal[] = [] ;   const taxCats: KeyVal[] = [] ;

    let tmpHouse: any ;  let houseInfo: House ;
    let tmpRD: any ;   let ruleO : RuleData ;
    for (const inGlobal of globals) {
      switch(inGlobal.RKey) {
        case(this.globalTypes['TranType']): tranTypes.push(inGlobal.RVal) ; break ;
        case(this.globalTypes['Houses']):
          tmpHouse = inGlobal.RVal ;   houseInfo = tmpHouse ;
          houses.push(houseInfo) ;     break ;
        case(this.globalTypes['AccountType']):  accountTypes.push(inGlobal.RVal) ; break ;
        case(this.globalTypes['Accounts']):   accounts.push(this.getKV(inGlobal.RVal)) ; break ;
        case(this.globalTypes['CategoryTaxcats']):
          descripTaxcats.push(this.getKV(inGlobal.RVal)) ; break ;
        case(this.globalTypes['TaxCats']):   taxCats.push(this.getKV(inGlobal.RVal)) ; break ;
        case(this.globalTypes['CategoryFolders']):
          descripCategories.push(this.getKV(inGlobal.RVal)) ; break ;
        case(this.globalTypes['RuleData']):
          tmpRD = inGlobal.RVal ;    ruleO = tmpRD ;
          ruleAdmin.push(ruleO) ;    break ;
      }
    }
    this.ruleData = ruleAdmin
    this.descripTaxcats = descripTaxcats.sort((a, b) => a.RKey.localeCompare(b.RKey)) ;
    this.descripCategories = descripCategories.sort((a, b) => a.RKey.localeCompare(b.RKey)) ;
    this.tranTypes = tranTypes.sort((a, b) => a.localeCompare(b)) ;
    this.houses = houses.sort((a, b) => a.name.localeCompare(b.name)) ;
    this.accounts = accounts.sort((a, b) => a.RKey.localeCompare(b.RKey)) ;
    this.accountTypes = accountTypes.sort((a, b) => a.localeCompare(b)) ;
    this.taxCats = taxCats.sort((a, b) => a.RKey.localeCompare(b.RKey)) ;
  }
  getRuleData() {  return this.ruleData }
  getDescripTaxcats() { return this.descripTaxcats }
  getDescripCategories() { return this.descripCategories }
  getTranTypes() { return this.tranTypes }
  getHouses() { return this.houses }
  getAccounts() { return this.accounts }
  getAccountTypes() { return this.accountTypes }
  getTaxcats() { return this.taxCats }

  getKV(inVal: any): KeyVal {
    const tmpKv: KeyVal = inVal ;
    return tmpKv ;
  }

  filterTrans(inTrans: TranRec[], tfAcct?: string, tfDesc?: string, tfTranType?: string,
      tfHouse?: string, tfTaxCat?: string): TranRec[] {
    const origLen = inTrans.length
    const filtTrans = inTrans.filter(cTran => {
      if (tfAcct && cTran.Account !== tfAcct) return false ;
      if (tfDesc && cTran.Category !== tfDesc) return false ;
      if (tfTranType && cTran.TranType !== tfTranType) return false ;
      if (tfHouse && cTran.House !== tfHouse) return false ;
      if (tfTaxCat && cTran.TaxCat !== tfTaxCat) return false ;
      return true ;
    })
    console.log('Filtered %d trans down to %d', origLen, filtTrans.length)
    return filtTrans ;
  }

  writeGenericJson(inArr: any[], fName: string) {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(inArr))
    this.writeFile(dataStr, fName)
  }

  writeFile(encodedData: string, fileName: string) {
    console.log('into writeFile w/fname: ', fileName)
    const dlAnchor = document.createElement('a')
    dlAnchor.setAttribute("href", encodedData)
    dlAnchor.setAttribute("download", fileName)
    document.body.appendChild(dlAnchor)
    dlAnchor.click()
    dlAnchor.remove()
  }
}
