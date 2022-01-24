import { ReturnState } from './../../../models/returnState.model';
import { Component, Input, OnInit, Output, ViewChild, EventEmitter } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Project } from 'src/app/models/project.model';
import { RecordService } from 'src/app/services/record.service';

@Component({
  selector: 'app-creprojectedit',
  templateUrl: './creprojectedit.component.html',
  styleUrls: ['./creprojectedit.component.css']
})
export class CreprojecteditComponent implements OnInit {
  @Input() curProj: Project = new Project('', '', '2021-07-11', '2021-07-11', '', '') ;
  @Output() projMod = new EventEmitter<{action: string, project: Project}>() ;
  @ViewChild('projectForm', { static: false })
  projectForm!: NgForm;
  editMode = false ;
  houses: string[] = new Array<string>() ;
  categories: string[] = new Array<string>() ;
  expandedView = false ;

    // Wanted origProj to be null, but typescript didn't like it, this is ugly but it works
  origProject: Project = new Project('', '', '2021-07-11', '2021-07-11', '', '') ;
  projId = '' ;
  completedActions = 0 ;
  statusMsg = '' ;

  /*********************************************************************
    Constructor to inject recordService and routing needs
  ********************************************************************/
    constructor(private recordService: RecordService) { }

  /*********************************************************************
    Identify reason for call (id embedded or adding new) and extract
    information needed from `record`Service
  ********************************************************************/
  ngOnInit(): void {
    this.editMode =  (this.curProj.ProjectId === '') ? false : true ;
    this.houses = this.recordService.getHomes() ;
    this.categories = this.recordService.getCategories() ;
  }

  /*********************************************************************
    Add the projec created to the data base or update it
  ********************************************************************/
  onAddProject(): void {
    if (!this.editMode) {
      this.editMode = true ;    // Project saved, now can edit
      this.recordService.createProject(this.curProj).subscribe(
        (response) => {
          const returnState: ReturnState = response ;
          this.curProj.ProjectId = returnState.Message.split(' ')[0] ;  // Capture projId
          this.projMod.emit({action: 'add', project: this.curProj}) ;
          console.log('Added w/projid: ', this.curProj.ProjectId) ;
          this.expandedView = false ;
        },
        (error) => { console.log('ProjectErr..RecordService: ', error) ; },
        () => { this.completedActions++ ; }
      ) ;
    } else {
      this.recordService.updateProject(this.curProj, this.origProject).subscribe(
        (response) => {
          const returnState: ReturnState = response ;
          this.projMod.emit({action: 'update', project: this.curProj}) ;
          this.expandedView = false ;
          this.statusMsg = 'Project update successful' ;
        },
        (error) => { console.log('UpdtProjectErr..RecordService: ', error) ; },
        () => { this.completedActions++ ; }
      ) ;
    }
  }

  /*********************************************************************
    Add the projec created to the data base or update it
  ********************************************************************/
  onDeleteProject(): void {
    console.log('csvProjEd delete Proj: ', this.curProj) ;
    if (!this.editMode) {
      this.editMode = true ;    // Project saved, now can edit (or add within family)
      this.projMod.emit({action: 'delete', project: this.curProj}) ;
      this.expandedView = false ;
    }
  }

  /*********************************************************************
    Add the projec created to the data base or update it
  ********************************************************************/
  onCancel(): void {
    console.log('csvProjEd cancel Proj: ', this.curProj) ;
    this.projMod.emit({action: 'cancel', project: this.curProj}) ;
    this.expandedView = false ;
  }
}
