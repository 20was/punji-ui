import { fileURLToPath } from 'node:url';

// Punji UI needs no Next.js configuration. The root setting only keeps Next from treating a parent folder's
// lockfile as the workspace root when this starter sits inside another project.
export default { turbopack: { root: fileURLToPath(new URL('.', import.meta.url)) } };
