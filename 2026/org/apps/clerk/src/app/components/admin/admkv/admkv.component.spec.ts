import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from 'environment';
import { initializeApp,provideFirebaseApp,getApp } from '@angular/fire/app';
import { provideFirestore,getFirestore,initializeFirestore,
  connectFirestoreEmulator, Firestore } from '@angular/fire/firestore';

import { AdmkvComponent } from './admkv.component';
import { FormsModule } from '@angular/forms';

describe('AdmkvComponent', () => {
  let component: AdmkvComponent;
  let fixture: ComponentFixture<AdmkvComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AdmkvComponent],
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
    fixture = TestBed.createComponent(AdmkvComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
