import { cUser } from '../models/cUser.model';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators' ;
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth.service';
import { CanDeactivateFn } from '@angular/router';
import { DeactivatableComponent } from '../interfaces/deactivatableComponent.interface';
import { inject } from '@angular/core';
import { GenutilsService } from './genutils.service';

  export const canActivate: CanActivateFn =
    (route: ActivatedRouteSnapshot, router: RouterStateSnapshot):
    boolean | Promise<boolean> | Observable<boolean> => {
    const authSvc = inject(AuthService) ;
    const utilSvc = inject(GenutilsService)
    return authSvc.user$.pipe(take(1), map(user => {
      const aUser: cUser = user ;
      switch (route.routeConfig!.path) {
        case 'trans':
        case 'projects':
        case 'reconcile':
        case 'reports':
          return !!user ;
        case 'admin':
          return (aUser?.role === utilSvc.roleNames.Admin ||
            aUser?.role === utilSvc.roleNames.GlobalAdmin)
        default:
          utilSvc.cWarn('canActivateFunc', 'Invalid route: %s', route.routeConfig!.path)
          return false ;
      }
    }))
  }

  export const canDeactivate: CanDeactivateFn<DeactivatableComponent> =
    (component: DeactivatableComponent, currentRoute: ActivatedRouteSnapshot,
    currentState: RouterStateSnapshot, nextState: RouterStateSnapshot) => {
      console.log('canDeactTrans curRoute: %s curState: %s  nextState: %s', currentRoute.routeConfig!.path,
        currentState.url, nextState.url)
      return  (component.canDeactivate) ? component.canDeactivate() : true
  }
