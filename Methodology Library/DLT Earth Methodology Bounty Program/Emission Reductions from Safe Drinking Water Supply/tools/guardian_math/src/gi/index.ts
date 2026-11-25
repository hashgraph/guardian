import { randomUUID } from 'node:crypto';
export function GenerateUUIDv4(): string { return randomUUID(); }
export * from './table-field-core.js';
export * from './interface/table-field.interface.js';
