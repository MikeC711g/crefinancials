export class GlobalX {

  constructor(
    public Cid: string,   // Company ID
    public RKey: string,  // Key value (only val or key in keyval pair)
    public RVal: string,  // Value in KeyVal pair (if applicable)
    public GlobalId?: string ) {}
}
