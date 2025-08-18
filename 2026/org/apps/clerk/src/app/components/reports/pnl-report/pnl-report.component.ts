import { Component, Input, OnInit } from '@angular/core';
import { KeyValuePipe } from '@angular/common';
import { TranRec } from './../../../models/TranRec.model';
// import { FirebaseService } from '../../../services/firebase.service';
import { GenutilsService } from './../../../services/genutils.service';
import { KeyVal } from './../../../models/globals.model';

import { jsPDF } from "jspdf";

interface PnlData {   // subTotal holder for each category
  category: string,
  taxCat: string,
  totBal: number
}

interface MapVal {    // Aggregate categories and keep totals
  pnlData: PnlData[],
  totBal: number
}

@Component({
  selector: 'app-pnl-report',
  standalone: true,
  imports: [KeyValuePipe],
  providers: [GenutilsService],
  templateUrl: './pnl-report.component.html',
  styleUrl: './pnl-report.component.css'
})

export class PnlReportComponent  implements OnInit {
  @Input() tranRecs: TranRec[] = [] ;
  @Input() categoryFolders: KeyVal[] = [] ;
  @Input() startDt = '' ;    @Input() endDt = '' ;
  @Input() debitTaxCats = ['BE', 'CE'] ;  @Input() creditTaxCats = ['BI'] ;
  @Input() 'title' = 'Profit & Loss Report' ;

        // Structures for P&L report
  totExpense = 0 ;  totIncome = 0 ;  netIncome = 0 ;
  allTaxCats = [''] ;
  incomeMap: Map<string, MapVal> = new Map<string, MapVal>() ;
  expenseMap: Map<string, MapVal> = new Map<string, MapVal>() ;
  CLASSNAME = 'pnlreport' ;

  constructor(private utilSvc: GenutilsService) {}

  ngOnInit(): void {
    this.utilSvc.cLog(this.CLASSNAME, "In w/tranRecs: %O  dts: %s %s catFolders: %O",
      this.tranRecs, this.startDt, this.endDt, this.categoryFolders)
    this.allTaxCats = this.creditTaxCats.concat(this.debitTaxCats) ;
    this.profitNLoss() ;
  }


  /** ************************************************************************
   * Primary logic to gen data for PnL reports
   ************************************************************************ */
  profitNLoss() {
    this.utilSvc.cLog(this.CLASSNAME,'tranRecs %O', this.tranRecs) ;
      // Need object key to map which recognizes exact equality, so cluging an array
    const pnlData: PnlData[] = [] ;
    // let pnlMap: Map<KeyVal, number> = new Map<KeyVal, number>() ;
    // Filter out parent trans and keep only business taxcats.  Filter here to avoid
    //  bringing back and re-uniting split trans.
    const filtTrans = this.tranRecs.filter(tr =>
      tr.TranType !== 'TPARENT' && this.allTaxCats.indexOf(tr.TaxCat) > -1)
      // (this.selectedHouseArr.length === 0 || this.selectedHouseArr.indexOf(tr.House) > -1))
    for (const curTran of filtTrans) {
      if (curTran.Category === '') {
        this.utilSvc.cWarn(this.CLASSNAME, "Tran had no category: %O", curTran)
        continue 
      }
      const curPnl: PnlData = pnlData.find((pd) =>
        pd.category === curTran.Category && pd.taxCat === curTran.TaxCat)!
      if (curPnl) {
        curPnl.totBal += curTran.Amount ;     // Have this combo, add to total
        curPnl.totBal = this.utilSvc.fixAmt(curPnl.totBal)
      } else {
        pnlData.push({category: curTran.Category, taxCat: curTran.TaxCat,
          totBal: curTran.Amount})
      }
    }
    this.utilSvc.cDebug(this.CLASSNAME,'pnlData %O', pnlData) ;
    this.incomeMap.clear() ;    this.expenseMap.clear() ;
    const incomes: PnlData[] = pnlData.filter((pd) => this.creditTaxCats.indexOf(pd.taxCat) > -1) ;
    const expenses: PnlData[] = pnlData.filter((pd) => this.debitTaxCats.indexOf(pd.taxCat) > -1) ;
    this.totExpense = 0 ;  this.totIncome = 0 ;
    console.log('Incomes: %O  Expenses: %O', incomes, expenses)
    for (const curCat of this.categoryFolders) {
      const catInc = incomes.filter((it) => curCat.RVal.includes(it.category)) ;
      const catExp = expenses.filter((it) => curCat.RVal.includes(it.category)) ;
      console.log('catInc: %O  catExp: %O', catInc, catExp)
      if (catInc.length > 0) {
        const totInc4Cat = this.totArray(catInc)
        this.incomeMap.set(curCat.RKey, {pnlData: catInc, totBal: this.utilSvc.fixAmt(totInc4Cat)})
        this.totIncome += totInc4Cat ;
      }
      if (catExp.length > 0) {
        const totExp4Cat = this.totArray(catExp)
        this.expenseMap.set(curCat.RKey, {pnlData: catExp, totBal: this.utilSvc.fixAmt(totExp4Cat)})
        this.totExpense += totExp4Cat ;
      }
      this.totIncome = this.utilSvc.fixAmt(this.totIncome) ;
      this.totExpense = this.utilSvc.fixAmt(this.totExpense) ;
      this.netIncome = this.utilSvc.fixAmt(this.totExpense + this.totIncome) ;
    }
    this.utilSvc.cDebug(this.CLASSNAME, 'Incomes: %O  Expenses: %O  incomeMap %O expenseMap: %O',
      incomes, expenses, this.incomeMap, this.expenseMap) ;
  }

