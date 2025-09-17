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
export class AdmleaseComponent implements OnInit {
  @Input() leases: Lease[] = new Array<Lease>() ;
  @Input() houses: House[] = new Array<House>() ;
  @Input() residents: Resident[] = new Array<Resident>() ;
  @Input() selectedHouse = '' ;
  @Output() parmMod = new EventEmitter<{ action: string, parmType: string,
    newVal: any, oldVal: any }>() ;
  filtLeases: Lease[] = new Array<Lease>() ;
  newRow = false ;  editMode = false ;
  origLease: Lease = new Lease('', '', false, false, '', '', '', 0, 0, 0, 0, 0, 0, 0, 0, [], '') ;
  statusMsg = "" ;
  gType: string ;
  CLASSNAME = 'admlease' ;

  constructor(private utilSvc: GenutilsService) {
    this.gType = utilSvc.globalTypes.Leases
  }

  ngOnInit(): void {
    // May need an "edit" subComponent here ... here is the basic idea
    // Start w/selectedHouse as @Input() but don't feed it in so have basic house key be ''
    // Template, if selectedHouse is '', show a select for house, else show all leases for house (< 3 yrs old)
    // NonCurrent leases can be viewed but not edited
    // If no leases, show a "New Lease" button
    // View button for old leases (edit maybe later)
    // Current lease has Edit OR Renew (which is a form of New)
    // For renew, copy all data but move StartDt and EndDt 12 months forward and calculate balance
    // For new ... pretty much all just new
    // Include button for select different house which sets selectedHouse to ''
    this.newRow = this.leases.length === 0 ;
    if (this.selectedHouse !== '') this.onChgHouse() ;
  }

  onChgHouse() {    // Should not be callable with a new value of ''
    this.filtLeases = this.leases.filter( l => l.House === this.selectedHouse).sort((a, b) => (a.StartDt < b.StartDt) ? 1 : -1) ;
    if (this.filtLeases.length === 0) {
      this.statusMsg = 'No existing leases found for house ' + this.selectedHouse ;
      this.newRow = true ;
    } else {
      this.statusMsg = '' ;
      this.newRow = false ;

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

