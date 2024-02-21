import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from 'environment';
import { initializeApp,provideFirebaseApp,getApp } from '@angular/fire/app';
import { provideFirestore,getFirestore,initializeFirestore,
  connectFirestoreEmulator, Firestore } from '@angular/fire/firestore';

import { AdminComponent } from './admin.component';

describe('AdminComponent', () => {
  let component: AdminComponent;
  let fixture: ComponentFixture<AdminComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AdminComponent],
      imports: [
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
    fixture = TestBed.createComponent(AdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
