import { TestBed } from "@angular/core/testing";
import { AdmruledataComponent } from "./admruledata.component";
import { FormsModule } from "@angular/forms";

import { environment } from 'environment';
import { initializeApp,provideFirebaseApp,getApp } from '@angular/fire/app';
import { provideFirestore,getFirestore,initializeFirestore,
  connectFirestoreEmulator, Firestore } from '@angular/fire/firestore';
import { House } from "src/app/models/house.model";
import { RuleData } from "src/app/models/ruleData.model";

describe('AdmHousesComponent', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ AdmruledataComponent ],
      imports: [
        FormsModule,
        provideFirebaseApp(() => initializeApp(environment.firebase)),
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
      ]
    })
  })

  it('mounts', () => {
    const fixture = TestBed.createComponent(AdmruledataComponent) ;
    // const app = fixture.debugElement.componentInstance;
    const component = fixture.componentInstance ;
    component.statusMsg = 'Test message' ;
    fixture.detectChanges() ;
    const htmlEls: HTMLElement = fixture.nativeElement ;
    const p = htmlEls.querySelector('p') ;
    expect(p.textContent).equal('Test message') ;
  })

  it('ruleContent', () => {
    const fixture = TestBed.createComponent(AdmruledataComponent) ;
    const component = fixture.componentInstance ;
    component.tranRule = new RuleData('testSrch', ['TestAcct1', 'TestAcct2'], 35.77, 'TestDescrip',
      'TestTranType', 'TestTranExtra', 'CE', '111ThatHouse', 'TestAnnotation') ;
    fixture.detectChanges() ;
    const htmlEls: HTMLElement = fixture.nativeElement ;
    const md3s = htmlEls.getElementsByClassName('col-md-3')
    // const p = htmlEls.querySelectorAll('col-md-3') ;
    console.dir(md3s) ;
    console.dir(md3s[0])
    expect(md3s[0].textContent).includes('testSrch') ;
  })
})
