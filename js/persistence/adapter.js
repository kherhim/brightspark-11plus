// Persistence adapter contract. The app talks to `activeAdapter` only —
// never to localStorage directly — so optional cloud sync can be added
// later by implementing this same interface in a cloudAdapter.js and
// pointing `activeAdapter` at it (last-writer-wins on state.updatedAt).
//
// PersistenceAdapter = {
//   name: string,
//   isAvailable() -> boolean,
//   load()        -> Promise<stateObject>,
//   save(state)   -> Promise<boolean>,
//   clear()       -> Promise<stateObject>,
//   meta()        -> { synced:boolean, lastSyncAt:number|null, deviceId:string|null }
// }

import { localAdapter } from "./localAdapter.js";

export const activeAdapter = localAdapter;
