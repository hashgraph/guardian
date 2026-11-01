import ObjGet from 'lodash.get';
import ObjSet from 'lodash.set';
import { ObjectId } from '@mikro-orm/mongodb';

export class PreviewQueryUnsupportedError extends Error {
    constructor(message: string) {
        super(`Calculation preview cannot evaluate this query: ${message}`);
        this.name = 'PreviewQueryUnsupportedError';
    }
}

export type PreviewSortOrder = [string, 1 | -1][];

const MISSING = Symbol('missing');

const EMPTY_ARRAY = Symbol('empty-array');

const GROUP_OPERATORS = new Set(['$and', '$or', '$nor']);

const FIELD_OPERATORS = new Set(['$eq', '$ne', '$in', '$nin', '$gt', '$gte', '$lt', '$lte', '$regex', '$exists', '$re', '$not']);

function isPlainRecord(value: unknown): value is Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function isObjectId(value: unknown): value is ObjectId {
    return value instanceof ObjectId || (!!value && typeof value === 'object' && Reflect.get(value, '_bsontype') === 'ObjectId');
}

function isOperatorObject(value: unknown): value is Record<string, unknown> {
    if (!isPlainRecord(value)) {
        return false;
    }
    const keys = Object.keys(value);
    return keys.length > 0 && keys.every((key) => key.startsWith('$'));
}

function toObjectId(value: unknown): unknown {
    if (isObjectId(value)) {
        return value;
    }
    if (typeof value === 'string' && /^[0-9a-f]{24}$/i.test(value)) {
        return new ObjectId(value);
    }
    if (Array.isArray(value)) {
        return value.map(toObjectId);
    }
    if (isPlainRecord(value)) {
        const result: Record<string, unknown> = {};
        for (const [key, item] of Object.entries(value)) {
            result[key] = toObjectId(item);
        }
        return result;
    }
    return value;
}

function normalizeParam(value: unknown): unknown {
    if (value === undefined) {
        return null;
    }
    if (Array.isArray(value)) {
        return value.map(normalizeParam);
    }
    if (isPlainRecord(value)) {
        const result: Record<string, unknown> = {};
        for (const [key, item] of Object.entries(value)) {
            result[key] = normalizeParam(item);
        }
        return result;
    }
    return value;
}

function normalizeFieldValue(value: unknown): unknown {
    if (Array.isArray(value)) {
        return { $in: value };
    }
    if (isPlainRecord(value)) {
        if (!isOperatorObject(value)) {
            throw new PreviewQueryUnsupportedError('a sub-document equality');
        }
        const result: Record<string, unknown> = {};
        for (const [operator, operand] of Object.entries(value)) {
            if (!FIELD_OPERATORS.has(operator)) {
                throw new PreviewQueryUnsupportedError(`the operator ${operator}`);
            }
            if (operator === '$re') {
                result.$regex = new RegExp(String(operand));
            } else if (operator === '$not') {
                if (!(operand instanceof RegExp) && !isOperatorObject(operand)) {
                    throw new PreviewQueryUnsupportedError('$not without an operator');
                }
                result.$not = operand instanceof RegExp ? operand : normalizeFieldValue(operand);
            } else {
                result[operator] = operand;
            }
        }
        return result;
    }
    return value;
}

function normalizeFilterObject(filter: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(filter)) {
        if (GROUP_OPERATORS.has(key)) {
            if (!Array.isArray(raw) || !raw.every(isPlainRecord)) {
                throw new PreviewQueryUnsupportedError(`the value of ${key}`);
            }
            result[key] = raw.map((item) => normalizeFilterObject(item));
            continue;
        }
        if (key.startsWith('$')) {
            throw new PreviewQueryUnsupportedError(`the operator ${key}`);
        }
        const name = key === 'id' ? '_id' : key;
        let value = normalizeFieldValue(normalizeParam(raw));
        if (name === '_id') {
            value = toObjectId(value);
        }
        result[name] = value;
    }
    return result;
}

