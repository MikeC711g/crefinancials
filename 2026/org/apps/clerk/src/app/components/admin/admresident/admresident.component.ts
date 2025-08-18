import { Component, EventEmitter, OnInit, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GenutilsService } from './../../../services/genutils.service';
import { Resident } from '../../../models/house.model';

@Component({
  selector: 'app-admresident',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admresident.component.html',
  styleUrl: './admresident.component.css'
})
export class AdmresidentComponent {
  @Input() resident: Resident = new Resident('', '', '', '', '', '', '') ;
  @Output() parmMod = new EventEmitter<{ action: string, parmType: string,
    newVal: any, oldVal: any }>() ;
  newRow = false ;  editMode = false ;
  origResident: Resident = new Resident('', '', '', '', '', '', '') ;
  statusMsg = "" ;
  gType: string ;
  CLASSNAME = 'admresident' ;

  constructor(private utilSvc: GenutilsService) {
    this.gType = utilSvc.globalTypes.Residents
  }

  ngOnInit(): void {
    if (this.resident.LName === '') {
      this.newRow = true ;  this.editMode = true ;
    } else {
      this.origResident = { ...this.resident } ;
    }
  }

  onAddRecord() {
    this.utilSvc.cDebug(this.CLASSNAME, 'Came into add for resident: %O  newRow: %s', this.resident, this.newRow ) ;
    if (this.newRow) {
      this.parmMod.emit({action: this.utilSvc.actionTypes.Add,
        parmType: this.gType, newVal: this.resident, oldVal: this.resident}) ;
      this.newRow = false ;
    } else {    // If update, send new and original for DB
      this.parmMod.emit({action: this.utilSvc.actionTypes.Update,
        parmType: this.gType, newVal: this.resident, oldVal: this.origResident}) ;
    }
    this.editMode = false ;
  }

  onDeleteRecord() {
    this.utilSvc.cDebug(this.CLASSNAME,'Came into delete for name: %s', this.resident.LName ) ;
    this.parmMod.emit({action: this.utilSvc.actionTypes.Delete,
      parmType: this.gType, newVal: this.resident, oldVal: this.resident}) ;
    this.editMode = false ;
  }

  onCancel() {
    this.utilSvc.cDebug(this.CLASSNAME, 'Came into cancel for name: %s', this.resident.LName ) ;
    if (this.newRow) {
      this.parmMod.emit({action: this.utilSvc.actionTypes.Cancel,
        parmType: this.gType, newVal: this.resident, oldVal: this.resident}) ;
    }
    this.editMode = false ;    this.newRow = false ;
  }
}
