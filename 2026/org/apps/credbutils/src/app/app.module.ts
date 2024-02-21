import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeadersComponent } from './components/headers/headers.component';
import { LoadutilsComponent } from './components/loadutils/loadutils.component';
import { UnloadutilsComponent } from './components/unloadutils/unloadutils.component';
import { LutransComponent } from './components/loadutils/lutrans/lutrans.component';
import { LuprojectsComponent } from './components/loadutils/luprojects/luprojects.component';
import { LuglobalsComponent } from './components/loadutils/luglobals/luglobals.component';
import { LureconcileComponent } from './components/loadutils/lureconcile/lureconcile.component';
import { UlutransComponent } from './components/unloadutils/ulutrans/ulutrans.component';
import { UluprojectsComponent } from './components/unloadutils/uluprojects/uluprojects.component';
import { UluglobalsComponent } from './components/unloadutils/uluglobals/uluglobals.component';
import { UlureconcileComponent } from './components/unloadutils/ulureconcile/ulureconcile.component';
// import { initializeApp,provideFirebaseApp } from '@angular/fire/app';
// import { AngularFireModule } from '@angular/fire/compat';
import { environment } from '../environments/environment';
// import { provideAnalytics,getAnalytics,ScreenTrackingService,UserTrackingService } from '@angular/fire/analytics';
import { initializeApp,provideFirebaseApp,getApp } from '@angular/fire/app';
import { provideAuth,getAuth, connectAuthEmulator } from '@angular/fire/auth';
import { provideFirestore,getFirestore,initializeFirestore,
  connectFirestoreEmulator, Firestore } from '@angular/fire/firestore';
import { AuthComponent } from './components/auth/auth.component';
import { ClonedbComponent } from './components/clonedb/clonedb.component';
import { ReportsComponent } from './components/reports/reports.component';
// import { providePerformance,getPerformance } from '@angular/fire/performance';

@NgModule({
  declarations: [
    AppComponent,
    HeadersComponent,
    LoadutilsComponent,
    UnloadutilsComponent,
    LutransComponent,
    LuprojectsComponent,
    LuglobalsComponent,
    LureconcileComponent,
    UlutransComponent,
    UluprojectsComponent,
    UluglobalsComponent,
    UlureconcileComponent,
    AuthComponent,
    ClonedbComponent,
    ReportsComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    // provideFirebaseApp(() => initializeApp(environment.firebase)),
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
  providers: [
    // ScreenTrackingService,UserTrackingService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
