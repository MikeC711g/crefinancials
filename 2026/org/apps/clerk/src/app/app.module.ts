import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
// import { environment } from '../environments/environment';
// import { environment } from 'environment';
import { environment } from '../environments/environment';
import { initializeApp,provideFirebaseApp,getApp } from '@angular/fire/app';
import { provideAuth,getAuth, connectAuthEmulator } from '@angular/fire/auth';
import { provideFirestore,getFirestore,initializeFirestore,
  connectFirestoreEmulator, Firestore } from '@angular/fire/firestore';
// import { provideFunctions,getFunctions } from '@angular/fire/functions';
import { AdminComponent } from './components/admin/admin.component';
import { AuthComponent } from './components/auth/auth.component';
import { CreprojectsComponent } from './components/creprojects/creprojects.component';
import { CrereconComponent } from './components/crerecon/crerecon.component';
import { CretranComponent } from './components/cretran/cretran.component';
import { HeadersComponent } from './components/headers/headers.component';
import { ReportsComponent } from './components/reports/reports.component';
import { Adm1parmComponent } from './components/admin/adm1parm/adm1parm.component';
import { AdmhousesComponent } from './components/admin/admhouses/admhouses.component';
import { AdmkvComponent } from './components/admin/admkv/admkv.component';
import { AdmloggingComponent } from './components/admin/admlogging/admlogging.component';
import { AdmruledataComponent } from './components/admin/admruledata/admruledata.component';
import { CreprojecteditComponent } from './components/creprojects/creprojectedit/creprojectedit.component';
import { DateselComponent } from './components/datesel/datesel.component';
import { AdmcategoryComponent } from './components/admin/admcategory/admcategory.component';
import { CretranallComponent } from './components/cretranall/cretranall.component';
import { CremessagesComponent } from './components/cremessages/cremessages.component';
import { TransrchComponent } from './components/transrch/transrch.component';
import { PnlReportComponent } from './components/reports/pnl-report/pnl-report.component';
import { Exp2projreportComponent } from './components/reports/exp2projreport/exp2projreport.component';
import { RentstatreportComponent } from './components/reports/rentstatreport/rentstatreport.component';
import { AdmmortgageComponent } from './components/admin/admmortgage/admmortgage.component';

@NgModule({
  declarations: [
    AppComponent,
    AdminComponent,
    AuthComponent,
    CreprojectsComponent,
    CrereconComponent,
    CretranComponent,
    DateselComponent,
    HeadersComponent,
    ReportsComponent,
    Adm1parmComponent,
    AdmhousesComponent,
    AdmkvComponent,
    AdmloggingComponent,
    AdmruledataComponent,
    CreprojecteditComponent,
    AdmcategoryComponent,
    CretranallComponent,
    CremessagesComponent,
    TransrchComponent,
    PnlReportComponent,
    Exp2projreportComponent,
    RentstatreportComponent,
    AdmmortgageComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    AppRoutingModule,
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

    // provideFunctions(() => getFunctions())
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
