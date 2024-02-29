import { Injectable } from '@angular/core';
import { TranRec } from '../models/TranRec.model';
import { RuleData } from '../models/ruleData.model';
import { Project } from '../models/project.model';

@Injectable({
  providedIn: 'root'
})

export class GenutilsService {
  classMap: Map<string, string> = new Map<string, string>() ;  dfltLevel = 'log' ;
  overrideLogLevel = '' ;   // If this is set, all logs will use it
    // dirty arrays are arrays of IDs of that type that have unsaved changes
  projects: Project[] = new Array<Project>() ;   dirtyProj: string[] = new Array<string>() ;
  trans: TranRec[] = new Array<TranRec>() ;  dirtyTrans: string[] = new Array<string>() ;
  globalTypes = { RuleData: 'ruleData', TaxCats: 'taxCats', CategoryTaxcats: 'categoryTaxcat',
    Houses: 'houses', TranType: 'tranType', Accounts: 'accounts', AccountType: 'accountType',
    CategoryFolders: 'categoryFolders', Logging: 'logging' } ;
  noAdminGlobalTypes = [this.globalTypes.TranType, this.globalTypes.AccountType,
    this.globalTypes.CategoryFolders] ;
  addOnlyGlobalTypes = [this.globalTypes.TaxCats] ;
  actionTypes = { Add: 'add', Update: 'update', Hide: 'hide', UnHide: 'unHide',
    Cancel: 'cancel', Delete: 'delete', Split: 'split', UnSplit: 'unSplit',
    SplitNew: 'splitNew', DirtyData: 'dirtyData', CleanData: 'cleanData' } ;
  colorTypes = {Parent: 'Magenta', NotInDB: 'Beige', Default: 'White' } ;
  tblNames = { Globals: 'GlobalVars', Transactions: 'Transactions',
    Projects: 'Projects', Reconciliations: 'Reconciliations', NewCustomer: 'newCustomer' } ;
  roleNames = { User: 'User', Admin: 'Admin', GlobalAdmin: 'globalAdmin'}
  accountTypes = {Checking: 'checking', Savings: 'savings', Credit: 'credit'} ;
  msgLvls = {Verbose: 'verbose', Debug: 'debug', Log: 'log', Warn: 'warn', Error: 'error'} ;
  authSignoff = false ;
  mlValue: Map<string, number> = new Map<string, number>() ;
  CLASSNAME = 'genUtilsService' ;    noGid = 'noGid' ;

  constructor() {
    const classList = [ 'adm1parm', 'admcategory', 'admhouses', 'admkv', 'admruledata', 'admin',
      'auth', 'authGuardService', 'authService', 'creprojectedit', 'creprojects', 'crerecon',
      'cretran', 'cretranall', 'firebaseService',
      'genUtilsService', 'headers', 'qfxService', 'reports' ] ;
    for (const curClass of classList) {
      this.classMap.set(curClass, this.dfltLevel) ;
    }
    this.mlValue.set('verbose', 0) ;    this.mlValue.set('debug', 10) ;
    this.mlValue.set('log', 20) ;    this.mlValue.set('warn', 30) ;
    this.mlValue.set('error', 40) ;   // ordered low to high by severity
  }

  isAuthSignoff() {  return this.authSignoff ; }
  setAuthLogoff(authSignoff: boolean) { this.authSignoff = authSignoff ; }

  getLoggingMap(): Map<string, string> {
    return this.classMap ;
  }

  getLoggingLevel(className: string): string {
    if (this.overrideLogLevel) { return this.overrideLogLevel ; }
    return  this.classMap.get(className) || this.dfltLevel
  }

  /**
   * isLoggable is used here and can be used by others if a debug or verbose message
   * involves notable work. A quick check to verify can avoid the work
   * @param className
   * @param level
   * @returns boolean of whether this class will log at this level
   */
  isLoggable(className: string, level: string): boolean {
    const classLvlNum: number = this.mlValue.get(this.getLoggingLevel(className)) || 20 ;
    return classLvlNum <= (this.mlValue.get(level) || 20) ;
  }

