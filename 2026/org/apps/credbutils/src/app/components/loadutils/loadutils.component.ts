import { KXref } from './../../models/kXref.model';
import { Reconciliation } from './../../models/reconciliation.model';
import { Project } from './../../models/project.model';
import { TranRec } from './../../models/tranRec.model';
import { FirebaseService } from '../../services/firebase.service';
import { FileSvcService } from './../../services/file-svc.service';
import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { Globals } from '../../models/globals.model';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'app-loadutils',
  templateUrl: './loadutils.component.html',
  styleUrls: ['./loadutils.component.css']
})
export class LoadutilsComponent  {

  dbCollections = ['Transactions', 'Projects', 'Globals', 'Reconciliations',
    'projIdXref', 'reconIdXref'] ;
  statusMsg = '' ;
  readSubscription: Subscription = new Subscription() ;
  completedActions = 0 ;
  codeVersion = '1.0.0.0' ;
  selectedCollection = '' ;
  projectIdXref: KXref[] = new Array<KXref>() ;
  reconIdXref: KXref[] = new Array<KXref>() ;
  cid = '' ;  dbPrefix = '' ;

  constructor(private fileSvc: FileSvcService, private fireSvc: FirebaseService ) { }

  jsonRead($event: any, account: string): void {
    console.log('selectedCollection: ', this.selectedCollection ) ;
    this.readSubscription = this.fileSvc.readJson($event).subscribe({
      next: (jsonStr) => {
        let tranData: TranRec[] ;    let projectData: Project[] ;
        let globalData: Globals[] ;  let reconData: Reconciliation[] ;
        switch (this.selectedCollection) {
          case 'Transactions':
            tranData = JSON.parse(jsonStr) ;
            console.log('Came in to Transactions and parsed: %d trans', tranData.length) ;
            for (let i = 0; i < tranData.length; i++) {
              tranData[i].Amount = Math.round(tranData[i].Amount * 100) / 100 ;
              if (tranData[i].Project !== '') {
                tranData[i].Project = this.getKey(tranData[i].Project, this.projectIdXref) ;
              }
              if (tranData[i].ReconKey !== '') {
                tranData[i].ReconKey = this.getKey(tranData[i].ReconKey, this.reconIdXref) ;
              }
              this.fireSvc.addTrans(this.cid, this.dbPrefix, tranData[i]).
                then(docRef => {
                  tranData[i].TranId = docRef?.id ;
                }).catch(error => {
                  console.warn('Error from add Tran: ', error) ;
                })
              if (i % 100 === 0) { console.dir(tranData[i]) ; }
            }
            break ;
          case 'Projects':
            projectData = JSON.parse(jsonStr) ;
            console.log('Came in to Projects and parsed: %d projects', projectData.length) ;
            for (let i = 0; i < projectData.length; i++) {
              const tmpStr: string = (projectData[i].ProjectId) ?
                projectData[i].ProjectId! : 'undefined' ;
              this.projectIdXref.push(new KXref(tmpStr, '')) ;
              this.fireSvc.addProjects(this.cid, this.dbPrefix, projectData[i]).
                then(docRef => {
                  projectData[i].ProjectId = docRef.id ;
                  this.projectIdXref[i].repl = docRef.id ;
                }).catch(error => {
                  console.warn('Erring adding project: ', projectData[i], 'Error: ', error)
                })
              if (i % 25 === 0) {
                console.dir(projectData[i]) ;
              }
            }
            console.dir(this.projectIdXref) ;
            break ;
          case 'Globals':
            console.log('Came in to Globals') ;
            globalData = JSON.parse(jsonStr) ;
            for (let i = 0; i < globalData.length; i++) {
              this.fireSvc.addGlobal(this.cid, this.dbPrefix, globalData[i]) ;
              if (i % 20 === 0) { console.dir(globalData[i]) ; }
            }
            break ;
          case 'Reconciliations':
            reconData = JSON.parse(jsonStr) ;
            console.log('Came in to Recons and parsed: %d recons', reconData.length ) ;
            for (let i = 0; i < reconData.length; i++) {
              const tmpStr = (reconData[i].ReconKey) ?
                reconData[i].ReconKey! : 'undefined' ;
              this.reconIdXref.push(new KXref(tmpStr, '')) ;
              reconData[i].TotalCredits = Math.round(reconData[i].TotalCredits * 100) / 100 ;
              reconData[i].TotalDebits = Math.round(reconData[i].TotalDebits * 100) / 100 ;
              reconData[i].BeginBal = Math.round(reconData[i].BeginBal * 100) / 100 ;
              reconData[i].EndBal = Math.round(reconData[i].EndBal * 100) / 100 ;
              reconData[i].DeltaAmt = Math.round(reconData[i].DeltaAmt * 100) / 100 ;
              this.fireSvc.addReconciliations(this.cid, this.dbPrefix, reconData[i]).
                then(docRef => {
                  reconData[i].ReconKey = docRef.id ;
                  this.reconIdXref[i].repl = docRef.id ;
                }).catch(error => {
                  console.warn('Error inserting recon, error: ', error) ;
                })
              if (i % 25 === 0) {
                console.dir(reconData[i]) ;
              }
            }
            console.dir(this.reconIdXref) ;
            break ;
          case 'projIdXref':
            this.projectIdXref = JSON.parse(jsonStr) ;
            console.dir(this.projectIdXref) ;
            break ;
          case 'reconIdXref':
            this.reconIdXref = JSON.parse(jsonStr) ;
            console.dir(this.reconIdXref) ;
            break ;
        }
      },
      error: (error) => { console.log('Error getting data from file: ', error) ; },
      complete: () => { this.completedActions++ ; }
    }) ;
              // After 7 seconds, release subscription
    setTimeout(() => {this.readSubscription.unsubscribe() ; }, 7000) ;
  }

  changeCollection(newCollection: string) {
    this.selectedCollection = newCollection ;
  }

  getKey(inSrch: string, xref: KXref[]): string {
    for (let i = 0; i < xref.length; i++) {
      if (inSrch === xref[i].srch) { return xref[i].repl ; }
    }
    return inSrch ;
  }
}
