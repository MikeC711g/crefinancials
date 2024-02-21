import { cUser } from '../models/cUser.model';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators' ;
import { ActivatedRouteSnapshot, CanActivate, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth.service';
import { Injectable } from '@angular/core';
import { GenutilsService } from './genutils.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  CLASSNAME = 'authGuardService' ;
  constructor(private authSvc: AuthService, private utilSvc: GenutilsService) { }

  canActivate(route: ActivatedRouteSnapshot, router: RouterStateSnapshot) :
    boolean | Promise<boolean> | Observable<boolean> {
    this.utilSvc.cDebug(this.CLASSNAME, 'path: %s', route.routeConfig!.path) ;
    return this.authSvc.user$.pipe(take(1), map(user => {
      const aUser: cUser = user ;
      switch (route.routeConfig!.path) {
        case 'trans':
        case 'projects':
        case 'reconcile':
        case 'reports':
          return !!user ;
        case 'admin':
          return (aUser?.role === this.utilSvc.roleNames.Admin ||
            aUser?.role === this.utilSvc.roleNames.GlobalAdmin)
        case 'globalAdmin':
          return aUser?.role === this.utilSvc.roleNames.GlobalAdmin ;
        default:
          this.utilSvc.cWarn(this.CLASSNAME,'Invalid route: %s', route.routeConfig!.path)
          return false ;
      }
    }))
  }
      // return (user.role === 'admin' || user.role === 'globalAdmin' ) ;
      // return (user.role === 'globalAdmin' ) ;
}
