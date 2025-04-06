import { TranRec } from './../models/TranRec.model';
import { Reconciliations } from './../models/reconciliations.model';
import { Project } from './../models/project.model';
import { TranQ } from './../models/TranQ.model';
import { BehaviorSubject, Observable, Subject, Subscription } from 'rxjs';
import { first, map } from 'rxjs/operators';
import { Injectable } from '@angular/core';
import { Firestore, collectionData, collection, query, where, CollectionReference,
  QueryConstraint, limit, orderBy, addDoc, doc, updateDoc, deleteDoc, runTransaction,
  DocumentReference} from '@angular/fire/firestore';
import { Globals } from '../models/globals.model'
import { RuleData } from '../models/ruledata.model';
import { House } from '../models/house.model';
import { GenutilsService } from './genutils.service';
import { KeyVal } from '../models/keyval.model';
import { Mortgage } from '../models/mortgages.model';

@Injectable({
  providedIn: 'root'
})
/**
 * Interface to all Firebase data
 */
export class FirebaseService {

  tranRecs: TranRec[] = new Array<TranRec>() ;    // Array of transaction documents
    // Map with parent TranIds and the child trans associated with each
  childMap: Map<string, TranRec[]> = new Map<string, TranRec[]>() ;
    // Global info and some loading indicators
  fbGlobals: Globals[] = new Array<Globals>() ;  globalsLoaded = false ;
  globalLoadTime = 0 ;  globalsLoading = false ;  need2LoadGlobals = false ;
    // Array of projects and some load indicators
  projects: Project[] = new Array<Project>() ;  projectsLoaded = false ;
    projectsStarted = false ;  projectLoadTime = 0 ;  projectLoadDays = 0 ;
    projsDt = '' ; projeDt = '' ;
    // Arrays of items from globals
  houses: House[] = new Array<House>() ;  houseLoadTime: number ;
  tranRules: RuleData[] = new Array<RuleData>() ;  ruleLoadTime: number ;
  mortgages: Mortgage[] = new Array<Mortgage>() ;  mortgageLoadTime: number ;
  accounts: KeyVal[] = new Array<KeyVal>() ;
  authMillis = 0 ;
  accountTypes: string[] = new Array<string>() ;
  tranTypes: string[] = new Array<string>() ;
  categoryTaxcat: KeyVal[] = new Array<KeyVal>() ;
  categoryFolders: KeyVal[] = new Array<KeyVal>() ;
  taxCats: KeyVal[] = new Array<KeyVal>() ;  taxCatTime = 0 ;
  tranQ$ = Observable<TranRec[]> ;    // Observable for returning array of trans
  isAdmin = false ;   isGlobalAdmin = false ;   // Current user role and auth info
  cid = 'test1' ;   dbPrefix = '' ;  role = 'Admin' ;    // DB ref info
  isAuthenticated = false ; newCustNm = ''
  globalsNm = '' ;  tranNm = '' ;  projNm = '' ;  reconNm = '' ;  // Used for full table nm
  tranRuleNm = 'TranRules' ; houseNm = 'Houses' ;  mortgageNm = 'Mortgages' ;
  tran$ = new BehaviorSubject<TranRec []>(this.tranRecs) ;
  project$ = new BehaviorSubject<Project []>(this.projects) ;
  projLoc$ = new Subscription() ;   global$ = new Observable<Globals[]> ;
  CLASSNAME = 'firebaseService' ;

  /**
   * Constructor for this service class
   * @param {AngularFirestore} firestore Reference to Angular
   * @param utilSvc Reference to service for generic utility type functions
   */
  // constructor(private firestore: AngularFirestore, private utilSvc: GenutilsService) { }
  constructor(private firestore: Firestore, private utilSvc: GenutilsService) {
    this.houseLoadTime = new Date().getTime() - 86400000;  // Set to 1 day ago (timed out)
    this.ruleLoadTime = new Date().getTime() - 86400000; 
    this.mortgageLoadTime = new Date().getTime() - 86400000;
    this.projLoc$ = this.project$.subscribe(proj => {
      const preLen = this.projects.length ;
      this.projects = proj ;
      this.projectsLoaded = true ;  this.projectsStarted = false ;
      this.projectLoadTime = new Date().getTime() ;
      this.utilSvc.loadProjects(this.projects) ;
      this.utilSvc.cDebug(this.CLASSNAME, 'Got new proj from subscript. old: %d  new: %d', preLen, this.projects.length)
    })

  }
    // Maintained here, actions controlled elsewhere. get method so header can handle it
  updtTimeStmp() { this.authMillis = new Date().getTime() ; }
  getTimeStmp() {  return  this.authMillis ; }

  /**
   * function captureAuth for capturing auth info for this person
   * @param {boolean} isAuth to identify whether or not auth has been run
   * @param {string} role of role this person is assigned
   * @param {string} cid company ID associated with this user
   * @param {string} dbPrefix Prefix to DB (different customers can be in diff collections)
   */
  captureAuth(isAuth: boolean, role: string, cid: string, dbPrefix: string) {
    this.utilSvc.cDebug(this.CLASSNAME, 'Into captureAuth isAuth: %s  role: %s dbPrefix: %s  cid: %s',
      isAuth, role, dbPrefix, cid) ;
    if (!isAuth) {  this.isAdmin = false ;   this.isGlobalAdmin = false ;
      this.cid = 'NoCid', this.dbPrefix = 'NoPrefix' ;  this.isAuthenticated = false ;
      this.role = 'NoRole' ;    // If called and not authorized, show no ability to do work
      this.authMillis = 0 ;     // Not signed in, so no need to timeout
    } else {
      this.updtTimeStmp() ;
      this.isAuthenticated = isAuth ;
      this.isAdmin = (role === this.utilSvc.roleNames.Admin ||
        role === this.utilSvc.roleNames.GlobalAdmin ) ;
      this.isGlobalAdmin = (role === this.utilSvc.roleNames.GlobalAdmin) ;
      this.cid = cid ;      this.dbPrefix = dbPrefix ;
      this.utilSvc.cDebug(this.CLASSNAME, 'cid: %s  dbpre: %s', this.cid, this.dbPrefix)
      this.globalsNm = this.utilSvc.tblNames.Globals ;
      this.tranNm = dbPrefix + this.utilSvc.tblNames.Transactions ;
      this.projNm = this.utilSvc.tblNames.Projects ;
      this.reconNm = this.utilSvc.tblNames.Reconciliations ;
      this.newCustNm = this.utilSvc.tblNames.NewCustomer ;
    }
  }

