export class Reconciliations {

  constructor(
    public Account: string,
    public Cid: string,
    public StartDt: string,
    public EndDt: string,
    public TotalCredits: number,
    public TotalDebits: number,
    public BeginBal: number,
    public EndBal: number,
    public DeltaAmt: number,
    public ReconKey?: string ) {}
  }
