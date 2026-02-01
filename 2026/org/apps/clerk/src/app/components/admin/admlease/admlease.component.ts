import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Lease, Resident } from '../../../models/house.model';
import { GenutilsService } from './../../../services/genutils.service';
import { FormsModule } from '@angular/forms';
import { GlobalModsService } from './../../../services/globalMods.service';

@Component({
  selector: 'crefinancials-admlease',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admlease.component.html',
  styleUrls: ['./admlease.component.css']
})

export class AdmleaseComponent implements OnInit {
  @Input() idx = 1 ;
  @Input() selHouse = '' ;    // If no lease, still house was selected
  @Input() newRow = false ;     // Row not yet in DB (false = in DB)
  @Input() residents: Resident[] = new Array<Resident>() ;
  @Input() lease: Lease = new Lease('', '', true, '', '', '', 0, 0, 0, 0, 0, 0, 0, 0, []) ;
  @Output() parmMod = new EventEmitter<{ action: string, parmType: string,
    newVal: any, oldVal: any }>() ;
  gType = this.utilSvc.globalTypes.Leases ;
  origLease: Lease = new Lease('', '', true, '', '', '', 0, 0, 0, 0, 0, 0, 0, 0, []) ;
  newLease: Lease = new Lease('', '', true, '', '', '', 0, 0, 0, 0, 0, 0, 0, 0, []) ;
  editMode = false ;    // true = update and false = add
  expandedView = false ;   // true = show all fields, false = show key fields
  residentNm = '' ;  bgColor = 'white' ;  sDtMsg = '' ;  eDtMsg = '' ;
  isLeaseCurrent = false ;    // Is this lease current within 180 days
  actTp = this.utilSvc.actionTypes ;  // For shorter refs
  CLASSNAME = 'admlease' ;

  // editmode for add/update  newRow?  expandedView and chevrons.
  constructor(private utilSvc: GenutilsService, private globSvc: GlobalModsService) {
  }

  ngOnInit(): void {
    if (!this.lease.LeaseId || this.newRow) {    // New, from pressing new or from renew
      this.expandedView = true ;   this.newRow = true ;  this.editMode = false ;
      this.lease.House = this.origLease.House = this.selHouse ;
      this.isLeaseCurrent = false ;   // New row cannot be renewed
    } else {
      this.expandedView = false ;   this.newRow = false ;  this.editMode = true ;
      this.isLeaseCurrent = this.checkLease() ;
    }
    this.residentNm = this.setResidentName();
    this.bgColor = (this.isLeaseCurrent) ? 'aquamarine' : (!this.lease.cancelDt) ? 'white' : 'red' ;
    this.origLease = {...this.lease} ;
  }

  setResidentName(): string {
    if (this.residents.length > 0 && this.lease.Residents.length > 0) {    // if lease w/res, get resident name
      const res = this.residents.find( r => r.ResidentId === this.lease.Residents[0]) ;
      return (res) ? `${res.FName} ${res.LName}` : 'Name not set';
    }
    return 'Name not set';
  }

  onSaveRecord() {
    this.utilSvc.cLog(this.CLASSNAME, 'Came into add for lease: %O  newRow: %O', this.lease, this.newRow ) ;
    const action = (this.editMode === false) ? this.actTp.Add : this.actTp.Update ;
    this.parmMod.emit({action: action, parmType: this.gType, newVal: this.lease, oldVal: this.origLease}) ;
    this.editMode = true ;   this.newRow = false ;   this.expandedView = false ;
    this.residentNm = this.setResidentName();
    this.origLease = {...this.lease} ;
  }

  onDeleteRecord() {
    this.utilSvc.cLog(this.CLASSNAME,'Came into delete for name: %s', this.lease.House ) ;
    this.parmMod.emit({action: this.actTp.Delete,
      parmType: this.gType, newVal: this.lease, oldVal: this.lease}) ;
    this.expandedView = false ;
  }

  onCancelEdit() {
    this.utilSvc.cDebug(this.CLASSNAME, 'Came into cancel for name: %s', this.lease.House ) ;
    if (this.newRow) {
      this.parmMod.emit({action: this.actTp.Cancel,
        parmType: this.gType, newVal: this.lease, oldVal: this.lease}) ;
    }
    this.editMode = true ;    this.newRow = false ;    this.expandedView = false ;
  }

  onCreateLease(renewal: boolean) {
    if (renewal)  this.parmMod.emit({action: this.actTp.Renew, parmType: this.gType,
      newVal: this.lease, oldVal: this.origLease}) ;
  }

  checkLease(): boolean {  // Is lease endDate current within numDays of today
    return this.globSvc.isLeaseCurrent(this.lease, this.idx) ;
  }

  preFillEndDate() {
    if (this.lease.StartDt && !this.lease.EndDt) {
      const sDt = new Date(this.lease.StartDt) ;
      const eYr = sDt.getFullYear() + 1 ;  sDt.setFullYear(eYr) ; // Move 1 year fwd
      sDt.setDate(sDt.getDate() - 1) ;  // Back up 1 day
      this.lease.EndDt = sDt.toISOString().substring(0,10) ;
    }
  }

  // Need to do a confirm(msg) if a date modification will cause an overlap
  onDateEdit(isStart: boolean) {
    this.sDtMsg = '' ;  this.eDtMsg = '' ;
    if (this.lease.StartDt && this.lease.EndDt && (this.lease.StartDt >= this.lease.EndDt)) {
      if (isStart) {
        this.lease.StartDt = this.origLease.StartDt ;  this.sDtMsg = ' (change cancelled, start must be before end)' ;
      } else {
        this.lease.EndDt = this.origLease.EndDt ;  this.eDtMsg = ' (change cancelled, end must be after start)' ;
      }
      return ;
    }
    const isOverlapOk = this.globSvc.checkLeaseOverlap(this.lease, isStart, this.idx) ;
    if (!isOverlapOk) {
      if (isStart) {
        this.lease.StartDt = this.origLease.StartDt ;  this.sDtMsg = ' (change cancelled due to date overlap)' ;
      } else {
        this.lease.EndDt = this.origLease.EndDt ;  this.eDtMsg = ' (change cancelled due to date overlap)' ;
      }
    }
  }
}