  /**
   * function setDBMeta for globalAdmin to switch key user info.  By running this, switches
   * company and collection currently in use
   * @param {string} cid Company ID
   * @param {string} dbPrefix DB Prefix
   */
  setDbMeta(cid: string, dbPrefix: string) {
    if (!this.isGlobalAdmin) { return ; }
    this.cid = cid ;    this.dbPrefix = dbPrefix ;
    this.globalsNm = this.utilSvc.tblNames.Globals ;
    this.tranNm = dbPrefix + this.utilSvc.tblNames.Transactions ;
    this.projNm = this.utilSvc.tblNames.Projects ;
    this.reconNm = this.utilSvc.tblNames.Reconciliations ;
  }

  getCid(): string {
    return this.cid ;
  }

  /**
   * function isUserGlobalAdmin to retrieve Global admin status
   * @returns {boolean} on whether person is global admin
   */
  isUserGlobalAdmin(): boolean {
    return this.isGlobalAdmin ;
  }

  /**
   * function getGlobals kicks off retrieve of globals from FB if needed.  A bit of chicanery
   * to avoid extra loads
   * @param {boolean} isForce Retrieve from DB if true.  Otherwise see if data
   * already is here and is fresh enough.  Retrieve is either is false
   * @returns {boolean} or {Subject}. Boolean if data is good (ie: we already have it, you
   * can request component parts), Subject if we have to call FB
   */
  getGlobals(isForce: boolean): Observable<Globals[]> | Globals [] { 
    const curMillis = new Date().getTime() ;  
    this.utilSvc.cDebug(this.CLASSNAME, 'getGlobals loading: %s  force: %s  loaded: %s  Tm: %d',
      this.globalsLoading, isForce, this.globalsLoaded, this.globalLoadTime) ;
    if (!isForce && this.globalsLoaded && this.globalLoadTime + 600000 > curMillis)
      return this.fbGlobals ;  // If data is good, return it
    if (this.globalsLoading) { return this.global$ ; }  // If already loading, return subject
    this.updtTimeStmp() ;
    // Determine if we need to call FB for fresh globals
    this.utilSvc.cDebug(this.CLASSNAME, 'Getting fresh globals loaded: %s Tm: %d  Millis: %d',
      this.globalsLoaded, this.globalLoadTime, curMillis) ;
    this.globalsLoading = true ;
    this.global$ = collectionData<Globals>(query(
      collection(this.firestore, this.globalsNm) as CollectionReference<Globals>,
      where('Cid', '==', this.cid)), {idField: 'GlobalId'}).pipe(first())
    return this.global$
  }

  getHouseDB(): Observable<House[]> | House[] {
    if (this.houseLoadTime + 600000 > new Date().getTime()) return this.houses ;
    this.updtTimeStmp();
    const house$ = collectionData<House>(query(
      collection(this.firestore, 'Houses') as CollectionReference<House>,
      where('Cid', '==', this.cid)), {idField: 'HouseId'}).pipe(first()) ;
    this.houseLoadTime = new Date().getTime() ;
    return house$
  }

  setHouses(houses: House[]) {
    this.houses = houses.sort((a, b) => a.name.localeCompare(b.name)) ;
  }

  getTranRuleDB(): Observable<RuleData[]> | RuleData[] {
    if (this.ruleLoadTime + 600000 > new Date().getTime()) return this.tranRules ;
    console.log('fb gtrdb Out to do firebase')
    this.updtTimeStmp() ;
    const tranRule$ = collectionData<RuleData>(query(
      collection(this.firestore, this.tranRuleNm) as CollectionReference<RuleData>,
      where('Cid', '==', this.cid)), {idField: 'RuleId'}).pipe(first())
    this.ruleLoadTime = new Date().getTime() ;
    return tranRule$
  }

  getMortgageDB(): Observable<Mortgage[]> | Mortgage[] {
    if (this.mortgageLoadTime + 600000 > new Date().getTime()) return this.mortgages ;
    this.updtTimeStmp();
    const mortgage$ = collectionData<Mortgage>(query(
      collection(this.firestore, 'Mortgages') as CollectionReference<Mortgage>,
      where('Cid', '==', this.cid)), {idField: 'mortgageId'}).pipe(first()) ;
    this.mortgageLoadTime = new Date().getTime() ;
    return mortgage$
  }
  /**
   * retrieveGlobals function brings back full array (not separated by types)
   * @returns full global array
   */
  setGlobals(fbGlobals: Globals[]) {
    this.fbGlobals = fbGlobals ;
    this.processGVals() ;
    this.globalsLoaded = true ;  this.globalsLoading = false ;
    this.globalLoadTime = new Date().getTime() ;
  }

  /**
   * retrieveGlobals function brings back full array (not separated by types)
   * @returns full global array
   */
  retrieveGlobals() {
    return this.fbGlobals ;
  }