  getDfltLogLevel(): string {  return this.dfltLevel ;  }
  setDfltLogLevel(inLevel: string): void { this.dfltLevel = inLevel ;  }
  getOverrideLogLevel(): string {  return this.overrideLogLevel ;  }
  setOverrideDfltLogLevel(inLevel: string): void { this.overrideLogLevel = inLevel ;  }

  getTimeStamp(): string {
    const d = new Date() ; let curMth = d.getMonth() ;  curMth++ ;
    return d.getFullYear().toString() + '.' + curMth.toString() + '.' + d.getDate().toString() + '-' +
        d.getHours().toString() + '.' + d.getMinutes().toString() + '.' + d.getSeconds().toString() + '.' +
        d.getMilliseconds().toString() ;
  }

  cVerbose(...args: any[]) {  args.unshift(this.msgLvls.Verbose + ' ') ;  this.consLog(args) }
  cDebug(...args: any[]) { args.unshift(this.msgLvls.Debug + ' ') ;  this.consLog(args) }
  cLog(...args: any[]) { args.unshift(this.msgLvls.Log + ' ') ;  this.consLog(args) }
  cWarn(...args: any[]) { args.unshift(this.msgLvls.Warn + ' ') ;  this.consLog(args) }
  cError(...args: any[]) { args.unshift(this.msgLvls.Error + ' ') ;  this.consLog(args) }

  consLog(args: any[]) {  // Args are: level, classname, message (including parts/vars/...)
    // let args = Array.prototype.slice.call(arguments);
    const msgLvl: string = args.shift().trim() ;     // Extract the level
    const classNm: string = args.shift().trim() ;
    if (this.isLoggable(classNm, msgLvl)) {
      args.unshift(this.getTimeStamp() + ' ' + classNm + ' ' + msgLvl.charAt(0).toUpperCase()) ;
      switch (msgLvl) {
        case this.msgLvls.Verbose:
        case this.msgLvls.Debug:
          console.debug(console, ...args) ;   break ;
        case this.msgLvls.Log:
          console.log(console, ...args) ; break ;
        case this.msgLvls.Warn:
          console.warn(console, ...args) ; break ;
        case this.msgLvls.Error:
          console.error(console, ...args) ;
      }
    }
  }

  dirtyTranUpdt(isDirty: boolean, tranId: string) {
    if (isDirty)  this.dirtyTrans.push(tranId) ;
    else {
      const idx = this.dirtyTrans.findIndex(tid => tid === tranId)
      if (idx >= 0) this.dirtyTrans.splice(idx, 1)
    }
  }

  dirtyProjUpdt(isDirty: boolean, projId: string) {
    if (isDirty)  this.dirtyProj.push(projId) ;
    else {
      const idx = this.dirtyProj.findIndex(pid => pid === projId)
      if (idx >= 0) this.dirtyProj.splice(idx, 1)
    }
  }

  /**
   * Take date passed in and return a yyyy-mm-dd string of a date dayDiff from it
   * @param {Date} inDate Date from which to calculate date of offset
   * @param {number} dayDiff Number of days from inDate.  - to return older date, positive for newer date
   * @return {string} ISO (yyyy-mm-dd) fmt date which is dayDiff days from incoming date
   */
  getDate(inDate: Date, dayDiff: number): string {
    const newDate = new Date(inDate.getTime() + (dayDiff * 24 * 3600 * 1000)) ;
    return newDate.toISOString().slice(0, 10) ;
  }

    // Can't subscribe to proj & tran from firesvc w/out creating mutual dependency
  loadProjects(inProj: Project[]) {
    this.cDebug(this.CLASSNAME, 'In genUtils w/inProj Len: %d', inProj.length) ;
    this.projects = inProj }

  loadTrans(inTrans: TranRec[]) { this.trans = inTrans ; }

