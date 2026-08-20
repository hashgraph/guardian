import * as fs from 'node:fs';

const raw = fs.readFileSync('./package.json', 'utf8');
export const guardianVersion = JSON.parse(raw).version;