  /**
   * Query transactions allowing most possibilities. Many resolved thru filter
   * @param {TranQ} tranQ Query structure allowing for query on most fields in tran docs
   * @param {string[]} accounts array of accounts for which to pull transaction documents
   * @returns Observable of Tran Documents
   */
  getTransFromDB(tranQ: TranQ, fixSplits: boolean):  Observable<TranRec[]> {
    this.updtTimeStmp() ;
    const doTrc = this.utilSvc.isLoggable(this.CLASSNAME, this.utilSvc.msgLvls.Log)
    const tranQuery: QueryConstraint[] = this.bldQuery(tranQ)
            // set up advanced query info
    const advQuery = this.isAdvancedQuery(tranQ)
    if (doTrc)  this.utilSvc.cLog(this.CLASSNAME, 'getTransFromDB tranQ: %O  Cid: %s  adv: %s',
      tranQ, this.cid, advQuery)    // trace guard to avoid costs of pulling trace data
    if (!advQuery)
      return collectionData<TranRec>(query(
        collection(this.firestore, this.tranNm) as CollectionReference<TranRec>,
        ...tranQuery), {idField: 'TranId'}).pipe(first()) ;
    else {
      const tranSub$: Subject<TranRec[]> = new Subject() ;
      const tran$ =  collectionData<TranRec>(query(
        collection(this.firestore, this.tranNm) as CollectionReference<TranRec>,
        ...tranQuery), {idField: 'TranId'}).pipe(first()).subscribe({
          next: (dbTranRecs) => {
            const tranRecs: TranRec[] = dbTranRecs
            const filtRecs = this.primaryFilter(tranRecs, tranQ)
            if (fixSplits) this.fixSplits(tranRecs, filtRecs, doTrc) ;  // Fix split trans?
            tranSub$.next(filtRecs)
          }
        })
      setTimeout(() => { tran$.unsubscribe() ; }, 60000);   // Set a timeout and clean up resources
      this.utilSvc.cLog(this.CLASSNAME, 'Sending back subject from adv srch')
      return tranSub$ ;
    }
  }

  isAdvancedQuery(tranQ: TranQ): boolean {
    // let truthLn = -1 ;
    if (tranQ.AnnotationRegEx || (tranQ.Category && tranQ.Category.length > 0)) return true ;
    if ((tranQ.House && tranQ.House.length > 0) || tranQ.MaxAmount || tranQ.MinAmount) return true ;
    if (tranQ.Project || (tranQ.TaxCat && tranQ.TaxCat.length > 0)) return true
    if (tranQ.TranType && tranQ.TranType.length > 0) return true ;
      return false
  }

  bldQuery(tranQ: TranQ): QueryConstraint[] {    // Build tran query
    const tranQuery: QueryConstraint[] = (tranQ.MinDate === tranQ.MaxDate) ?
      [where('TranDate', '==', tranQ.MinDate)] :
      [where('TranDate', '>=', tranQ.MinDate), where('TranDate', '<=', tranQ.MaxDate)]
    tranQuery.push(where('Cid', '==', this.cid)) ;
    if (tranQ.AccountArr!.length > 0) tranQuery.push(where('Account', 'in', tranQ.AccountArr))
    return tranQuery
  }

  primaryFilter(tranRecs: TranRec[], tranQ: TranQ): TranRec[] {
    let annoCk: RegExp ;
    if (tranQ.AnnotationRegEx) {    // If they sent a regexp (now we smart-case it)
      annoCk = (tranQ.AnnotationRegEx === tranQ.AnnotationRegEx.toLowerCase()) ?
        new RegExp(tranQ.AnnotationRegEx, 'i') : new RegExp(tranQ.AnnotationRegEx)
    }   // If all lower case, then ignore case, otherwise respect case (smart-case)
    return tranRecs.filter((tr) => {
      if (tranQ.Category && tranQ.Category.length > 0 &&
        !tranQ.Category.includes(tr.Category)) return false ;
      if (tranQ.TranType && tranQ.TranType.length > 0 &&
        !tranQ.TranType.includes(tr.TranType)) return false ;
      if (tranQ.TaxCat && tranQ.TaxCat.length > 0 &&
        !tranQ.TaxCat.includes(tr.TaxCat))  return false ;
      if (tranQ.House && tranQ.House.length > 0 &&
        !tranQ.House.includes(tr.House))  return false ;
      if (tranQ.Project && tranQ.Project !== tr.Project)  return false ;
      if ((tranQ.MinAmount !== 0 || tranQ.MaxAmount !== 0) &&
        (tr.Amount < tranQ.MinAmount! || tr.Amount > tranQ.MaxAmount!)) return false ;
      if (tranQ.AnnotationRegEx && !annoCk.test(tr.TranExtra + tr.Annotation)) return false
      return true ;
    })
  }

  /**
   * Take full and filtered list, and add to filtered list any parts of split trans
   * (parent or children) NOT in filtered trans. Don't want to split split trans ;)
   * @param allRecs Full list of trans before added filtering
   * @param filtRecs Records after added filtering
   */
  fixSplits(allRecs: TranRec[], filtRecs: TranRec[], doTrc: boolean) {
        // Note most recs are likely not child or parent, this grabs those that are
    const allChildren = allRecs.filter(ar => ar.SplitParent)
    const filtChildren = filtRecs.filter(fr => fr.SplitParent)
    const filtParent = filtRecs.filter(fr => fr.TranType === 'TPARENT')
    if (doTrc) this.utilSvc.cLog(this.CLASSNAME, 'fixSplits all %O  filt: %O  allChild: %O  filtChild %O  filtPar: %O',
      allRecs, filtRecs, allChildren, filtChildren, filtParent)
    for (const tr of filtChildren) {    // For each child, make sure parent loaded
      if (!filtRecs.find(fr => fr.TranId === tr.SplitParent)) {  // If did not find parent
        const parentRow = allRecs.find(allr => allr.TranId === tr.SplitParent)
        if (doTrc) this.utilSvc.cLog(this.CLASSNAME, 'add parent: %O due to child: %O', parentRow, tr)
        if (parentRow)  filtRecs.push(parentRow) // Add parent to filtered list
        else this.utilSvc.cWarn(this.CLASSNAME, 'No parentRow fnd for child: %O', tr)
      }   // else parent is in so no action needed
    }
    for (const tr of filtParent) {      // for each parent, make sure children loaded
      const allKids = allChildren.filter(ac => ac.SplitParent === tr.TranId)
      const filtKids = filtChildren.filter(fc => fc.SplitParent === tr.TranId)
      if (filtKids.length < allKids.length) {   // some children not in filtered array
        for (const ak of allKids) {   // For each child here, see if it is also in filtered
          if (!filtKids.find(fk => fk.TranId === ak.TranId)) {
            filtRecs.push(ak)   // If child not in filtered list, add it there
            if (doTrc) this.utilSvc.cLog(this.CLASSNAME, 'Add child: %O for parent: %O', ak, tr)
          }
        }
      }   // else they are all in filtered array
    }
  }

