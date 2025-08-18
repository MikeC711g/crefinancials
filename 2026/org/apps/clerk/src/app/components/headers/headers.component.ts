import { FirebaseService } from './../../services/firebase.service';
import { NgClass } from '@angular/common';
import { AuthService } from './../../services/auth.service';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { GenutilsService } from './../../services/genutils.service';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { cUser } from '../../models/cUser.model';

@Component({
  selector: 'app-headers',
  standalone: true,
  imports: [NgClass, RouterLink, RouterLinkActive],
  templateUrl: './headers.component.html',
  styleUrls: ['./headers.component.css']
})
export class HeadersComponent implements OnInit, OnDestroy {
  @ViewChild('authTOId', { static: true }) dialog!: ElementRef<HTMLDialogElement>;
  navbarOpen = false ;
  stayConfirmed = false ;
  isAuthenticated = false ;  isAdmin = false ;  isGlobalAdmin = false ;
  CLASSNAME = 'headers' ;

  constructor(private authSvc: AuthService, private fireSvc: FirebaseService,
    private utilSvc: GenutilsService, private router: Router) { }

  ngOnInit(): void {
    const authSubscription = this.authSvc.user$.subscribe(user => {
      this.isAuthenticated = !!user ;
      this.utilSvc.cDebug(this.CLASSNAME,'user: %O  isAuth: %s', user, this.isAuthenticated) ;
      if (this.isAuthenticated) {
        this.isAdmin = (user.role === this.utilSvc.roleNames.Admin ||
          user.role === this.utilSvc.roleNames.GlobalAdmin) ;
        this.isGlobalAdmin = (user.role === this.utilSvc.roleNames.GlobalAdmin) ;
        this.fireSvc.captureAuth(this.isAuthenticated, user.role, user.cid, user.dbPrefix) ;
        this.authSvc.setCUser(user) ;
      } else {
        this.isAdmin = false ;  this.isGlobalAdmin = false ;
        this.fireSvc.captureAuth(false, 'none', 'noCid', 'noDBPrefix') ;
        this.authSvc.setCUser(new cUser('', '', '', '', '', ''))
      }
    })
    setInterval(() => {
      const authTime = this.fireSvc.getTimeStmp() ;
      if (authTime) {   // If not 0, only timeout/signout if we have signed in
        const timeDelta = (new Date().getTime()) - authTime ;
        this.utilSvc.cDebug(this.CLASSNAME, 'Driving time test') ;
        if (timeDelta > 1200000) {    // If 20 minutes since last data base call (1200000)
          this.handleTimeout() ;
        }

      }
    }, 1200000) ; // Real is 1200000, this is 2 minutes for test
  }

  handleTimeout() {
    this.utilSvc.cDebug(this.CLASSNAME, 'HandleTimeout about to showModal') ;
    this.dialog.nativeElement.showModal() ;
    this.utilSvc.cDebug(this.CLASSNAME,'After showModal showineg we have control') ;
    setTimeout(() => {
      if (this.dialog.nativeElement.open) { // Still have window up
        this.utilSvc.cDebug(this.CLASSNAME, 'Timing out window and logging it all off') ;
        this.signOut() ;
        }
    }, 90000)
  }

  timeoutOpt(stayOn: boolean) {
    this.utilSvc.cDebug(this.CLASSNAME,'Heard from dialog with stayon: %s', stayOn) ;
    console.log('Heard from dialog with stayon: ', stayOn)
    if (stayOn) {
      this.fireSvc.updtTimeStmp() ;   // If asked to stay, update timeStamp
      this.dialog.nativeElement.close() ;
    } else this.signOut() ;
  }

  signOut() {
    if (this.dialog.nativeElement.open) this.dialog.nativeElement.close() ;
    this.logOut() ;
    this.router.navigate(['/auth'])
  }

  logOut() { this.authSvc.doLogout() ; }       // Separate for external calls

  ngOnDestroy() {
    this.utilSvc.cDebug(this.CLASSNAME,'OnDestroy, closing box') ;
    this.signOut() ;
  }
}
