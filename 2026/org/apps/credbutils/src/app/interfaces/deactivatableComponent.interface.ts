import { Observable  } from "rxjs" ;

// deactivatableComponent.interface.ts
export interface DeactivatableComponent {
  canDeactivate: () => boolean | Observable<boolean>
}
