import { Component, EventEmitter, Input, Output } from '@angular/core';
import { GenutilsService } from './../../../services/genutils.service';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'app-admlogging',
  templateUrl: './admlogging.component.html',
  styleUrls: ['./admlogging.component.css']
})
export class AdmloggingComponent  {
  @Input() logLevels: string[] = ['verbose', 'debug', 'log', 'warn', 'error'] ;
  @Input() className = '' ;
  @Input() level = 'log' ;
  @Output() logMod = new EventEmitter<{className: string, level: string}>() ;

  constructor(private utilSvc: GenutilsService) { }

  editClassLevel() {
    this.logMod.emit({className: this.className, level: this.level }) ;
  }
}
