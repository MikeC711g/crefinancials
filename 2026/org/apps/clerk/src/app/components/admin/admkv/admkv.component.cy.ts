import { TestBed } from "@angular/core/testing";
import { AdmkvComponent } from "./admkv.component";
import { FormsModule } from "@angular/forms";

import { environment } from 'environment';
import { initializeApp,provideFirebaseApp,getApp } from '@angular/fire/app';
import { provideFirestore,getFirestore,initializeFirestore,
  connectFirestoreEmulator, Firestore } from '@angular/fire/firestore';

describe('AdmkvComponent', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ AdmkvComponent ],
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
    const fixture = TestBed.createComponent(AdmkvComponent) ;
    // const app = fixture.debugElement.componentInstance;
    const component = fixture.componentInstance ;
    component.statusMsg = 'Test message' ;
    component.parmType = 'accounts' ;   component.keyLabel = 'TestAccountNm' ;
    component.valLabel = 'TestAccountTp' ;
    fixture.detectChanges() ;
    const htmlEls: HTMLElement = fixture.nativeElement ;
    const p = htmlEls.querySelector('p') ;
    expect(p.textContent).equal('Test message') ;
    // app.get(['aqua']).should('have.text', 'Test') ;
    // cy.mount(AdmkvComponent) ;
  })
})
