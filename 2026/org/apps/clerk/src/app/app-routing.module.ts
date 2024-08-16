import { AuthComponent } from './components/auth/auth.component';
import { AdminComponent } from './components/admin/admin.component';
import { CrereconComponent } from './components/crerecon/crerecon.component';
import { CreprojectsComponent } from './components/creprojects/creprojects.component';
import { CretranComponent } from './components/cretran/cretran.component';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ReportsComponent } from './components/reports/reports.component';
import { canActivate, canDeactivate } from './services/activationguard.service';

const routes: Routes = [
  { path: '', redirectTo: 'auth', pathMatch: 'full'},
  { path: 'trans', component: CretranComponent, canActivate: [canActivate],
    canDeactivate: [canDeactivate], children: [
      { path: 'loadfile', component: CretranComponent },
      { path: 'createtran', component: CretranComponent },
      { path: 'search', component: CretranComponent },
    ]},
  { path: 'auth', component: AuthComponent },
  { path: 'projects', component: CreprojectsComponent, canActivate: [canActivate],
    canDeactivate: [canDeactivate] },
  { path: 'reconcile', component: CrereconComponent, canActivate: [canActivate],
    canDeactivate: [canDeactivate] },
  { path: 'reports', component: ReportsComponent, canActivate: [canActivate], children: [
    { path: 'profitnloss', component: ReportsComponent },
    { path: 'expbyproj', component: ReportsComponent },
    { path: 'rentstat', component: ReportsComponent },
    { path: 'dumpglobals', component: ReportsComponent },
    { path: 'dumpprojects', component: ReportsComponent },
    { path: 'dumprecons', component: ReportsComponent },
    { path: 'dumptrans', component: ReportsComponent },
  ] },
  { path: 'admin', component: AdminComponent, canActivate: [canActivate],
    canDeactivate: [canDeactivate], children: [
      { path: 'houses', component: AdminComponent },
      { path: 'accounts', component: AdminComponent },
      { path: 'taxCats', component: AdminComponent },
      { path: 'categoryTaxcat', component: AdminComponent },
      { path: 'ruleData', component: AdminComponent },
      { path: 'logging', component: AdminComponent }
    ] },
    { path: 'profile', component: AuthComponent, canActivate: [canActivate],
      canDeactivate: [canDeactivate], children: [
        { path: 'chgpw', component: AuthComponent }
      ] }
  ];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
