import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KeyValuePipe } from '@angular/common';
import { KeyVal } from './../../../models/globals.model';
import { FirebaseService } from './../../../services/firebase.service';
import { GenutilsService } from './../../../services/genutils.service';
import { GlobalModsService } from '../../../services/globalMods.service';

@Component({
  selector: 'crefinancials-admcategory',
  standalone: true,
  imports: [FormsModule, KeyValuePipe],
  templateUrl: './admcategory.component.html',
  styleUrls: ['./admcategory.component.css']
})

export class AdmcategoryComponent implements OnInit {
  @Input() categoryTaxcat: KeyVal[] = [] ;
  @Input() categoryFolders: KeyVal[] = [] ;
  @Input() taxCats: KeyVal[] = [] ;
  @Output() parmMod = new EventEmitter<{ action: string, parmType: string,
    newVal: any, oldVal: any }>() ;
  newCatFolder = "" ; newCategory = ""; addCatFolder = false ;  addCategory = false ;
  categoryMap: Map<string, KeyVal[]> = new Map<string, KeyVal[]>() ;
  curCategory: KeyVal = new KeyVal('', '') ;  origCategory: KeyVal = new KeyVal('', '')
  curCatFolder: KeyVal = new KeyVal('', '') ;  origCatFolder: KeyVal = new KeyVal('', '')
  curCatKey = '' ;  curCatFolderKey = '' ; origTaxCat = '' ;
  emptyKv: KeyVal = new KeyVal('', '')
  statusMsg = '' ; catSeparator = '|$|'
  CLASSNAME = 'admcategory'

  constructor(private fireSvc: FirebaseService, private utilSvc: GenutilsService,
    private globalMod: GlobalModsService) { }

  ngOnInit(): void {
    this.categoryMap = this.globalMod.genCategoryMap(this.categoryFolders, this.categoryTaxcat) ;
    this.onClearSelect() ;
    this.utilSvc.cLog(this.CLASSNAME,'CategoryMap: %O', this.categoryMap ) ;
  }

  onSelect() {    // See if select can load full curCategory, else send args here to do it
    this.curCatFolder = this.categoryFolders.find(kv => kv.RVal.includes(this.curCatKey))!
    this.curCatFolderKey = this.curCatFolder.RKey
    this.utilSvc.cLog(this.CLASSNAME, 'curCat: %s  CatFolder: %s  tCat: %s  CatKey: %s',
      this.curCategory.RKey, this.curCatFolder.RKey, this.curCategory.RVal, this.curCatKey ) ;
    this.curCategory = this.categoryTaxcat.find((dt) => dt.RKey === this.curCatKey )!
    this.utilSvc.cLog(this.CLASSNAME, 'onSelect curCategory: %O', this.curCategory)
    this.origCatFolder.RKey = this.curCatFolder.RKey  // Capture pre-edited
    this.origCatFolder.RVal = this.curCatFolder.RVal
    this.origCategory.RKey = this.curCategory.RKey
    this.origCategory.RVal = this.curCategory.RVal
  }

  onClearSelect() {
    this.origCatFolder.RKey = this.origCatFolder.RVal = ''
    this.origCategory.RKey = this.origCategory.RVal = ''
    this.curCatFolderKey = this.curCatKey = '' ;
    this.curCategory = new KeyVal('', '')
  }

  onNewCatFolder() {
    this.utilSvc.cLog(this.CLASSNAME, 'Got new Category Folder: %s', this.newCatFolder)
    if (this.categoryMap.has(this.newCatFolder)) {
      this.statusMsg = this.newCatFolder + 'already exists as a category folder'
    } else {
      const newVal = new KeyVal(this.newCatFolder, '')
      this.parmMod.emit({action: this.utilSvc.actionTypes.Add,
        parmType: this.utilSvc.globalTypes.CategoryFolders, newVal: newVal, oldVal: newVal}) ;
      this.categoryMap.set(this.newCatFolder, []) ;
      this.categoryFolders.push(newVal)
    }
    // this.onClearSelect()
    this.addCatFolder = false ;  this.newCatFolder = '' ;
  }

