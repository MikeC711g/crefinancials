import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { House } from './../../models/house.model';
import { KeyVal } from './../../models/globals.model';
import { Project } from './../../models/project.model';
import { GenutilsService } from './../../services/genutils.service';
import { NgFor } from '@angular/common';

@Component({
  selector: 'crefinancials-transrch',
  standalone: true,
  imports: [FormsModule, NgFor],
  templateUrl: './transrch.component.html',
  styleUrls: ['./transrch.component.css']
})
export class TransrchComponent {

  @Input() categoryTaxcat:  KeyVal[] = new Array<KeyVal>() ;
  @Input() tranTypes: string[] = new Array<string>() ;
  @Input() houses: House[] = new Array<House>() ;
  @Input() projects: Project[] = new Array<Project>()
  @Input() taxCats: KeyVal[] = new Array<KeyVal>()
  @Output() tranSrch = new EventEmitter<{action: string, category: string[], tranType: string[],
    house: string[], project: string, taxCat: string[], annotationRegEx: string,
    minAmt: number, maxAmt: number}>() ;
  category: string[] = [] ;  tranType: string[] = [] ;  house: string[] = [] ;  project = '' ;
  taxCat: string[] = [] ; annotationRegEx = '' ;  minAmt = 0 ; maxAmt = 0

  constructor(private utilSvc: GenutilsService) {}

  onSubmit() {
    this.emit2Caller('submit', this.category, this.tranType, this.house, this.project,
      this.taxCat, this.annotationRegEx, this.minAmt, this.maxAmt)
  }

  onCancel() {
    this.emit2Caller('cancel', this.category, this.tranType, this.house, this.project,
      this.taxCat, this.annotationRegEx, this.minAmt, this.maxAmt)
  }

  emit2Caller(action: string, category: string[], tranType: string[], house: string[],
    project: string, taxCat: string[], annotationRegEx: string, minAmt: number, maxAmt: number) {
      this.tranSrch.emit({action: action, category: category, tranType: tranType, house: house,
        project: project, taxCat: taxCat, annotationRegEx: annotationRegEx, minAmt: minAmt,
        maxAmt: maxAmt})
  }
}
