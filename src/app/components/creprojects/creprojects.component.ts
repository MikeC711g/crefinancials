import { MsgInfo } from './../../models/MsgInfo.model';
import { Project } from './../../models/project.model';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { RecordService } from './../../services/record.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-creprojects',
  templateUrl: './creprojects.component.html',
  styleUrls: ['./creprojects.component.css']
})
export class CreprojectsComponent implements OnInit {
  houses: string[] = new Array<string>() ;
  projects: Project[] = new Array<Project>() ;
  completedActions = 0 ;
  startDt = '' ; endDt = '' ;
  statusMsg = '' ;  newRow = false ;
  msgInfo: MsgInfo = new MsgInfo('', '') ;
  msgSubscription: Subscription = new Subscription() ;

  constructor(private recordService: RecordService) { }

  ngOnInit(): void {
    this.houses = this.recordService.getHomes() ;
    if (this.houses.length < 1) {
      this.recordService.getHomesFromDB().subscribe(
        (response) => {
          this.houses = response ;
          this.recordService.loadHouses(this.houses) ;
        },
        (error) => { console.log('HouseErr..RecordService: ', error) ; },
        () => { this.completedActions++ ; }
      ) ;
    }

    const bDate = '2017-01-01' ;
    const eDate = '2028-12-31' ;
    this.projects = this.recordService.getProjects(bDate, eDate) ;
    console.log('crepro get project cnt: ', this.projects.length) ;
    if (this.projects.length < 1) {
      this.recordService.getProjectsFromDB(bDate, eDate).subscribe(
        (response) => {
          this.projects = response ;
          this.recordService.loadProjects(this.projects) ;
          this.statusMsg = 'Loaded: ' + this.projects.length + ' Projects' ;
        },
        (error) => { console.log('ProjectErr..RecordService: ', error) ; },
        () => { this.completedActions++ ; }
      ) ;
    }
    this.msgSubscription = this.recordService.getMessage().subscribe( msgInfo => {
      this.msgInfo = msgInfo ;
    }) ;
  }

  /*********************************************************************
    Query the transaction data base for trans between the dates
  ********************************************************************/
  onQueryProjects(startDate: string, endDate: string): void {
    this.recordService.getProjectsFromDB(startDate, endDate).subscribe(
      (response) => {
        this.projects = response ;
        this.recordService.loadProjects(this.projects) ;
        this.statusMsg = 'Loaded: ' + this.projects.length + ' Projects' ;
      },
      (error) => { console.log('ProjectErr..RecordService: ', error) ; },
      () => { this.completedActions++ ; }
    ) ;
    this.startDt = startDate ;
    this.endDt = endDate ;
  }

  /*****************************************************************************
     Event occurred to a row in child component cretranedit
   *****************************************************************************/
    isrtRow(project: Project, inArr: Project[]): void {
    for (let i = 0; i < inArr.length; i++) {
      if (project.StartDt < inArr[i].StartDt) {
        inArr.splice(i, 0, project) ;     // Splice in before this row
        return ;
      }
    }
    inArr.push(project) ;   // Higher than highest in array, so add to end
  }

  /*****************************************************************************
     Return the tranId of in array.  Return -1 if not found
    *****************************************************************************/
  findProjId(projId: string, inArr: Project[]): number {
    for (let i = 0; i < inArr.length; i++) {
      if (projId === inArr[i].ProjectId) { return i ; }
    }
    return -1 ;
  }

  /*****************************************************************************
     Event occurred to a row in child component creprojectedit
    *****************************************************************************/
  onProjMod(action: string, project: Project): void {
    console.log('ProjMod Action: ' + action + ' on Project: ' + project.ProjectId ) ;
    let idx = 0 ;
    switch (action) {
      // case 'addKeep':
      case 'add':
        if (project.StartDt <= this.endDt && project.EndDt >= this.startDt) {
          this.isrtRow(project, this.projects) ;
        }
        this.statusMsg = 'Added row w/projId; ' + project.ProjectId ;
        if (action === 'add') { this.newRow = false ; }   // Clear this "new" section
        break ;
      case 'update':
        idx = this.findProjId(project.ProjectId, this.projects) ;
        if (idx >= 0) {
          this.projects[idx] = project ;      // Update row in array
          this.statusMsg = 'Updated row w/Projid: ' + project.ProjectId ;
          if (this.newRow)  { this.newRow = false ; }
        }
        break ;
      case 'delete':
        idx = this.findProjId(project.ProjectId, this.projects) ;
        if (idx < 0) {
          this.statusMsg = 'ProjId: ' + project.ProjectId + ' Not found, cannot delete' ;
        } else {
          this.projects.splice(idx, 1) ;
          this.statusMsg = 'Deleted row w/Projid: ' + project.ProjectId ;
          if (this.newRow)  { this.newRow = false ; }
        }
        break ;
      case 'cancel':
        this.statusMsg = 'Cancelled operation on row' ;
        if (this.newRow)  { this.newRow = false ; }
        break ;
      default: this.statusMsg = 'Invalid action notification of: ' + action ;
    }
    console.log('Newrow: ', this.newRow) ;
  }

  ngOnDestroy() {
    this.msgSubscription.unsubscribe() ;
  }
}