  checkFitidArray(fitIds: string[]): Observable<TranRec[]> {
    const fitQuery: QueryConstraint[] = [where('FitID', 'in', fitIds),
    where('Cid', '==', this.cid)] ;
   return collectionData<TranRec>(query(
     collection(this.firestore, this.tranNm) as CollectionReference<TranRec>,
     ...fitQuery), {idField: 'TranId'}).pipe(first())
  }

  // May need to break up at some point in caller  if > 25 shared trans already entered
  //  and trans from ofx/qfx reloaded
  getChildrenByParentId(parentIds: string[]): Observable<TranRec[]> {
    const parentQuery: QueryConstraint[] = [where('SplitParent', 'in', parentIds),
      where('Cid', '==', this.cid)] ;
    return collectionData<TranRec>(query(
      collection(this.firestore, this.tranNm) as CollectionReference<TranRec>,
      ...parentQuery), {idField: 'TranId'}).pipe(first())
  }

  /**
   * Query to find a matching FITID. FITID is a unique identifier from bank (or gen'd)
   * for the tran. Make sure this tran has not already been added
   * @param {string} fitId fitId of current tran. Srch DB to see if is unique
   * @returns {Observable} of Tran Documents that may match (usually 0, but we're async)
   */
  getMatchingFitId(fitId: string): Observable<TranRec[]> {
    this.utilSvc.cDebug(this.CLASSNAME, 'Got to getMatchingFitId') ;
    const tranQuery: QueryConstraint[] = [where('FitID', '==', fitId),
      where('Cid', '==', this.cid), limit(2)] ;
    this.utilSvc.cLog(this.CLASSNAME, 'gmfi: query: %O', tranQuery)
    return collectionData<TranRec>(query(
      collection(this.firestore, this.tranNm) as CollectionReference<TranRec>,
      ...tranQuery), {idField: 'TranId'}).pipe(first())
  }

  /**
   * getProjectsFromDB function to retrieve functions from Firebase. Either using number of
   * days back from current date or using mindate/maxdate.
   * @param {string} numDays Number of days back from current to get
   * @returns {Observable} Observable of array of projects
   */
  getProjectsFromDB(numDays: number, minDate?: string, maxDate?: string): Observable<Project[]> {
    this.updtTimeStmp() ;
    this.utilSvc.cDebug(this.CLASSNAME, 'proj, days: %d  strt: %s  end: %s',  numDays, minDate, maxDate)

    if (!maxDate) {    // If mindate/maxdate not sent
      this.projectLoadDays = numDays ;    // For future calls
      const endDate = new Date() ;
      this.projeDt = endDate.toISOString().slice(0, 10) ;
      this.projsDt = this.utilSvc.getDate(endDate, numDays * -1) ;
    } else {
      this.projsDt = minDate! ;
      this.projeDt = maxDate ;
        // Since projectLoadDays implies from to current dt and this may not be, not setting it
      // this.projectLoadDays = this.utilSvc.getDateDiff(new Date(startDtStr), new Date(endDtStr)) ;
    }
    this.utilSvc.cDebug(this.CLASSNAME, 'proj, cid: %s  days: %d  strt: %s  end: %s',
      this.cid, numDays, this.projsDt, this.projeDt) ;
    const projQuery: QueryConstraint[] = [where('EndDt', '>=', this.projsDt),
      where('Cid', '==', this.cid)] ;
    const project$: Observable<Project[]> = collectionData<Project>(query(
      collection(this.firestore, this.projNm) as CollectionReference<Project>,
      ...projQuery), {idField: 'ProjectId'}).pipe(map(results => results.filter((proj) => {
        return proj['StartDt'] <= this.projeDt ; // {} allows more logic if needed
      })),first()) ;
    this.projectsStarted = true ;
    return project$ ;
  }

  /**
   * getProjects function retrieves projects for a date range
   * @param {boolean} isForce force pulling from DB vs checking existing
   * @param {number} numDays # days back to pull projects
   * @returns {Project[]} or {Observable} depending on if we can use existing array vs retrieve
   */
  getProjects(isForce: boolean, numDays: number, minDate?: string, maxDate?: string):
    Project[] | Observable<Project[]> {
    if (!maxDate) {    // If mindate/maxdate not sent
      this.projectLoadDays = numDays ;    // For future calls
      const endDate = new Date() ;
      maxDate = endDate.toISOString().slice(0, 10) ;
      minDate = this.utilSvc.getDate(endDate, numDays * -1) ;
    }
    let needRefresh = false ;
      // If force refresh, or projects not loaded, or #days in cache too small
    if (isForce || !this.projectsLoaded || minDate! < this.projsDt ||
      maxDate > this.projeDt) { needRefresh = true ; }
      // If cache is too old
    if (this.projectLoadTime + 900000 < new Date().getTime()) { needRefresh = true ; }
    return (needRefresh) ? this.getProjectsFromDB(numDays, minDate, maxDate) : this.projects ;
  }

  /**
   * getLatestRecon4Acct function finds the latest prior recon for this account to prefill
   * for the current reconciliation
   * @param {number} numDays How far back to search for prior reconciliation
   * @param {string} account account being reconciled
   * @returns {Observable} of Reconciliation array (which returns 1 or 0 reconciliations)
   */
  getLatestRecon4Acct(numDays: number, account: string): Observable<Reconciliations[]> {
    this.updtTimeStmp() ;
    const minEndDt = this.utilSvc.getDate(new Date(), numDays) ;
    this.utilSvc.cDebug(this.CLASSNAME, 'getRecon , cid: %s  eDt: %s  account: %s',
      this.cid, minEndDt, account) ;
    const reconQuery: QueryConstraint[] = [where('EndDt', '>=', minEndDt),
      where('Cid', '==', this.cid), where('Account', '==', account),
      orderBy('EndDt', 'desc'), limit(1)] ;
    const recon$: Observable<Reconciliations[]> = collectionData<Reconciliations>(query(
      collection(this.firestore, this.reconNm) as CollectionReference<Reconciliations>,
      ...reconQuery), {idField: 'ReconKey'}).pipe(first()) ;
    return recon$ ;
  }