export function normalizePreviewFilter(filter: unknown): Record<string, unknown> {
    if (typeof filter === 'string' || isObjectId(filter)) {
        return { _id: toObjectId(filter) };
    }
    if (filter === null || filter === undefined) {
        return {};
    }
    if (!isPlainRecord(filter)) {
        throw new PreviewQueryUnsupportedError('a filter that is not an object');
    }
    return normalizeFilterObject(filter);
}

function collectPathValues(node: unknown, parts: string[], index: number, out: unknown[]): void {
    if (index === parts.length) {
        out.push(node);
        return;
    }
    const part = parts[index];
    if (Array.isArray(node)) {
        if (/^\d+$/.test(part) && Number(part) < node.length) {
            const element = node[Number(part)];
            if (index + 1 === parts.length || isPlainRecord(element) || Array.isArray(element)) {
                collectPathValues(element, parts, index + 1, out);
            }
        }
        for (const element of node) {
            if (isPlainRecord(element)) {
                collectPathValues(element, parts, index, out);
            }
        }
        return;
    }
    if (isPlainRecord(node) && Object.prototype.hasOwnProperty.call(node, part) && node[part] !== undefined) {
        collectPathValues(node[part], parts, index + 1, out);
        return;
    }
    out.push(MISSING);
}

function getPathValues(record: unknown, path: string): unknown[] {
    const out: unknown[] = [];
    collectPathValues(record, path.split('.'), 0, out);
    return out;
}

function typeRank(value: unknown): number {
    if (value === EMPTY_ARRAY) {
        return 0;
    }
    if (value === MISSING || value === null || value === undefined) {
        return 1;
    }
    if (typeof value === 'number') {
        return 2;
    }
    if (typeof value === 'string') {
        return 3;
    }
    if (isObjectId(value)) {
        return 7;
    }
    if (typeof value === 'boolean') {
        return 8;
    }
    if (value instanceof Date) {
        return 9;
    }
    if (value instanceof RegExp) {
        return 11;
    }
    if (Array.isArray(value)) {
        return 5;
    }
    if (isPlainRecord(value)) {
        return 4;
    }
    throw new PreviewQueryUnsupportedError(`a value of type ${typeof value}`);
}

function compareStrings(a: string, b: string): number {
    const left = Buffer.from(a, 'utf8');
    const right = Buffer.from(b, 'utf8');
    return Buffer.compare(left, right);
}

function compareValues(a: unknown, b: unknown): number {
    const rankA = typeRank(a);
    const rankB = typeRank(b);
    if (rankA !== rankB) {
        return rankA < rankB ? -1 : 1;
    }
    switch (rankA) {
        case 0:
        case 1:
            return 0;
        case 2: {
            const left = Number(a);
            const right = Number(b);
            if (Number.isNaN(left) || Number.isNaN(right)) {
                return Number.isNaN(left) === Number.isNaN(right) ? 0 : Number.isNaN(left) ? -1 : 1;
            }
            return left === right ? 0 : left < right ? -1 : 1;
        }
        case 3:
            return compareStrings(String(a), String(b));
        case 7:
            return compareStrings(String(a), String(b));
        case 8:
            return a === b ? 0 : a ? 1 : -1;
        case 9: {
            const left = (a as Date).getTime();
            const right = (b as Date).getTime();
            return left === right ? 0 : left < right ? -1 : 1;
        }
        case 5: {
            const left = a as unknown[];
            const right = b as unknown[];
            for (let i = 0; i < Math.min(left.length, right.length); i++) {
                const result = compareValues(left[i], right[i]);
                if (result !== 0) {
                    return result;
                }
            }
            return left.length === right.length ? 0 : left.length < right.length ? -1 : 1;
        }
        case 4: {
            const left = Object.entries(a as Record<string, unknown>);
            const right = Object.entries(b as Record<string, unknown>);
            for (let i = 0; i < Math.min(left.length, right.length); i++) {
                const key = compareStrings(left[i][0], right[i][0]);
                if (key !== 0) {
                    return key;
                }
                const result = compareValues(left[i][1], right[i][1]);
                if (result !== 0) {
                    return result;
                }
            }
            return left.length === right.length ? 0 : left.length < right.length ? -1 : 1;
        }
        default:
            throw new PreviewQueryUnsupportedError('a comparison of regular expressions');
    }
}