  getProjById(projId: string): Project | undefined {
    return this.projects.find(proj => proj.ProjectId === projId) ;
  }
  getTranById(tranId: string): TranRec | undefined {
    return this.trans.find(tran => tran.TranId === tranId) ;
  }
  /**
   * function getDateDiff Calculates days difference between 2 incoming dates
   * @param {Date} minDate Minimum/start date
   * @param {Date} maxDate Max/End date
   * @returns {number} Days difference between min and max dates
   */
  getDateDiff(minDate: Date, maxDate: Date): number {
    const diffTime = maxDate.getTime() - minDate.getTime() ;
    return diffTime / (1000 * 60 * 60 * 24) ;
  }

  /**
   * function generateGuid is for generating temporary IDs for trans not yet in FB collection
   * @returns {string} format of GUID that mimics an FB id
   */
  generateGuid() : string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0,
        v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  isTranDB(tranRec: TranRec): boolean {
    if (!tranRec.TranId)  return false ;
    const tidSplit = tranRec.TranId.split('-') ;
    if (tidSplit.length !== 5)  return true ;
    if (tidSplit[0].length === 8 && tidSplit[1].length === 4 && tidSplit[2].length === 4 &&
      tidSplit[3].length === 4 && tidSplit[4].length === 12) return false ; // locally gen'd
    return true ;
  }

  fixAmt(inNum: number): number {
    return Math.round(inNum*Math.pow(10,2))/Math.pow(10,2);
  }

  /**
   * Split total trans into debits and credits (only up front lest hidden trans lost)
   * @param {TranRec[]} csvTranRecs List of transactions
   * @param {TranRec[]} creditTranRecs Credit transactions
   * @param {TranRec[]} debitTranRecs Debit transactions
   * @param {TranRec[]} hiddenTranRecs Hidden trans
   * @param {boolean} isReconcile Is caller reconcile (ie: hidden as part of it)
   */
  repopArrays(csvTranRecs: TranRec[], creditTranRecs: TranRec[], debitTranRecs: TranRec[],
    hiddenTranRecs: TranRec[], isReconcile: boolean): void {
    creditTranRecs.splice(0) ;  debitTranRecs.splice(0) ; hiddenTranRecs.splice(0) ;

    for (const curTran of csvTranRecs) {
      if (isReconcile && curTran.ReconKey) { continue ; }   // This tran in another reconciliation
      if (curTran.Amount <= 0) {
        debitTranRecs.push(curTran) ;
      } else {
        creditTranRecs.push(curTran) ;
      }
    }
    this.cDebug(this.CLASSNAME, 'TotalRecs: %d deb: %d credit: %d',
      csvTranRecs.length, debitTranRecs.length, creditTranRecs.length) ;
  }

  /**
   *
   * @param tranRec
   * @param inArr
   * @returns
   */
  isrtTranRow(tranRec: TranRec, inArr: TranRec[]): void {
    for (let i = 0; i < inArr.length; i++) {
      if (tranRec.TranDate < inArr[i].TranDate) {
        inArr.splice(i, 0, tranRec) ;     // Splice in before this row
        return ;
      }
    }
    inArr.push(tranRec) ;   // Higher than highest in array, so add to end
  }

  shallowClone(inProj: Project): Project {    // Moved from generic to proj so lint happy
    return  new Project(inProj.House, inProj.Cid, inProj.StartDt, inProj.EndDt, inProj.Description,
      inProj.ProjectId) ;
  }

  // objCompare(objA: Object, objB: Object): boolean {
    // for (let cProp in objA)  if (objA[cProp] !== objB[cProp])  return false ;
    // return true ;
  // }

