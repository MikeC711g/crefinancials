import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GenutilsService } from './../../../services/genutils.service';

@Component({
  selector: 'crefinancials-admlogging',
  standalone: true,
  imports: [FormsModule],
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
