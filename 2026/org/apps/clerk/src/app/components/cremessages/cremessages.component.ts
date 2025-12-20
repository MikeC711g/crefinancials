import { Component, Input, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'crefinancials-cremessages',
  standalone: true,
  imports: [],
  templateUrl: './cremessages.component.html',
  styleUrls: ['./cremessages.component.css']
})
export class CremessagesComponent  {
  @Input() dispMsgs: string[] = [] ;
  @Output() msgDel = new EventEmitter<{idx: number, msg: string}>() ;

  onDelete(inIdx: number) {
    this.msgDel.emit({idx: inIdx, msg: this.dispMsgs[inIdx]} )
  }
}
