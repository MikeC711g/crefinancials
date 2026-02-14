import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GenutilsService } from './../../../services/genutils.service';
import { Project } from '../../../models/house.model';

@Component({
  selector: 'crefinancials-admproject',
  imports: [FormsModule],
  templateUrl: './admproject.html',
  styleUrl: './admproject.css'
})
export class Admproject implements OnInit {
  @Input() project: Project = new Project('', '', '', '', '') ;
  @Input() house = '' ;
  @Output() parmMod = new EventEmitter<{ action: string, parmType: string,
    newVal: any, oldVal: any }>() ;
  newRow = false ;  editMode = false ;
  origProject: Project = new Project('', '', '', '', '') ;
  statusMsg = "" ;
  gType: string ;
  CLASSNAME = 'admproject' ;

  constructor(private utilSvc: GenutilsService) {
    this.gType = utilSvc.globalTypes.Projects
  }

  ngOnInit(): void {
    if (this.project.House === '') {
      this.newRow = true ;  this.editMode = true ;  this.project.House = this.house ;
    } else {
      this.origProject = { ...this.project } ;
    }
  }


  onAddRecord() {
    if (this.newRow) {
      this.parmMod.emit({action: this.utilSvc.actionTypes.Add,
        parmType: this.gType, newVal: this.project, oldVal: this.project}) ;
      this.newRow = false ;
    } else {    // If update, send new and original for DB
      this.parmMod.emit({action: this.utilSvc.actionTypes.Update,
        parmType: this.gType, newVal: this.project, oldVal: this.origProject}) ;
    }
    this.editMode = false ;
  }

  onDeleteRecord() {
    this.parmMod.emit({action: this.utilSvc.actionTypes.Delete,
      parmType: this.gType, newVal: this.project, oldVal: this.project}) ;
    this.editMode = false ;
  }

  onCancel() {
    if (this.newRow) {
      this.parmMod.emit({action: this.utilSvc.actionTypes.Cancel,
        parmType: this.gType, newVal: this.project, oldVal: this.project}) ;
    }
    this.editMode = false ;    this.newRow = false ;
  }

}
