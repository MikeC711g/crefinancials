import { NgForm } from '@angular/forms';
import { AuthService } from './../../services/auth.service';
import { AfterViewInit, Component, ElementRef } from '@angular/core';
import { UserRec } from './../../models/UserRec.model';
import { cUser } from './../../models/cUser.model';
import { Router } from '@angular/router';
import { GenutilsService } from './../../services/genutils.service';
import { FirebaseService } from './../../services/firebase.service';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.css']
})
export class AuthComponent implements  AfterViewInit {
  dispMsgs: string[] = new Array<string>()
  uid = '' ;  eMail = '' ;  pw = '' ;  compName = '' ;  phone = ''
  guiMode = 'Sign In'    // or 'Reset Password' or 'Sign Up'
  loginDelay = 2    // 2 milliseconds, but bumped higher w/failed logins to catch forces
  CLASSNAME = 'auth' ;

  constructor(private authSvc: AuthService, private utilSvc: GenutilsService,
    private fireSvc: FirebaseService, private router: Router, private elementRef: ElementRef) { }

  ngAfterViewInit() {
    this.elementRef.nativeElement.ownerDocument.body.style.backgroundColor = '#2471A3';
  }

  onSubmit(loginForm: NgForm) {
    if (!loginForm.valid) { return ; }   // If form hacked, don't allow it here
    const eMail = loginForm.value.email ;
    let password = '' ;  this.compName = '' ;  this.phone = ''
    switch (this.guiMode) {
      case 'Sign In':
        password = loginForm.value.password ;
        this.doLogin(eMail, password) ;  break ;
      case 'Reset Password':
        this.resetPw(eMail) ; break ;
      case 'Sign Up':
        this.compName = loginForm.value.compName ;
        password = loginForm.value.password ;
        this.phone = loginForm.value.phone ;
        this.createUser(eMail, password, this.compName, this.phone)
    }
    this.guiMode = 'Sign In'
  }

  doLogin(eMail: string, password: string) {
    console.log('doLogin w/delay: %d', this.loginDelay)
    setTimeout(() => {
      this.loginProcess(eMail, password)
    }, this.loginDelay);
  }

  loginProcess(eMail: string, password: string) {
    this.authSvc.doLogin(eMail, password).
      then(rslt => {
        this.utilSvc.cDebug(this.CLASSNAME, 'login: %s', rslt.user.uid) ;
        this.uid = rslt.user.uid ;
        this.authSvc.getUser(rslt.user.uid).
          then(doc => {
            if (doc.exists) {
              const data = doc.data() as UserRec ;
              if (data.activeU === false) {
                this.utilSvc.cWarn(this.CLASSNAME,'uid: %s not active', this.uid) ;
                this.errLogin(rslt.user.email, rslt.user.uid, rslt.user.refreshToken,
                  'Clerk user is inactive, please contact customer support') ;
              } else {
                const user = new cUser(rslt.user.email, rslt.user.uid, rslt.user.refreshToken,
                  data.cid, data.dbPrefix, data.role) ;
                this.authSvc.user$.next(user) ;
                this.loginDelay = 2
                this.dispMsgs.push('You are now logged in') ;
                this.router.navigate(['/trans']) ;
              }
            } else {
              this.utilSvc.cWarn(this.CLASSNAME,'uid: %s not in Users collection', this.uid) ;
              this.errLogin(rslt.user.email, rslt.user.uid, rslt.user.refreshToken,
                'Clerk user information not available') ;
            }
          }).catch(error => {
            this.utilSvc.cWarn(this.CLASSNAME, 'Failed to retrieve user for this signon, err: %s', error)
            this.errLogin(rslt.user.email, rslt.user.uid, rslt.user.refreshToken,
              'Failed to get Clerk user information') ;
          })
      }).catch(error => {
        this.utilSvc.cWarn(this.CLASSNAME,'Failed signin with err: %s', error)
        this.errLogin(eMail, 'NoUid', 'noRefreshToken', 'Failed to sign in to auth uid') ;
      })
  }

  errLogin(eMail: string, uid: string, refreshToken: string, msgReason: string) {
    this.loginDelay += (this.loginDelay === 2) ? 250 : 5000
    const user = new cUser(eMail, uid, refreshToken, 'noCid', 'noDBprefix', 'noRole') ;
    this.authSvc.user$.next(user) ;
    this.dispMsgs.push('Problem with the signin process: ' + msgReason)
  }

  resetPw(eMail: string) {
    this.authSvc.resetPassword(eMail).then(() => {
      this.dispMsgs.push('An eMail has been sent to '+ eMail + ' with instructions to reset/change your password')
    }).catch(error => {
      this.dispMsgs.push('An error occurred resetting the password')
      this.utilSvc.cWarn(this.CLASSNAME, 'Error resetting pw: %s', error)
    })
  }

  createUser(eMail: string, pw: string, companyName: string, phone: string) {
    this.utilSvc.cLog(this.CLASSNAME, 'cre8user: eMail %s company: %s  pho: %s',
      eMail, companyName, phone)
    this.authSvc.createUser(eMail, pw).then(userCred => {
      const dtAdd = new Date().toISOString().slice(0, 10)
      const uid = userCred.user.uid
      this.utilSvc.cLog(this.CLASSNAME, 'created user %s do newCust', uid)
      const userRec: UserRec = new UserRec('add', '', companyName, dtAdd, '', eMail, phone, 'Admin',
        true, uid)
      this.cre8NewCust(userRec)
      // ToDo ... message about thanks for signing up, you will receive an eMail with
      //  instructions to get you going shortly
    }).catch(error => {
      this.utilSvc.cWarn(this.CLASSNAME, 'Error %s %s %d creating user for eMail %s',
        error, error.message, error.code, eMail)
    })
  }

  cre8NewCust(userRec: UserRec) {
    this.authSvc.addNewCustomer(userRec).then(() => {
      this.utilSvc.cLog(this.CLASSNAME, 'Created newCustomer record for %s', userRec.uuid)
      this.dispMsgs.push('Thank you for signing up for Clerk Real Estate Record Keeping. ' +
        ' We will prepare your data base and you will receive an eMail soon to help you get started')
    }).catch(err => {
      this.utilSvc.cWarn(this.CLASSNAME, 'Error %s adding request to newCustomer table for %O',
        err, userRec)
      this.dispMsgs.push('Error occurred in the signup process, please contact Clerk support')
    })
  }

  onMsgDel(idx: number, msg: string) {
    this.dispMsgs.splice(idx, 1) ;
  }

}
