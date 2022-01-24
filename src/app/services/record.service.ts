import { ReconTrans } from './../models/reconTrans.model';
import { Reconciliations } from './../models/reconciliations.model';
import { MsgInfo } from './../models/MsgInfo.model';
import { DescripInfo } from './../models/descripInfo.model';
import { ReturnState } from './../models/returnState.model';
import { Project } from './../models/project.model';
import { TranRec } from './../models/TranRec.model';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { observable, Observable, Subject, throwError } from 'rxjs';
import { catchError, retry, map } from 'rxjs/operators';
import { __values } from 'tslib';

@Injectable({
  providedIn: 'root'
})

/***************************************************************************************
 * This service can take a file name and return an array of finRec objects or it can
 * take query parameters and return an array of finRec objects. The id in the objects
 * created for file will be blank as it is assumed file is being added to data base.
 * For query parameters, id should be populated. In sending records to server for db
 * insertion, a valid id field implies update, a blank id field implies insert.  id will
 * be generated at server based on date, vendor, amount, and annotation.
 * This service will also provide the DB calls to server
 * May actually also make server call to get list of files as that is really all that's left.
 * So it will be a big service including all calls to the server
***************************************************************************************/
export class RecordService {
  transArr: TranRec[] = new Array<TranRec>() ;  // Array of trans
  houses: string[] = new Array<string>() ;
  projects: Project[] = new Array<Project>() ;  // All projects for now
    // In Parm DB: worktype -> categories, trantype -> tranTypes, accounts -> accounts,
    // descripHints -> commonDescrips/descripCats, taxCats -> taxCats
  // accounts = ['bbt9312', 'bbt9723', 'cfcugg', 'chase', 'lowes', 'sams', 'noStatement'] ;
  // tranTypes = ['Check', 'Chg', 'Credit', 'Debit', 'Dep', 'Misc', 'Pmt', 'Rent', 'WithD', 'XIn', 'XOut'] ;
  // categories = ['ACorAppliance', 'Cleaning', 'Demolition', 'Electric', 'Exterior', 'Flooring',
    // 'Framing', 'Miscellaneous', 'Painting', 'Plumbing', 'Roofing', 'Sheetrock', 'Siding'] ;
  accounts: string[] = new Array<string>() ;
  tranTypes: string[] = new Array<string>() ;
  categories: string[] = new Array<string>() ;
  descripInfo: DescripInfo[] = new Array<DescripInfo>() ;
  taxCats: string[] = new Array<string>() ;
  private  subject = new Subject<MsgInfo>() ;

  baseURL = 'http://localhost:8081/api/' ;
/*  httpOptions = { headers: new HttpHeaders({
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  })} ; */
  // urlList: string [] ;

  constructor(private http: HttpClient) { }

  /****************************************************************************
  * Retrieve name of each home for select boxes et al
  *****************************************************************************/
  getHomesFromDB(): Observable<string[]> {
    return this.http.get<string[]>(this.baseURL + 'getHouses') ;
  }

  /****************************************************************************
  * Retrieve name of each home for select boxes et al
  *****************************************************************************/
   getParmsFromDB(): Observable<string[]> {
    return this.http.get<string[]>(this.baseURL + 'getParms') ;
  }

  /****************************************************************************
  * Should be part of getHomes, but will try to add that later ... maybe
  *****************************************************************************/
  getHomes(): string[] {
    return this.houses ;
  }

  /****************************************************************************
  * Get information on the common tran descriptions and their tax category
  *****************************************************************************/
   getDescripInfo(): DescripInfo[] {
    return this.descripInfo ;
  }

  /****************************************************************************
  * Should be part of getHomes, but will try to add that later ... maybe
  *****************************************************************************/
   getTaxCats(): string[] {
    return this.taxCats ;
  }

  /****************************************************************************
  * Retrieve rows from the database
  *****************************************************************************/
  getTransFromDB( bDate: string, eDate: string, account: string,
                  tranType: string, house: string, project: string): Observable<TranRec[]> {
    const tranUrl = this.baseURL + 'getTranRows?bDate=' + bDate + '&eDate=' +
      eDate + '&account=' + account + '&tranType=' + tranType + '&house=' +
      house + '&project=' + project ;
    return this.http.get<TranRec[]>(tranUrl) ;
  }

  /****************************************************************************
  * Create a Tran in DB
  *****************************************************************************/
   createTran(inTran: TranRec): Observable<ReturnState> {
    const tranUrl = this.baseURL + 'createTran' ;
    return this.http.post<ReturnState>(tranUrl, inTran) ;
  }

  /****************************************************************************
  * Update a Tran in DB
  *****************************************************************************/
   updateTran(newTran: TranRec, oldTran: TranRec): Observable<ReturnState> {
    const tranArray: TranRec[] = [ newTran, oldTran ]
    const tranUrl = this.baseURL + 'updateTran' ;
    return this.http.put<ReturnState>(tranUrl, tranArray) ;
  }

  /****************************************************************************
  * Retrieve rows from the database
  *****************************************************************************/
   deleteTran( tranId: string): Observable<ReturnState> {
    const tranUrl = this.baseURL + 'deleteTran?tranId=' + tranId ;
    return this.http.delete<ReturnState>(tranUrl) ;
  }

