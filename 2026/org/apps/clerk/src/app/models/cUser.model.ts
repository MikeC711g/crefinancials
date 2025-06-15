export class cUser {    // User object carried around for auth
    constructor(
      public email: string,
      public uid: string,
      public refreshToken: string,
      public cid: string,
      public dbPrefix: string,
      public role: string) {}
}

export class UserRec {  // User record for Firebase DB used during login
    constructor(
      public action: string,
      public cid: string,
      public cName: string,
      public dateAdded: string,
      public dbPrefix: string,
      public eMail: string,
      public phone: string,
      public role: string,
      public activeU: boolean,
      public uuid?: string) {}
}