  /**
   * function getReconiliations retrieves an array of reconciliations. Firebase query and
   * index limitations means we limit all we can in the query and then use the rxjs filter for
   * final filtering.  For security, FB limits to all security related fields
   * @param {string} minDate Furthest back date for which to grab recons
   * @param {string} maxDate Latest/closest date for which to grab recons
   * @param {string[]} accountArr
   * @returns {Observable} of reconciliation array
   */
  getReconciliations(minDate: string, maxDate: string, accountArr: string[]): Observable<Reconciliations[]> {
    this.updtTimeStmp() ;
    this.utilSvc.cDebug(this.CLASSNAME, 'getRecon , cid: %s  sDt: %s  eDt: %s  accounts: %s',
      this.cid, minDate, maxDate, accountArr) ;
    const reconQuery: QueryConstraint[] = [where('EndDt', '>=', minDate),
      where('Cid', '==', this.cid), where('Account', 'in', accountArr),
      orderBy('EndDt', 'desc')] ;
    const recon$: Observable<Reconciliations[]> = collectionData<Reconciliations>(query(
      collection(this.firestore, this.reconNm) as CollectionReference<Reconciliations>,
      ...reconQuery), {idField: 'ReconKey'}).pipe(first(),map(results => results.filter((recon) => {
        return recon['StartDt'] <= maxDate ; // {} allows more logic if needed
      }))) ;
    return recon$ ;
  }

  /**
   * function addTrans adds a transaction to the transaction collection.  It first uses FITID
   * to try to avoid adding duplicate transactions to the table
   * @param {TranRec} tranRec row to be added to transactions collection
   * @returns {Promise} response which is either a document ref or an error (reject)
   */
  addTrans(tranRec: TranRec, dupCheck?: boolean): Promise<any> {
    if (dupCheck === undefined)  dupCheck = true
    this.utilSvc.cLog(this.CLASSNAME, 'addTrans w/dupCheck: %s', dupCheck)
    this.updtTimeStmp() ;
    tranRec.Cid = this.cid ;
    if (tranRec.FitID === '') {   // No Fin unique key, create one
      tranRec.FitID = tranRec.TranDate + tranRec.Account + tranRec.Amount.toString() ;
    }
    return new Promise< Promise<any> >(( resolve, reject ) => {
      if (!dupCheck) {      // If we checked already (ofx file), don't reCheck for fitid
        delete tranRec.TranId ;
        resolve(addDoc(collection(this.firestore, this.tranNm), {...tranRec })) ;
        // Do I need to return as well?
        this.utilSvc.cLog(this.CLASSNAME, 'Came in after resolve, so also returning')
        return ;
      }
      this.utilSvc.cDebug(this.CLASSNAME, 'Inside promise in addTrans') ;   // Skip Fitid check for child trans
      if (!tranRec.SplitParent) {   // If not a child tran
        const fitSubscrip = this.getMatchingFitId(tranRec.FitID).subscribe({
          next: (response) => {
            const tranRecs = response ;
            this.utilSvc.cDebug(this.CLASSNAME, 'Inside next in addTrans w/Resp: %O', response)
            if (tranRecs.length > 0) {
              if (confirm('Possible duplicate transaction exists.  Continue?')) {
                this.utilSvc.cDebug(this.CLASSNAME, 'AddTrans with dup FITID about to call add')
                delete tranRec.TranId ;   // Clear generated TranId and let FB create one
                resolve(addDoc(collection(this.firestore, this.tranNm), {...tranRec })) ;
              } else {
                this.utilSvc.cLog(this.CLASSNAME, 'Bad confirm, so not adding')
                reject('Duplicate tran exists') ;
              }
            } else {
              this.utilSvc.cDebug(this.CLASSNAME, 'No FitID conflict, adding row %O', tranRec)
              delete tranRec.TranId ;
              resolve(addDoc(collection(this.firestore, this.tranNm), {...tranRec })) ;
            }
          }, error: (error) => {
            this.utilSvc.cWarn(this.CLASSNAME, 'Into error in AddTrans from getmfi .. failed to ck fitid')
            reject('Error checking for dup transaction' + error) ;
          }, complete: () => {
            this.utilSvc.cDebug(this.CLASSNAME, 'Came into complete from matchFitId') ;
          }
        })
      } else {
        delete tranRec.TranId ;   // Clear generated TranId and let FB create one
        resolve(addDoc(collection(this.firestore, this.tranNm), {...tranRec })) ;
      }
    })
  }

  /**
   * function updateTran updates a transaction record in the collection
   * @param {TranRec} newTran new version of transaction
   * @param {TranRec} oldTran old version (not currently used)
   * @returns {Promise} for async processing of result by caller
   */
  updateTran(newTran: TranRec, oldTran: TranRec): Promise<any> {
    this.updtTimeStmp() ;
    newTran.Cid = this.cid ;
    // let d2Tran = this.firestore.doc(`${this.tranNm}/${newTran.TranId}`) ;
    const dbTran = doc(this.firestore, this.tranNm, newTran.TranId!)
    this.utilSvc.cDebug(this.CLASSNAME, 'Updating tran: %O', newTran) ;
    return updateDoc(dbTran, { ...newTran }) ;
  }

  /**
   * function deleteTran deletes a transaction from the FB collection
   * @param {TranRec} dTran Transaction to be deleted
   * @returns {Promise} for processing of FB call
   */
  deleteTran(dTran: TranRec, doConfirm?: boolean): Promise<any> | boolean {
    this.utilSvc.cLog(this.CLASSNAME, 'deleteTran1: doConfirm: %s', doConfirm)
    if (doConfirm === undefined) { doConfirm = true ; }
    this.updtTimeStmp() ;
    if (!doConfirm || confirm(`Confirm delete of transaction ${dTran.TranDate} ${dTran.Amount}`)) {
      const dbTran = doc(this.firestore, this.tranNm, dTran.TranId!)
      this.utilSvc.cDebug(this.CLASSNAME, 'Deleting tran: %O', dTran) ;
      return deleteDoc( dbTran ) ;
    }
    return false ;
  }

