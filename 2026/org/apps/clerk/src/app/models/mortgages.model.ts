export class Mortgage {

  constructor(
    public Cid: string,
    public house: string,
    public rate: number,
    public lterm: number,
    public lpmt: number,
    public balYr: number,
    public balMth: number,
    public cBal: number,
    public mortgageId?: string  ) {}
}
