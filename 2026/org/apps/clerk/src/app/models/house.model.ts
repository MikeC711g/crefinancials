export class House {

  constructor(
    public Cid: string,
    public name: string,
    public Addr: string,
    public City: string,
    public State: string,
    public zipCode: string,
    public activeDt: string,
    public inactiveDt: string,
    public HouseId?: string) {}
}

export class Lease {
  // future thoughts: Cancel reason/category and/or text for cancel comment
  constructor(
    public Cid: string,
    public House: string,
    public official: boolean, // true if the lease is official vs implied (ie: no real lease)
    public cancelled: boolean, // true if lease is cancelled (early termination)
    public cancelDt: string,   // Date of cancellation if cancelled
    public StartDt: string,
    public EndDt: string,
    public Rent: number,
    public AdlMthlyFees: number,
    public RentDueDom: number,
    public LateFee: number,
    public GracePeriod: number,
    public SecurityDeposit: number,
    public AdlStartupFees: number,
    public StartBal: number,
    public Residents: string[],    
    public LeaseId?: string) {}
}

export class Mortgage {

  constructor(
    public Cid: string,
    public house: string,
    public rate: number,
    public lterm: number,
    public lpmt: number,
    public balDate: string, // Date when cBal was calculated
    public cBal: number,
    public MortgageId?: string  ) {}
}

export class Resident {

  constructor(
    public Cid: string,
    public LName: string,
    public FName: string,
    public eMail: string,
    public phone: string,
    public startDt: string,
    public endDt: string,
    public ResidentId?: string) {}
}

export class BalAdjust {

  constructor(
    public Cid: string,
    public ADate: string,
    public House: string,
      // Adjustment type (e.g., newBill, lateFee, rentChg, curBal, etc.)
    public AType: string,   // Note no payment needed as those handled thru rent income
    public Amount: number,
    public deletedDate?: string,
    public Comment?: string,
    public BalAdjId?: string) {}
}

