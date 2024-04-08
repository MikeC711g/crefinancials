import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthComponent } from './components/auth/auth.component';
import { UseractionsComponent } from './components/useractions/useractions.component';
import { AuthGuard } from './services/authguard.service' ;
import { ReportsComponent } from './components/reports/reports.component';
import { LoadComponent } from './components/load/load.component';
import { RepairComponent } from './components/repair/repair.component';

const routes: Routes = [
  { path: '', redirectTo: 'auth', pathMatch: 'full'},
  { path: 'auth', component: AuthComponent },
  { path: 'useractions', component: UseractionsComponent, canActivate: [AuthGuard], children: [
    { path: 'adduser', component: UseractionsComponent },
    { path: 'removeuser', component: UseractionsComponent },
    { path: 'resetpw', component: UseractionsComponent },
    { path: 'handleuseractions', component: UseractionsComponent },
    { path: 'analyzecidbytrans', component: UseractionsComponent },
    { path: 'analyzeciddbbyusers', component: UseractionsComponent }
  ]},
  { path: 'dbmaint', component: LoadComponent, canActivate: [AuthGuard], children: [
    { path: 'removedb', component: LoadComponent },
    { path: 'clearglobals', component: LoadComponent },
    { path: 'cleartrans', component: LoadComponent },
    { path: 'clearprojects', component: LoadComponent },
    { path: 'clearrecons', component: LoadComponent },
    { path: 'rmvglobalbytype', component: LoadComponent },
    { path: 'addglobals', component: LoadComponent },
    { path: 'loadtranprojrecon', component: LoadComponent },
    { path: 'cloneglobals', component: LoadComponent },
    { path: 'listtrans', component: LoadComponent },
    { path: 'listglobals', component: LoadComponent }
  ] },
  { path: 'repairs', component: RepairComponent, canActivate: [AuthGuard], children: [
    { path: 'addname2rules', component: RepairComponent },
    { path: 'fixnameinglobals', component: RepairComponent }
  ] },
  { path: 'reports', component: ReportsComponent, canActivate: [AuthGuard] }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
