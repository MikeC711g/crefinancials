import { Component, Input, OnInit } from '@angular/core';
import { TranRec } from '../../../models/TranRec.model';
import { GenutilsService } from '../../../services/genutils.service';
import { Project } from '../../../models/project.model';


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
  selector: 'app-exp2projreport',
  templateUrl: './exp2projreport.component.html',
  styleUrl: './exp2projreport.component.css'
})
export class Exp2projreportComponent implements OnInit {
  @Input() tranRecs: TranRec[] = [] ;
  @Input() projects: Project[] = [] ;
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
    const filtTrans = this.tranRecs.filter(tr => tr.House && tr.Project)
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
    console.log('Called write PDF')
  }
}
