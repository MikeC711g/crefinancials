export class UserRec {
  constructor(
    public action: string,
    public cid: string,
    public cName: string,
    public dateAdded: string,
    public dbPrefix: string,
    public eMail: string,
    public phone: string,
    public role: string,
    public uuid?: string) {}
}