  /**
   * function createProject adds a Project record to the FB collection
   * @param {Project} inProj Project to be added to collection
   * @returns {Promise} for async processing of result (docRef will have new ID)
   */
  addProject(inProj: Project): Promise<any> {
    this.updtTimeStmp() ;
    delete inProj.ProjectId ;
    inProj.Cid = this.cid ;
    return addDoc(collection(this.firestore, this.projNm), {...inProj })
  }

  /**
   * function updateProject to modify a project in the FB collection
   * @param {Project} newProj New version of project document
   * @param {Project} oldProj Old version of project document
   * @returns {Promise} for completion of update
   */
  updateProject(newProj: Project, oldProj: Project): Promise<any> {
    this.updtTimeStmp() ;
    const dbProj = doc(this.firestore, this.projNm, newProj.ProjectId!)
    newProj.Cid = this.cid ;
    return updateDoc(dbProj, { ...newProj }) ;
  }

  /**
   * function deleteProj deletes the project passed in
   * @param {Project} dProj Project document to remove from FB collection
   * @returns {Promise} for async processing by caller
   */
  deleteProj(dProj: Project): Promise<any> {
    this.updtTimeStmp() ;
    const dbProj = doc(this.firestore, this.projNm, dProj.ProjectId!)
    this.utilSvc.cDebug(this.CLASSNAME, 'Deleting Project: %O', dProj) ;
    return deleteDoc( dbProj ) ;
  }

  reconTrans(inRecon: Reconciliations, tranids: string[]): Promise<any> {
    this.updtTimeStmp() ;
    delete inRecon.ReconKey ;
    const numTrans = tranids.length ;
    inRecon.Cid = this.cid ;
    const reconRef = doc(collection(this.firestore, this.reconNm)) ;
    const tranDocRefs: DocumentReference[] = [] ;
    this.utilSvc.cLog(this.CLASSNAME, 'reconTrans tranids: %O  reconref: %s', tranids, reconRef)
    // eslint-disable-next-line no-async-promise-executor
    return new Promise<any> (async ( resolve, reject ) => {
      try {
        while (tranids.length > 0) {    // If we get huge recons, 200 trans at a time
          const num2Run = (tranids.length > 200) ? 200 : tranids.length ;
          const curTrans = tranids.splice(0, num2Run) ;
          this.utilSvc.cLog(this.CLASSNAME, 'reconTrans num2Run: %d  curTransLen: %d  tranidsLen: %d',
            num2Run, curTrans.length, tranids.length)
          for (const tranid of curTrans) {    // Get document reference for each tran
            tranDocRefs.push(doc(this.firestore, this.tranNm, tranid))
          }
          await runTransaction(this.firestore, async (transaction) => {
            transaction.set(reconRef, {...inRecon})
            for (const tranRef of tranDocRefs) {
              this.utilSvc.cLog(this.CLASSNAME, 'reconTrans update tranid: %s', tranRef.id) ;
              transaction.update(tranRef, { ReconKey: reconRef.id })
            }
          })
        }
        resolve('Save of reconciliation complete for account')
      } catch (err) {
        reject('Save of reconciliation failed with error: ' + err)
      }
    })
  }

  /**
   * function addGlobal adds a document to the GlobalVars collection
   * It is complex as there are numerous different record types for different global info
   * @param {string} gType type of global row (ruledata, house, account, trantype, ...)
   * @param {string} rVal value which can be a JSON object with numerous values
   * @returns {Promise} based on add action to FB collection
   */
  addGlobal(globRow: Globals): Promise<any> {
    this.updtTimeStmp() ;
    if (!globRow.RVal)  delete globRow.RVal ;
    delete globRow.GlobalId ;
    return addDoc(collection(this.firestore, this.globalsNm),
      {  ...globRow }) ;
  }

  /**
   * function updateGlobal updates an existing document in the GlobalVars collection
   * @param {string} rKey type of global document
   * @param {any} oldGlob original document
   * @param {any} newGlob new document
   * @param {string} globalId FB document ID
   * @returns {Promise} or {string}. string if error before call, promise if call is made
   */
  updateGlobal(rKey: string, oldGlob: Globals, newGlob: Globals, globalId: string): Promise<any> | string {
    this.updtTimeStmp() ;
    if (globalId === 'noGid') {
      return 'Error updating '+ rKey + ' Failed to find Gid for ' + oldGlob ;
    }
    if (!newGlob.RVal)  delete newGlob.RVal ;
    delete newGlob.GlobalId ;
    const dbGlob = doc(this.firestore, this.globalsNm, globalId)
    this.utilSvc.cDebug(this.CLASSNAME, 'Updating Global for key: %s  Val: %O ', globalId, newGlob ) ;
    return updateDoc(dbGlob, { ...newGlob }) ;
  }

  /**
   * function deleteGlobal to remove a document from GlobalVars collection
   * @param {string} rKey Type of global
   * @param {any} rVal Value (core of document)
   * @param {string} globalId document ID to delete
   * @returns {string} or {Promise}. String if early error, Promise if FB call made
   */
  deleteGlobal(rKey: string, rVal: any, globalId: string): Promise<any> | string {
    this.updtTimeStmp() ;
    if (globalId === 'noGid') {
      return 'Error deleting '+ rKey + ' Failed to find key for ' + rVal ;
    }
    const dbGlob = doc(this.firestore, this.globalsNm, globalId)
    return deleteDoc( dbGlob ) ;
  }

