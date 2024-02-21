import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from 'environment';
import { initializeApp,provideFirebaseApp,getApp } from '@angular/fire/app';
import { provideFirestore,getFirestore,initializeFirestore,
  connectFirestoreEmulator, Firestore } from '@angular/fire/firestore';

import { AdmhousesComponent } from './admhouses.component';
import { FormsModule } from '@angular/forms';

describe('AdmhousesComponent', () => {
  let component: AdmhousesComponent;
  let fixture: ComponentFixture<AdmhousesComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AdmhousesComponent],
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

    });
    fixture = TestBed.createComponent(AdmhousesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
