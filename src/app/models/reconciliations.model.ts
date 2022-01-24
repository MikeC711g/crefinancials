export class Reconciliations {

  constructor(
    public ReconKey: string,
    public Account: string,
    public StartDt: string,
    public EndDt: string,
    public TotalCredits: number,
    public TotalDebits: number,
    public BeginBal: number,
    public EndBal: number,
    public DeltaAmt: number) {}
  }
