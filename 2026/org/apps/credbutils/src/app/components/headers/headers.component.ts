import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from './../../services/auth.service';
import { FirebaseService } from './../../services/firebase.service';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'credbutils-headers',
  standalone: true,
  imports: [NgClass, RouterLink, RouterLinkActive],
  templateUrl: './headers.component.html',
  styleUrls: ['./headers.component.css']
})
export class HeadersComponent  {
  navbarOpen = false ;
  isAuthenticated = false ;
  authSubscription: Subscription ;
  isAdmin = false ;
  isGlobalAdmin = false ;

  constructor(private authSvc: AuthService, private fireSvc: FirebaseService) {
    this.authSubscription = this.authSvc.user$.subscribe(user => {
      if (!!user && user.cid != 'noCid') {
        this.isAuthenticated = true ;
        console.log('user: ', user, ' IsAuth: ', this.isAuthenticated) ;
        this.isAdmin = (user.role === 'admin' || user.role === 'globalAdmin') ;
        this.isGlobalAdmin = (user.role === 'globalAdmin') ;
        this.fireSvc.captureAuth(this.isAuthenticated, user.role, user.cid, user.dbPrefix) ;
      } else {
        this.isAdmin = false ;  this.isGlobalAdmin = false ;
        this.fireSvc.captureAuth(false, 'none', 'noCid', 'noDBPrefix') ;
      }
    })
  }
}
