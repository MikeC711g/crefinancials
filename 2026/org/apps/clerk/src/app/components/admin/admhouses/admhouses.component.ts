import { FirebaseService } from './../../../services/firebase.service';
import { House } from './../../../models/house.model';
import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { GenutilsService } from './../../../services/genutils.service';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'app-admhouses',
  templateUrl: './admhouses.component.html',
  styleUrls: ['./admhouses.component.css']
})
export class AdmhousesComponent implements OnInit {

  @Input() house: House = new House('', '', '', '', '', '', '') ;
  @Output() parmMod = new EventEmitter<{ action: string, parmType: string,
    newVal: any, oldVal: any }>() ;
  newRow = false ;  editMode = false ;
  origHouse: House = new House('', '', '', '', '', '', '') ;
  statusMsg = "" ;
  CLASSNAME = 'admhouses' ;

  constructor(private utilSvc: GenutilsService) { }

  ngOnInit(): void {
    if (this.house.name === '') {
      this.newRow = true ;  this.editMode = true ;
    } else {
      this.origHouse = { ...this.house } ;
    }
  }

  onAddRecord() {
    this.utilSvc.cDebug(this.CLASSNAME, 'Came into add for house: %s    newRow: %s', this.house, this.newRow ) ;
    if (this.newRow) {
      this.parmMod.emit({action: this.utilSvc.actionTypes.Add,
        parmType: this.utilSvc.globalTypes.Houses, newVal: this.house, oldVal: this.house}) ;
      this.newRow = false ;
    } else {    // If update, send new and original for DB
      this.parmMod.emit({action: this.utilSvc.actionTypes.Update,
        parmType: this.utilSvc.globalTypes.Houses, newVal: this.house, oldVal: this.origHouse}) ;
    }
    this.editMode = false ;
  }

  onDeleteRecord() {
    this.utilSvc.cDebug(this.CLASSNAME,'Came into delete for name: %s', this.house.name ) ;
    this.parmMod.emit({action: this.utilSvc.actionTypes.Delete,
      parmType: this.utilSvc.globalTypes.Houses, newVal: this.house, oldVal: this.house}) ;
    this.editMode = false ;
  }

  onCancel() {
    this.utilSvc.cDebug(this.CLASSNAME, 'Came into cancel for name: %s', this.house.name ) ;
    if (this.newRow) {
      this.parmMod.emit({action: this.utilSvc.actionTypes.Cancel,
        parmType: this.utilSvc.globalTypes.Houses, newVal: this.house, oldVal: this.house}) ;
    }
    this.editMode = false ;    this.newRow = false ;
  }
}
