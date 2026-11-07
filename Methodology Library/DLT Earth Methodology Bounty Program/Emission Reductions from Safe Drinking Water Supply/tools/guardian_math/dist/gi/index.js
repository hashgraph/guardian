import { randomUUID } from 'node:crypto';
export function GenerateUUIDv4() { return randomUUID(); }
export * from './table-field-core.js';
export * from './interface/table-field.interface.js';
