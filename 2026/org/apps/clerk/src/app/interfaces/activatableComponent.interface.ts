import { Observable  } from "rxjs" ;

// activatableComponent.interface.ts
export interface ActivatableComponent {
  canActivate: () => boolean | Observable<boolean>
}
