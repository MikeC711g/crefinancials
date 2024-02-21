import { TestBed } from "@angular/core/testing";
import { AdmhousesComponent } from "./admhouses.component";
import { FormsModule } from "@angular/forms";

import { environment } from 'environment';
import { initializeApp,provideFirebaseApp,getApp } from '@angular/fire/app';
import { provideFirestore,getFirestore,initializeFirestore,
  connectFirestoreEmulator, Firestore } from '@angular/fire/firestore';
import { House } from "src/app/models/house.model";

describe('AdmHousesComponent', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ AdmhousesComponent ],
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
    const fixture = TestBed.createComponent(AdmhousesComponent) ;
    // const app = fixture.debugElement.componentInstance;
    const component = fixture.componentInstance ;
    component.statusMsg = 'Test message' ;
    component.house = new House('111TestHouse', '111 Main St', 'TestCity', 'NC', '27777',
      '2020-01-01', '2029-12-31') ;
    fixture.detectChanges() ;
    const htmlEls: HTMLElement = fixture.nativeElement ;
    const p = htmlEls.querySelector('p') ;
    expect(p.textContent).equal('Test message') ;
    // app.get(['aqua']).should('have.text', 'Test') ;
    // cy.mount(AdmkvComponent) ;
  })
})
