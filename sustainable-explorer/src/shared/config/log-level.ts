import { LogLevel } from '@nestjs/common';

/**
 * Translates the `LOG_LEVEL` env var into the NestJS logger level array.
 * Cumulative: each level includes all higher-priority ones.
 */
export function resolveNestLogLevels(): LogLevel[] {
    const level = (process.env.LOG_LEVEL || 'info').toLowerCase();
    switch (level) {
        case 'error':   return ['error'];
        case 'warn':    return ['error', 'warn'];
        case 'info':    return ['error', 'warn', 'log'];
        case 'debug':   return ['error', 'warn', 'log', 'debug'];
        case 'verbose': return ['error', 'warn', 'log', 'debug', 'verbose'];
        default:        return ['error', 'warn', 'log'];
    }
}
