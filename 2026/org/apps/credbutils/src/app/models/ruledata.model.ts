export class RuleData {

  constructor(
    public ruleName: string,
    public srchStr: string,
    public accounts: string[],
    public srchAmt: number,
    public Category?: string,
    public TranType?: string,
    public TranExtra?: string,
    public TaxCat?: string,
    public House?: string,
    public Annotation?: string) {}
}