  /** ************************************************************************
   * Write an RTF version of PnL for import into word processors
   ************************************************************************ */
  writePnlRtf() {
    let fStr = '{\\rtf1\\ansi\\deff0\n'+    // Doc header
      '{\\fonttbl {\\f0 Times New Roman;} {\\f1\\fswiss Arial;} {\\f2\\fmodern Courier New;}}\n' +
      `\\f0 {\\pard\\fs36\\qc\\b ${this.title} \\line\\par}\n` +
      `{\\pard\\fs20\\qc Start Date: ${this.startDt}  End Date: ${this.endDt} \\line\\par}\n` +
      '{\\pard\\fs32\\b Income \\line\\par}\n'
    const [incomeTot, iStr] = this.catGrpRtf(false, this.incomeMap) ;
    fStr += iStr ;    const incomeStr = this.utilSvc.dispFmt(incomeTot)
    fStr += '  {\\trowd \\trgaph180  \\cellx5760\\cellx8640\n'
    fStr += '   {\\pard\\intbl\\li420\\fs32\\sb240\\b Total Income \\cell   ' +
      `\\pard\\intbl\\qr\\fs32\\sb240\\b ${incomeStr} \\cell} \\row}\n`

    fStr += '{\\pard\\fs32\\sb480\\b Expenses \\line\\par}\n'
    const [expenseTot, eStr] = this.catGrpRtf(true, this.expenseMap) ;
    fStr += eStr ;    const expenseStr = this.utilSvc.dispFmt(expenseTot)
    fStr += '  {\\trowd \\trgaph180  \\cellx5760\\cellx8640\n'
    fStr += '   {\\pard\\intbl\\li420\\fs32\\sb240\\b Total Expense \\cell   ' +
      `\\pard\\intbl\\qr\\fs32\\sb240\\b ${expenseStr} \\cell} \\row}\n`

    fStr += '  {\\trowd \\trgaph180  \\cellx5760\\cellx8640\n'
    const netInc = this.utilSvc.dispFmt(incomeTot - expenseTot) ;
    fStr += `  {\\pard\\intbl\\li420\\fs32\\sb240\\b Net Income \\cell   \\pard\\intbl\\qr\\fs32\\sb240\\b ${netInc} \\cell} \\row}\n`
    fStr += '   {\\pard\\fs32\\li720\\sb480\\b Net Income Summary \\line\\par}\n'
    fStr += '   {\\trowd \\trgaph180  \\cellx5760\\cellx8640\n'
    fStr += `   {\\pard\\intbl\\li720\\fs28 Income \\cell   \\pard\\intbl\\qr ${incomeStr} \\cell} \\row}\n`
    fStr += '   {\\trowd \\trgaph180  \\cellx5760\\cellx8640\n'
    fStr += `   {\\pard\\intbl\\li720\\fs28 Expense \\cell   \\pard\\intbl\\qr -${expenseStr} \\cell} \\row}\n`
    fStr += '  {\\trowd \\trgaph180  \\cellx5760\\cellx8640\n'
    fStr += `   {\\pard\\intbl\\li720\\sb160\\fs36\\b Net Income \\cell   \\pard\\intbl\\qr\\sb160\\b ${netInc} \\cell} \\row} }\n`
    console.log('TotIncome: %d  TotExpense: %d', incomeTot, expenseTot)
    const encodedUri = encodeURI("data:text/plain;charset=utf-8," + fStr) ;
    // window.open(encodedUri);
    this.utilSvc.writeFile(encodedUri, 'profitNLoss.rtf') ;
  }

