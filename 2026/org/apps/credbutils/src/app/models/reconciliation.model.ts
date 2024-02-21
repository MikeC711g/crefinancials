export class Reconciliation {

  constructor(
    public Cid: string,
    public Account: string,
    public StartDt: string,
    public EndDt: string,
    public TotalCredits: number,
    public TotalDebits: number,
    public BeginBal: number,
    public EndBal: number,
    public DeltaAmt: number,
    public ReconKey?: string ) {}
  }
