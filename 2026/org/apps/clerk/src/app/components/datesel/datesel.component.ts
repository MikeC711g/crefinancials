import { Component, EventEmitter, Input, Output } from '@angular/core';
import { GenutilsService } from './../../services/genutils.service';
import { KeyVal } from './../../models/keyval.model';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'app-datesel',
  templateUrl: './datesel.component.html',
  styleUrls: ['./datesel.component.css']
})
export class DateselComponent  {
  @Input() title = 'Date'
  @Input() dateOpts: KeyVal[] = [ new KeyVal('30 days', '30'), new KeyVal('90 days', '90'),
    new KeyVal('Custom Dates', '-1')]
  @Input() advQuery = { isOn: false }    // Object so shared w/sender/parent
  @Output() dateMod = new EventEmitter<{numDays: number, startDt: string, endDt: string}>() ;
  // this.dateMod.emit({numDays: this.curDateIntvl, startDt: '', endDt: ''}) ;

  errorMsg = '' ;  successMsg = '';
  curDateIntvl = '0' ;  startDt = '' ;  endDt = '' ;
  CLASSNAME = 'datesel' ;

  constructor(private utilSvc: GenutilsService ) { }

  runFixedIntvl() {
    if (this.curDateIntvl === '0') { return ; }   // No action "select option"
    const curDt = new Date() ;
    this.endDt = curDt.toISOString().slice(0, 10) ;
    if (/^[\d-]+$/.test(this.curDateIntvl)) {        // Numeric interval ?
      const numDays = parseInt(this.curDateIntvl) ;
      if (numDays === -1) {
        // Set these to sort of normals, and emit on any change on screen to avoid loss
        this.startDt = this.utilSvc.getDate(curDt, -90) ;
          // Emit in case they don't chg date. Any date chg emits as well, to cover all bases
        if (this.advQuery.isOn) this.dateMod.emit({numDays: numDays, startDt: this.startDt, endDt: this.endDt})
      } else {
        this.startDt = this.utilSvc.getDate(curDt, numDays*-1) ;
        this.dateMod.emit({numDays: numDays, startDt: this.startDt, endDt: this.endDt})
      }
    } else {    // Not a number, check which
      const mthEnds = [ 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 ] ;
      const qtrMthEnds = [11, 8, 5, 2 ] ;  // 0 offset
      let sMth = -1 ;  let curMth: number ;  let pQtrEMth: number ;
      let curYr = curDt.getFullYear() ;
      switch (this.curDateIntvl) {
        case 'pmth':
          sMth = curDt.getMonth() - 1 ;    // Get yr/mth
          if (sMth < 0) {  curYr -= 1 ;  sMth += 12 }   // If was Jan, then Dec prior yr
          this.endDt = new Date(curYr, sMth, mthEnds[sMth]).toISOString().slice(0, 10) ;
          this.startDt = this.endDt.slice(0, 8) + '01' ;
          this.utilSvc.cDebug(this.CLASSNAME, 'pmth sDate: %s  eDate: %s', this.startDt, this.endDt) ; break ;
        case 'pqtr':
          curMth = curDt.getMonth() ;
          pQtrEMth = qtrMthEnds.find((qMth) => qMth < curMth)! ;
          if (pQtrEMth === 11) {  curYr -= 1 ; }    // Prior qtr is in prior yr
          this.endDt = new Date(curYr, pQtrEMth, mthEnds[pQtrEMth]).toISOString().slice(0, 10) ;
          this.startDt = new Date(curYr, pQtrEMth - 2, 1).toISOString().slice(0, 10) ;
          this.utilSvc.cDebug(this.CLASSNAME, 'pqtr sDate: %s EndDt: %s', this.startDt, this.endDt) ; break ;
        case 'ttm':
          this.endDt = curDt.toISOString().slice(0, 10) ;
          this.startDt = this.utilSvc.getDate(curDt, -365) ;
          this.utilSvc.cDebug(this.CLASSNAME, 'ttm sDate: %s  endDt: %s', this.startDt, this.endDt) ; break ;
        case 'pyr':
          this.endDt = new Date(curYr-1, 11, 31).toISOString().slice(0, 10) ;
          this.startDt = new Date(curYr-1, 0, 1).toISOString().slice(0, 10) ;
          this.utilSvc.cDebug(this.CLASSNAME,'pyr sDate: %s  endDt: %s', this.startDt, this.endDt) ;
      }
      this.dateMod.emit({numDays: -1, startDt: this.startDt, endDt: this.endDt})
    }
  }

  runDates(emit2Parent: boolean) {
    if (emit2Parent || this.advQuery.isOn)
      this.dateMod.emit({numDays: -1, startDt: this.startDt, endDt: this.endDt})
  }

}
