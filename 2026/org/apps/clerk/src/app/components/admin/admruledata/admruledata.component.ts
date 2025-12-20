import { FirebaseService } from './../../../services/firebase.service';
import { FormsModule } from '@angular/forms';
import { RuleData } from './../../../models/ruledata.model';
import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { GenutilsService } from './../../../services/genutils.service';
import { KeyVal } from './../../../models/globals.model';
import { House } from './../../../models/house.model';

@Component({
  selector: 'crefinancials-admruledata',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admruledata.component.html',
  styleUrls: ['./admruledata.component.css']
})
export class AdmruledataComponent implements OnInit {

  @Input() tranRule: RuleData = new RuleData('', '', '', [], 0) ;
  @Input() tranTypes: string[] = [''] ;
  @Input() categoryTaxcat: KeyVal[] = [] ;
  @Input() taxCats: KeyVal[] = [] ;
  @Input() accounts: KeyVal[] = [] ;
  @Input() newRow = false ;   // Dflt, but over-ridden when tran caller feeds new rule
  @Output() parmMod = new EventEmitter<{ action: string, parmType: string, newVal: any, oldVal: any }>() ;
  editMode = false ;  acctString = '' ;
  origRules: RuleData = new RuleData('', '', '', [], 0) ;
  houses: House[] = new Array<House>() ;
  srchAmtStr = '' ;
  statusMsg = "" ;
  gType = 'tranRule' ;
  CLASSNAME = 'admruledata' ;

  constructor(private fireSvc: FirebaseService, private utilSvc: GenutilsService) { }

  ngOnInit(): void {
    console.log('Into tranRule w/rule: %O', this.tranRule) ;
    this.gType = this.utilSvc.globalTypes.RuleData
    if (this.newRow || (this.tranRule.srchStr === '' && this.tranRule.srchAmt === 0)) {
      this.newRow = true ;  this.editMode = true ;
    } else {
      this.origRules = { ...this.tranRule } ;
      this.acctString = this.tranRule.accounts.join(' ') ;
      if (this.tranRule.srchAmt && this.tranRule.srchAmt !== 0.0001) {
        this.srchAmtStr = this.tranRule.srchAmt.toString() ;
      }
    }
    this.houses = this.fireSvc.getHouses() ;
  }

  onAddRecord() {
    this.utilSvc.cDebug(this.CLASSNAME,'Came into add/update, newRow: %O ruleAdm: %O  srchStr: %s', this.newRow,
      this.tranRule, this.srchAmtStr) ;
    this.tranRule.srchStr = this.tranRule.srchStr.toUpperCase() ;
    this.tranRule.srchAmt = (this.srchAmtStr === '') ? 0.0001 : parseFloat(this.srchAmtStr) ;
    if (this.newRow) {
      this.parmMod.emit({action: this.utilSvc.actionTypes.Add,
        parmType: this.gType, newVal: this.tranRule, oldVal: this.tranRule}) ;
      this.newRow = false ;
    } else {    // If update, send new and original for DB
      this.origRules.srchStr = this.origRules.srchStr.toUpperCase() ;
      this.acctString = this.tranRule.accounts.join(' ') ;
      this.parmMod.emit({action: this.utilSvc.actionTypes.Update,
        parmType: this.gType, newVal: this.tranRule, oldVal: this.origRules}) ;
    }
    this.editMode = false ;
    setTimeout(() => { this.origRules = { ...this.tranRule } ; }, 3000); // Delay mod for parent
  }

  onChgSrchStr(isSrchStr: boolean) {
    this.utilSvc.cLog(this.CLASSNAME, 'isSrch: %s  ruleAdmin: %O', isSrchStr, this.tranRule)
    if (isSrchStr) {
      if (this.tranRule.srchStr && !this.tranRule.ruleName)  this.tranRule.ruleName = this.tranRule.srchStr
    } else
      if (this.srchAmtStr && !this.tranRule.ruleName)
        this.tranRule.ruleName = 'SearchAmount' + this.srchAmtStr
    this.utilSvc.cLog(this.CLASSNAME, 'Out ruleAd: %O', this.tranRule)
  }

  multiSelAll() {   // action on option did not work well, so onto select
    if (this.tranRule.accounts.includes('selectAll')) {
      this.tranRule.accounts = [] ;
      for (const curAcct of this.accounts) { this.tranRule.accounts.push(curAcct.RKey ) }
    }
  }

  onDeleteRecord() {
    this.utilSvc.cDebug(this.CLASSNAME,'Came into delete for rule: %s', this.tranRule.srchStr ) ;
    this.parmMod.emit({action: this.utilSvc.actionTypes.Delete,
      parmType: this.gType, newVal: this.tranRule, oldVal: this.tranRule}) ;
    this.editMode = false ;
  }

  onCancel() {
    this.utilSvc.cDebug(this.CLASSNAME,'Came into cancel for rule: %s', this.tranRule.srchStr ) ;
    if (this.newRow) {
      this.parmMod.emit({action: this.utilSvc.actionTypes.Cancel,
        parmType: this.gType, newVal: this.tranRule, oldVal: this.tranRule}) ;
    }
    this.editMode = false ;    this.newRow = false ;
  }
}
