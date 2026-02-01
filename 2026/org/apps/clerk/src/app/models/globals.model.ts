export class Globals {    // Global object for globals table
  constructor(
    public Cid: string,   // Company ID
    public GType: string, // Global Type
    public RKey: string,  // Key value (only val or key in keyval pair)
    public RVal?: string,  // Value in KeyVal pair (if applicable)
    public GlobalId?: string ) {}
}

export class globInfo { // Global type for generic global updates
  constructor(
    public collectNm: string, // Collection name
    public idVar: string,     // ID variable
    public sortVar: string,   // Sort variable
    public flds2Del?: string[] // Fields to delete
  ) {}
}

export class KeyVal {   // Representation of a KeyValue pair

  constructor(
    public RKey: string,
    public RVal: string) {}
}

export interface  objwCid  {  // Object with Cid which is used in geneeric global processing
  Cid: string,
  [key: string]: string; }

export interface genHelpers {  // If handling globals, this is the interface for special processing
  action: string,   // add, update, delete
  gType: string,  // global type
  newRow: objwCid,  // Modified row
  oldRow: objwCid,  // Original row
  objArr: objwCid[],  // Array containing row
}

export class MsgInfo {    // Allows services to return all info needed
  constructor(
    public childMsg: string,
    public tranId: string) {}
}
