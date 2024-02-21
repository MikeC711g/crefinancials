import { Adm1parmComponent } from './adm1parm.component';
import { TestBed } from "@angular/core/testing";
import { FormsModule } from "@angular/forms";

import { environment } from 'environment';
import { initializeApp,provideFirebaseApp,getApp } from '@angular/fire/app';
import { provideFirestore,getFirestore,initializeFirestore,
  connectFirestoreEmulator, Firestore } from '@angular/fire/firestore';

describe('Adm1ParmComponent', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ Adm1parmComponent ],
      imports: [
        FormsModule,
        provideFirebaseApp(() => initializeApp(environment.firebase)),
        provideFirestore(() => {
          let fireStore: Firestore ;
          if (environment.useEmulators) {
            fireStore = initializeFirestore(getApp(), {
              experimentalForceLongPolling: true
            }) ;
            connectFirestoreEmulator(fireStore, 'localhost', 8080) ;
          } else {
            fireStore = getFirestore() ;
          }
          return fireStore ;
        })
      ]
    })
  })

  it('mounts', () => {
    const fixture = TestBed.createComponent(Adm1parmComponent) ;
    const component = fixture.componentInstance ;
    component.statusMsg = 'Test message' ;
    component.parmLabel = 'TestAccountType' ;   component.parmType = 'accountType' ;
    fixture.detectChanges() ;
    const htmlEls: HTMLElement = fixture.nativeElement ;
    const p = htmlEls.querySelector('p') ;
    expect(p.textContent).equal('Test message') ;
  })
})