  /****************************************************************************
  * Create a project in DB
  *****************************************************************************/
  createProject(inProj: Project): Observable<ReturnState> {
    const tranUrl = this.baseURL + 'createProject' ;
    return this.http.post<ReturnState>(tranUrl, inProj) ;
    // return this.http.post<ReturnState>(tranUrl, inProj, this.httpOptions) ;
  }

  /****************************************************************************
  * Update a project in DB
  *****************************************************************************/
   updateProject(newProj: Project, oldProj: Project): Observable<ReturnState> {
    const projArray: Project[] = [ newProj, oldProj ]
    const tranUrl = this.baseURL + 'updateProject' ;
    console.log('updateproject w/newproj: ', newProj, ' url: ', tranUrl) ;
    return this.http.put<ReturnState>(tranUrl, projArray) ;
  }

  /****************************************************************************
  * Retrieve rows from the database
  *****************************************************************************/
   getProjects( bDateStr: string, eDateStr: string): Project[] {
    const projRtn: Project[] = new Array<Project>() ;
    for (const curProj of this.projects) {
      if (curProj.StartDt.localeCompare(eDateStr) < 0 && curProj.EndDt.localeCompare(bDateStr) > 0) {
        projRtn.push(curProj) ;
      }
    }
    return projRtn ;
  }

  /****************************************************************************
  * Retrieve rows from the database
  *****************************************************************************/
  getProjectsFromDB( bDate: string, eDate: string): Observable<Project[]> {
    const projectUrl = this.baseURL + 'getProjectsForDateRange?bDate=' + bDate + '&eDate=' +
      eDate ;
    return this.http.get<Project[]>(projectUrl) ;
  }

  /****************************************************************************
  * Create a project in DB
  *****************************************************************************/
   createReconciliation(inRecon: Reconciliations): Observable<ReturnState> {
    const tranUrl = this.baseURL + 'createReconciliation' ;
    return this.http.post<ReturnState>(tranUrl, inRecon) ;
  }

  /****************************************************************************
  * Update all trans in this reconciliation with the reconciliation key
  *****************************************************************************/
   reconcileTrans(reconKey: string, tranIds: string[]): Observable<ReturnState> {
    const tranUrl = this.baseURL + 'reconcileTrans' ;
    const reconTrans = new ReconTrans(reconKey, tranIds) ;
    return this.http.put<ReturnState>(tranUrl, reconTrans) ;
  }

  /****************************************************************************
  * Return the list of valid accounts
  *****************************************************************************/
   getAccounts(): string[] {
    return this.accounts ;
  }

  /****************************************************************************
  * Return the list of valid transaction types
  *****************************************************************************/
   getTranTypes(): string[] {
    return this.tranTypes ;
  }

  /****************************************************************************
  * Populate service transaction array
  *****************************************************************************/
  loadTrans(inTrans: TranRec[]): void {
    this.transArr = inTrans ;
  }

  /****************************************************************************
  * Caller who subscribed to sql can send the new list of houses back in
  *****************************************************************************/
  loadHouses(inHouses: string[]): void {
    this.houses = inHouses ;
  }

  /****************************************************************************
  * Load Description Info
  *****************************************************************************/
  loadDescripInfo(inDescripInfo: DescripInfo[]): void {
    this.descripInfo = inDescripInfo ;
  }

  /****************************************************************************
  * Load list of tax categories (PE = Personal Expense, PI = Personal Income,
  *  BE = Business Expense, BI = Business Income, ?? = unknown, ' ' = no tax cat)
  *****************************************************************************/
   loadTaxCats(inTaxCats: string[]): void {
    this.taxCats = inTaxCats ;
  }

  /****************************************************************************
  * Load projects retrieved async
  *****************************************************************************/
   loadProjects(inProjects: Project[]): void {
    this.projects = inProjects ;
  }

  /****************************************************************************
  * Load categories of work (plumbing, painting, ...)
  *****************************************************************************/
   loadCategories(inCategories: string[]): void {
    this.categories = inCategories ;
  }

  /****************************************************************************
  * Load transaction types (deposit, withdrawal, ...)
  *****************************************************************************/
   loadTranTypes(inTranTypes: string[]): void {
    this.tranTypes = inTranTypes ;
  }

  /****************************************************************************
  * Load transaction types (deposit, withdrawal, ...)
  *****************************************************************************/
   loadAccounts(inAccounts: string[]): void {
    this.accounts = inAccounts ;
  }

  /****************************************************************************
  * Return the categories for projects
  *****************************************************************************/
   getCategories(): string[] {
     return this.categories ;
   }

  /****************************************************************************
  * List the CSV tran files currently unprocessed on server
  *****************************************************************************/
  get1Tran(tranId: string): TranRec | any {
    for (const inTran of this.transArr) {
      if (inTran.TranId === tranId) {
        return inTran ;
      }
    }
    return null ;
  }

  /****************************************************************************
  * List the CSV tran files currently unprocessed on server
  *****************************************************************************/
   get1Proj(projId: string): Project | any {
    for (const inProj of this.projects) {
      if (inProj.ProjectId === projId) {
        return inProj ;
      }
    }
    return null ;
  }

  /****************************************************************************
  * Child component (via router) pushing msg parent should display as child goes away
  *****************************************************************************/
  setMessage(msgInfo: MsgInfo) {
    this.subject.next(msgInfo) ;
  }

  /****************************************************************************
  * Get the message coming back from edit
  *****************************************************************************/
  getMessage(): Observable<MsgInfo> {
    return this.subject.asObservable() ;
  }
}
