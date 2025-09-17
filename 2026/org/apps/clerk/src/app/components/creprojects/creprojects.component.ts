import { FirebaseService } from './../../services/firebase.service';
import { FormsModule } from '@angular/forms';
import { MsgInfo } from './../../models/globals.model'
import { Project } from './../../models/project.model';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { DateselComponent } from '../datesel/datesel.component';
import { CremessagesComponent } from '../cremessages/cremessages.component';
import { CreprojecteditComponent } from './creprojectedit/creprojectedit.component';
import { Subscription } from 'rxjs';
import { GenutilsService } from './../..//services/genutils.service';
// import { GenutilsService } from 'src/app/services/genutils.service';
import { KeyVal } from './../..//models/globals.model';
import { DeactivatableComponent } from './../..//interfaces/deactivatableComponent.interface';
import { House } from '../../models/house.model';
// import { House } from 'src/app/models/house.model';

@Component({
  selector: 'app-creprojects',
  standalone: true,
  imports: [DateselComponent, CremessagesComponent, CreprojecteditComponent, FormsModule],
  templateUrl: './creprojects.component.html',
  styleUrls: ['./creprojects.component.css']
})
export class CreprojectsComponent implements OnInit, OnDestroy, DeactivatableComponent {
  houses: House[] = new Array<House>() ;   house: string [] = new Array<string>() ;
  projects: Project[] = new Array<Project>() ;
  completedActions = 0 ;
  numDays = 0 ;  startDt = '' ;  endDt = '' ;
  dispMsgs: string[] = new Array<string>() ;  newRow = false ;
  msgInfo: MsgInfo = new MsgInfo('', '') ;
  dateOpts: KeyVal[] = [ new KeyVal('30 days', '30'), new KeyVal('90 days', '90'),
    new KeyVal('1 year', '365'), new KeyVal('Custom Dates', '-1')]
  curProjIntvl = '90' ;
  msg$: Subscription = new Subscription() ;
  projQuery$: Subscription = new Subscription() ;   // Used on proj query to firesvc
  project$: Subscription = new Subscription() ;     // Used to refresh array when updated elsewhere
  global$: Subscription = new Subscription() ;
  CLASSNAME = 'creprojects' ;

  constructor(private fireSvc: FirebaseService, private utilSvc: GenutilsService) { }

  ngOnInit(): void {
    const house$ = this.fireSvc.getHouseDB().subscribe({
      next: () => {
        this.houses = this.fireSvc.getHouses() ;
        this.fireSvc.setHouses(this.houses) ;
      }, error: (error) => {
        this.utilSvc.cWarn(this.CLASSNAME, 'Failed to get globals to find houses: %s', error) ;
      }
    })
    setTimeout(() => {   house$.unsubscribe() ; }, 30000);

    this.onQueryProjects(parseInt(this.dateOpts[2].RVal) ) ;
    const idx = this.utilSvc.dirtyProj.length ;
    if (idx > 0)  this.utilSvc.dirtyProj.splice(0, idx) ;

    this.project$ = this.fireSvc.project$.subscribe(proj => {
      this.utilSvc.cLog(this.CLASSNAME, 'Got new Proj from subscrip, Pre len: %d', this.projects.length)
      this.projects = proj ;
      this.utilSvc.cLog(this.CLASSNAME, 'Got new Proj from subscrip, Post len: %d', this.projects.length)
    })
  }

  /*****************************************************************************
     Handling date select component output
   *****************************************************************************/
    onDateMod(numDays: number, startDt: string, endDt: string): void {
    this.numDays = numDays ;  this.startDt = startDt ;  this.endDt = endDt ;
    // this.onQueryProjects(numDays, startDt, endDt) ;
  }


  /*****************************************************************************
     Event occurred to a row in child component cretranedit
   *****************************************************************************/
  onProjMod(action: string, project: Project): void {
    let statusMsg = '' ;
    [statusMsg, this.newRow] = this.utilSvc.onProjMod(action, project) ;
    this.dispMsgs.push(statusMsg)
  }

  onQueryProj() {
    this.onQueryProjects(this.numDays, this.startDt, this.endDt) ;
  }

  /*********************************************************************
    Query the project collection for projects between the dates
  ********************************************************************/
  onQueryProjects(numDays: number, startDt?: string, endDt?: string): void {
    const projRtn = this.fireSvc.getProjects(true, numDays, startDt, endDt) ;
    if (Array.isArray(projRtn)) {
      this.projects = projRtn ;   // isForce, so shouldn't really hit this
      this.utilSvc.cWarn(this.CLASSNAME, 'Odd that we got cached projects in spite of isForce') ;
    } else {
      this.projQuery$ = projRtn.subscribe({
        next: (dbProj) => {
              // Notify all listeners (including self) of new projects
          this.fireSvc.project$.next(dbProj) ;
          this.projects = (this.house.length <= 0) ? dbProj : dbProj.filter(cpro => this.house.includes(cpro.House)) ;
          this.utilSvc.cLog(this.CLASSNAME, 'Proj Q numD: %d  strt: %s  end: %s w/dtLen: %d  totLen: %d',
            numDays, startDt, endDt, dbProj.length, this.projects.length)
          this.dispMsgs.push('Loaded: ' + this.projects.length + ' Projects')
        }, error: (error) => {
          this.utilSvc.cWarn(this.CLASSNAME, 'Failed to retrieve projects, error: %s', error) ;
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        }, complete: () => { }
      })
    }
    if (endDt === undefined) {
      const curDt = new Date() ;
      this.endDt = curDt.toISOString().slice(0, 10) ;
      this.startDt = this.utilSvc.getDate(curDt, numDays*-1) ;
    } else {
      this.endDt = endDt ;
      this.startDt = startDt! ;
    }
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

  onMsgDel(idx: number, msg: string) {
    this.dispMsgs.splice(idx, 1) ;
  }

  canDeactivate() {
    this.utilSvc.cLog('canDeact proj dirtyLen: %d', this.utilSvc.dirtyProj.length)
    if (this.utilSvc.dirtyProj.length > 0)
      this.utilSvc.cLog(this.CLASSNAME, 'deActivateProj dirty projects: %O', this.utilSvc.dirtyProj)
    return (this.utilSvc.dirtyProj.length === 0) ? true :
      confirm("There are unsaved changes, exit anyway?") ;
  }

  ngOnDestroy() {
    this.msg$.unsubscribe() ;
    this.global$.unsubscribe() ;
    this.projQuery$.unsubscribe() ;
    this.project$.unsubscribe() ;
    this.fireSvc.project$.next(this.projects) ;    // Update array others will use
    const idx = this.utilSvc.dirtyProj.length ;
    if (idx > 0)  this.utilSvc.dirtyProj.splice(0, idx) ;
  }
}
