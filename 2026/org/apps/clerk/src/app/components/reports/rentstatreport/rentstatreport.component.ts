import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranRec } from '../../../models/TranRec.model';
import { GenutilsService } from '../../../services/genutils.service';

interface TranRunningTot {
  tranRec: TranRec,
  runTot: number ;
}

@Component({
  selector: 'app-rentstatreport',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './rentstatreport.component.html',
  styleUrl: './rentstatreport.component.css'
})
export class RentstatreportComponent {
  @Input() tranRecs: TranRec[] = [] ;
  @Input() startDt = '' ;  @Input() endDt = '' ;
  @Input() rHouse = '';
  rentArr: TranRunningTot[] = [] ;  reportDetails = false ;  reportReady = false ;
  CLASSNAME = 'RentStatus' ;
  rentAmt = 1000 ;  beginBal = 0 ; lateFee = 50 ;  rentDue = 2 ;  lateDue = 7 ;  runBal = 0 ;

  constructor(private utilSvc: GenutilsService) {}

  ngOnInit(): void {
    console.log('Into RentStatus')
  }
  /** ************************************************************************
   * Main logic for Rent Status
   *  Balance is amount owed, so fees & rent are + and pmts are minus
   *  Only one house in report as many added data points needed per house
   * ToDo: Saving some of the key info.
   *  Array of "extras" (outside pmts, rent forgive, rent changes, ...)
   ************************************************************************ */
  rentStatus() {
    this.utilSvc.cLog(this.CLASSNAME,'Into rentStatus tranRecs: %O', this.tranRecs) ;
    const locRentArr: TranRunningTot[] = [] ;
    for (const inTran of this.tranRecs)  {
      inTran.Amount *= -1 ;     // Payments bring down the balance
      locRentArr.push({tranRec: inTran, runTot: 0})
    }
    this.addRecs(locRentArr, this.rentDue, this.rentAmt, 'Rent Due', this.startDt, this.endDt)
    this.addRecs(locRentArr, this.lateDue, this.lateFee, 'Late Fee', this.startDt, this.endDt)
    locRentArr.sort((a, b) => {return a.tranRec.TranDate.localeCompare(b.tranRec.TranDate)})
    let curBal = this.beginBal ;
    for (const curRB of locRentArr) {
      if (curRB.tranRec.Category === 'Late Fee' && curBal <= 0)  curRB.tranRec.Amount = 0 ;
      curBal += curRB.tranRec.Amount ;  curRB.runTot = curBal ;
    }
    this.rentArr = locRentArr.filter(tr => tr.tranRec.Amount !== 0)
    console.log('Struc: %O', this.rentArr) ;
    this.reportReady = true ;
  }

  addRecs(rentArr: TranRunningTot[], dayOfMonth: number, amount: number, tType: string,
    startDt: string, endDt: string) {
    const rentDt = new Date(startDt) ;  const rentEnd = new Date(endDt)
    const startDay = rentDt.getDate() ;   rentDt.setDate(dayOfMonth-1) ;
    if (dayOfMonth < startDay)  rentDt.setMonth(rentDt.getMonth() + 1)
    console.log('RentDt: %s  dayOfMth: %d  startDay: %d',
      rentDt.toISOString().slice(0, 10), dayOfMonth, startDay) ;
    let curTran: TranRec ;
    while (rentDt < rentEnd) {
      curTran = new TranRec('', rentDt.toISOString().slice(0, 10), '', tType, '', amount,
      '', '', '', '', '', '', '') ;
      rentArr.push({tranRec: curTran, runTot: 0})
      rentDt.setMonth(rentDt.getMonth() + 1)
    }
  }
}
