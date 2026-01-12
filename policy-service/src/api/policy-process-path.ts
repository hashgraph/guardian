import { fileURLToPath } from 'node:url';
import path from 'node:path';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

/**
 * Policy module path
 */
export const POLICY_PROCESS_PATH = path.join(dirname, 'policy-process');
