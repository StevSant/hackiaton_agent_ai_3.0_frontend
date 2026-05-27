// Stable import path for the active environment. Angular swaps the underlying file
// per build via `fileReplacements` in angular.json:
//   development → src/environments/environment.ts      (backendUrl = http://localhost:8000)
//   production  → src/environments/environment.prod.ts (backendUrl = Cloud Run URL)
// Feature code keeps importing from 'core/config/env' — do NOT hardcode URLs here.
export { environment } from '../../../environments/environment';
