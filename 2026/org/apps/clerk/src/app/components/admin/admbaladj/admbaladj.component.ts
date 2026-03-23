import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BalAdjust, Lease } from '../../../models/house.model';
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
  @Input() lease: Lease = new Lease('', '', false, '', '', '', 0, 0, 0, 0, 0, 0, 0, 0, [])
  @Input() balAdj: BalAdjust = new BalAdjust('', '', '', '', 0) ;
  @Input() curBal = 0 ;
  @Output() parmMod = new EventEmitter<{ action: string, parmType: string,
    newVal: any, oldVal: any }>() ;
  origBa: BalAdjust = new BalAdjust('', '', '', '', 0) ;
  balAdjTypes: string[] = new Array<string>() ;  negTypes: string[] = new Array<string>() ;
  newRow = false ;  editMode = false ;  negateAmount = false ;
  statusMsg = "" ;  gType: string ;  curDate = '' ;
  virtualRow = false ;    // Is this a row in report, but not physically in BalAdj DB (ie: Rent income)
  bgColor = 'white' ;
  CLASSNAME = 'admbaladj' ;

  constructor(private utilSvc: GenutilsService, private globMods: GlobalModsService) {
    this.gType = utilSvc.globalTypes.BalAdjust
  }

  ngOnInit(): void {
    this.balAdjTypes = this.utilSvc.balAdjTypes ;
    this.negTypes = this.utilSvc.balAdjNegTypes ;
    this.curDate = new Date().toISOString().slice(0, 10)
    if (this.balAdj.BalAdjId || this.balAdj.AType === "Late Fee"){    // Existing doc/row in data base
      this.origBa = { ...this.balAdj } ;  // Late fees may be adding async and not have BalAdjId yet
    } else {
      if (this.balAdj.House) {   // Virtual row, not in Baladj DB
        this.virtualRow = true ;
      } else {
        this.newRow = true ;  this.editMode = true ;  this.balAdj.House = this.lease.House ;
        this.balAdj.ADate = this.curDate ;
      }
    }
    this.bgColor = (this.virtualRow) ? 'white' : 'aquamarine' ;
  }

  ckAmt() {
    if ( this.balAdj.AType && this.negTypes.includes(this.balAdj.AType) && this.balAdj.Amount > 0 )
      this.balAdj.Amount *= -1 ;
  }

  onAddRecord() {
    this.utilSvc.cDebug(this.CLASSNAME, 'Came into add for balAdj: %O  newRow: %s', this.balAdj, this.newRow ) ;
    if (this.newRow) {
      this.parmMod.emit({action: this.utilSvc.actionTypes.Add,
        parmType: this.gType, newVal: this.balAdj, oldVal: this.balAdj}) ;
      this.newRow = false ;
    } else {    // If update, send new and original for DB
      this.parmMod.emit({action: this.utilSvc.actionTypes.Update,
        parmType: this.gType, newVal: this.balAdj, oldVal: this.origBa}) ;
    }
    this.editMode = false ;
  }

  onCancel() {
    this.utilSvc.cDebug(this.CLASSNAME, 'Came into cancel for name: %s', this.balAdj.BalAdjId ) ;
    if (this.newRow) {
      this.parmMod.emit({action: this.utilSvc.actionTypes.Cancel,
        parmType: this.gType, newVal: this.balAdj, oldVal: this.balAdj}) ;
    }
    this.editMode = false ;    this.newRow = false ;
  }
}
