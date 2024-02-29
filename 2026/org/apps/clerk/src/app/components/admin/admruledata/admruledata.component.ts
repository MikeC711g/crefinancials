import { FirebaseService } from './../../../services/firebase.service';
import { RuleData } from './../../../models/ruleData.model';
import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { GenutilsService } from './../../../services/genutils.service';
import { KeyVal } from './../../../models/keyval.model';
import { House } from './../../../models/house.model';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'app-admruledata',
  templateUrl: './admruledata.component.html',
  styleUrls: ['./admruledata.component.css']
})
export class AdmruledataComponent implements OnInit {

  @Input() ruleAdmin: RuleData = new RuleData('', '', [], 0, '', '', '', '', '', '') ;
  @Input() tranTypes: string[] = [''] ;
  @Input() categoryTaxcat: KeyVal[] = [] ;
  @Input() taxCats: KeyVal[] = [] ;
  @Input() accounts: KeyVal[] = [] ;
  @Input() newRow = false ;   // Dflt, but over-ridden when tran caller feeds new rule
  @Output() parmMod = new EventEmitter<{ action: string, parmType: string, newVal: any, oldVal: any }>() ;
  editMode = false ;  acctString = '' ;
  origRules: RuleData = new RuleData('', '', [], 0, '', '', '', '', '', '') ;
  houses: House[] = new Array<House>() ;
  srchAmtStr = '' ;
  statusMsg = "" ;
  CLASSNAME = 'admruledata' ;

  constructor(private fireSvc: FirebaseService, private utilSvc: GenutilsService) { }

  ngOnInit(): void {
    if (this.newRow || (this.ruleAdmin.srchStr === '' && this.ruleAdmin.srchAmt === 0)) {
      this.newRow = true ;  this.editMode = true ;
    } else {
      this.origRules = { ...this.ruleAdmin } ;
      this.acctString = this.ruleAdmin.accounts.join(' ') ;
      if (this.ruleAdmin.srchAmt && this.ruleAdmin.srchAmt !== 0.0001) {
        this.srchAmtStr = this.ruleAdmin.srchAmt.toString() ;
      }
    }
    this.houses = this.fireSvc.getFullHouses() ;
  }

  onAddRecord() {
    this.utilSvc.cDebug(this.CLASSNAME,'Came into add/update, newRow: %O ruleAdm: %O  srchStr: %s', this.newRow,
      this.ruleAdmin, this.srchAmtStr) ;
        // Only keep relevant fields in object
    if (this.ruleAdmin.Category !== undefined && this.ruleAdmin.Category === '')
      delete this.ruleAdmin.Category ;
    if (this.ruleAdmin.TranType !== undefined && this.ruleAdmin.TranType === '')
      delete this.ruleAdmin.TranType ;
    if (this.ruleAdmin.TranExtra !== undefined && this.ruleAdmin.TranExtra === '')
      delete this.ruleAdmin.TranExtra ;
    if (this.ruleAdmin.TaxCat !== undefined && this.ruleAdmin.TaxCat === '')
      delete this.ruleAdmin.TaxCat ;
    if (this.ruleAdmin.House !== undefined && this.ruleAdmin.House === '')
      delete this.ruleAdmin.House ;
    if (this.ruleAdmin.Annotation !== undefined && this.ruleAdmin.Annotation === '')
      delete this.ruleAdmin.Annotation ;
    this.ruleAdmin.srchStr = this.ruleAdmin.srchStr.toUpperCase() ;
    this.ruleAdmin.srchAmt = (this.srchAmtStr === '') ? 0.0001 : parseFloat(this.srchAmtStr) ;
    if (this.newRow) {
      this.parmMod.emit({action: this.utilSvc.actionTypes.Add,
        parmType: this.utilSvc.globalTypes.RuleData, newVal: this.ruleAdmin, oldVal: this.ruleAdmin}) ;
      this.newRow = false ;
    } else {    // If update, send new and original for DB
      this.origRules.srchStr = this.origRules.srchStr.toUpperCase() ;
      this.acctString = this.ruleAdmin.accounts.join(' ') ;
      this.parmMod.emit({action: this.utilSvc.actionTypes.Update,
        parmType: this.utilSvc.globalTypes.RuleData, newVal: this.ruleAdmin, oldVal: this.origRules}) ;
    }
    this.editMode = false ;
    setTimeout(() => { this.origRules = { ...this.ruleAdmin } ; }, 3000); // Delay mod for parent
  }

  onChgSrchStr(isSrchStr: boolean) {
    this.utilSvc.cLog(this.CLASSNAME, 'isSrch: %s  ruleAdmin: %O', isSrchStr, this.ruleAdmin)
    if (isSrchStr) {
      if (this.ruleAdmin.srchStr && !this.ruleAdmin.ruleName)  this.ruleAdmin.ruleName = this.ruleAdmin.srchStr
    } else
      if (this.srchAmtStr && !this.ruleAdmin.ruleName)
        this.ruleAdmin.ruleName = 'SearchAmount' + this.srchAmtStr
    this.utilSvc.cLog(this.CLASSNAME, 'Out ruleAd: %O', this.ruleAdmin)
  }

  multiSelAll() {   // action on option did not work well, so onto select
    if (this.ruleAdmin.accounts.includes('selectAll')) {
      this.ruleAdmin.accounts = [] ;
      for (const curAcct of this.accounts) { this.ruleAdmin.accounts.push(curAcct.RKey ) }
    }
  }

  onDeleteRecord() {
    this.utilSvc.cDebug(this.CLASSNAME,'Came into delete for rule: %s', this.ruleAdmin.srchStr ) ;
    this.parmMod.emit({action: this.utilSvc.actionTypes.Delete,
      parmType: this.utilSvc.globalTypes.RuleData,
      newVal: this.ruleAdmin, oldVal: this.ruleAdmin}) ;
    this.editMode = false ;
  }

  onCancel() {
    this.utilSvc.cDebug(this.CLASSNAME,'Came into cancel for rule: %s', this.ruleAdmin.srchStr ) ;
    if (this.newRow) {
      this.parmMod.emit({action: this.utilSvc.actionTypes.Cancel,
        parmType: this.utilSvc.globalTypes.RuleData,
        newVal: this.ruleAdmin, oldVal: this.ruleAdmin}) ;
    }
    this.editMode = false ;    this.newRow = false ;
  }
}
