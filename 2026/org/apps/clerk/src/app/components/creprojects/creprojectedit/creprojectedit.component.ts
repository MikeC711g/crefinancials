import { FirebaseService } from './../../../services/firebase.service';
import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DeactivatableComponent } from './../../../interfaces/deactivatableComponent.interface';
import { House } from './../../../models/house.model';
import { Project } from './../../../models/project.model';
import { GenutilsService } from './../../../services/genutils.service';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'app-creprojectedit',
  templateUrl: './creprojectedit.component.html',
  styleUrls: ['./creprojectedit.component.css']
})
export class CreprojecteditComponent implements OnInit, DeactivatableComponent {
  @Input() projId = ''
  @Output()  projMod = new EventEmitter<{action: string, project: Project}>() ;

  editMode = false ;   dataSaved = true ;  // No chgs yet
  curProj: Project = new Project('', '', '', '', '', '') ;
  projectForm!: NgForm;
  expandedView = false ; newRow = false ;  isDirty = false ;   // No unsaved changes
  houses: House[] = new Array<House>() ;
  CLASSNAME = 'creprojectedit' ;

    // Wanted origProj to be null, but typescript didn't like it, this is ugly but it works
  origProject: Project = new Project('', '', '', '', '')
  completedActions = 0 ;
  dispMsgs: string[] = new Array<string>() ;

  /*********************************************************************
    Constructor to inject firebase service and routing needs
  ********************************************************************/
    constructor(private fireSvc: FirebaseService, private utilSvc: GenutilsService,
      private route: ActivatedRoute, private router: Router) { }

  /*********************************************************************
    Identify reason for call (id embedded or adding new) and extract
    information needed from `record`Service
  ********************************************************************/
  ngOnInit(): void {
    if (this.projId) {
      this.editMode = true ;
      this.curProj = this.utilSvc.getProjById(this.projId)! ;
      this.origProject = this.utilSvc.cloneProj(this.curProj)
    } else {    // Create new project
      const curDt = new Date() ;
      this.newRow = true ;
      this.curProj.EndDt = curDt.toISOString().slice(0, 10) ;
      this.curProj.StartDt = this.utilSvc.getDate(curDt, -90) ;
      this.origProject.StartDt = this.curProj.StartDt ;
      this.origProject.EndDt = this.curProj.StartDt ;
    }
    this.houses = this.fireSvc.getFullHouses() ;
  }

  /*********************************************************************
    Add the projec created to the data base or update it
  ********************************************************************/
  onAddProject(): void {
    if (!this.editMode) {
      this.editMode = true ;    // Project saved, now can edit
      this.utilSvc.cDebug(this.CLASSNAME, 'about to addProject') ;
      this.fireSvc.addProject(this.curProj).
        then(docRef => {
          this.curProj.ProjectId = docRef?.id ;
          this.expandedView = false ;
          this.utilSvc.cDebug(this.CLASSNAME, 'Added proj w/ID %s', this.curProj.ProjectId);
          this.dispMsgs.push('Successfully added project: ', this.curProj.ProjectId!) ;
          this.projMod.emit({action: this.utilSvc.actionTypes.Add, project: this.curProj}) ;
          const projects = this.utilSvc.isrtProjectRow(this.curProj) ;
          console.log('ProjEdit Added project sending calling next w/len: %d', projects.length)
          this.fireSvc.project$.next(projects)    // Notify listeners of chg
        }).catch(error => {
          this.utilSvc.cWarn(this.CLASSNAME, 'Error adding project: %s', error) ;
          this.dispMsgs.push('Error Adding Project')
        }) ;
      this.completedActions++ ;
    } else {
      this.utilSvc.cDebug(this.CLASSNAME, 'Updating project') ;
      this.fireSvc.updateProject(this.curProj, this.origProject).
        then(docRef => {
          this.expandedView = false ;
          this.projMod.emit({action: this.utilSvc.actionTypes.Update, project: this.curProj}) ;
          this.utilSvc.cDebug(this.CLASSNAME, 'projUpd docRef: %O', docRef) ;
          if (!this.curProj.ProjectId || this.curProj.ProjectId === '') {
            this.curProj.ProjectId = docRef?.id ;
          }   // If different, use utilSvc to update row for tranId
              // Either way, signal fireSvc with next
          this.dispMsgs.push('Project update successful')
          this.completedActions++ ;
        }).catch(error => {
          this.utilSvc.cWarn(this.CLASSNAME, 'Error updating project: %s', error) ;
          this.dispMsgs.push('Error updating project')
        }) ;
    }
  }

  /*********************************************************************
    Add the projec created to the data base or update it
  ********************************************************************/
  onDeleteProject(): void {
    this.utilSvc.cDebug(this.CLASSNAME,'csvProjEd delete Proj: %O', this.curProj) ;
    this.fireSvc.deleteProj(this.curProj).
      then(docRef => {
        this.projMod.emit({action: this.utilSvc.actionTypes.Delete, project: this.curProj}) ;
        this.utilSvc.cDebug(this.CLASSNAME, 'projDel docRef: %O', docRef) ;
        if (!this.curProj.ProjectId || this.curProj.ProjectId === '') {
          this.curProj.ProjectId = docRef?.id ;
        }
        const projArr = this.utilSvc.deleteProjRow(this.curProj.ProjectId!)
        console.log('projed del, calling next w/ len: %d', projArr.length)
        this.fireSvc.project$.next(projArr) ;
        this.dispMsgs.push('Successfully Deleted project')
      }).catch(error => {
        this.utilSvc.cWarn(this.CLASSNAME,'Error deleting project: %s', error) ;
        this.dispMsgs.push('Failed to delete project')
      })
  }

  onMsgDel(idx: number, msg: string) {
    this.dispMsgs.splice(idx, 1) ;
  }

  chgData() {
    if (!this.isDirty) {
      this.isDirty = true ;
      this.utilSvc.dirtyProjUpdt(true, this.curProj.ProjectId!)
    }
  }

  canDeactivate(): boolean {
    console.log('Projects called canDeactivate')
    return true ;
  }

  /*********************************************************************
    Cancel any action that was taking place
  ********************************************************************/
  onCancel(): void {
    this.projMod.emit({action: this.utilSvc.actionTypes.Cancel, project: this.curProj}) ;
    this.utilSvc.cDebug(this.CLASSNAME,'csvProjEd cancel Proj: %O', this.curProj) ;
    this.expandedView = false ;
    if (this.newRow)  this.newRow = false ;
  }
}
