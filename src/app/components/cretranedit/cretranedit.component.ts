import { ReturnState } from '../../models/returnState.model';
import { RecordService } from '../../services/record.service';
import { Project } from '../../models/project.model';
import { DescripInfo } from './../../models/descripInfo.model';
import { NgForm } from '@angular/forms';
import { TranRec } from './../../models/TranRec.model';
import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { MsgInfo } from '../../models/MsgInfo.model';

@Component({
  selector: 'app-cretranedit',
  templateUrl: './cretranedit.component.html',
  styleUrls: ['./cretranedit.component.css']
})
export class CretraneditComponent implements OnInit {

  @Input() tranRec: TranRec = new TranRec('', '', '', '', '', 0.0, '', '', '', '', '', '')
  @Input() tranDB = false ;
  @Input() hideLabel = '' ;
  @Output() tranMod = new EventEmitter<{action: string, tranRec: TranRec}>() ;
  @ViewChild('recordForm', { static: false })
  recordForm!: NgForm;
  editMode = false ;  newRow = false ;
  accounts: string[] = new Array<string>() ;
  tranTypes: string[] = new Array<string>() ;
  taxCats: string[] = new Array<string>() ;
  descripInfo: DescripInfo[] = new Array<DescripInfo>() ;
  houses: string[] = new Array<string>() ;
  projects: Project[] = new Array<Project>() ;
  filteredProjects: Project[] = new Array<Project>() ;
  noProj = new Project('', 'None', '2015-01-01', '2030-12-31', '', 'Miscellaneous') ;
  completedActions = 0 ;
  recordsAdded = 0 ;
  statusMsg = ' ' ;
  expandedView = false ;

  constructor(private recordService: RecordService) { }

  ngOnInit(): void {
    if (this.tranRec.TranId === '') {
      this.newRow = true ;
      this.expandedView = true ;
    } else {
      this.editMode = true ;
    }
    this.accounts = this.recordService.getAccounts() ;
    this.tranTypes = this.recordService.getTranTypes() ;
    this.projects = this.recordService.getProjects('2017-01-01', '2028-12-31') ;
    this.taxCats = this.recordService.getTaxCats() ;
    this.descripInfo = this.recordService.getDescripInfo() ;
    for (const curProj of this.projects) {
      this.filteredProjects.push(curProj) ;
    }
    this.filteredProjects = this.projects ;
    this.houses = this.recordService.getHomes() ;
  }

  /*********************************************************************
    Add the record created to the data base
  ********************************************************************/
  onAddRecord(newEdit: boolean): void {
    console.log('csvrecEd editmd: ', this.editMode, ' Tran: ', this.tranRec, ' DB: ', this.tranDB) ;
    this.tranRec.ReconKey = '' ;
    if (!this.editMode || !this.tranDB) {   // New record or record from CSV not yet in DB
      this.editMode = newEdit ;    // Record saved, now can edit
      this.recordService.createTran(this.tranRec).subscribe(
        (response) => {
          const returnState: ReturnState = response ;
          this.tranRec.TranId = returnState.Message.split(' ')[0] ; // Capture new tranId
          this.statusMsg = 'Successfully added Record: ' + ++this.recordsAdded ;
          this.tranMod.emit({ action: (newEdit) ? 'add' : 'addKeep', tranRec: this.tranRec }) ;
          if (newEdit) {    // Add and go back
            this.expandedView = false ;
            this.newRow = false ;
            if (!this.tranDB) { this.tranDB = true ; }
          } else {    // Give 1 second for processing, then create partially populated tranrec
            setTimeout(() => {
              this.tranRec = new TranRec('', this.tranRec.TranDate, this.tranRec.Account,
                this.tranRec.Description, this.tranRec.TranType, 0, this.tranRec.TranExtra,
                '', '', '', '', '') ;
                console.log('newEdit false newrow: ', this.newRow, ' expand: ', this.expandedView) ;
              }, 1000) ;
          }
        },
        (error) => {
          console.log('TranErr..RecordService: ', error) ;
          this.statusMsg = 'Error adding record: ' ;
        },
        () => { this.completedActions++ ; }
      ) ;
    } else {
      this.recordService.updateTran(this.tranRec, this.tranRec).subscribe(
        (response) => {
          const returnState: ReturnState = response ;
          this.statusMsg = 'Update record successful' ;
          this.expandedView = false ;
          this.tranMod.emit({ action: 'update', tranRec: this.tranRec }) ;
        },
        (error) => {
          console.log('UpdtTranErr..RecordService: ', error) ;
          this.statusMsg = 'Error updating record' ;
        },
        () => { this.completedActions++ ; }
      ) ;
    }
  }

  /*********************************************************************
    Delete current record (not yet impl'd)
  ********************************************************************/
  onDeleteRecord(): void {
    this.recordService.deleteTran(this.tranRec.TranId).subscribe(
      (response) => {
        const returnState: ReturnState = response ;
        this.statusMsg = 'Successfully deleted Record: ' + ++this.recordsAdded ;
        this.tranMod.emit({ action: 'delete', tranRec: this.tranRec }) ;
      },
      (error) => {
        console.log('TranErr..RecordService: ', error) ;
        this.statusMsg = 'Error deleting record: ' ;
      },
      () => { this.completedActions++ ; }
    ) ;

    this.expandedView = false ;
  }

  /*********************************************************************
    Cancel work on current record
  ********************************************************************/
  onHideRecord(): void {
    this.tranMod.emit({ action: this.hideLabel, tranRec: this.tranRec }) ;
    this.expandedView = false ;
  }

  /*********************************************************************
    Cancel work on current record
  ********************************************************************/
  onCancel(): void {
    this.tranMod.emit({ action: 'cancel', tranRec: this.tranRec }) ;
    this.expandedView = false ;
  }

  /*********************************************************************
    If select house is modified, reFilter projects for that house only
  ********************************************************************/
  onFilterProjects(useHouse: boolean): void {
    this.filteredProjects = [ this.noProj ] ;
    for (const curProj of this.projects) {
      if (!useHouse || curProj.House === this.tranRec.House) {
        if (curProj.StartDt.localeCompare(this.tranRec.TranDate) <= 0 &&
          curProj.EndDt.localeCompare(this.tranRec.TranDate) >= 0) {
          // Consider logic to identify $s associated with each project thus far.
          this.filteredProjects.push(curProj) ;
        }
      }
    }
    this.statusMsg = 'Modified project list for Date, house = ' + useHouse +
      ' ProjectCnt: ' + this.filteredProjects.length ;
  }

  /*********************************************************************
    If tranType is negative to balance (or positive for credit card), make amount negative
  ********************************************************************/
  onCheckValAbs(): void {
    if (['Check', 'Chg', 'Debit', 'Pmt', 'WithD', 'XOut'].indexOf(this.tranRec.TranType) > -1) {
      if (this.tranRec.Amount > 0) {
        this.tranRec.Amount *= -1 ;
      }
    }
  }

  /*********************************************************************
    Use parameter to see if description defaults to a particular tax category
  ********************************************************************/
  onSetTaxcat(): void {
    if (this.tranRec.Project !== '') {
      this.tranRec.TaxCat = 'BE' ;
    } else {
      const curDescrip =
        this.descripInfo.find( ({description}) => description === this.tranRec.Description ) ;
      this.tranRec.TaxCat = (curDescrip) ? this.tranRec.TaxCat = curDescrip.taxCat : '??' ;
    }
  }

}
