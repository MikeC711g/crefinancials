import { ApplicationConfig,  provideBrowserGlobalErrorListeners,  provideZoneChangeDetection} from '@angular/core';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';
import { provideFirebaseApp, initializeApp, getApp } from '@angular/fire/app';
import { getFirestore, provideFirestore, Firestore, initializeFirestore, connectFirestoreEmulator }
  from '@angular/fire/firestore';
import { provideAuth, getAuth, connectAuthEmulator } from '@angular/fire/auth';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideFirebaseApp(() => initializeApp(environment.firebase)), provideAuth(() => {
      const auth = getAuth();
      if (environment.useEmulators) {
          connectAuthEmulator(auth, 'http://localhost:9099', {
              disableWarnings: true
          });
      }
      return auth;
    }),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    // provideFirestore(() => getFirestore()),
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
      }),
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes)
  ]
};
