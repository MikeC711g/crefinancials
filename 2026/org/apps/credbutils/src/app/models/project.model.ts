export class Project {

  constructor(
    public Cid: string,
    public House: string,
    public StartDt: string,
    public EndDt: string,
    public Description: string,
    public ProjectId?: string) {}
}