  /**
   * Specific logic for each category folder rendering in RTF
   * @param isExpense 
   * @param inMap 
   * @returns 
   */
  catGrpRtf(isExpense: boolean, inMap: Map<string, MapVal>): [number, string] {
    let cStr = '' ; let hdrSpce = '' ; let ieTot = 0 ;
    for (const [catGrp, catVal] of inMap) {
      cStr += `  {\\pard \\fs28${hdrSpce} \\b \\li720 ${catGrp} \\line\\par}\n`
      hdrSpce = '\\sb360 '
      const [rStr, tNum] = this.writeCatGrp(catGrp, catVal, isExpense)
      cStr += rStr ;  ieTot += tNum ;
      cStr += '   {\\trowd \\trgaph180  \\cellx5760\\cellx8640\n'
      cStr += '    {\\pard\\intbl\\li720 \\cell   \\pard\\intbl\\qr ---------- \\cell} \\row}\n'
      cStr += '   {\\trowd \\trgaph180  \\cellx5760\\cellx8640\n'
      cStr += `    {\\pard\\intbl\\li720\\b\\fs28 Total ${catGrp} \\cell   \\pard\\intbl\\qr\\b ${this.utilSvc.dispFmt(tNum)} \\cell} \\row}\n`
    }
    return [ieTot, cStr] ;
  }

  /** ************************************************************************
   * Write out one category folder in RTF
   * @param catGrp 
   * @param mapVal 
   * @param isExpense 
   * @returns 
   ************************************************************************ */
  writeCatGrp(catGrp: string, mapVal: MapVal, isExpense: boolean): [string, number] {
    let locStr = ''
    console.log('catGrp: ', catGrp, ' TotBal: ', mapVal.totBal)
    for (const pnlData of mapVal.pnlData) {
      locStr += '    {\\trowd \\trgaph180  \\cellx5760\\cellx8640\n'
      const pnlTot = (isExpense && pnlData.totBal < 0) ? pnlData.totBal * -1 : pnlData.totBal
      locStr += `     {\\pard\\intbl\\li720\\fs24 ${pnlData.category} \\cell   \\pard\\intbl\\qr ${this.utilSvc.dispFmt(pnlTot)} \\cell} \\row}\n`
      console.log('category: %s  tc: %s  bal: %d: ', pnlData.category, pnlData.taxCat, pnlData.totBal)
    }
    const mapTot = (isExpense && mapVal.totBal < 0) ? mapVal.totBal *= -1 : mapVal.totBal ;
    return [locStr, mapTot] ;
  }

  /** ************************************************************************
   * Calculate total of an array of PnLData (debit or credit)
   * @param pnlData 
   * @returns 
   ************************************************************************ */
  totArray(pnlData: PnlData[]): number {
    let totBal = 0
    for (const curData of pnlData) { totBal += curData.totBal }
    return this.utilSvc.fixAmt(totBal) ;
  }

