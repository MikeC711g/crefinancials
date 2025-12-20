import { Route } from '@angular/router';
import { AuthComponent } from './components/auth/auth.component';
import { UseractionsComponent } from './components/useractions/useractions.component';

import { canActivate, canDeactivate } from './services/activationguard.service';
import { LoadComponent } from './components/load/load.component';
import { RepairComponent } from './components/repair/repair.component';
import { ReportsComponent } from './components/reports/reports.component';

export const appRoutes: Route[] = [
    { path: '', redirectTo: 'auth', pathMatch: 'full'},
    { path: 'auth', component: AuthComponent },
    { path: 'useractions', component: UseractionsComponent, canActivate: [canActivate], children: [
      { path: 'adduser', component: UseractionsComponent },
      { path: 'removeuser', component: UseractionsComponent },
      { path: 'resetpw', component: UseractionsComponent },
      { path: 'handleuseractions', component: UseractionsComponent },
      { path: 'analyzecidbytrans', component: UseractionsComponent },
      { path: 'analyzeciddbbyusers', component: UseractionsComponent }
    ]},
    { path: 'dbmaint', component: LoadComponent, canActivate: [canActivate], children: [
      { path: 'removedb', component: LoadComponent },
      { path: 'splitglobals', component: LoadComponent },
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
    { path: 'repairs', component: RepairComponent, canActivate: [canActivate], children: [
      { path: 'addname2rules', component: RepairComponent },
      { path: 'fixnameinglobals', component: RepairComponent },
      { path: 'modcategories', component: RepairComponent }
    ] },
    { path: 'reports', component: ReportsComponent, canActivate: [canActivate] }
  ];
