import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FileSvcService {

  constructor() { }

  readJson($event: any): Observable<string> {
    // let files = $event.srcElement.files ;
    const getRecs = new Observable<string>((observer) => {
      let input = $event.target ;
      let reader = new FileReader() ;
      console.log(input.files[0]) ;
      reader.readAsText(input.files[0]) ;
      reader.onload = () => {
        let jsonData: string = reader.result as string;
        observer.next(jsonData) ;
      };

      reader.onerror = function () {
        console.log('error is occured while reading file!', input.files[0]);
        observer.error('Error reading file') ;
      };
    }) ;
    return getRecs ;
  }
}