  /******************************************************************************
   * Event occurred to a row in child component of tran or reconcile
   *   Much logic, so we reFactored to bring it here and ... yes, there are
   *   lots of parms and 3 returns ... Still common logic .. maybe
   * When I go to array service, will call from here to service passing arrays
   * as well and if the 3rd array (hidden) is null, then hide case will be
   * considered an error. Will need to drive reCalcTotals, check newRow status,
   * and if added row should show up in array (dates and trandb)
   * Returns: StatusMsg, isNewRow, runRelc ()
   ******************************************************************************/
  onTranMod(action: string, tranRec: TranRec, creditTrans: TranRec[],
    debitTrans: TranRec[], hiddenTrans: TranRec[], isReconcile: boolean,
    accountArr: string[], startDt: string, endDt: string, tranDB: boolean, newRow: boolean):
    [string, boolean, boolean] {
    let statusMsg = '' ; let isNewRow = false ;  let runReCalc = false ;
    this.cDebug(this.CLASSNAME, 'Action: %s  TranId: %s  isRecon: %s ', action, tranRec.TranId, isReconcile ) ;
    let destArr: TranRec[] = (tranRec.Amount >= 0) ? creditTrans : debitTrans ;
    let srcArr: TranRec[] ;
    let idx = 0 ;
    switch (action) {
      case this.actionTypes.Add:
      // If arrays are of rows in DB (vs OFX) AND date is between begin and end date, add 2 arr
        if (accountArr.length === 0)  accountArr.push(tranRec.Account) ;
        if (tranDB) {     // Tran in DB, not coming from ofx/qfx/csv
          if (tranRec.TranDate >= startDt && tranRec.TranDate <= endDt &&
            accountArr.includes(tranRec.Account)) {
            this.isrtTranRow(tranRec, destArr) ;
            runReCalc = true ;
            statusMsg = 'Added row w/tranId; ' + tranRec.TranId ;
          } else {
            console.log('Row not added TranDB: ', tranDB, ' TranDt: ', tranRec.TranDate,
            ' startDt: ', startDt, ' EndDt: ', endDt) ;
            statusMsg = 'Row added to data base but not shown in display due to filters' ;
          }
        }
        isNewRow = false ;    // Clear this "new" section
        break ;
      case this.actionTypes.Update:    // Update, tricky as amount could have switched sides of 0
        idx = destArr.findIndex((tr) => tr.TranId === tranRec.TranId) ;
        if (idx >= 0) {
          destArr[idx] = tranRec ;      // Update row in array
          statusMsg = 'Updated row w/Tranid: ' + tranRec.TranId ;
        } else {                        // Amount may have changed
          srcArr = (tranRec.Amount < 0) ? creditTrans : debitTrans ;
          idx = srcArr.findIndex((tr) => tr.TranId === tranRec.TranId) ;
          if (idx < 0) {      // Not found anywhere
            statusMsg =  'Update to tranid: ' + tranRec.TranId + ' failed as not found' ;
          } else {      // Must delete from where it is and isrt to other array
            srcArr.splice(idx, 1) ;     // Rmv from where it is
            this.isrtTranRow(tranRec, destArr) ;  // Add to where it isn't (yet)
            statusMsg = 'Updated row and switched debit/credit status' ;
          }
        }
        runReCalc = true ;
        break ;
      case this.actionTypes.Delete:
        idx = destArr.findIndex((tr) => tr.TranId === tranRec.TranId) ;
        if (idx < 0) {
          statusMsg = 'Tranid: ' + tranRec.TranId + ' Not found, cannot delete' ;
        } else {
          console.debug('del preLen: ', debitTrans.length, ' idx: ', idx, ' Row: ', debitTrans[idx])
          destArr.splice(idx, 1) ;
          console.debug('del post: ', debitTrans.length, ' destLen: ', destArr.length) ;
          statusMsg = 'Deleted row w/Tranid: ' + tranRec.TranId ;
        }
        runReCalc = true ;
        break ;
      case this.actionTypes.Hide:
      case this.actionTypes.UnHide:
        if (!isReconcile) {
          this.cWarn(this.CLASSNAME, 'Got a %s when not on reconcile, not good', action) ;
          statusMsg = 'Got' + action + ' action when not doing reconcile!!' ;
          break;
        }
        srcArr = destArr ;      // Credit or debit array may be source
        if (action === this.actionTypes.Hide) {
          destArr = hiddenTrans ;     // Hide means move to hidden
        } else { // Unhide
          srcArr = hiddenTrans ;      // Unhide moves from hidden
        }
        idx = srcArr.findIndex((tr) => tr.TranId === tranRec.TranId) ;
        srcArr.splice(idx, 1) ;
        this.isrtTranRow(tranRec, destArr) ;
        statusMsg = 'Moved row w/Tranid: ' + tranRec.TranId ;
        runReCalc = true ;
        break ;
      case this.actionTypes.Split:    // Make sure array change noted, replace row
      case this.actionTypes.SplitNew:
      case this.actionTypes.UnSplit:
        this.cDebug(this.CLASSNAME, 'Split/UnSplit %s on tran: %O destArr: %O', action, tranRec, destArr) ;
        idx = destArr.findIndex((tr) => tr === tranRec) ;
        if (idx > -1) { destArr[idx] = tranRec ; }
        else {    // Wasnt in array, is OK if new row (splitNew), so insert in array
          if (action === this.actionTypes.SplitNew) {
            this.isrtTranRow(tranRec, destArr) ;
            isNewRow = true ;
          } else {
            this.cWarn(this.CLASSNAME, 'Split/UnSplit %s did not find TranId for tran: %O', action, tranRec) ;
          }
        }
        break ;
      case this.actionTypes.Cancel:
        statusMsg = 'Cancelled operation on row' ;
        if (newRow)  { isNewRow = false ; }
        break ;
      default: statusMsg = 'Invalid action notification of: ' + action ;
    }
    this.cDebug(this.CLASSNAME, 'Newrow: %s', isNewRow) ;
    return [statusMsg, isNewRow, runReCalc] ;
  }

