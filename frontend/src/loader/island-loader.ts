// Vite entry `src/loader/island-loader.ts` (contract.md §5). Every page loads it through
// <t:assets/>; it costs nothing when the page has no `[data-island]` element.
import 'vite/modulepreload-polyfill'
import { mountIslands, registryFromGlob, type IslandModule } from './mount-islands'

const registry = registryFromGlob(import.meta.glob<IslandModule>('../islands/*/index.tsx'))

void mountIslands({ registry })
