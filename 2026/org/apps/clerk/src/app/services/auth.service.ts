import { Injectable } from '@angular/core';
import { Auth, UserCredential, User, createUserWithEmailAndPassword, deleteUser,
  sendPasswordResetEmail, signInWithEmailAndPassword, signOut, 
  sendEmailVerification, updatePassword} from '@angular/fire/auth' ;
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { BehaviorSubject } from 'rxjs';
import { GenutilsService } from './genutils.service';
import { cUser } from '../models/cUser.model';
import { UserRec } from '../models/UserRec.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  userAny: any = null ;
  user$ = new BehaviorSubject<cUser>(this.userAny) ;
  userData: any ;
  uid = '' ;
  CLASSNAME = 'authService' ;
  newCustNm = 'newCustomer'

  constructor(private auth: Auth, private firestore: Firestore,
    private utilSvc: GenutilsService) {}

  doLogin(eMail: string, password: string): Promise<any> {
    return signInWithEmailAndPassword(this.auth, eMail, password) ;
  }

  getUser(uid: string): Promise<any> {
    this.uid = uid ;
    const userId = doc(this.firestore, 'Users', uid)
    return getDoc(userId) ;
  }

  doLogout() {
    signOut(this.auth) ;
    this.user$.next(this.userAny) ;
  }

  resetPassword(eMail: string): Promise<any> {
    return sendPasswordResetEmail(this.auth, eMail)
  }

  changePassword(user: User, oldPw: string, newPw: string): Promise<any> | string {
    return (this.auth.currentUser) ? updatePassword(this.auth.currentUser!, newPw) :
      'Must be signed in to use this feature'
  }

  createUser(email: string, password: string): Promise<UserCredential> {
    console.log('Cre8User email %s', email)
    return createUserWithEmailAndPassword(this.auth, email, password)
  }

  verifyEMail(user: User): Promise<any> {
    return sendEmailVerification(user) ;
  }

  addNewCustomer(userRec: UserRec): Promise<any> {
    const rowId = userRec.uuid
    delete userRec.uuid
    console.log('Driving setDoc w/newCustNm: %s  rowId: %s  userRec: %O', this.newCustNm, rowId, userRec)
    return setDoc(doc(this.firestore, this.newCustNm, rowId!), {...userRec })
  }

  removeUser(user: User): Promise<any> {    // This only does currently logged in user
    return deleteUser(user)
  }
}
