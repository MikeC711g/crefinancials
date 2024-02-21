import { cUser } from '../models/cUser.model';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators' ;
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth.service';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard  {

  constructor(private authSvc: AuthService) { }

  canActivate(route: ActivatedRouteSnapshot, router: RouterStateSnapshot) :
    boolean | Promise<boolean> | Observable<boolean> {
    return this.authSvc.user$.pipe(take(1), map(user => {
      if (user.cid === 'noCid') { return false ; }    // No active signon
      const aUser: cUser = user ;
      if (!route.routeConfig) {
        console.warn('authGuard called but route.routeConfig null')
        return false ;
      }
      console.log('path: %s', route.routeConfig.path) ;
        switch (route.routeConfig.path) {
        case 'loadutils':
        case 'unloadutils':
        case 'clonedb':
        case 'reports':
          return !!user ;
        default:
          console.log('Invalid route: %s', route.routeConfig.path)
          return false ;
      }
    }))
  }
      // return (user.role === 'admin' || user.role === 'globalAdmin' ) ;
      // return (user.role === 'globalAdmin' ) ;
}
