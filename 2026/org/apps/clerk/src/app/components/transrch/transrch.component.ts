import { Component, EventEmitter, Input, Output } from '@angular/core';
import { House } from './../../models/house.model';
import { KeyVal } from './../../models/keyval.model';
import { Project } from './../../models/project.model';
import { GenutilsService } from './../../services/genutils.service';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'app-transrch',
  templateUrl: './transrch.component.html',
  styleUrls: ['./transrch.component.css']
})
export class TransrchComponent {

  @Input() categoryTaxcat:  KeyVal[] = new Array<KeyVal>() ;
  @Input() tranTypes: string[] = new Array<string>() ;
  @Input() fullHouses: House[] = new Array<House>() ;
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
