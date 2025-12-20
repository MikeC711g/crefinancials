import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BalAdjust, House, Lease } from '../../../models/house.model';
import { GenutilsService } from '../../../services/genutils.service';
import { GlobalModsService } from '../../../services/globalMods.service';

@Component({
  selector: 'crefinancials-admbaladj',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admbaladj.component.html',
  styleUrls: ['./admbaladj.component.css']
})
export class AdmbaladjComponent implements OnInit {
  @Input() houses: House[] = new Array<House>() ;
  @Input() leases: Lease[] = new Array<Lease>() ;
  @Output() parmMod = new EventEmitter<{ action: string, parmType: string,
    newVal: any, oldVal: any }>() ;
  newRow = false ;  editMode = false ;
  houseBA: BalAdjust[] = new Array<BalAdjust>() ;  selectedLease = '' ;
  statusMsg = "" ;  houseSelected = false ;  selectedHouse = '' ;
  gType: string ;  curDate = '' ;
  CLASSNAME = 'admbaladj' ;

  constructor(private utilSvc: GenutilsService, private globMods: GlobalModsService) {
    this.gType = utilSvc.globalTypes.BalAdjust
  }

  ngOnInit(): void {
    const curDt = new Date() ;
    this.curDate = curDt.toISOString().slice(0, 10)
    this.selHouse() ;
    console.log(`Leases: ${this.leases.length}, Houses: ${this.houses.length}`) ;
    // On startup, get house from select with nothing else viewable (unless house passed in later)
    // With house, find latest lease in array and retrieve all baladjusts for the house
    // lease query goes back 5 years, baladj query back 3 years
    // If no current lease, bail and tell them we need current lease
    // Grab beginBal from lease
    // Update late fees: See if needed and if applied for each month.  Apply if not applied
    // Back in leases, when started, make sure balAdj has all adjustments prior to lease
    // Do most calcs in genUtils or GlobalMods so core logic doable from elsewhere as well (dashboard/report)
    // 
  }
  onParmMod(action: string, parmType: string, newVal: any, oldVal: any) {
    console.log(`onParmMod called with action: ${action}, parmType: ${parmType}, newVal: ${newVal}, oldVal: ${oldVal}`) ;
    this.parmMod.emit({ action, parmType, newVal, oldVal }) ;
  }

  selHouse() {    // House selected
    console.log(`selected house: ${this.selectedHouse}`) ;
    console.log(`selHouse: Leases: ${this.leases.length}, Houses: ${this.houses.length}`) ;
    const curDt = new Date().toISOString().slice(0, 10) ; // todo ... check on need of houseselected boolen
    const curLease = this.leases.find(lease => lease.House === this.selectedHouse &&
      lease.StartDt <= curDt && lease.EndDt >= curDt) ;
  }

  selLease() {
    console.log(`selected lease: ${this.selectedLease}`) ;
  }
}
