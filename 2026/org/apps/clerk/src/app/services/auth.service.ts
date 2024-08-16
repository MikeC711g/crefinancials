import { Injectable } from '@angular/core';
import { Auth, UserCredential, User, createUserWithEmailAndPassword, deleteUser,
  sendPasswordResetEmail, signInWithEmailAndPassword, signOut, sendEmailVerification, updatePassword,
  EmailAuthProvider, reauthenticateWithCredential} from '@angular/fire/auth' ;
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { BehaviorSubject } from 'rxjs';
import { GenutilsService } from './genutils.service';
import { cUser } from '../models/cUser.model';
import { UserRec } from '../models/UserRec.model';
import { Router } from '@angular/router';

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
    private utilSvc: GenutilsService, private route: Router) {}

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

  // This should go away. If I do use it, I should do re-validation to make sure signed in
  changePw(user: User, eMail: string, oldPw: string, newPw: string, confirmPw: string):
    Promise<any> {
    return new Promise< Promise<any> >(( resolve, reject ) => {
      if (newPw !== confirmPw) reject('New and Confirm passwords do not match') ;
      if (!user && !this.auth.currentUser) reject('Could not retrieve user info') ;
      if (!user) user = this.auth.currentUser! ;
      const credential = EmailAuthProvider.credential(eMail, newPw) ;
      reauthenticateWithCredential(user, credential).then(() => {
        resolve(updatePassword(user, newPw)) ;
      }).catch(error => {reject(`Error ${error} reauthenticating current user`)})
    })
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
