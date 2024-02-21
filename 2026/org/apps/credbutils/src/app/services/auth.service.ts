import { Injectable, NgZone } from '@angular/core';
import { Auth, signInWithEmailAndPassword, signOut, sendPasswordResetEmail,
  createUserWithEmailAndPassword, User, deleteUser, UserCredential } from '@angular/fire/auth' ;
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { BehaviorSubject } from 'rxjs';
import { cUser } from '../models/cUser.model';
// import { UserRec} from '../models/UserRec.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  userAny: any = null ;
  user$ = new BehaviorSubject<cUser>(new cUser('noEMail', 'noUid', 'noRefToken', 'noCid',
    'noDBPrefix', 'noRole')) ;
  userData: any ;
  uid = '' ;

  constructor(private auth: Auth, private firestore: Firestore) {}

  doLogin(eMail: string, password: string): Promise<any> {
    return signInWithEmailAndPassword(this.auth, eMail, password) ;
  }

  getUser(uid: string): Promise<any> {
    this.uid = uid ;
    let userId = doc(this.firestore, 'Users', uid)
    return getDoc(userId) ;
  }

  doLogout() {
    signOut(this.auth) ;
    this.user$.next(this.userAny) ;
  }

  resetPassword(): Promise<any> {
    return sendPasswordResetEmail(this.auth, 'myEmail')
  }

  createUser(email: string, password: string): Promise<UserCredential> {
    return createUserWithEmailAndPassword(this.auth, email, password)
  }

  removeUser(user: User): Promise<any> {    // This only does currently logged in user
    return deleteUser(user)
  }
}
