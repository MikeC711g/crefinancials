import { UnloadutilsComponent } from './components/unloadutils/unloadutils.component';
import { LoadutilsComponent } from './components/loadutils/loadutils.component';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthComponent } from './components/auth/auth.component';
import { ClonedbComponent } from './components/clonedb/clonedb.component';
import { AuthGuard } from './services/authguard.service' ;
import { ReportsComponent } from './components/reports/reports.component';

const routes: Routes = [
  { path: '', redirectTo: 'auth', pathMatch: 'full'},
  { path: 'auth', component: AuthComponent },
  { path: 'clonedb', component: ClonedbComponent, canActivate: [AuthGuard] },
  { path: 'reports', component: ReportsComponent, canActivate: [AuthGuard] },
  { path: 'loadutils', component: LoadutilsComponent, canActivate: [AuthGuard] },
  { path: 'unloadutils', component: UnloadutilsComponent, canActivate: [AuthGuard] }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
