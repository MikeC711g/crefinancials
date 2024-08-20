import { NgForm } from '@angular/forms';
import { AuthService } from './../../services/auth.service';
import { AfterViewInit, Component, ElementRef } from '@angular/core';
import { UserRec } from './../../models/UserRec.model';
import { cUser } from './../../models/cUser.model';
import { NavigationEnd, Router } from '@angular/router';
import { GenutilsService } from './../../services/genutils.service';
import { FirebaseService } from './../../services/firebase.service';
import { Subscription } from 'rxjs';
import { User, user } from '@angular/fire/auth';

type GuiMode = 'Sign In' | 'Change Password' | 'Reset Password' | 'Sign Up' 

@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.css']
})
export class AuthComponent implements  AfterViewInit {
  dispMsgs: string[] = new Array<string>() ;  curUser: any = null ;
  npwValid = false ;  cpwValid = false ;  npwMsg = '' ;  cpwMsg = '' ;
  uid = '' ;  eMail = '' ;  pw = '' ;  compName = '' ;  phone = ''
  action$: Subscription = new Subscription() ;
  guiMode: GuiMode = 'Sign In'    // or 'Reset Password' or 'Sign Up'
  loginDelay = 2    // 2 milliseconds, but bumped higher w/failed logins to catch forces
  CLASSNAME = 'auth' ;

  constructor(private authSvc: AuthService, private utilSvc: GenutilsService,
    private fireSvc: FirebaseService, private router: Router, private elementRef: ElementRef) {
    this.action$ = router.events.subscribe((routeUrl) => {
      if (routeUrl instanceof NavigationEnd) {
        const urlParts = routeUrl.url.split('/') ;
        const lastPart = urlParts[urlParts.length-1]
        if (lastPart === 'chgpw') {
          this.guiMode = 'Change Password' ;
          const cuser: cUser  = authSvc.getCUser() ;
          this.eMail = cuser.email ;
        }
        this.cpwValid = this.npwValid = 'Sign In.Reset Password'.includes(this.guiMode) ;    // no cks here
        utilSvc.cDebug(this.CLASSNAME, 'Into url chg with guiMode %s  npwValid: %s  cpwValid: %s',
          this.guiMode, this.npwValid, this.cpwValid)
      }
    })
  }

  ngAfterViewInit() {
    this.elementRef.nativeElement.ownerDocument.body.style.backgroundColor = '#2471A3';
  }

