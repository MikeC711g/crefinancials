import { TestBed } from "@angular/core/testing";
import { GenutilsService } from "./genutils.service";
import { RuleData } from "../models/ruleData.model";
import { TranRec } from "../models/TranRec.model";
import { Project } from "../models/project.model";

/**
 * tranCompare compares 2 trans.  Some extra as not all of these fields can be
 * changed in current code, but to be safe, we're checking almost all
 * @param outTran Tran that the unit test call returned
 * @param keyTran What the tran should look like (answer key)
 * @returns boolean true if they are the same, false if not
 */
function tranCompare(outTran: TranRec, keyTran: TranRec): boolean {
  console.debug('out: ', outTran, ' key: ', keyTran) ;
  if (outTran.Cid !== keyTran.Cid)  return false ;
  if (outTran.TranDate !== keyTran.TranDate)  return false ;
  if (outTran.Category !== keyTran.Category) return false ;
  if (outTran.TranType !== keyTran.TranType) return false ;
  if (outTran.Amount !== keyTran.Amount) return false ;
  if (outTran.TranExtra !== keyTran.TranExtra) return false ;
  if (outTran.TaxCat !== keyTran.TaxCat) return false ;
  if (outTran.House !== keyTran.House) return false ;
  if (outTran.Project !== keyTran.Project) return false ;
  if (outTran.Annotation !== keyTran.Annotation) return false ;
  return true ;
}

