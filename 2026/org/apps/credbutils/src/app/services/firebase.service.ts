import { Reconciliation } from '../models/reconciliation.model';
import { Project } from '../models/project.model';
import { TranRec } from '../models/tranRec.model';
import { Injectable } from '@angular/core';
import { Firestore, collectionData, collection, query, where, CollectionReference,
  QueryConstraint, orderBy, addDoc, setDoc, doc, updateDoc,
  deleteDoc, getDoc, getDocs,
  QuerySnapshot,
  DocumentData} from '@angular/fire/firestore';
import { Globals } from '../models/globals.model';
import { Observable } from 'rxjs';
import { first, map } from 'rxjs/operators';
import { RuleData } from '../models/ruledata.model';
import { House } from '../models/house.model';
import { KeyVal } from '../models/keyval.model';
import { UserRec } from '../models/UserRec.model';
import { GenutilsService } from './genutils.service';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  isAdmin = false ;   isGlobalAdmin = false ;
  cid = 'NoCid' ;   dbPrefix = 'NoPrefix' ;  role = 'NoRole' ;
  isAuthenticated = false ;
  globalsNm = 'GlobalVars' ;  tranNm = 'Transactions' ;  userNm = 'Users';  custNm = 'newCustomer'
  projNm = 'Projects' ;  reconNm = 'Reconciliations' ;

  constructor(private firestore: Firestore, private utilSvc: GenutilsService) { }

  captureAuth(isAuth: boolean, role: string, cid: string, dbPrefix: string) {
    console.log('Into captureAuth isAuth: %s  role: %s dbPrefix: %s  cid: %s',
      isAuth, role, dbPrefix, cid) ;
    if (!isAuth) {  this.isAdmin = false ;   this.isGlobalAdmin = false ;
      this.cid = 'NoCid', this.dbPrefix = 'NoPrefix' ;  this.isAuthenticated = false ;
      this.role = 'NoRole' ;
    } else {
      this.isAuthenticated = isAuth ;
      this.isAdmin = (role === 'admin' || role === 'globalAdmin') ;
      this.isGlobalAdmin = (role === 'globalAdmin') ;
      this.cid = cid ;      this.dbPrefix = dbPrefix ;
      console.log('cid: %s  dbpre: %s', this.cid, this.dbPrefix)
      //  Commented these as in utils, prefix varies as needed
      // this.globalsNm = dbPrefix + this.globalsNm ;
      // this.tranNm = dbPrefix + this.tranNm ;
      // this.projNm = dbPrefix + this.projNm ;
      // this.reconNm = dbPrefix + this.reconNm ;
    }
  }

  getAllTrans(cid: string, dbPrefix: string): Observable<TranRec[]> {
    const tranQuery: QueryConstraint[] = [where('Cid', '==', cid)] ;

    return collectionData<TranRec>(query(
      collection(this.firestore, dbPrefix+this.tranNm) as CollectionReference<TranRec>,
      ...tranQuery), {idField: 'TranId'}).pipe(first())

  }

  getAllGlobals(cid: string, dbPrefix: string): Observable<Globals[]> {
    const globQuery: QueryConstraint[] = [where('Cid', '==', cid)] ;
    return collectionData<Globals>(query(
      collection(this.firestore, this.globalsNm) as CollectionReference<Globals>,
      ...globQuery), {idField: 'GlobalId'}).pipe(first())
  }

  getGlobalType(cid: string, dbPrefix: string, rKey: string): Observable<Globals[]> {
    if (rKey === 'All')  return this.getAllGlobals(cid, dbPrefix) ;
    const globQuery: QueryConstraint[] = [where('Cid', '==', cid),
      where('RKey', '==', rKey)] ;
    return collectionData<Globals>(query(
      collection(this.firestore, this.globalsNm) as CollectionReference<Globals>,
      ...globQuery), {idField: 'GlobalId'}).pipe(first())
  }

  getAllProjects(cid: string, dbPrefix: string): Observable<Project[]> {
    const projQuery: QueryConstraint[] = [where('Cid', '==', cid)] ;
    return collectionData<Project>(query(
      collection(this.firestore, this.projNm) as CollectionReference<Project>,
      ...projQuery), {idField: 'ProjectId'}).pipe(first())
  }

  getAllReconciliations(cid: string, dbPrefix: string): Observable<Reconciliation[]> {
    const reconQuery: QueryConstraint[] = [where('Cid', '==', cid)] ;
    return collectionData<Reconciliation>(query(
      collection(this.firestore, this.reconNm) as CollectionReference<Reconciliation>,
      ...reconQuery), {idField: 'ReconKey'}).pipe(first())
  }

  getTransForDateRange(cid: string, dbPrefix: string, minDate: string, maxDate: string,
    accounts: string[]): Observable<TranRec[]> {
    const tranQuery: QueryConstraint[] = [where('TranDate', '>=' ,minDate),
      where('TranDate', '<=', maxDate), where('Cid', '==', cid)]
    if (accounts.length > 0) tranQuery.push(where('Account', 'in', accounts)) ;
    return collectionData<TranRec>(query(
      collection(this.firestore, dbPrefix+this.tranNm) as CollectionReference<TranRec>,
      ...tranQuery), {idField: 'TranId'}).pipe(first())
  }

  getProjectsForDateRange(cid: string, dbPrefix: string, minDate: string, maxDate: string):
    Observable<Project[]> {
    const projQuery: QueryConstraint[] = [where('Cid', '==', cid),
      (where('EndDt', '>=', minDate))] ;
    return collectionData<Project>(query(
      collection(this.firestore, this.projNm) as CollectionReference<Project>,
      ...projQuery), {idField: 'ProjectId'}).pipe(map(results => results.filter((proj) => {
        return proj['StartDt'] <= maxDate ; })),first()) ;
  }

  getReconciliationsForDateRange(cid: string, dbPrefix: string, minDate: string,
    maxDate: string, accounts: string[]): Observable<Reconciliation[]> {
    const reconQuery: QueryConstraint[] = [where('EndDt', '>=', minDate),
      where('Cid', '==', cid), orderBy('EndDt', 'desc')] ;
    if (accounts.length > 0) reconQuery.push(where('Account', 'in', accounts)) ;
    return collectionData<Reconciliation>(query(
      collection(this.firestore, this.reconNm) as CollectionReference<Reconciliation>,
      ...reconQuery), {idField: 'ReconKey'}).pipe(first())
  }

  getUserQuery(uid: string, eMail: string): Observable<UserRec[]> {
    const userQuery: QueryConstraint[] = (uid) ? [where('id', '==', uid)] :
      [where('eMail', '==', eMail)] ;
    console.log('getUser queryContraints: %O', userQuery)
    return collectionData<UserRec>(query(
      collection(this.firestore, this.userNm) as CollectionReference<UserRec>,
      ...userQuery), {idField: 'uuid'}).pipe(first())
  }

  addGlobal(cid: string, dbPrefix: string, globalRow: Globals): Promise<any> {
    delete globalRow.GlobalId ;
    if (cid && cid !== '') { globalRow.Cid = cid ; }
    if (!dbPrefix || dbPrefix === '') { dbPrefix = this.dbPrefix ; }
    if (globalRow.GlobalId) { delete globalRow.GlobalId }
    return addDoc(collection(this.firestore, this.globalsNm), {...globalRow })
  }

  addGlobalMultFld(cid: string, dbPrefix: string, rKey: string, rVal: any) : Promise<any> {
    const globalTypes = this.utilSvc.globalTypes ;
    let cRule: RuleData ;  let cHouse: House ;  let cCategory: KeyVal ;
    switch(rKey) {
      case globalTypes.RuleData:
        cRule = rVal ;
        if (cRule.Annotation === undefined) { delete cRule.Annotation ; }
        if (cRule.Category === undefined) { delete cRule.Category ; }
        if (cRule.House === undefined) { delete cRule.House ; }
        if (cRule.TaxCat === undefined) { delete cRule.TaxCat ; }
        if (cRule.TranExtra === undefined) { delete cRule.TranExtra ; }
        if (cRule.TranType === undefined) { delete cRule.TranType ; }
        return addDoc(collection(this.firestore, this.globalsNm),
          {RKey: rKey, RVal: { ...cRule }, Cid: cid }) ; break ;
      case globalTypes.Houses:
        cHouse = rVal ;
        return addDoc(collection(this.firestore, this.globalsNm),
          {RKey: rKey, RVal: { ...cHouse }, Cid: cid }) ; break ;
      case globalTypes.CategoryTaxcats:
      case globalTypes.CategoryFolders:
      case globalTypes.Accounts:
      case globalTypes.TaxCats:
        cCategory = rVal ;
        return addDoc(collection(this.firestore, this.globalsNm),
          {RKey: rKey, RVal: { ...cCategory }, Cid: cid }) ; break ;
      default:    // Presumably one of the 1 field globals
        return addDoc(collection(this.firestore, this.globalsNm),
          {RKey: rKey, RVal: rVal, Cid: cid }) ;
    }
  }

  addTrans(cid: string, dbPrefix: string, tranRec: TranRec): Promise<any> {
    delete tranRec.TranId ;
    if (cid && cid !== '') { tranRec.Cid = cid ; }
    if (!dbPrefix || dbPrefix === '') { dbPrefix = this.dbPrefix ; }
    delete tranRec.TranId ;   // Not needed in firestore collection
    return addDoc(collection(this.firestore, dbPrefix+this.tranNm), {...tranRec}) ;
  }

  addProjects(cid: string, dbPrefix: string, project: Project): Promise<any> {
    delete project.ProjectId ;    // Rmv old value from collection
    if (cid && cid !== '') { project.Cid = cid ; }
    if (!dbPrefix || dbPrefix === '') { dbPrefix = this.dbPrefix ; }
    return addDoc(collection(this.firestore, this.projNm), {...project}) ;
  }

  addUsers(cid: string, dbPrefix: string, userRec: UserRec): Promise<any> {
    const uuid = userRec.uuid! ;   // Save off to become ID of row in table
    delete userRec.uuid
    if (cid) userRec.cid = cid    // Overrides just in case
    if (dbPrefix) userRec.dbPrefix = dbPrefix
    return setDoc(doc(this.firestore, this.userNm, uuid), {...userRec})
  }

  updtTranFld(dbPrefix: string, tranId: string, updtObj: object): Promise<any> {
    const dbTran = doc(this.firestore, dbPrefix+this.tranNm, tranId!)
    return updateDoc(dbTran, { ...updtObj }) ;
  }

  updtGlobFld(dbPrefix: string, globId: string, updtObj: object): Promise<any> {
    console.log('UpdtGlobFld: globid: ', globId, ' Updt: ', updtObj) ;
    const dbGlob = doc(this.firestore, this.globalsNm, globId!)
    return updateDoc(dbGlob, { ...updtObj }) ;
  }

  updtReconFld(dbPrefix: string, reconKey: string, updtObj: object): Promise<any> {
    const dbRecon = doc(this.firestore, this.reconNm, reconKey!)
    return updateDoc(dbRecon, { ...updtObj }) ;
  }

  updtProjFld(dbPrefix: string, projId: string, updtObj: object): Promise<any> {
    const dbProj = doc(this.firestore, this.projNm, projId!)
    return updateDoc(dbProj, { ...updtObj }) ;
  }

  addReconciliations(cid: string, dbPrefix: string, reconciliation: Reconciliation): Promise<any> {
    delete reconciliation.ReconKey ;
    if (cid && cid !== '') { reconciliation.Cid = cid ; }
    if (!dbPrefix || dbPrefix === '') { dbPrefix = this.dbPrefix ; }
    return addDoc(collection(this.firestore, this.reconNm), {...reconciliation}) ;
  }

  delProjects(cid: string, dbPrefix: string, project: Project): Promise<any> {
    const dbProj = doc(this.firestore, this.projNm, project.ProjectId!)
    return deleteDoc( dbProj ) ;
  }

  delRecons(cid: string, dbPrefix: string, reconciliation: Reconciliation): Promise<any> {
    const dbRecon = doc(this.firestore, this.reconNm, reconciliation.ReconKey!)
    return deleteDoc( dbRecon ) ;
  }

  delTrans(cid: string, dbPrefix: string, tranRec: TranRec): Promise<any> {
    const dbTrans = doc(this.firestore, dbPrefix+this.tranNm, tranRec.TranId!)
    return deleteDoc( dbTrans ) ;
  }

  delGlobals(cid: string, dbPrefix: string, global: Globals): Promise<any> {
    const dbGlob = doc(this.firestore, this.globalsNm, global.GlobalId!)
    return deleteDoc( dbGlob ) ;
  }

  getUser(uid: string): Promise<any> {
    const dbUser = doc(this.firestore, this.userNm, uid)
    return getDoc( dbUser )
  }

  delUser(uid: string): Promise<any> {
    const dbUser = doc(this.firestore, this.userNm, uid)
    return deleteDoc( dbUser ) ;
  }

  altCustActions(): Promise<QuerySnapshot<DocumentData>> {
    return getDocs(collection(this.firestore, 'newCustomer'))
  }

  loadAllGlobals():Promise<QuerySnapshot<DocumentData>> {
    return getDocs(collection(this.firestore, 'GlobalVars'))
  }

  loadAllTrans(dbPref: string): Promise<QuerySnapshot<DocumentData>> {
    return getDocs(collection(this.firestore, dbPref+'Transactions'))
  }

  loadAllUsers(): Promise<QuerySnapshot<DocumentData>> {
    return getDocs(collection(this.firestore, 'Users'))
  }

  delCustActions(uid: string): Promise<any> {
    const dbUser = doc(this.firestore, this.custNm, uid)
    return deleteDoc( dbUser ) ;
  }
}
