import * as fs from 'fs';

const raw = fs.readFileSync('./package.json', 'utf-8');
export const guardianVersion = JSON.parse(raw).version;