describe('GenUtilsService', () => {
  let service: GenutilsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GenutilsService);
  });

  it('getLoggingMap', () => {
    const logMap = service.getLoggingMap() ;
    expect(logMap.size).to.equal(19)
    logMap.set('testClass', 'Debug')
    expect(logMap.size).to.equal(20)
    const lvl = service.getLoggingLevel('testClass') ;
    expect(lvl).to.equal('Debug') ;
  })

  it('getDate', () => {
    const dateDiff = -30
    const newerDt = new Date('2023-12-01')
    const olderDt = service.getDate(newerDt, dateDiff) ;
    expect(olderDt).to.equal('2023-11-01') ;
    const olderDt2 = new Date(olderDt) ;
    const caldDiff = service.getDateDiff(newerDt, olderDt2) ;
    expect(caldDiff).to.equal(dateDiff) ;
  })

  it('applyRules', () => {    // Will have tons of these eventually
    let pfRules: RuleData[] = [] ;
    pfRules.push(new RuleData('JONES APARTMENTS.COM', ['TestAcct1', 'TestAcct2'], 0.0001,
      'Rent Income', 'DEPOSIT', '', 'BI', '111TestHouse')) ;
    pfRules.push(new RuleData('', ['TestAcct1'], -123.45,
      'Utilities', 'DEBIT', 'Office utils', 'BE', '222Office')) ;
      // First here will hit on search string
    let tran1Src: TranRec = new TranRec('test1', '2023-07-01', 'TestAcct2', '', 'RENT',
      1000, 'XYZ JONES APARTMENTS.COM ABC', '', '', '', '', '', '123456') ;
    let tran1Dest: TranRec = new TranRec('test1', '2023-07-01', 'TestAcct2', 'Rent Income',
      'DEPOSIT', 1000, 'XYZ JONES APARTMENTS.COM ABC', 'BI', '111TestHouse', '', '',
      '', '123456') ;
      // Second will hit on amount
    let tran2Src: TranRec = new TranRec('test1', '2023-07-01', 'TestAcct1', '', 'PAYMENT',
      -123.45, 'Unneeded tranextra', 'CE', '', '', '', '', '123456') ;
    let tran2Dest: TranRec = new TranRec('test1', '2023-07-01', 'TestAcct1', 'Utilities',
      'DEBIT', -123.45, 'Office utils', 'BE', '222Office', '', '', '', '123456') ;
      // This one should not be modified at all
    let tran3Src: TranRec = new TranRec('test1', '2023-07-01', 'TestAcct2', '', 'RENT',
      1000, 'XYZ SMITH APARTMENTS.COM ABC', '', '', '', '', '', '123456') ;
    let tran3Dest: TranRec = new TranRec('test1', '2023-07-01', 'TestAcct2', '', 'RENT',
      1000, 'XYZ SMITH APARTMENTS.COM ABC', '', '', '', '', '', '123456') ;
    service.prefillDoc(tran1Src.TranExtra, tran1Src.Amount, pfRules, tran1Src) ;
    service.prefillDoc(tran2Src.TranExtra, tran2Src.Amount, pfRules, tran2Src) ;
    service.prefillDoc(tran3Src.TranExtra, tran3Src.Amount, pfRules, tran3Src) ;
    expect(tranCompare(tran1Src, tran1Dest)).true ;
    expect(tranCompare(tran2Src, tran2Dest)).true ;
    expect(tranCompare(tran3Src, tran3Dest)).true ;
    // let dummy = new TranRec('cid', 'tdate', 'acct', 'desc', 'ttype', 100, 'textra', 'BE',
      // 'house', 'proj', 'annot', 'reconkey', 'fitid', 'tranid', 'splitPar') ;
    // let dummyr = new RuleData('srchstr', ['accts'], 0.0001, 'desc', 'ttype', 'textra',
      // 'taxcat', 'house', 'annot') ;
  })

  it('repopArrays', () => {
    let srcTranRecs: TranRec[] = [] ; let credTrans: TranRec[] = [] ;
    let debTrans: TranRec[] = [] ;    let hiddenTranRecs: TranRec[] = [] ;
    srcTranRecs.push(new TranRec('testCid', '2023-01-01', 'testAcct', 'testDesc', 'DEBIT',
      -200, 'testTextra', 'BE', '', '', '', '', '')) ;
    srcTranRecs.push(new TranRec('testCid', '2023-01-01', 'testAcct', 'testDesc', 'CREDIT',
      150, 'testTextra', 'BI', '', '', '', '', '')) ;
    srcTranRecs.push(new TranRec('testCid', '2023-01-01', 'testAcct', 'testDesc', 'DEP',
      350, 'testTextra', 'PI', '', '', '', '', '')) ;
    srcTranRecs.push(new TranRec('testCid', '2023-01-01', 'testAcct', 'testDesc', 'DEBIT',
      -300, 'testTextra', 'BE', '', '', '', '', '')) ;
    srcTranRecs.push(new TranRec('testCid', '2023-01-01', 'testAcct', 'testDesc', 'DEBIT',
      -400, 'testTextra', 'BE', '', '', '', 'testRecon', '')) ;
    for (let curTran of srcTranRecs) {
      credTrans.push(curTran) ;   debTrans.push(curTran) ;  hiddenTranRecs.push(curTran) ;
    }
    service.repopArrays(srcTranRecs, credTrans, debTrans, hiddenTranRecs, true) ;
    let credTot = 0 ;  let debTot = 0 ;
    for (let curTran of debTrans) { debTot += curTran.Amount ; }
    for (let curTran of credTrans) { credTot += curTran.Amount ; }
    expect(credTot).to.equal(500) ;
    expect(debTot).to.equal(-500) ;
    expect(hiddenTranRecs.length).to.equal(0) ;
    debTot = 0 ;  credTot = 0 ;
    service.repopArrays(srcTranRecs, credTrans, debTrans, hiddenTranRecs, false) ;
    for (let curTran of debTrans) { debTot += curTran.Amount ; }
    expect(debTot).to.equal(-900) ;
  })

  it('isrtTranRow', () => {
    let srcTranRecs: TranRec[] = [] ;
    srcTranRecs.push(new TranRec('testCid', '2023-03-01', 'testAcct', 'oldRow1', 'DEBIT',
      -200, 'testTextra', 'BE', '', '', '', '', '')) ;
    srcTranRecs.push(new TranRec('testCid', '2023-03-08', 'testAcct', 'oldRow2', 'CREDIT',
      150, 'testTextra', 'BI', '', '', '', '', '')) ;
    srcTranRecs.push(new TranRec('testCid', '2023-03-21', 'testAcct', 'oldRow3', 'DEP',
      350, 'testTextra', 'PI', '', '', '', '', '')) ;
    srcTranRecs.push(new TranRec('testCid', '2023-04-03', 'testAcct', 'oldRow4', 'DEBIT',
      -300, 'testTextra', 'BE', '', '', '', '', '')) ;
    srcTranRecs.push(new TranRec('testCid', '2023-05-01', 'testAcct', 'oldRow5', 'DEBIT',
      -400, 'testTextra', 'BE', '', '', '', 'testRecon', '')) ;
    let isrtRow: TranRec = new TranRec('testCid', '2023-06-01', 'testAcct', 'newRow1', 'DEBIT',
      -400, 'testTextra', 'BE', '', '', '', 'testRecon', '') ;
    service.isrtTranRow(isrtRow, srcTranRecs) ;
    expect('newRow1').to.equal(srcTranRecs[5].Category) ;
    isrtRow = new TranRec('testCid', '2023-04-01', 'testAcct', 'newRow2', 'DEBIT',
      -400, 'testTextra', 'BE', '', '', '', 'testRecon', '') ;
    service.isrtTranRow(isrtRow, srcTranRecs) ;
    expect('newRow2').to.equal(srcTranRecs[3].Category) ;
    isrtRow = new TranRec('testCid', '2022-11-01', 'testAcct', 'newRow3', 'DEBIT',
      -400, 'testTextra', 'BE', '', '', '', 'testRecon', '') ;
    service.isrtTranRow(isrtRow, srcTranRecs) ;
    expect('newRow3').to.equal(srcTranRecs[0].Category) ;
  })

  it('findTranId', () => {
    let srcTranRecs: TranRec[] = [] ;
    srcTranRecs.push(new TranRec('testCid', '2023-03-01', 'testAcct', 'oldRow1', 'DEBIT',
      -200, 'testTextra', 'BE', '', '', '', '', '', 'tid0010')) ;
    srcTranRecs.push(new TranRec('testCid', '2023-03-08', 'testAcct', 'oldRow2', 'CREDIT',
      150, 'testTextra', 'BI', '', '', '', '', '', 'tid0050')) ;
    srcTranRecs.push(new TranRec('testCid', '2023-03-21', 'testAcct', 'oldRow3', 'DEP',
      350, 'testTextra', 'PI', '', '', '', '', '', 'tid0025')) ;
    srcTranRecs.push(new TranRec('testCid', '2023-04-03', 'testAcct', 'oldRow4', 'DEBIT',
      -300, 'testTextra', 'BE', '', '', '', '', '', 'tid0045')) ;
    srcTranRecs.push(new TranRec('testCid', '2023-05-01', 'testAcct', 'oldRow5', 'DEBIT',
      -400, 'testTextra', 'BE', '', '', '', 'testRecon', '')) ;
    let idx = service.findTranId('tid0050', srcTranRecs) ;
    expect(idx).to.equal(1) ;
    idx = service.findTranId('tid0045', srcTranRecs) ;
    expect(idx).to.equal(3) ;
    idx = service.findTranId('tidnotfound', srcTranRecs) ;
    expect(idx).to.equal(-1) ;
  })

  /**
   * Items to test here:
   * add credit, add debit, add debit NOT in date range, add credit not in account array,
   *   add w/tranDB false (should not add)
   * update credit, update debit, cvt debit to credit, update not found tranId
   * delete credit, delete debit, delete not found tranid
   * hide credit, unhide debit, hide not found row, hide when isReconcile false
   * Later watch statusMsgs et al. Also look at update with tranDate chg outside of range
   *  Look at add of dup tranid
   */
  it('onTranMod', () => {
    let credTranRecs: TranRec[] = [] ;  let debTranRecs: TranRec[] = [] ;
    let hiddenTranRecs: TranRec[] = [] ;  let statusMsg: string ;
    let isNewrow: boolean ;  let runRecalc: boolean ;
    debTranRecs.push(new TranRec('testCid', '2023-03-01', 'testAcct1', 'dTran1', 'DEBIT',
      -200, 'testTextra', 'BE', '', '', '', '', '', 'tid0010')) ;
    debTranRecs.push(new TranRec('testCid', '2023-04-03', 'testAcct2', 'dTran2', 'DEBIT',
      -300, 'testTextra', 'BE', '', '', '', '', '', 'tid0045')) ;
    debTranRecs.push(new TranRec('testCid', '2023-05-01', 'testAcct1', 'dTran3', 'DEBIT',
      -400, 'testTextra', 'BE', '', '', '', 'testRecon', '', 'tid0071')) ;
    credTranRecs.push(new TranRec('testCid', '2023-03-08', 'testAcct2', 'cTran1', 'CREDIT',
      150, 'testTextra', 'BI', '', '', '', '', '', 'tid0030')) ;
    credTranRecs.push(new TranRec('testCid', '2023-03-21', 'testAcct1', 'cTran2', 'DEP',
      350, 'testTextra', 'PI', '', '', '', '', '', 'tid0035')) ;
    hiddenTranRecs.push(new TranRec('testCid', '2023-04-08', 'testAcct2', 'hTran1', 'CREDIT',
      -150, 'testTextra', 'BI', '', '', '', '', '', 'tid0029')) ;
    hiddenTranRecs.push(new TranRec('testCid', '2023-04-21', 'testAcct1', 'hTran2', 'DEP',
      350, 'testTextra', 'PI', '', '', '', '', '', 'tid0039')) ;
            // Standard credit add
    let credTran = new TranRec('testCid', '2023-04-01', 'testAcct2', 'cTran3', 'CREDIT',
      150, 'testTextra', 'BI', '', '', '', '', '', 'tid0044') ;
    service.onTranMod('add', credTran, credTranRecs, debTranRecs, hiddenTranRecs, false,
      ['testAcct1', 'testAcct2'], '2023-01-29', '2023-11-29', true, true)
    expect('cTran3').to.equal(credTranRecs[2].Category) ;
            // Standard debit add (not newrow)
    let debTran = new TranRec('testCid', '2023-04-10', 'testAcct2', 'dTran2.5', 'DEBIT',
      -250, 'testTextra', 'BE', '', '', '', '', '', 'tid0052') ;
    service.onTranMod('add', debTran, credTranRecs, debTranRecs, hiddenTranRecs, false,
      ['testAcct1', 'testAcct2'], '2023-01-29', '2023-11-29', true, false)
    expect('dTran2.5').to.equal(debTranRecs[2].Category) ;
            // Debit not in date range
    debTran = new TranRec('testCid', '2022-04-10', 'testAcct1', 'dTrannot', 'DEBIT',
      -250, 'testTextra', 'BE', '', '', '', '', '', 'tid0000') ;
    [statusMsg, isNewrow, runRecalc] = service.onTranMod('add', debTran, credTranRecs,
      debTranRecs, hiddenTranRecs, false, ['testAcct1', 'testAcct2'], '2023-01-29',
      '2023-11-29', true, true)
    expect(4).to.equal(debTranRecs.length) ;  // This one not added
    expect(statusMsg.includes('Row not added')).true ;
            // Credit but for account not displayed
    credTran = new TranRec('testCid', '2023-04-10', 'testAcct7', 'cTrannot', 'CREDIT',
      450, 'testTextra', 'BI', '', '', '', '', '', 'tid0000') ;
    [statusMsg, isNewrow, runRecalc] = service.onTranMod('add', credTran, credTranRecs,
      debTranRecs, hiddenTranRecs, false, ['testAcct1', 'testAcct2'], '2023-01-29',
      '2023-11-29', true, true)
    expect(3).to.equal(credTranRecs.length) ;  // This one not added
    expect(statusMsg.includes('Row not added')).true ;
            // Credit but tranDB false so not adding
    credTran = new TranRec('testCid', '2023-04-11', 'testAcct1', 'cTrannot', 'CREDIT',
      450, 'testTextra', 'BI', '', '', '', '', '', 'tid0000') ;
    [statusMsg, isNewrow, runRecalc] = service.onTranMod('add', credTran, credTranRecs,
      debTranRecs, hiddenTranRecs, false, ['testAcct1', 'testAcct2'], '2023-01-29',
      '2023-11-29', false, true)
    expect(3).to.equal(credTranRecs.length) ;  // This one not added
    expect(statusMsg.includes('Row not added')).true ;
            // Update a credit tran
    credTran = new TranRec('testCid', '2023-03-21', 'testAcct1', 'cTran2New', 'DEP',
      250, 'testTextra', 'PI', '', '', '', '', '', 'tid0035') ;
    [statusMsg, isNewrow, runRecalc] = service.onTranMod('update', credTran, credTranRecs,
      debTranRecs, hiddenTranRecs, true, ['testAcct1', 'testAcct2'], '2023-01-29',
      '2023-11-29', true, true)
    let curIdx = service.findTranId('tid0035', credTranRecs)    // assuming found
    expect('cTran2New').to.equal(credTranRecs[curIdx].Category) ;  // This one not added
            // Update a debit tran
    debTran = new TranRec('testCid', '2023-04-03', 'testAcct2', 'dTran2New', 'DEBIT',
      -400, 'testTextra', 'BE', '', '', '', '', '', 'tid0045') ;
    [statusMsg, isNewrow, runRecalc] = service.onTranMod('update', debTran, credTranRecs,
      debTranRecs, hiddenTranRecs, true, ['testAcct1', 'testAcct2'], '2023-01-29',
      '2023-11-29', true, true)
    curIdx = service.findTranId('tid0045', debTranRecs)    // assuming found
    expect('dTran2New').to.equal(debTranRecs[curIdx].Category) ;  // This one not added
            // Convert a debit to a credit
    debTran = new TranRec('testCid', '2023-04-03', 'testAcct2', 'dTran2NewCred', 'CREDIT',
      300, 'testTextra', 'BI', '', '', '', '', '', 'tid0045') ;
    [statusMsg, isNewrow, runRecalc] = service.onTranMod('update', debTran, credTranRecs,
      debTranRecs, hiddenTranRecs, true, ['testAcct1', 'testAcct2'], '2023-01-29',
      '2023-11-29', true, true)
    curIdx = service.findTranId('tid0045', debTranRecs)
    expect(-1).to.equal(curIdx) ;   // Not found in debits anymore
    curIdx = service.findTranId('tid0045', credTranRecs)
    expect('dTran2NewCred').to.equal(credTranRecs[curIdx].Category) ;
            // Try updating a tranid that is not found
    debTran = new TranRec('testCid', '2023-04-03', 'testAcct2', 'dTran2NewCred', 'CREDIT',
      300, 'testTextra', 'BI', '', '', '', '', '', 'unfindableTranId') ;
    [statusMsg, isNewrow, runRecalc] = service.onTranMod('update', debTran, credTranRecs,
      debTranRecs, hiddenTranRecs, true, ['testAcct1', 'testAcct2'], '2023-01-29',
      '2023-11-29', true, true)
    expect(statusMsg.includes('failed as not found')).true ;
            // delete a debit tranid
    let oldLen = debTranRecs.length ;
    debTran = new TranRec('testCid', '2023-03-01', 'testAcct1', 'dTran1', 'DEBIT',
      -200, 'testTextra', 'BE', '', '', '', '', '', 'tid0010') ;
    [statusMsg, isNewrow, runRecalc] = service.onTranMod('delete', debTran, credTranRecs,
      debTranRecs, hiddenTranRecs, true, ['testAcct1', 'testAcct2'], '2023-01-29',
      '2023-11-29', true, true)
    console.log(statusMsg) ;
    expect(--oldLen).to.equal(debTranRecs.length) ;   // One less debit tran
          // delete a credit tranid
    oldLen = credTranRecs.length ;
    credTran = new TranRec('testCid', '2023-03-08', 'testAcct2', 'cTran1', 'CREDIT',
      150, 'testTextra', 'BI', '', '', '', '', '', 'tid0030') ;
    [statusMsg, isNewrow, runRecalc] = service.onTranMod('delete', credTran, credTranRecs,
      debTranRecs, hiddenTranRecs, true, ['testAcct1', 'testAcct2'], '2023-01-29',
      '2023-11-29', true, true)
    console.log(statusMsg) ;
    expect(--oldLen).to.equal(credTranRecs.length) ;   // One less debit tran
          // Try deleting not found id
    credTran = new TranRec('testCid', '2023-03-08', 'testAcct2', 'cTran1', 'CREDIT',
      150, 'testTextra', 'BI', '', '', '', '', '', 'tidIdontwanto') ;
    [statusMsg, isNewrow, runRecalc] = service.onTranMod('delete', credTran, credTranRecs,
      debTranRecs, hiddenTranRecs, true, ['testAcct1', 'testAcct2'], '2023-01-29',
      '2023-11-29', true, true)
    console.log(statusMsg) ;
    expect(statusMsg.includes('cannot delete')).true ;
          // Hide a credit tran
    oldLen = hiddenTranRecs.length ;
    credTran = new TranRec('testCid', '2023-03-21', 'testAcct1', 'cTran2', 'DEP',
      350, 'testTextra', 'PI', '', '', '', '', '', 'tid0035') ;
    [statusMsg, isNewrow, runRecalc] = service.onTranMod('hide', credTran, credTranRecs,
      debTranRecs, hiddenTranRecs, true, ['testAcct1', 'testAcct2'], '2023-01-29',
      '2023-11-29', true, true)
    expect(++oldLen).to.equal(hiddenTranRecs.length) ;
          // Unhide a debit
    oldLen = hiddenTranRecs.length ;    // yes, it had it, but standalone rmvs dependency
    debTran = new TranRec('testCid', '2023-04-08', 'testAcct2', 'hTran1', 'CREDIT',
      -150, 'testTextra', 'BI', '', '', '', '', '', 'tid0029') ;
    [statusMsg, isNewrow, runRecalc] = service.onTranMod('unHide', debTran, credTranRecs,
      debTranRecs, hiddenTranRecs, true, ['testAcct1', 'testAcct2'], '2023-01-29',
      '2023-11-29', true, true)
    expect(--oldLen).to.equal(hiddenTranRecs.length) ;
          // Try to rehide last Tran but reconcile false so hide should fail
    debTran = new TranRec('testCid', '2023-04-08', 'testAcct2', 'hTran1', 'CREDIT',
      -150, 'testTextra', 'BI', '', '', '', '', '', 'tid0029') ;
    [statusMsg, isNewrow, runRecalc] = service.onTranMod('hide', debTran, credTranRecs,
      debTranRecs, hiddenTranRecs, false, ['testAcct1', 'testAcct2'], '2023-01-29',
      '2023-11-29', true, true) ;
    expect(statusMsg.includes('when not doing reconcile')).true ;
  }) ;

  /**
   * Build tranRec array w/2 parents, 5 kids, and 2 standalone
   * Verify in the end that it is all good.
   * Later add parent w/no children and child w/no parent
   */
  it('splitChildren', () => {
    let tranRecs: TranRec[] = [] ;
    let childMap: Map<string, TranRec[]> = new Map<string, TranRec[]>() ;
    tranRecs.push(new TranRec('testCid', '2023-03-01', 'testAcct1', 'parTran1', 'TPARENT',
      0, 'testTextra', 'BE', '', '', '', '', '', 'tidParent1')) ;
    tranRecs.push(new TranRec('testCid', '2023-04-01', 'testAcct1', 'parTran2', 'TPARENT',
      0, 'testTextra', 'BI', '', '', '', '', '', 'tidParent2')) ;
    tranRecs.push(new TranRec('testCid', '2023-05-01', 'testAcct2', 'debTran1', 'DEBIT',
      -300, 'testTextra', 'BE', '', '', '', '', '', 'tidDebit1')) ;
    tranRecs.push(new TranRec('testCid', '2023-05-02', 'testAcct1', 'credTran1', 'CREDIT',
      400, 'testTextra', 'BI', '', '', '', '', '', 'tidCredit1')) ;
    tranRecs.push(new TranRec('testCid', '2023-03-01', 'testAcct1', 'chiTran11', 'DEBIT',
      -150, 'Mtg Int', 'BE', '111MS', '', '', '', '', 'tidChiDeb1', 'tidParent1')) ;
    tranRecs.push(new TranRec('testCid', '2023-04-01', 'testAcct1', 'chiTran21', 'DEP',
      1050, 'Rent Income', 'BI', '123MS', '', '', '', '', 'tidChiCred1', 'tidParent2')) ;
    tranRecs.push(new TranRec('testCid', '2023-03-01', 'testAcct1', 'chiTran12', 'DEBIT',
      -250, 'Mtg Prin', 'BE', '111MS', '', '', '', '', 'tidChiDeb2', 'tidParent1')) ;
    tranRecs.push(new TranRec('testCid', '2023-04-01', 'testAcct1', 'chiTran22', 'DEP',
      50, 'Late Fee', 'BI', '123MS', '', '', '', '', 'tidChiCred2', 'tidParent2')) ;
    service.splitChildren(tranRecs, childMap, true) ;
    expect(tranRecs.length).to.equal(4) ;   // After children stripped out
    expect(childMap.size).to.equal(2) ;     // 2 map entries
    let childCount = childMap.get('tidParent1').length ;
    expect(childCount).to.equal(2) ;
    childCount = childMap.get('tidParent2').length ;
    expect(childCount).to.equal(2) ;
    let parentIdx = service.findTranId('tidParent1', tranRecs) ;
    expect(tranRecs[parentIdx].Amount).to.equal(-400) ;
    parentIdx = service.findTranId('tidParent2', tranRecs) ;
    expect(tranRecs[parentIdx].Amount).to.equal(1100) ;
  })

  it('fixString', () => {
    let tStr1 = 'The small brown fox jumped & ran' ;
    let oStr1 = 'The small brown fox jumped &amp; ran' ;
    let tStr2 = 'The small brown fox jumped over the sleeping dog' ;
    let oStr2 = 'The small brown fox jumped over the sleeping dog' ;
    let tStr3 = '&&The small brown fox jumped & ran&&' ;
    let oStr3 = '&amp;&amp;The small brown fox jumped &amp; ran&amp;&amp;' ;
    expect(service.fixString(tStr1, '&', '&amp;')).to.equal(oStr1) ;
    expect(service.fixString(tStr2, '&', '&amp;')).to.equal(oStr2) ;
    expect(service.fixString(tStr3, '&', '&amp;')).to.equal(oStr3) ;
  })

  /**
   *
   */
  it('isrtProjRow', () => {
    let projects: Project[] = [] ;
    projects.push(new Project('111MS', 'test1', '2023-03-01', '2023-08-01',
      'Electrical work', 'pid0010')) ;
    projects.push(new Project('123TS', 'test1', '2023-04-01', '2023-09-01',
      'Plumbing work', 'pid0020')) ;
    projects.push(new Project('141PB', 'test1', '2023-05-01', '2023-10-01',
      'Cleaning work', 'pid0030')) ;
    projects.push(new Project('411SC', 'test1', '2023-06-01', '2023-11-01',
      'Turnover', 'pid0040')) ;
    projects.push(new Project('911CB', 'test1', '2023-08-01', '2023-12-01',
      'Window work', 'pid0050')) ;
    let firstProj = new Project('999PB', 'test1', '2023-02-01', '2023-07-01',
      'Power wash', 'pid0005') ;
    service.isrtProjectRow(firstProj, projects) ;
    expect(firstProj).to.equal(projects[0]) ;
    let midProj = new Project('919CD', 'test1', '2023-05-15', '2023-10-01',
      'Landscaping', 'pid0035') ;
    service.isrtProjectRow(midProj, projects) ;
    expect(midProj).to.equal(projects[4]) ;
    let endProj = new Project('252ED', 'test1', '2023-10-15', '2024-03-01',
      'Roofing', 'pid0055') ;
    service.isrtProjectRow(endProj, projects) ;
    expect(endProj).to.equal(projects[projects.length-1]) ;
  })
}) ;
