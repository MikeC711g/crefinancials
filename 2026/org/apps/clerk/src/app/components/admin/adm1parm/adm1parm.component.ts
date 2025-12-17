import { GenutilsService } from './../../../services/genutils.service';
import { FormsModule } from '@angular/forms';
// import { FirebaseService } from './../../../services/firebase.service';
import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'crefinancials-adm1parm',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './adm1parm.component.html',
  styleUrls: ['./adm1parm.component.css']
})
export class Adm1parmComponent implements OnInit {

  @Input() parmVal = "" ;
  @Input() parmType = "" ;
  @Input() parmLabel = "" ;
  @Output() parmMod = new EventEmitter<{ action: string, parmType: string,
    newVal: any, oldVal: any }>() ;
  origPV = "" ;  newRow = false ;  editMode = false ;
  statusMsg = "" ;
  CLASSNAME = 'adm1parm' ;

  constructor(private utilSvc: GenutilsService) { }

  ngOnInit(): void {
    this.newRow = (this.parmVal === "") ? true : false ;
    if (this.newRow) { this.editMode = true ; }
    this.origPV = this.parmVal ;
  }

  onAddRecord() {
    this.utilSvc.cDebug(this.CLASSNAME, 'Came into add for rowKey: %s  of type: %s  newRow: %s',
      this.parmVal, this.parmType, this.newRow ) ;
    if (this.newRow) {
      this.parmMod.emit({action: this.utilSvc.actionTypes.Add, parmType: this.parmType,
        newVal: this.parmVal, oldVal: this.parmVal}) ;
      this.newRow = false ;
    } else {    // If update, send new and original for DB
      this.parmMod.emit({action: this.utilSvc.actionTypes.Update, parmType: this.parmType,
        newVal: this.parmVal, oldVal: this.origPV}) ;
      this.editMode = false ;
    }
  }

  onDeleteRecord() {
    this.utilSvc.cDebug(this.CLASSNAME,'Came into delete for rowKey: %s  of type: %s', this.parmVal, this.parmType ) ;
    this.parmMod.emit({action: this.utilSvc.actionTypes.Delete, parmType: this.parmType, newVal: this.parmVal,
      oldVal: this.parmVal}) ;
    this.editMode = false ;
  }

  onCancel() {
    this.utilSvc.cDebug(this.CLASSNAME, 'Came into cancel for rowKey: %s  of type: %s', this.parmVal, this.parmType ) ;
    if (this.newRow) { this.parmMod.emit({action: this.utilSvc.actionTypes.Cancel, parmType: this.parmType,
      newVal: this.parmVal, oldVal: this.parmVal}) ; }
    this.editMode = false ;    this.newRow = false ;
  }
}
