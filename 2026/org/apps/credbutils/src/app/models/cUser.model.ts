export class cUser {
  constructor(
    public email: string,
    public uid: string,
    public refreshToken: string,
    public cid: string,
    public dbPrefix: string,
    public role: string) {}
}
