import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { HeadersComponent } from './components/headers/headers.component';
import { AuthComponent } from './components/auth/auth.component';
import { environment } from 'environment';
import { initializeApp,provideFirebaseApp,getApp } from '@angular/fire/app';
import { provideAuth,getAuth, connectAuthEmulator } from '@angular/fire/auth';
import { provideFirestore,getFirestore,initializeFirestore,
  connectFirestoreEmulator, Firestore } from '@angular/fire/firestore';

describe('AppComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [RouterTestingModule,
      provideFirebaseApp(() => initializeApp(environment.firebase)),
      provideAuth(() => {
        console.log('Env Emulators', environment.useEmulators) ;
        const auth = getAuth() ;
        if (environment.useEmulators) {
          connectAuthEmulator(auth, 'http://localhost:9099', {
            disableWarnings: true
          }) ;
        }
        return auth ;
      }),
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
    ],
    declarations: [AppComponent, HeadersComponent, AuthComponent]
  }));

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title 'clerk'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('clerk');
  });

  /* it('should render title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('ng-content-ng')?.textContent).toContain('Real Estate Accounting');
  }); */
});
