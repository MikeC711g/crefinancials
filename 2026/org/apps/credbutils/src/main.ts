import { enableProdMode, importProvidersFrom } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';


import { environment } from './environments/environment';
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import { AppRoutingModule } from './app/app-routing.module';
import { FormsModule } from '@angular/forms';
import { provideFirebaseApp, initializeApp, getApp } from '@angular/fire/app';
import { provideAuth, getAuth, connectAuthEmulator } from '@angular/fire/auth';
import { provideFirestore, Firestore, initializeFirestore, connectFirestoreEmulator, getFirestore } from '@angular/fire/firestore';
import { AppComponent } from './app/app.component';

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
    providers: [importProvidersFrom(BrowserModule, AppRoutingModule, FormsModule, 
        // provideFirebaseApp(() => initializeApp(environment.firebase)),
        provideFirebaseApp(() => initializeApp(environment.firebase)), provideAuth(() => {
            console.log('Env Emulators', environment.useEmulators);
            const auth = getAuth();
            if (environment.useEmulators) {
                connectAuthEmulator(auth, 'http://localhost:9099', {
                    disableWarnings: true
                });
            }
            return auth;
        }), provideFirestore(() => {
            let fireStore: Firestore;
            if (environment.useEmulators) {
                fireStore = initializeFirestore(getApp(), {
                    experimentalForceLongPolling: true
                });
                connectFirestoreEmulator(fireStore, 'localhost', 8080);
            }
            else {
                fireStore = getFirestore();
            }
            return fireStore;
        }))]
})
  .catch(err => console.error(err));
