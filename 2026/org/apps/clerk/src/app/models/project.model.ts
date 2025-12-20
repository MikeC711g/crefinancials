export class Project {

  constructor(
    public House: string,
    public Cid: string,
    public StartDt: string,
    public EndDt: string,
    public Description: string,
    public ProjectId?: string ) {}
}
