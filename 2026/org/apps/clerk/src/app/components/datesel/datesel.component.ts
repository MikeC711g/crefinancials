import { Component, EventEmitter, Input, Output } from '@angular/core';
import { GenutilsService } from './../../services/genutils.service';
import { KeyVal } from './../../models/keyval.model';

@Component({
  selector: 'app-datesel',
  templateUrl: './datesel.component.html',
  styleUrls: ['./datesel.component.css']
})
export class DateselComponent  {
  @Input() title = 'Date'
  @Input() dateOpts: KeyVal[] = [ new KeyVal('30 days', '30'), new KeyVal('90 days', '90'),
    new KeyVal('Custom Dates', '-1')]
  @Output() dateMod = new EventEmitter<{numDays: number, startDt: string, endDt: string}>() ;

  dateIntvl = '0'
  errorMsg = '' ;  successMsg = '';
  startDt = '' ;  endDt = '' ;
  CLASSNAME = 'datesel' ;

  constructor(private utilSvc: GenutilsService ) { }

  runFixedIntvl() {
    if (this.dateIntvl === '0') { return ; }   // No action "select option"
    const curDt = new Date() ;
    this.endDt = curDt.toISOString().slice(0, 10) ;
    if (/^[\d-]+$/.test(this.dateIntvl)) {        // Numeric interval ?
      const numDays = parseInt(this.dateIntvl) ;
      this.startDt =  (numDays === -1) ? this.utilSvc.getDate(curDt, -90) : 
        this.utilSvc.getDate(curDt, numDays*-1)
          // Emit in case they don't chg date. Any date chg emits as well, to cover all bases
      this.dateMod.emit({numDays: numDays, startDt: this.startDt, endDt: this.endDt})
    } else {    // Not a number, check which
      const mthEnds = [ 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 ] ;
      const qtrMthEnds = [11, 8, 5, 2 ] ;  // 0 offset
      let sMth = -1 ;  let curMth: number ;  let pQtrEMth: number ;
      let curYr = curDt.getFullYear() ;
      switch (this.dateIntvl) {
        case 'pmth':
          sMth = curDt.getMonth() - 1 ;    // Get yr/mth
          if (sMth < 0) {  curYr -= 1 ;  sMth += 12 }   // If was Jan, then Dec prior yr
          this.endDt = new Date(curYr, sMth, mthEnds[sMth]).toISOString().slice(0, 10) ;
          this.startDt = this.endDt.slice(0, 8) + '01' ;
          this.utilSvc.cDebug(this.CLASSNAME, 'pmth sDate: %s  eDate: %s', this.startDt, this.endDt) ; break ;
        case 'pqtr':
          curMth = curDt.getMonth() ;
          pQtrEMth = qtrMthEnds.find((qMth) => qMth < ((curMth < 3) ? curMth+12 : curMth))! ;
          if (pQtrEMth === 11) {  curYr -= 1 ; }    // Prior qtr is in prior yr
          console.log('curMth: ', curMth, 'pQtrEMth: ', pQtrEMth)
          console.log('MthEnd pqtr: %d', mthEnds[pQtrEMth])
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
    this.dateMod.emit({numDays: -1, startDt: this.startDt, endDt: this.endDt})
  }
}
