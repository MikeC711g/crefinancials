import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { FirebaseService } from './firebase.service';
import { TranRec } from '../models/TranRec.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  tran$ = new BehaviorSubject<TranRec []>(this.fireSvc.gett) ;
  userData: any ;
  uid = '' ;
  CLASSNAME = 'authService' ;

  constructor(private fireSvc: FirebaseService) {}

}
