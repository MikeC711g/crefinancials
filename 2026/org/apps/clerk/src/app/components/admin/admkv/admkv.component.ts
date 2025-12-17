import { GenutilsService } from './../../../services/genutils.service';
import { FormsModule } from '@angular/forms';
import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { KeyVal } from './../../../models/globals.model';

@Component({
  selector: 'crefinancials-admkv',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admkv.component.html',
  styleUrls: ['./admkv.component.css']
})
export class AdmkvComponent implements OnInit {
  @Input() parmType = "" ;
  @Input() keyLabel = "" ;
  @Input() valLabel = "" ;
  @Input() kv: KeyVal = new KeyVal('', '') ;
  @Input() valDomain: string[] = [] ;
  @Input() valDomainKV: KeyVal[] = [] ;
  @Output() parmMod = new EventEmitter<{ action: string, parmType: string,
    newVal: any, oldVal: any }>() ;
  newRow = false ;  editMode = false ;  origKV = new KeyVal('', '') ;
  isDomain = false ;  isDomainKV = false ;
  statusMsg = "" ;
  CLASSNAME = 'admkv' ;

  constructor(private utilSvc: GenutilsService) { }

  ngOnInit(): void {
    this.utilSvc.cDebug(this.CLASSNAME,'onInit: kv: %O  OrigKv: %O', this.kv, this.origKV) ;
    if (this.kv.RKey === "") {
      this.newRow = true ;
      this.editMode = true ;
    } else {
      this.origKV.RKey = this.kv.RKey ;  this.origKV.RVal = this.kv.RVal ;
    }
    this.utilSvc.cLog(this.CLASSNAME, 'valDomainLen: %d  vdkv  %d', this.valDomain.length, this.valDomainKV.length)
    if (this.valDomain.length > 0) {
      this.isDomain = true ;
    } else {
      if (this.valDomainKV.length > 0) { this.isDomainKV = true ; }
    }
  }

  onAddRecord() {
    this.utilSvc.cDebug(this.CLASSNAME, 'Came into add/upd for RKey: %s  RVal: %s  newRow: %s',
      this.kv.RKey, this.kv.RVal, this.newRow ) ;
    if (this.newRow) {
      this.parmMod.emit({action: this.utilSvc.actionTypes.Add, parmType: this.parmType,
        newVal: this.kv, oldVal: this.origKV}) ;
    } else {
      this.utilSvc.cDebug(this.CLASSNAME, 'Emitting for update with new: %O Old: %O', this.kv, this.origKV) ;
      this.parmMod.emit({action: this.utilSvc.actionTypes.Update, parmType: this.parmType,
        newVal: this.kv, oldVal: this.origKV}) ;
    }
    this.editMode = false ;   this.newRow = false ;
  }

  onDeleteRecord() {
    this.utilSvc.cDebug(this.CLASSNAME, 'Came into delete for parmKey: %s  parmVal: %s', this.kv.RKey, this.kv.RVal ) ;
    this.parmMod.emit({action: this.utilSvc.actionTypes.Delete, parmType: this.parmType,
      newVal: this.kv, oldVal: this.kv}) ;
    this.editMode = false ;
  }

  onCancel() {
    this.utilSvc.cDebug(this.CLASSNAME,'Came into cancel for parmKey: %s  parmVal: %s', this.kv.RKey, this.kv.RVal ) ;
    if (this.newRow) { this.parmMod.emit({action: this.utilSvc.actionTypes.Cancel, parmType: this.parmType,
      newVal: this.kv, oldVal: this.kv}) ; }
    this.editMode = false ;    this.newRow = false ;
  }
}