function isEqualValue(candidate: unknown, operand: unknown): boolean {
    if (operand instanceof RegExp) {
        return matchesRegex(candidate, operand);
    }
    if (operand === null) {
        if (candidate === MISSING || candidate === null) {
            return true;
        }
        return Array.isArray(candidate) && candidate.some((item) => item === null);
    }
    if (candidate === MISSING) {
        return false;
    }
    if (Array.isArray(candidate)) {
        if (Array.isArray(operand) && compareValues(candidate, operand) === 0) {
            return true;
        }
        return candidate.some((item) => typeRank(item) === typeRank(operand) && compareValues(item, operand) === 0);
    }
    return typeRank(candidate) === typeRank(operand) && compareValues(candidate, operand) === 0;
}

function matchesRegex(candidate: unknown, pattern: RegExp): boolean {
    if (typeof candidate === 'string') {
        return new RegExp(pattern.source, pattern.flags.replace('g', '')).test(candidate);
    }
    if (Array.isArray(candidate)) {
        return candidate.some((item) => matchesRegex(item, pattern));
    }
    return false;
}

function matchesRange(candidate: unknown, operator: string, operand: unknown): boolean {
    if (Array.isArray(operand) || isPlainRecord(operand) || operand instanceof RegExp) {
        throw new PreviewQueryUnsupportedError(`${operator} with a ${Array.isArray(operand) ? 'list' : 'complex'} value`);
    }
    if (Array.isArray(candidate)) {
        return candidate.some((item) => matchesRange(item, operator, operand));
    }
    if (operand === null) {
        if (operator === '$gte' || operator === '$lte') {
            return candidate === MISSING || candidate === null;
        }
        return false;
    }
    if (candidate === MISSING || typeRank(candidate) !== typeRank(operand)) {
        return false;
    }
    const result = compareValues(candidate, operand);
    switch (operator) {
        case '$gt':
            return result > 0;
        case '$gte':
            return result >= 0;
        case '$lt':
            return result < 0;
        default:
            return result <= 0;
    }
}

function toRegExp(operand: unknown): RegExp {
    if (operand instanceof RegExp) {
        return operand;
    }
    if (typeof operand === 'string') {
        return new RegExp(operand);
    }
    throw new PreviewQueryUnsupportedError('$regex with a value that is not text');
}

function matchesInList(candidates: unknown[], operand: unknown): boolean {
    if (!Array.isArray(operand)) {
        throw new PreviewQueryUnsupportedError('$in or $nin without a list');
    }
    return operand.some((item) => candidates.some((candidate) => isEqualValue(candidate, item)));
}

function matchesField(record: unknown, path: string, condition: unknown): boolean {
    const candidates = getPathValues(record, path);
    if (condition instanceof RegExp) {
        return candidates.some((candidate) => matchesRegex(candidate, condition));
    }
    if (!isOperatorObject(condition)) {
        return candidates.some((candidate) => isEqualValue(candidate, condition));
    }
    for (const [operator, operand] of Object.entries(condition)) {
        let matched: boolean;
        switch (operator) {
            case '$eq':
                matched = candidates.some((candidate) => isEqualValue(candidate, operand));
                break;
            case '$ne':
                matched = !candidates.some((candidate) => isEqualValue(candidate, operand));
                break;
            case '$in':
                matched = matchesInList(candidates, operand);
                break;
            case '$nin':
                matched = !matchesInList(candidates, operand);
                break;
            case '$gt':
            case '$gte':
            case '$lt':
            case '$lte':
                matched = candidates.some((candidate) => matchesRange(candidate, operator, operand));
                break;
            case '$regex': {
                const pattern = toRegExp(operand);
                matched = candidates.some((candidate) => matchesRegex(candidate, pattern));
                break;
            }
            case '$exists':
                matched = candidates.some((candidate) => candidate !== MISSING) === !!operand;
                break;
            case '$not':
                matched = !matchesField(record, path, operand);
                break;
            default:
                throw new PreviewQueryUnsupportedError(`the operator ${operator}`);
        }
        if (!matched) {
            return false;
        }
    }
    return true;
}