  /**
   * function addRule adds a document to the GlobalVars collection
   * It is complex as there are numerous different record types for different global info
   * @param {RuleData} Rule to add to table
   * @returns {Promise} based on add action to FB collection
   */
  addTranRule(inRule: RuleData): Promise<any> {
    this.updtTimeStmp() ;
    delete inRule.RuleId ;
    if (!inRule.Annotation)  delete inRule.Annotation ;
    if (!inRule.Category)  delete inRule.Category ;
    if (!inRule.TaxCat)  delete inRule.TaxCat ;
    if (!inRule.House)  delete inRule.House ;
    if (!inRule.TranExtra)  delete inRule.TranExtra ;
    if (!inRule.TranType)  delete inRule.TranType ;
    inRule.Cid = this.cid ;
    return addDoc(collection(this.firestore, this.tranRuleNm),
      { ...inRule }) ;
  }

  /**
   * function updateGlobal updates an existing document in the GlobalVars collection
   * @param {RuleData} oldRule is original image of rule (pre-update)
   * @param {RuleData} newRule is updated image of rule
   * @returns {Promise} or {string}. string if error before call, promise if call is made
   */
  updateTranRule(oldRule: RuleData, newRule: RuleData ): Promise<any> | string {
    this.updtTimeStmp() ;
    const ruleTranDoc = doc(this.firestore, this.tranRuleNm, oldRule.RuleId!)
    newRule.Cid = this.cid ;
    return updateDoc(ruleTranDoc, { ...newRule }) ;
  }

  /**
   * function deleteGlobal to remove a document from GlobalVars collection
   * @param {RuleData} tranRule to be deleted
   * @returns {string} or {Promise}. String if early error, Promise if FB call made
   */
  deleteTranRule(delRule: RuleData): Promise<any> | string {
    this.updtTimeStmp() ;
    const ruleTranDoc = doc(this.firestore, this.tranRuleNm, delRule.RuleId!)
    return deleteDoc( ruleTranDoc ) ;
  }

  /**
   * function addRule adds a document to the GlobalVars collection
   * It is complex as there are numerous different record types for different global info
   * @param {House} House to add to table
   * @returns {Promise} based on add action to FB collection
   */
  addHouse(inHouse: House): Promise<any> {
    this.updtTimeStmp() ;
    delete inHouse.HouseId ;
    inHouse.Cid = this.cid ;
    return addDoc(collection(this.firestore, this.houseNm),
      { ...inHouse }) ;
  }

  /**
   * function updateGlobal updates an existing document in the GlobalVars collection
   * @param {RuleData} oldHouse is original image of rule (pre-update)
   * @param {RuleData} newHouse is updated image of rule
   * @returns {Promise} or {string}. string if error before call, promise if call is made
   */
  updateHouse(oldHouse: House, newHouse: House ): Promise<any> | string {
    this.updtTimeStmp() ;
    const houseDoc = doc(this.firestore, this.houseNm, oldHouse.HouseId!)
    newHouse.Cid = this.cid ;
    return updateDoc(houseDoc, { ...newHouse }) ;
  }

  /**
   * function deleteGlobal to remove a document from GlobalVars collection
   * @param {House} house to be deleted
   * @returns {string} or {Promise}. String if early error, Promise if FB call made
   */
  deleteHouse(delHouse: House): Promise<any> | string {
    this.updtTimeStmp() ;
    const houseDoc = doc(this.firestore, this.houseNm, delHouse.HouseId!)
    return deleteDoc(houseDoc) ;
  }

  /**
   * function addRule adds a document to the GlobalVars collection
   * It is complex as there are numerous different record types for different global info
   * @param {House} House to add to table
   * @returns {Promise} based on add action to FB collection
   */
  addMortgage(inMortgage: Mortgage): Promise<any> {
    this.updtTimeStmp() ;
    delete inMortgage.mortgageId ;
    inMortgage.Cid = this.cid ;
    return addDoc(collection(this.firestore, this.mortgageNm),
      { ...inMortgage }) ;
  }

  /**
   * function updateGlobal updates an existing document in the GlobalVars collection
   * @param {RuleData} oldHouse is original image of rule (pre-update)
   * @param {RuleData} newHouse is updated image of rule
   * @returns {Promise} or {string}. string if error before call, promise if call is made
   */
  updateMortgage(oldMortgage: Mortgage, newMortgage: Mortgage ): Promise<any> | string {
    this.updtTimeStmp() ;
    const mortgageDoc = doc(this.firestore, this.mortgageNm, oldMortgage.mortgageId!)
    newMortgage.Cid = this.cid ;
    return updateDoc(mortgageDoc, { ...newMortgage }) ;
  }

  /**
   * function deleteGlobal to remove a document from GlobalVars collection
   * @param {House} house to be deleted
   * @returns {string} or {Promise}. String if early error, Promise if FB call made
   */
  deleteMortgage(delMortgage: Mortgage): Promise<any> | string {
    this.updtTimeStmp() ;
    const mortgageDoc = doc(this.firestore, this.mortgageNm, delMortgage.mortgageId!)
    return deleteDoc(mortgageDoc) ;
  }

  /**
   * function loadTrans receives transaction array as retrieved and sent async.
   * @param {TranRec[]} inTrans Transaction array as returned from query to caller
   * @param {Map} childTrans child trans associated with multiPart trans
   */
  loadTrans(inTrans: TranRec[], childTrans: Map<string, TranRec[]>) {
    this.tranRecs = inTrans ;
    this.childMap = childTrans ;
  }

