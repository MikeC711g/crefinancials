import { CrereconComponent } from './components/crerecon/crerecon.component';
import { CreprojectsComponent } from './components/creprojects/creprojects.component';
import { CretranComponent } from './components/cretran/cretran.component';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: 'trans', pathMatch: 'full'},
  { path: 'trans', component: CretranComponent },
  { path: 'projects', component: CreprojectsComponent },
  { path: 'reconcile', component: CrereconComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
