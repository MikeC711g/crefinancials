import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from 'environment';
import { initializeApp,provideFirebaseApp,getApp } from '@angular/fire/app';
import { provideFirestore,getFirestore,initializeFirestore,
  connectFirestoreEmulator, Firestore } from '@angular/fire/firestore';

import { CreprojecteditComponent } from './creprojectedit.component';
import { FormsModule } from '@angular/forms';

describe('CreprojecteditComponent', () => {
  let component: CreprojecteditComponent;
  let fixture: ComponentFixture<CreprojecteditComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CreprojecteditComponent],
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
    fixture = TestBed.createComponent(CreprojecteditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
