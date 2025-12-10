import { HttpException, HttpStatus } from '@nestjs/common';
import { IAuthUser, PinoLogger } from '@guardian/common';
import { IOwner, PolicyHelper, UserRole } from '@guardian/interfaces';
import { PolicyEngine } from './policy-engine.js';

interface MessageError extends Error {
    code: number;
}

/**
 * Find all field values in object by field name
 * @param obj
 * @param name
 */
export function findAllEntities(obj: { [key: string]: any }, name: string): string[] {
    const result = [];

    const finder = (o: { [key: string]: any }): void => {
        if (!o) {
            return;
        }
        if (o.hasOwnProperty(name)) {
            result.push(o[name]);
        }

        if (o.hasOwnProperty('children')) {
            for (const child of o.children) {
                finder(child);
            }
        }
    }
    finder(obj);

    const map = {};
    for (const r of result) {
        map[r] = r;
    }
    return Object.values(map);
}

/**
 * Replace all field values by field name
 * @param obj
 * @param name
 * @param oldValue
 * @param newValue
 */
export function replaceAllEntities(
    obj: { [key: string]: any },
    name: string,
    oldValue: string,
    newValue: string
): void {
    const finder = (o: { [key: string]: any }): void => {
        if (o.hasOwnProperty(name) && o[name] === oldValue) {
            o[name] = newValue;
        }

        if (o.hasOwnProperty('children')) {
            for (const child of o.children) {
                finder(child);
            }
        }
    }
    finder(obj);
}

/**
 * Pars int
 * @param value
 */
export function parseInteger(value: any): number | undefined {
    if (typeof value === 'string') {
        const result = Number.parseInt(value, 10);
        if (Number.isFinite(result)) {
            return result;
        } else {
            return undefined;
        }
    }
    if (typeof value === 'number') {
        if (Number.isFinite(value)) {
            return Math.floor(value);
        } else {
            return undefined;
        }
    }
    return undefined;
}

export const ONLY_SR = ' Only users with the Standard Registry role are allowed to make the request.';

/**
 * Generate HttpException
 * @param error
 * @param logger
 */
export async function InternalException(error: HttpException | string | MessageError, logger: PinoLogger, userId: string = null) {
    await logger.error(error, ['API_GATEWAY'], userId);
    if (error instanceof HttpException) {
        throw error;
    } else if (typeof error === 'string') {
        throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    } else {
        if (error.code) {
            throw new HttpException(error.message, error.code);
        } else {
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    };
}

/**
 * Check policy
 * @param policyId
 * @param owner
 */
export async function checkPolicyByRecord(policyId: string, owner: IOwner): Promise<any> {
    const policy = await (new PolicyEngine().accessPolicy(policyId, owner, 'read'));
    if (!PolicyHelper.isDryRunMode(policy)) {
        throw new HttpException('Invalid status.', HttpStatus.FORBIDDEN)
    }
    return policy;
}

/**
 * Check policy
 * @param policyId
 * @param owner
 */
export function getParentUser(user: IAuthUser): string {
    if (user.role === UserRole.STANDARD_REGISTRY) {
        return user.did;
    } else {
        return user.parent;
    }
}

export function parseSavepointIdsJson(json?: string): string[] | undefined {
    if (!json) {
        return undefined;
    }

    let parsed: unknown;

    try {
        parsed = JSON.parse(json);
    } catch {
        throw new HttpException(
            'Query param "savepointIds" must be a JSON array of strings.',
            HttpStatus.BAD_REQUEST
        );
    }

    if (!Array.isArray(parsed)) {
        throw new HttpException(
            'Query param "savepointIds" must be a JSON array of strings.',
            HttpStatus.BAD_REQUEST
        );
    }

    const ids = parsed.filter((v) => typeof v === 'string' && v.trim().length > 0) as string[];

    if (ids.length === 0) {
        return undefined;
    }

    return Array.from(new Set(ids));
}