  onSubmit(loginForm: NgForm) {
    if (!loginForm.valid) { return ; }   // If form hacked, don't allow it here
    const oldPw = loginForm.value.oldPw ;   this.compName = '' ;  this.phone = ''
    let newPw = '' ;   let confirmPw = '' ;   let dispName = '' ;
    switch (this.guiMode) {
      case 'Sign In':
        this.doLogin(this.eMail, oldPw) ;  break ;
      case 'Change Password':
        newPw = loginForm.value.newPw ;
        confirmPw = loginForm.value.confirmPw ;
        this.changePw(this.eMail, oldPw, newPw, confirmPw) ; break ;
      case 'Reset Password':
        this.resetPw(this.eMail) ; break ;
      case 'Sign Up':
        this.compName = loginForm.value.compName ;
        dispName = loginForm.value.dispName ;
        this.phone = loginForm.value.phone ;

        this.createUser(this.eMail, oldPw, this.compName, dispName, this.phone)
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
    console.log('LoginProc: eml: %s  pw: %s', eMail, password)
    this.authSvc.doLogin(eMail, password).then(rslt => {
      this.utilSvc.cDebug(this.CLASSNAME, 'login: %s', rslt.user.uid) ;
      this.curUser = rslt.user ;
      this.authSvc.setAuthuser(this.curUser) ;
      this.uid = this.curUser.uid ;
      this.authSvc.getUser(rslt.user.uid).then(doc => {
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
            this.router.navigate(['/trans/loadfile']) ;
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
    console.log('resetPw for eml: %s', eMail)
    this.authSvc.resetPassword(eMail).then(() => {
      this.dispMsgs.push('An eMail has been sent to '+ eMail + ' with instructions to reset/change your password')
    }).catch(error => {
      this.dispMsgs.push('An error occurred resetting the password')
      this.utilSvc.cWarn(this.CLASSNAME, 'Error resetting pw: %s', error)
    })
  }

  changePw(eMail: string, oldPw: string, newPw: string, confirmPw: string) {
    const aUser = this.authSvc.getAuthUser() ;
    console.log('changePw w/user: %O  eMl: %s  oldPw: %s  newPw: %s  cPw: %s', aUser, eMail, oldPw, newPw, confirmPw)
    this.authSvc.changePw(aUser, eMail, oldPw, newPw, confirmPw).then(() => {
      this.dispMsgs.push(`Successfully changed password for user: ${eMail}`)
      this.router.navigate(['/trans/loadfile']) ;
    }).catch(error => {
      this.dispMsgs.push(`Error ${error} occurred changing the password`)
      this.utilSvc.cWarn(this.CLASSNAME, 'Error changing pw: %s', error)
    })
  }

  createUser(eMail: string, pw: string, companyName: string, dispName: string, phone: string) {
    this.utilSvc.cLog(this.CLASSNAME, 'cre8user: eMail %s company: %s  disp: %s  pho: %s',
      eMail, companyName, dispName, phone)
    this.authSvc.createUser(eMail, pw).then(userCred => {
      const dtAdd = new Date().toISOString().slice(0, 10)
      const uid = userCred.user.uid
      this.utilSvc.cLog(this.CLASSNAME, 'created user %s do newCust', uid)
      const userRec: UserRec = new UserRec('add', '', companyName, dtAdd, '', eMail, phone, 'Admin',
        true, uid)
      this.cre8NewCust(userRec)
      this.authSvc.verifyEMail(userCred.user).then(emailV => {
        console.log('eMailVerifyResult: ', emailV) ;
      }).catch(emailVErr => {
        this.utilSvc.cWarn(this.CLASSNAME, 'Error %s sending eMail verify', emailVErr)
      })
      // ToDo ... message about thanks for signing up, you will receive an eMail with
      //  instructions to get you going shortly
      // ToDo ... Add dispName to userRec
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

  validatePassword(newPw: string, confirmPw?: string): boolean {   // Quick boolean for testing in templates
    if (!'Change Password.Sign Up'.includes(this.guiMode)) {
      this.cpwValid = this.npwValid = true ;   return true ; // No ck unless this verb
    }
    const minLength = 8; // Example minimum length
    const hasUppercase = /[A-Z]/.test(newPw);
    const hasLowercase = /[a-z]/.test(newPw);
    const hasNumber = /[0-9]/.test(newPw);
    const hasSpecialChar = /[!@#$%^&*]/.test(newPw); 

    if (newPw.length >= minLength && hasUppercase && hasLowercase && hasNumber &&
      hasSpecialChar && (!confirmPw || confirmPw === newPw)) {    // All good
      this.cpwValid = this.npwValid = true ;   this.npwMsg = 'New Password good'
      if (confirmPw) {
        this.cpwMsg = 'Confirm Password good' ;
      } else { this.cpwValid = true ;  this.npwValid = true ; }
    } else {      // Something wrong, figure it out and set validity and msg
      if (newPw !== confirmPw) {
        this.cpwValid = false ;  this.cpwMsg = 'Confirm Password does not equal new password' ;
      }
      this.npwMsg = '' ;
      if (newPw.length < minLength) this.setPwErr('Password too short') ;
      if (!hasUppercase || !hasLowercase) this.setPwErr('Need upper and lower case characters') ;
      if (!hasNumber) this.setPwErr('Password must have a number') ;
      if (!hasSpecialChar) this.setPwErr('Password must have a special character') ;
    }
    return this.npwValid && this.cpwValid ;
  }

  setPwErr(msg: string) {
    this.npwValid = false ;  this.npwMsg += msg + '\n' ;
  }

  chgGuiMode(newMode: GuiMode) {
    this.guiMode = newMode ;
    this.npwValid = 'Sign In.Reset Password'.includes(this.guiMode) ;    // no cks here
  }
}
