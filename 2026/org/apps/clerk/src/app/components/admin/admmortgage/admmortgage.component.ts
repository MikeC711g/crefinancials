import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GenutilsService } from './../../../services/genutils.service';
import { Mortgage } from '../../../models/house.model';

@Component({
  selector: 'crefinancials-admmortgage',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admmortgage.component.html',
  styleUrl: './admmortgage.component.css'
})
export class AdmmortgageComponent implements OnInit {
  @Input() mortgage: Mortgage = new Mortgage('', '', '', 0, 0, 0, "", 0);
  @Input() house = '' ;
  @Output() parmMod = new EventEmitter<{ action: string, parmType: string,
    newVal: any, oldVal: any }>() ;
  newRow = false ;  editMode = false ;
  origMortgage: Mortgage = new Mortgage('', '', '', 0, 0, 0, "", 0);
  statusMsg = "" ;
  gType: string ;
  CLASSNAME = 'admmortgage' ;

  constructor(private utilSvc: GenutilsService) {
    this.gType = utilSvc.globalTypes.Mortgages
  }

  ngOnInit(): void {
    if (this.mortgage.house === '') {
      this.newRow = true ;  this.editMode = true ;  this.mortgage.house = this.house ;
    } else {
      this.origMortgage = { ...this.mortgage } ;
    }
  }

  onAddRecord() {
    this.utilSvc.cDebug(this.CLASSNAME, 'Came into add for mortgage: %O  newRow: %s', this.mortgage, this.newRow ) ;
    if (this.newRow) {
      this.parmMod.emit({action: this.utilSvc.actionTypes.Add,
        parmType: this.gType, newVal: this.mortgage, oldVal: this.mortgage}) ;
      this.newRow = false ;
    } else {    // If update, send new and original for DB
      this.parmMod.emit({action: this.utilSvc.actionTypes.Update,
        parmType: this.gType, newVal: this.mortgage, oldVal: this.origMortgage}) ;
    }
    this.editMode = false ;
  }

  onDeleteRecord() {
    this.utilSvc.cDebug(this.CLASSNAME,'Came into delete for name: %s', this.mortgage.house ) ;
    this.parmMod.emit({action: this.utilSvc.actionTypes.Delete,
      parmType: this.gType, newVal: this.mortgage, oldVal: this.mortgage}) ;
    this.editMode = false ;
  }

  onCancel() {
    this.utilSvc.cDebug(this.CLASSNAME, 'Came into cancel for name: %s', this.mortgage.house ) ;
    if (this.newRow) {
      this.parmMod.emit({action: this.utilSvc.actionTypes.Cancel,
        parmType: this.gType, newVal: this.mortgage, oldVal: this.mortgage}) ;
    }
    this.editMode = false ;    this.newRow = false ;
  }
}
