import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Lease, Resident } from '../../../../models/house.model';
import { GenutilsService } from './../../../../services/genutils.service';

@Component({
  selector: 'app-admleaseedit',
  imports: [],
  templateUrl: './admleaseedit.component.html',
  styleUrl: './admleaseedit.component.css'
})

export class AdmleaseeditComponent implements OnInit {
  @Input() idx = 1 ;
  @Input() newRow = false ;
  @Input() residents: Resident[] = new Array<Resident>() ;
  @Input() lease: Lease = new Lease('', '', false, false, '', '', '', 0, 0, 0, 0, 0, 0, 0, 0, [], '') ;
  @Input() selectedHouse = '' ;
  @Output() parmMod = new EventEmitter<{ action: string, parmType: string,
y,    newVal: any, oldVal: any }>() ;
  newLease: Lease = new Lease('', '', false, false, '', '', '', 0, 0, 0, 0, 0, 0, 0, 0, [], '') ;
  editMode = false ;   residentNm = '' ;
  CLASSNAME = 'admleaseedit' ;

  constructor(private utilSvc: GenutilsService) {
  }
  
  // Button on parent to choose new house (selectedHouse = '')
  ngOnInit(): void {
    if (this.lease.Residents.length > 0) {    // If we have a lease here, get resident name for list
      const res = this.residents.find( r => r.ResidentId === this.lease.Residents[0]) ;
      this.residentNm = (res) ? `${res.FName} ${res.LName}` : 'Name not set';
    }
  }

  onRenew() {
    this.newLease = { ...this.lease } ;
    const eDt = new Date(this.lease.EndDt) ;
    this.newLease.StartDt = this.utilSvc.getDate(eDt, 1) ;
    const newEndYr = eDt.getFullYear() + 1 ;  eDt.setFullYear(newEndYr) ;
    this.newLease.EndDt = eDt.toISOString().substring(0,10) ;
  }

  // Need to do a confirm(msg) if a date modification will cause an overlap
  onDateEdit() {
  }
}