  onProjMod(action: string, project: Project): [string, boolean] {
    let newRow = false  ;  let statusMsg = '' ;
    switch (action) {
      case this.actionTypes.Add:
        statusMsg = 'Add on project succeeded'
        newRow = false ;    break ;
      case this.actionTypes.Update:    // Update, tricky as amount could have switched sides of 0
      case this.actionTypes.Delete:
        statusMsg = action + ' on project succeeded'
        break ;
      case this.actionTypes.Cancel:
        statusMsg = 'Cancelled modifications to project' ;
        newRow = false ;      break ;
      default: statusMsg = 'Invalid action notification of: ' + action ;
    }
    return [statusMsg, newRow]
  }

  /**
   * function prefillDoc looks at amount and category type info in a row coming from
   * ofx file and compares to ruleData to see if there are rules about handling that doc.
   * Handling = prefilling other fields in the doc. Example would be seeing
   * Jones apartments.com and recognizing that it is rent income for house 111MS (where
   * Jones lives)
   * @param {string} data2Srch description type data in incoming document
   * @param {number} amt2Ck in incoming documenty
   * @param {RuleData[]} ruleData to search for this account
   * @param {TranRec} tranRec with final document
   */
  prefillDoc(data2Srch: string, amt2Ck: number, ruleData: RuleData[], tranRec : TranRec)  {
    const ucSrchData = data2Srch.toUpperCase() ;    // search all upcase for efficiency
    // const  roProps = ['srchStr', 'accounts', 'srchAmt' ]   // ReadOnly, don't subst these
    // const  rwProps = ['Category', 'TranType', 'TranExtra', 'TaxCat', 'House', 'Annotation']
    this.cDebug(this.CLASSNAME, 'prefillDoc w/Srch: %s  Num: %d rLen: %d', data2Srch, amt2Ck, ruleData.length) ;
    for (const rule of ruleData) {
      if ((!rule.srchAmt || rule.srchAmt === 0.0001) && rule.srchStr === '') {
        this.cWarn(this.CLASSNAME, 'Invalid rule, no srchStr and no valid amount: %O', rule) ;
        return ;
      }
          // If srchStr is not used in rule or if it matches, check amount as well
      if (rule.srchStr === '' || ucSrchData.indexOf(rule.srchStr) > -1) {
          // If no amount or amount MATCHES (ie: one or both matched if sent
        if (!rule.srchAmt || rule.srchAmt === 0.0001 || rule.srchAmt === amt2Ck) {
          this.cDebug(this.CLASSNAME, 'Matched on rule: %O', rule) ;
          if (rule.Category) { tranRec.Category = rule.Category ; }
          if (rule.TranType)    { tranRec.TranType = rule.TranType ; }
          if (rule.TaxCat)      { tranRec.TaxCat = rule.TaxCat ; }
          if (rule.TranExtra)   { tranRec.TranExtra = (tranRec.TranExtra === '') ?
            rule.TranExtra : tranRec.TranExtra + ' [' + rule.TranExtra + ']' }
          if (rule.House)       { tranRec.House = rule.House ; }
          if (rule.Annotation)  { tranRec.Annotation = (tranRec.Annotation === '') ?
            rule.Annotation : tranRec.Annotation + ' [' + rule.Annotation + ']' ; }
        }
      }
    }
  }

