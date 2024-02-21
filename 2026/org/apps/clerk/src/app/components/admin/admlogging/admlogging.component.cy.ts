import { TestBed } from "@angular/core/testing";
import { AdmloggingComponent } from "./admlogging.component";
import { FormsModule } from "@angular/forms";

import { environment } from 'environment';
import { initializeApp,provideFirebaseApp,getApp } from '@angular/fire/app';
import { provideFirestore,getFirestore,initializeFirestore,
  connectFirestoreEmulator, Firestore } from '@angular/fire/firestore';
import { House } from "src/app/models/house.model";

describe('AdmHousesComponent', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ AdmloggingComponent ],
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
    const fixture = TestBed.createComponent(AdmloggingComponent) ;
    // const app = fixture.debugElement.componentInstance;
    const component = fixture.componentInstance ;
    // component.statusMsg = 'Test message' ;
    component.className = 'testClass' ;
    component.logLevels = [ 'DebugTest1', 'InfoTest1', 'WarnTest1', 'ErrorTest1'] ;
    fixture.detectChanges() ;
    const htmlEls: HTMLElement = fixture.nativeElement ;
    const p = htmlEls.querySelector('option') ;
    expect(p.textContent).equal('DebugTest1') ;
    // app.get(['aqua']).should('have.text', 'Test') ;
    // cy.mount(AdmkvComponent) ;
  })
})