export function matchesPreviewFilter(record: unknown, filter: Record<string, unknown>): boolean {
    for (const [key, condition] of Object.entries(filter)) {
        if (key === '$and') {
            if (!(condition as Record<string, unknown>[]).every((item) => matchesPreviewFilter(record, item))) {
                return false;
            }
            continue;
        }
        if (key === '$or') {
            if (!(condition as Record<string, unknown>[]).some((item) => matchesPreviewFilter(record, item))) {
                return false;
            }
            continue;
        }
        if (key === '$nor') {
            if ((condition as Record<string, unknown>[]).some((item) => matchesPreviewFilter(record, item))) {
                return false;
            }
            continue;
        }
        if (!matchesField(record, key, condition)) {
            return false;
        }
    }
    return true;
}

function toDirection(value: unknown): 1 | -1 {
    if (value === 1 || value === 'ASC' || value === 'asc') {
        return 1;
    }
    if (value === -1 || value === 'DESC' || value === 'desc') {
        return -1;
    }
    throw new PreviewQueryUnsupportedError(`the sort direction ${String(value)}`);
}

export function normalizePreviewOrder(orderBy: unknown): PreviewSortOrder {
    const order: PreviewSortOrder = [];
    const items = Array.isArray(orderBy) ? orderBy : orderBy ? [orderBy] : [];
    for (const item of items) {
        if (!isPlainRecord(item)) {
            throw new PreviewQueryUnsupportedError('a sort that is not an object');
        }
        for (const [key, direction] of Object.entries(item)) {
            order.push([key === 'id' ? '_id' : key, toDirection(direction)]);
        }
    }
    return order;
}

function collectSortValues(node: unknown, parts: string[], index: number, out: unknown[]): void {
    if (index === parts.length) {
        out.push(node);
        return;
    }
    const part = parts[index];
    if (Array.isArray(node)) {
        if (/^\d+$/.test(part)) {
            if (Number(part) < node.length) {
                collectSortValues(node[Number(part)], parts, index + 1, out);
            } else {
                out.push(MISSING);
            }
            return;
        }
        if (!node.length) {
            out.push(MISSING);
        }
        for (const element of node) {
            if (isPlainRecord(element)) {
                collectSortValues(element, parts, index, out);
            } else {
                out.push(MISSING);
            }
        }
        return;
    }
    if (isPlainRecord(node) && Object.prototype.hasOwnProperty.call(node, part) && node[part] !== undefined) {
        collectSortValues(node[part], parts, index + 1, out);
        return;
    }
    out.push(MISSING);
}

function getSortKey(record: unknown, path: string, direction: 1 | -1): unknown {
    const values: unknown[] = [];
    const candidates: unknown[] = [];
    collectSortValues(record, path.split('.'), 0, candidates);
    for (const candidate of candidates) {
        if (Array.isArray(candidate)) {
            values.push(...(candidate.length ? candidate : [EMPTY_ARRAY]));
        } else {
            values.push(candidate);
        }
    }
    return values.reduce((best, value) => {
        const result = compareValues(value, best);
        return (direction === 1 ? result < 0 : result > 0) ? value : best;
    });
}

export function comparePreviewRecords(a: unknown, b: unknown, order: PreviewSortOrder): number {
    for (const [path, direction] of order) {
        const result = compareValues(getSortKey(a, path, direction), getSortKey(b, path, direction));
        if (result !== 0) {
            return result * direction;
        }
    }
    return 0;
}

export function buildPreviewDocumentCache(document: unknown, fields: string[] | null | undefined): Record<string, unknown> | null {
    if (!fields) {
        return null;
    }
    const cache: Record<string, unknown> = {};
    const limit = +process.env.DOCUMENT_CACHE_FIELD_LIMIT || 100;
    for (const field of fields) {
        const value = ObjGet(document, field);
        if (typeof value === 'number' || (typeof value === 'string' && value.length < limit)) {
            ObjSet(cache, field, value);
        }
    }
    return cache;
}