  /** ************************************************************************
   * Rendering of PnL as a PDF
   ************************************************************************ */
  writePnLPDF() {
    let yCoord = 10 ; let xCoord = 10 ; let incomeTot = 0 ; let  expenseTot = 0
    const divLine = '--------------------------------------------------------------------' +
      '-------------------------'
    const doc = new jsPDF() ;
    const xCenter = doc.internal.pageSize.width / 2 ;
    doc.setFont('Helvetica', 'bold').setFontSize(18).
      text(this.title, xCenter, yCoord, {align: 'center'}) ;
    yCoord += 7 ;
    const dtStr = `Start Date: ${this.startDt}   End Date: ${this.endDt}` ;
    doc.setFontSize(10).text(dtStr, xCenter, yCoord, {align: 'center'}) ;  yCoord += 8

    doc.setFontSize(14).text('Income', xCoord, yCoord) ;
    [incomeTot, xCoord, yCoord] = this.catGrpPdf(doc, xCoord, yCoord+8, this.incomeMap)
    yCoord += 2
    doc.setFontSize(14).text('Total Income', xCoord, yCoord).
      text(this.utilSvc.dispFmt(incomeTot), xCoord+128, yCoord, {align: 'right'})
    doc.text(divLine, xCenter, yCoord+6, {align: 'center'}) ;
    doc.text('Expense', xCoord, yCoord+10) ;
    [expenseTot, xCoord, yCoord] = this.catGrpPdf(doc, xCoord, yCoord+17, this.expenseMap)
    yCoord += 2
    doc.setFontSize(14).text('Total Expense', xCoord, yCoord).
      text(this.utilSvc.dispFmt(expenseTot), xCoord+128, yCoord, {align: 'right'})
    doc.text(divLine, xCenter, yCoord+6, {align: 'center'}) ;  yCoord += 14

    if (yCoord > 220) yCoord = this.pdfAddPg(doc, yCoord) ;
    const netInc = incomeTot - expenseTot ;
    doc.text('Net Income', xCoord, yCoord).
      text(this.utilSvc.dispFmt(netInc), xCoord+128, yCoord, {align: 'right'})
    doc.text('Net Income Summary', xCoord, yCoord+10) ;  yCoord += 16
    doc.setFontSize(12).setFont('Helvetica', 'normal').text('Income', xCoord+8, yCoord).
      text(this.utilSvc.dispFmt(incomeTot), xCoord+128, yCoord, {align: 'right'}); yCoord += 6 ;
    doc.text('Expense', xCoord+8, yCoord).
      text('-' + this.utilSvc.dispFmt(expenseTot), xCoord+128, yCoord, {align: 'right'}) ; yCoord += 4 ;
    doc.text('---------------', xCoord+128, yCoord, {align: 'right'}) ; yCoord += 4 ;
    doc.setFontSize(14).setFont('Helvetica', 'bold').text('Net Income', xCoord+4, yCoord).
      text(this.utilSvc.dispFmt(netInc), xCoord+128, yCoord, {align: 'right'});
    
    doc.save('PnL.pdf')
  }

  /** ************************************************************************
   * Category folder logic for PDF from PnL data
   * @param doc 
   * @param xCoord 
   * @param yCoord 
   * @param ieMap 
   * @returns 
   ************************************************************************ */
  catGrpPdf(doc: jsPDF, xCoord: number, yCoord: number, ieMap: Map<string, MapVal> ):
    [number, number, number] {
    let ieTot = 0 ;   let catGrpTot = 0 ;
    for (const [catGrp, catVal] of ieMap) {
      const yAtBottom = yCoord + (6 * catVal.pnlData.length)
      if (yAtBottom > 250) yCoord = this.pdfAddPg(doc, yCoord) ;
      doc.setFontSize(12).text(catGrp, xCoord+4, yCoord) ;
      [ieTot, xCoord, yCoord] = this.catGrpDtls(doc, catVal, xCoord, yCoord+7, true)
      catGrpTot += ieTot ;  yCoord -= 3 ;   // Shrink for line of underscores
      doc.text('---------------', xCoord+128, yCoord, {align: 'right'}) ; yCoord += 5 ;
      doc.setFont('Helvetica', 'bold').setFontSize(12).text('Total '+catGrp, xCoord+10, yCoord).
        text(this.utilSvc.dispFmt(ieTot), xCoord+128, yCoord, {align: 'right'}) ;
      yCoord += 10
    }
    return [catGrpTot, xCoord, yCoord]
  }

  /** ************************************************************************
   * Category group rendering for PDF
   * @param doc 
   * @param catVal 
   * @param xCoord 
   * @param yCoord 
   * @param isExpense 
   * @returns 
   ************************************************************************ */
  catGrpDtls(doc: jsPDF, catVal: MapVal, xCoord: number, yCoord: number, isExpense: boolean):
    [number, number, number] {
    doc.setFontSize(10).setFont('Helvetica', 'normal')
    let catTotal = 0 ;
    for (const pnlData of catVal.pnlData) {
      const pnlTot = (isExpense && pnlData.totBal < 0) ? pnlData.totBal * -1 : pnlData.totBal
      doc.text(pnlData.category, xCoord+10, yCoord).text(this.utilSvc.dispFmt(pnlTot), xCoord+128, yCoord, {align: 'right'})
      yCoord += 6 ;  catTotal += pnlTot ;
    }
    return [catTotal, xCoord, yCoord]
  }

  /** ************************************************************************
   * Start a new page and reset the vertical coordinate
   * @param doc 
   * @param yCoord 
   * @returns 
   ************************************************************************ */
  pdfAddPg(doc: jsPDF, yCoord: number): number {
    doc.addPage() ;
    return 10 ;
  }
}
