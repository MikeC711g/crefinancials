export class TranRec {

  constructor(
    public TranId: string,
    public TranDate: string,
    public Account: string,
    public Description: string,
    public TranType: string,
    public Amount: number,
    public TranExtra: string,
    public TaxCat: string,
    public House: string,
    public Project: string,
    public Annotation: string,
    public ReconKey: string) {}

  cvtDate(inDate: string): Date {
    const mdyArr = inDate.split('/') ;
    return new Date(mdyArr[0].padStart(2, '0') + '/' + mdyArr[1].padStart(2, '0') +
      '/' + mdyArr[2]) ;
  }

  fromString(csvString: string) {
    const tranFlds = csvString.split(',') ;
    console.log('fromString w/str: ', csvString, ' fldsLen: ', tranFlds.length) ;
    let tranRec: TranRec  ;
    switch (tranFlds.length) {
      case 8:
      case 7:
      case 6:
      case 5: {
        // tranRec = new TranRec(" ", this.cvtDate(tranFlds[0]), tranFlds[1], tranFlds[2],
        tranRec = new TranRec(' ', tranFlds[0], tranFlds[1], tranFlds[3],
        tranFlds[2], +tranFlds[4], '', '', '', '', '', '') ;
        break ;
      }
      case 10:
      case 9: {
        tranRec = new TranRec(' ', tranFlds[0], tranFlds[1], tranFlds[3],
        tranFlds[2], +tranFlds[4], tranFlds[5], '', tranFlds[6], tranFlds[7], tranFlds[8], '') ;
        break ;
      }
      default: {
        console.log('Invalid CSS tran: ', csvString, ' Of len: ', tranFlds.length) ;
      }
    }
  }
}
