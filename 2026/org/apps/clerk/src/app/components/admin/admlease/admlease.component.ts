import { Component, EventEmitter, OnInit, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GenutilsService } from './../../../services/genutils.service';
import { House, Lease, Resident } from '../../../models/house.model';

@Component({
  selector: 'app-admlease',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admlease.component.html',
  styleUrl: './admlease.component.css'
})
export class AdmleaseComponent {
  @Input() lease: Lease = new Lease('', '', false, false, '', '', 0, 0, 0, 0, 0, 0, 0, 0, [], '') ;
  @Input() houses: House[] = new Array<House>() ;
  @Input() residents: Resident[] = new Array<Resident>() ;
  @Output() parmMod = new EventEmitter<{ action: string, parmType: string,
    newVal: any, oldVal: any }>() ;
  newRow = false ;  editMode = false ;
  origLease: Lease = new Lease('', '', false, false, '', '', 0, 0, 0, 0, 0, 0, 0, 0, [], '') ;
  statusMsg = "" ;
  gType: string ;
  CLASSNAME = 'admlease' ;

  constructor(private utilSvc: GenutilsService) {
    this.gType = utilSvc.globalTypes.Leases
  }

  ngOnInit(): void {
    if (this.lease.House === '') {
      this.newRow = true ;  this.editMode = true ;
    } else {
      this.origLease = { ...this.lease } ;
    }
  }

  onAddRecord() {
    this.utilSvc.cDebug(this.CLASSNAME, 'Came into add for lease: %O  newRow: %s', this.lease, this.newRow ) ;
    if (this.newRow) {
      this.parmMod.emit({action: this.utilSvc.actionTypes.Add,
        parmType: this.gType, newVal: this.lease, oldVal: this.lease}) ;
      this.newRow = false ;
    } else {    // If update, send new and original for DB
      this.parmMod.emit({action: this.utilSvc.actionTypes.Update,
        parmType: this.gType, newVal: this.lease, oldVal: this.origLease}) ;
    }
    this.editMode = false ;
  }

  onDeleteRecord() {
    this.utilSvc.cDebug(this.CLASSNAME,'Came into delete for name: %s', this.lease.House ) ;
    this.parmMod.emit({action: this.utilSvc.actionTypes.Delete,
      parmType: this.gType, newVal: this.lease, oldVal: this.lease}) ;
    this.editMode = false ;
  }

  onCancel() {
    this.utilSvc.cDebug(this.CLASSNAME, 'Came into cancel for name: %s', this.lease.House ) ;
    if (this.newRow) {
      this.parmMod.emit({action: this.utilSvc.actionTypes.Cancel,
        parmType: this.gType, newVal: this.lease, oldVal: this.lease}) ;
    }
    this.editMode = false ;    this.newRow = false ;
  }

  chgStartDate() {    // Run when dstart date is changed
    this.lease.EndDt = this.utilSvc.getDate(new Date(this.lease.StartDt), 364) ;
  }
}

