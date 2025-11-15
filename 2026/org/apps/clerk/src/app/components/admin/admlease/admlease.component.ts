import { Component, EventEmitter, OnInit, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GenutilsService } from './../../../services/genutils.service';
import { House, Lease, Resident } from '../../../models/house.model';
import { AdmleaseeditComponent } from "../admleaseedit/admleaseedit/admleaseedit.component";
import { GlobalModsService } from '../../../services/globalMods.service';

@Component({
  selector: 'app-admlease',
  standalone: true,
  imports: [FormsModule, AdmleaseeditComponent],
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
  newRow = false ;   canRenewLease = false ;
  statusMsg = "" ;
  gType: string ;
  CLASSNAME = 'admlease' ;

  constructor(private utilSvc: GenutilsService, private globSvc : GlobalModsService) {
    this.gType = utilSvc.globalTypes.Leases ;
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
    this.globSvc.setLeases(this.leases) ;
  }

  onChgHouse() {    // Should not be callable with a new value of ''
    this.filtLeases = this.leases.filter( l => l.House === this.selectedHouse).sort((a, b) => (a.StartDt < b.StartDt) ? 1 : -1) ;
    if (this.filtLeases.length === 0) {
      this.statusMsg = 'No existing leases found for house ' + this.selectedHouse ;
      this.newRow = true ;
    } else {
      this.statusMsg = '' ;
      this.newRow = false ;   this.canRenewLease = false ;
      const renewableLse = this.filtLeases.filter( l => !l.cancelled) ;
      this.canRenewLease = this.globSvc.isLeaseCurrent(renewableLse[0]) ;
    }
  }

  createNewLease(house: string, renew: boolean) {
    let newLease: Lease ;
    if (renew) {
      const renewableLse = this.filtLeases.filter( l => !l.cancelled) ;
      const lse = renewableLse[0] ;
      newLease = { ...lse } ;
      const eDt = new Date(lse.EndDt) ;
      newLease.StartDt = this.utilSvc.getDate(eDt, 1) ;
      const newEndYr = eDt.getFullYear() + 1 ;  eDt.setFullYear(newEndYr) ;
      newLease.EndDt = eDt.toISOString().substring(0,10) ;
      newLease.LeaseId = '' ;
    } else {
      newLease = new Lease('', house, true, false, '', '', '', 0, 0, 1, 0, 5, 0, 0, 0, [], '') ;
    }
    this.filtLeases.splice(0, 0, newLease) ;
    this.canRenewLease = false ;
  }

  onLeaseMod(event: { action: string; parmType: string; newVal: any; oldVal: any }) {
    const actTp = this.utilSvc.actionTypes ;  const cLease: Lease = event.newVal as Lease ;
    if ((event.action === actTp.Delete || event.action === actTp.Cancel) && 
      !cLease.LeaseId) { // New row being deleted or cancelled before save
      const idx = this.filtLeases.findIndex( l => l === cLease) ;
      if (idx >= 0)    this.filtLeases.splice(idx, 1) ;
      const renewableLse = this.filtLeases.filter( l => !l.cancelled) ;
      this.canRenewLease = this.globSvc.isLeaseCurrent(renewableLse[0]) ;
     return ;
    }
    this.parmMod.emit({action: event.action, parmType: event.parmType,
      newVal: event.newVal, oldVal: event.oldVal}) ;
      // Full array delete can be delayed, so fix this array in the meantime
    if (event.action === actTp.Delete) {
      const idx = this.filtLeases.findIndex( l => l.LeaseId === event.newVal.LeaseId) ;
      if (idx >= 0)    this.filtLeases.splice(idx, 1) ;
    } else {
      if (event.action === actTp.Cancel) {
        const idx = this.filtLeases.findIndex( l => l.LeaseId === event.newVal.LeaseId) ;
        if (idx >= 0)    this.filtLeases[idx] = event.newVal ;
      }
    }
  }
}