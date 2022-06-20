import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { LoggerModule, NgxLoggerLevel } from 'ngx-logger';
import { environment } from 'src/environments/environment';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule, Routes} from '@angular/router';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CretranComponent } from './components/cretran/cretran.component';
import { CretraneditComponent } from './components/cretranedit/cretranedit.component';
import { CreprojectsComponent } from './components/creprojects/creprojects.component';
import { CrereconComponent } from './components/crerecon/crerecon.component';
import { HeadersComponent } from './components/headers/headers.component';
import { CreprojecteditComponent } from './components/creprojects/creprojectedit/creprojectedit.component';

@NgModule({
  declarations: [
    AppComponent,
    CretranComponent,
    CretraneditComponent,
    CreprojectsComponent,
    CrereconComponent,
    HeadersComponent,
    CreprojecteditComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule,
    RouterModule,
    LoggerModule.forRoot({ level: environment.logLevel, disableConsoleLogging: false })
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