  /*****************************************************************************
   * Section for data manipulation et al used by multiple components
   *****************************************************************************/
  /**
   * function processGVals takes generic Global array as returned from FB collection and
   * breaks it into its component parts
   */
  processGVals(): void {
    this.utilSvc.cDebug(this.CLASSNAME, 'processGVals running') ;
    this.tranTypes.splice(0, this.tranTypes.length) ; // Clear arrays
    this.accountTypes.splice(0, this.accountTypes.length) ;
    this.accounts.splice(0, this.accounts.length) ;
    this.categoryTaxcat.splice(0, this.categoryTaxcat.length) ;
    this.categoryFolders.splice(0, this.categoryFolders.length) ;
    this.taxCats.splice(0, this.taxCats.length) ;
    const categoryTaxcats: KeyVal[] = [] ;
    const categoryFolders: KeyVal[] = [] ;
    const tranTypes: string[] = [] ;    const accountTypes: string[] = [] ;
    const accounts: KeyVal[] = [] ;     const taxCats: KeyVal[] = [] ;
      // Now for each item in parm table update appropriate parm array or map
    for (const inGlobal of this.fbGlobals) {
      switch(inGlobal.GType) {
        case(this.utilSvc.globalTypes.TranTypes):
          tranTypes.push(inGlobal.RKey) ; break ;
        case(this.utilSvc.globalTypes.AccountTypes):
          accountTypes.push(inGlobal.RKey) ; break ;
        case(this.utilSvc.globalTypes.Accounts):
          accounts.push(new KeyVal(inGlobal.RKey, inGlobal.RVal!)) ; break ;
        case(this.utilSvc.globalTypes.CategoryTaxcats):
          categoryTaxcats.push(new KeyVal(inGlobal.RKey, inGlobal.RVal!)) ;  break ;
        case(this.utilSvc.globalTypes.TaxCats):
          taxCats.push(new KeyVal(inGlobal.RKey, inGlobal.RVal!)) ; break ;
        case(this.utilSvc.globalTypes.CategoryFolders):
          categoryFolders.push(new KeyVal(inGlobal.RKey, inGlobal.RVal!)) ; break ;
      }
    }
    this.utilSvc.cDebug(this.CLASSNAME, 'PG Lens catTC: %d  acc: %d  tCats: %d  tTypes: %d',
      categoryTaxcats.length, accounts.length,
        taxCats.length, tranTypes.length)
          // Sort local arrays into global arrays
    /* this.ruleAdmin = ruleAdmin.sort((a, b) => {
      const cmp = a.srchStr.localeCompare(b.srchStr) ;
      if (cmp != 0) { return cmp }
      return (a.srchAmt < b.srchAmt) ? -1 : 1 ;
    }) */
//    this.utilSvc.setRules(this.ruleAdmin) ;
    this.categoryTaxcat = categoryTaxcats.sort((a, b) => a.RKey.localeCompare(b.RKey)) ;
    this.categoryFolders = categoryFolders.sort((a, b) => a.RKey.localeCompare(b.RKey)) ;
    this.tranTypes = tranTypes.sort((a, b) => a.localeCompare(b)) ;
    this.accounts = accounts.sort((a, b) => a.RKey.localeCompare(b.RKey)) ;
    this.accountTypes = accountTypes.sort((a, b) => a.localeCompare(b)) ;
    this.taxCats = taxCats.sort((a, b) => a.RKey.localeCompare(b.RKey)) ;
    this.utilSvc.cDebug(this.CLASSNAME, 'taxCats: %O  Account: %O  acctTps: %O', this.taxCats, this.accounts, this.accountTypes) ;
    this.utilSvc.cDebug(this.CLASSNAME, 'PG Lens catTC: %d  acc: %d  tCats: %d  tTypes: %d',
      this.categoryTaxcat.length, this.accounts.length,
      this.taxCats.length, this.tranTypes.length)
  }

  /**
   * function getChildArray Retrieve child array for a particular parent document. Split
   * trans have a parent representing the total amount, and child trans for the component parts.
   * Example, if someone deposits 2 rents together (not recommended) ... there would be a parent
   * tran representing the total deposit (matching a statement) and 2 child trans representing
   * the individual rents tied to the appropriate houses/units
   * @param {string} parentId tranId of the parent document
   * @returns {TranRec[]} list of child tran documents
   */
  getChildArray(parentId: string): TranRec[] {
    return this.childMap.get(parentId)! ;
  }

  rmvChildren4Parent(parentId: string) {
    this.utilSvc.cLog(this.CLASSNAME, 'pre childMap has %s  %s', parentId, this.childMap.has(parentId))
    if (this.childMap.has(parentId)) { this.childMap.delete(parentId) }
  }

  add2ChildMap(parentId: string, childArr: TranRec[]) {
    this.childMap.set(parentId, childArr) ;
  }

  /**
   * function getHouses retrieves house record
   * @returns
   */
  getHouses(): House[] {
    return this.houses ;
  }

  /**
   * function getAccounts return KeyVal for each account (name and type)
   * @returns {KeyVal[]} list of accounts
   */
  getAccounts(): KeyVal[] {
    return this.accounts ;
  }

  /**
   * function getAcctTypes returns list of account types (from globals)
   * @returns {string[]} list of account types
   */
  getAcctTypes(): string[] {
    return this.accountTypes ;
  }

  /**
   * function getTranTypes returns list of Transaction types (tied to OFX spec)
   * @returns {string[]} list of transaction thypes
   */
  getTranTypes(): string[] {
    return this.tranTypes ;
  }

  /**
   * function getCategoryTaxcat returns the list of valid categories + the tax categories for each
   * @returns {KeyVal[]} list of categories and their default tax categories
   */
  getCategoryTaxcat(): KeyVal[] {
    return this.categoryTaxcat ;
  }

  /**
   * function getCategoryFolders returns the list of categories grouped into folders
   * creatively called category folders
   * @returns {KeyVal[]} list of category folders and their categories
   */
  getCategoryFolders(): KeyVal[] {
    return this.categoryFolders ;
  }

  /**
   * function getTaxCats return the tax categories as defined in globals
   * @returns {KeyVal[]} list of tax categories for many select boxes
   */
  getTaxCats(): KeyVal[] {
    return this.taxCats ;
  }

  // Return a sorted array vs trusting ts/js impl
  setTranRules(rules: RuleData []): RuleData[] {
    this.tranRules = rules.sort((a, b) => a.ruleName.localeCompare(b.ruleName)) ;
    this.utilSvc.setRules(this.tranRules) ;
    return this.tranRules;
  }

  getTranRules(): RuleData[] {
    return this.tranRules ;
  }

  setMortgages(mortgages: Mortgage[]) {
    this.mortgages = mortgages ;
    this.utilSvc.setMortgages(mortgages) ;
  }
}