  onNewCat() {
      // Take currently selected category, find it in categoryFolder, add Category, update FS
    //  Take currently selected TaxCat and update map .. also update categoryTaxcat in FS
    this.curCategory.RKey = this.newCategory ;
    this.utilSvc.cLog(this.CLASSNAME, 'Got new Category: %s  Folder: %s  TaxCat: %O',
      this.newCategory, this.curCatFolderKey, this.curCategory) ;
    const categoryArr = this.categoryMap.get(this.curCatFolderKey)!   // Update map for this category
    const categoryTaxcat = new KeyVal(this.newCategory, this.curCategory.RVal)
    categoryArr.push(categoryTaxcat)    // Add to categories tied to this categoryFolder
    // this.categoryTaxcat.push(categoryTaxcat)   // Make sure our list is added to
    this.parmMod.emit({action: this.utilSvc.actionTypes.Add,
      parmType: this.utilSvc.globalTypes.CategoryTaxcats, newVal: categoryTaxcat, oldVal: categoryTaxcat}) ;
        // Done with Category/Taxcat, now do categoryFolder/category globals
    const catFolder = this.categoryFolders.find(dc => dc.RKey === this.curCatFolderKey)
    if (!catFolder) console.warn('Could not add new category to categoryFolder since catFolder not in categoryFolders')
    else {
      const origDCat = new KeyVal(catFolder.RKey, catFolder.RVal) // Save original
      catFolder.RVal += (catFolder.RVal === '') ? this.newCategory : this.catSeparator + this.newCategory
      this.parmMod.emit({action: this.utilSvc.actionTypes.Update,
        parmType: this.utilSvc.globalTypes.CategoryFolders, newVal: catFolder, oldVal: origDCat}) ;
    }
    // this.onClearSelect()
    this.addCategory = false ; this.newCategory = '' ;  this.curCatFolderKey = '' ;
      this.curCategory.RKey = '' ;  this.curCategory.RVal = '' ;
  }

  /** ************************************************************************
   * Future will be deleting categoryFolder if now 0 categories and maybe maybe
   *  update category ... but may need to first ck how many trans have
   *  category and should we update all of those
   ************************************************************************ */
  onUpdateCategory() {   // Updates as adds thru separate buttons/functions
    //  curCatFolder  curCategory   curCategory.RVal (taxcat)
    // Compare original catFolder w/new.  If diff
    //   Add category to new and delete from old (FB and data structures)
    // Compare original taxcat w/new.  If diff, modify FB and structures for taxcat
    this.utilSvc.cLog(this.CLASSNAME, 'onupdt curCatFolder: %O  origCatFolder: %O  curCat: %o  origCat: %O',
      this.curCatFolder, this.origCatFolder, this.curCategory, this.origCategory)
    if (this.curCatFolderKey !== this.origCatFolder.RKey) {    // Actions if catFolder changed
        // Find map entry for old category folder and new category folder
      const origCats = this.categoryMap.get(this.origCatFolder.RKey)! ;
      const newCats = this.categoryMap.get(this.curCatFolderKey)! ;
        // Find category in old categoryFolder map entry
      const idx = origCats.findIndex(catKv => catKv.RKey === this.curCatKey)
      newCats.push(origCats[idx])   // Push it into new category map entry
      origCats.splice(idx, 1) ;      // Remove it from old category map entry
      // Do the same for the catFolder data structure (aggregate string, not array here)
      const catFold = this.categoryFolders.find(cFold => cFold.RKey === this.curCatFolderKey)
      const origFold = this.categoryFolders.find(cFold => cFold.RKey === this.origCatFolder.RKey)
      if (!catFold || !origFold)
        this.utilSvc.cWarn(this.CLASSNAME, 'Could not find category as expected')
      else {
          // Add category to catFolder string and emit to update data base
        catFold.RVal += (catFold.RVal === '') ? this.curCatKey : this.catSeparator + this.curCatKey
        this.parmMod.emit({action: this.utilSvc.actionTypes.Update,
          parmType: this.utilSvc.globalTypes.CategoryFolders, newVal: catFold, oldVal: origFold}) ;
        const keyIdx = origFold.RVal.indexOf(this.curCatKey)  // Rmv category from old catFolder
        if (keyIdx < 0)
          this.utilSvc.cWarn(this.CLASSNAME, 'Could not find category: %s in original catFolder: %O', this.curCatKey, origFold)
        else {
          const rmvStr = (keyIdx === 0) ? this.curCatKey : this.catSeparator + this.curCatKey
          origFold.RVal = origFold.RVal.replace(rmvStr, '') // Remove this category for the catFolder
          this.parmMod.emit({action: this.utilSvc.actionTypes.Update,
            parmType: this.utilSvc.globalTypes.CategoryFolders, newVal: origFold, oldVal: origFold}) ;
        }
      }
    }
    if (this.curCategory.RVal !== this.origCategory.RVal) {   // Taxcat Changed, updt structure
      const curCatTaxcat = this.categoryTaxcat.find(ctc => ctc.RKey === this.curCatKey)
      if (!curCatTaxcat)
        this.utilSvc.cWarn(this.CLASSNAME, 'Could not find categoryTaxcat for category: %s', this.curCatKey)
      else {
        curCatTaxcat.RVal = this.curCategory.RVal
        this.parmMod.emit({action: this.utilSvc.actionTypes.Update,
          parmType: this.utilSvc.globalTypes.CategoryTaxcats, newVal: curCatTaxcat,
          oldVal: curCatTaxcat}) ;
      }
    }
    this.onClearSelect()
  }
}
