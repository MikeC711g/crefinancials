import { Component, Input, OnInit } from '@angular/core';
import { TranRec } from '../../../models/TranRec.model';
import { GenutilsService } from '../../../services/genutils.service';
import { Project } from '../../../models/project.model';
import { jsPDF } from "jspdf";

interface ProjTran {  // Holder for transactions tied to a project
  projId: string,
  projDesc: string ,
  projTot: number,
  tranRecs: TranRec[] ;
}

interface HouseProj {
  houseNm: string ,   // Holder for projects tied to a house
  houseTot: number,
  projTran: ProjTran[] ;
}

@Component({
  selector: 'crefinancials-exp2projreport',
  standalone: true,
  imports: [],
  templateUrl: './exp2projreport.component.html',
  styleUrls: ['./exp2projreport.component.css']
})
export class Exp2projreportComponent implements OnInit {
  @Input() tranRecs: TranRec[] = [] ;
  @Input() projects: Project[] = [] ;
  @Input() startDt = '' ;  @Input() endDt = '' ;
  houseArr: HouseProj[] = [] ;  reportDetails = false ;
  CLASSNAME = 'exp2projreport' ;

  constructor(private utilSvc: GenutilsService) {}

  ngOnInit(): void {
      this.expByProject() ;
  }
  /** ************************************************************************
   * Main logic for expenses by project
   ************************************************************************ */
  expByProject() {
    this.utilSvc.cLog(this.CLASSNAME,'Into expByProject') ;
    for (const testTran of this.tranRecs) 
      if (testTran.House !== '' && testTran.Project !== '')
        console.log('Cat: %s  Hs: %s  Pr: %s', testTran.Category, testTran.House, testTran.Project) ;
    const filtTrans = this.tranRecs.filter(tr => tr.House)
    for (const curTran of filtTrans) {   if (!curTran.Project)   curTran.Project = 'No project' ;}
    const sortTrans = filtTrans.sort((a, b) => {
      let cmp = a.House.localeCompare(b.House) ;
      if (cmp != 0) { return cmp }
      cmp = a.Project.localeCompare(b.Project) ;
      if (cmp != 0) { return cmp }
      return (a.TranDate < b.TranDate) ? -1 : 1 ;
    })
    this.utilSvc.cLog(this.CLASSNAME,'postFilterTranList %O', sortTrans) ;
    let curProj: ProjTran = { projId: '', projDesc: '', projTot: 0, tranRecs: [] }
    let curHouseProj: HouseProj = { houseNm: '', houseTot: 0, projTran: []} ;
    for (const curTran of sortTrans) {
      if (curTran.House !== curHouseProj.houseNm) {
        if (curHouseProj.houseNm !== '') {
          if (curProj.tranRecs.length > 0) {
            curHouseProj.projTran.push(curProj) ; curHouseProj.houseTot += curProj.projTot ;
          } 
          this.houseArr.push(curHouseProj) ;
        } 
        curHouseProj = { houseNm: curTran.House, houseTot: 0, projTran: []}
        curProj = { projId: curTran.Project, projDesc: this.getProjDesc(curTran.Project),
          projTot: 0, tranRecs: [] }
      }
      if (curProj.projId !== curTran.Project) {  // Project break w/in house
        curHouseProj.projTran.push(curProj) ;  curHouseProj.houseTot += curProj.projTot ;
        curProj = { projId: curTran.Project, projDesc: this.getProjDesc(curTran.Project),
          projTot: 0, tranRecs: [] }
      }
      curProj.tranRecs.push(curTran) ;  curProj.projTot += curTran.Amount ;
    }
    if (curProj.tranRecs.length > 0) {
      curHouseProj.projTran.push(curProj) ; curHouseProj.houseTot += curProj.projTot ;
    } 
    if (curHouseProj.projTran.length > 0)  this.houseArr.push(curHouseProj) ;

    this.utilSvc.cLog(this.CLASSNAME, 'HouseArr: %O  ', this.houseArr) ;
  }

  /** ************************************************************************
   * Get the description of the project via finding the project row based on id
   * @param projKey ProjectId
   * @returns ProjectDescription
   ************************************************************************ */
  getProjDesc(projKey: string): string {
    if (projKey === 'No project')  return 'No project' ;
    let  projDesc = 'NotFoundProj' ;
    const projRow = this.projects.find(pr => pr.ProjectId === projKey)
    if (projRow)   projDesc = projRow.Description ;
    else  this.utilSvc.cWarn(this.CLASSNAME, 'Failed to find project for ID: %s', projKey)
    return projDesc ;
  }
  
  dispFmt(inNo: number, prec = 2): string {    return this.utilSvc.dispFmt(inNo, prec)  }

  writeExpHPRtf() {
    console.log('Called write RTF')
  }

  writeExpHPPdf() {
    let yCoord = 10 ; const xCoord = 10 ;
    const doc = new jsPDF() ;
    const xCenter = doc.internal.pageSize.width / 2 ;
    doc.setFont('Helvetica', 'bold').setFontSize(18).
      text('House Expenses by Project', xCenter, yCoord, {align: 'center'}) ;
    yCoord += 7 ;
    const dtStr = `Start Date: ${this.startDt}   End Date: ${this.endDt}` ;
    doc.setFontSize(10).text(dtStr, xCenter, yCoord, {align: 'center'}) ;  yCoord += 8
    for (const curHouse of this.houseArr) {
      doc.setFontSize(14).text(curHouse.houseNm, xCoord, yCoord).
        text(this.utilSvc.dispFmt(curHouse.houseTot), xCoord+128, yCoord) ;
      yCoord += 10 ;
      for (const curProj of curHouse.projTran) {
        doc.setFontSize(12).text(curProj.projDesc, xCoord+20, yCoord).
          text(this.utilSvc.dispFmt(curProj.projTot), xCoord+128, yCoord) ;
        yCoord += 7 ;
      }
      yCoord += 10 ;      
    }
    doc.save('exp2Proj.pdf')
  }
}
