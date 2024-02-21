/** Class specific to querying the transaction data base */
export class TranQ {
  /** A Transaction document query ... ALL fields optional
   * @constructor
   * @param {string} MinDate - Minimum date in yyyy-mm-dd form for querying a range of dates
   * @param {string} MaxDate - Mzximum date in yyyy-mm-dd form for querying a range of dates
   * @param {string} cid - Company ID which should be handled in the authentication code
   * @param {string[]} AccountArr - Institutional account array (bank/charge/mortgage/..)
   * @param {string[]} Category - Category on Transaction
   * @param {string[]} TranType - Type of tran (Chg/Deposit/Check/...)
   * @param {number} MinAmount - Minimum amount for a numeric range
   * @param {number} MaxAmount - Maximum amount for a numeric range
   * @param {string[]} TaxCat - Tax Category (Business expense, personal expense, ...)
   * @param {string[]} House - House tied to transaction (if any)
   * @param {string} Project - ID of project record
   * @param {string} AnnotationRegEx - Final description/annotation on tran
   */
  constructor(
    public MinDate?: string,
    public MaxDate?: string,
    public Cid?: string,
    public AccountArr?: string[],
    public Category?: string[],
    public TranType?: string[],
    public MinAmount?: number,
    public MaxAmount?: number,
    public TaxCat?: string[],
    public House?: string[],
    public Project?: string,
    public AnnotationRegEx?: string) {}
}
