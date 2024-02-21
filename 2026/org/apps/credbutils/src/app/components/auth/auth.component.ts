import { NgForm } from '@angular/forms';
import { AuthService } from './../../services/auth.service';
import { Component } from '@angular/core';
import { UserRec } from './../../models/UserRec.model';
import { cUser } from './../../models/cUser.model';
import { Router } from '@angular/router';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.css']
})
export class AuthComponent  {
  errorMsg = '' ;   successMsg = '' ;   uid = '' ;

  constructor(private authSvc: AuthService, private router: Router) { }

  onSubmit(loginForm: NgForm) {
    if (!loginForm.valid) { return ; }   // If form hacked, don't allow it here
    const eMail = loginForm.value.email ;
    const password = loginForm.value.password ;
    console.log('eMail: %s', eMail) ;
    this.authSvc.doLogin(eMail, password).
      then(rslt => {
        console.log('login: ', rslt) ;
        this.uid = rslt.user.uid ;
        this.errorMsg = '' ;
        this.authSvc.getUser(rslt.user.uid).
          then(doc => {
            if (doc.exists) {
              const data = doc.data() as UserRec ;
              const user = new cUser(rslt.user.email, rslt.user.uid, rslt.user.refreshToken,
                data.cid, data.dbPrefix, data.role) ;
              this.authSvc.user$.next(user) ;
              this.successMsg = 'You are now logged in' ;
              this.router.navigate(['/clonedb']) ;
            } else {
              console.log('uid: %s not in Users collection', this.uid) ;
              this.errLogin(rslt.user.email, rslt.user.uid, rslt.user.refreshToken) ;
            }
          }).catch(error => {
            console.warn('Failed to retrieve user for this signon, err: ', error)
            this.errLogin(rslt.user.email, rslt.user.uid, rslt.user.refreshToken) ;
          })
      }).catch(error => {
        console.warn('Failed signin with err: ', error)
        this.errLogin(eMail, 'NoUid', 'noRefreshToken') ;
      })
  }

  errLogin(eMail: string, uid: string, refreshToken: string) {
    const user = new cUser(eMail, uid, refreshToken, 'noCid', 'noDBprefix', 'noRole') ;
    this.authSvc.user$.next(user) ;
    this.errorMsg = 'Problem with the signin'
  }
}