  /** ************************************************************************
   * Remove child trans (logical) from array and store them in a map for associated parent
   * tran.  May add: populate amount of parent tran
   * @param tranRecs List of all transactions
   * @param children  Map of array of child trans with key being tranId of parent
   ************************************************************************** */
  splitChildren(tranRecs: TranRec[], children: Map<string, TranRec[]>) {
    this.cDebug(this.CLASSNAME, 'gu:sC tranRecs len: %d', tranRecs.length) ;
    for (let i = tranRecs.length - 1; i >= 0; i--) {  // Backwards due to splice
      if (tranRecs[i].SplitParent) {  // If child
        const parentId = tranRecs[i].SplitParent! ;
        if (children.has(parentId)) {   // If in map, add to the array
          children.get(parentId)!.push(tranRecs[i]) ;
        } else {                        // Else add to map with this tran
          children.set(parentId, [tranRecs[i]] ) ;
        }
        this.cDebug(this.CLASSNAME, 'gu:sC rmv child tran: %s  i %d', tranRecs[i].TranId, i) ;
        tranRecs.splice(i, 1) ;         // Remove child from source array
      }
    }
  }

  fixString(curString: string, invalidStr: string, replaceStr: string): string {
    const repLen = replaceStr.length ;
    let invalidPos = curString.indexOf(invalidStr) ;
    while (invalidPos >= 0) {
      if (curString.substring(invalidPos, invalidPos+repLen) !== replaceStr) {
        if (this.isLoggable(this.CLASSNAME, this.msgLvls.Verbose)) {
          this.cVerbose(this.CLASSNAME, 'Fixing invalid xml char: %s', curString.substring(invalidPos, invalidPos+repLen))
        }
        curString = curString.substring(0, invalidPos) + replaceStr +
          curString.substring(invalidPos+1) ;
      }
      invalidPos = curString.indexOf(invalidStr, invalidPos+1) ;
    }
    return curString ;
  }

  /*****************************************************************************
     Event occurred to a row in child component cretranedit
   *****************************************************************************/
  isrtProjectRow(project: Project, inArr?: Project[]): Project [] {
    if (!inArr)  inArr = this.projects ;
    this.cDebug(this.CLASSNAME, 'Inserting project: %O', project) ;
    for (let i = 0; i < inArr.length; i++) {
      if (project.StartDt < inArr[i].StartDt) {
        this.cDebug(this.CLASSNAME, 'Adding before startDt: %s', inArr[i].StartDt)
        inArr.splice(i, 0, project) ;     // Splice in before this row
        return inArr ;
      }
    }
    this.cDebug(this.CLASSNAME, 'Pushing onto end of array') ;
    inArr.push(project) ;   // Higher than highest in array, so add to end
    return inArr ;    // return proj array ptr so others can be notified
  }

  deleteProjRow(projectId: string, inArr?: Project[]): Project[] {
    if (!inArr)  inArr = this.projects
    const idx = inArr.findIndex(proj =>  proj.ProjectId === projectId)
    if (idx >= 0)  inArr.splice(idx, 1)
    else  {
      this.cWarn(this.CLASSNAME, 'Delete proj failed as projId: %s could not be found', projectId) ;
    }
    return inArr
  }
}
