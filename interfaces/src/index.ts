import EventEmitter from 'events';
import fs, { WatchOptions } from 'fs';
import 'reflect-metadata';

declare class FSWatcher extends EventEmitter implements fs.FSWatcher {
    options: WatchOptions

    ref(): this; // <-- added
    unref(): this; // <-- added

    close(): void;

    /**
     * events.EventEmitter
     *   1. change
     *   2. error
     */
    addListener(event: string, listener: (...args: any[]) => void): this;
    addListener(event: 'change', listener: (eventType: string, filename: string | Buffer) => void): this;
    addListener(event: 'error', listener: (error: Error) => void): this;
    addListener(event: 'close', listener: () => void): this;

    on(event: string, listener: (...args: any[]) => void): this;
    on(event: 'change', listener: (eventType: string, filename: string | Buffer) => void): this;
    on(event: 'error', listener: (error: Error) => void): this;
    on(event: 'close', listener: () => void): this;

    once(event: string, listener: (...args: any[]) => void): this;
    once(event: 'change', listener: (eventType: string, filename: string | Buffer) => void): this;
    once(event: 'error', listener: (error: Error) => void): this;
    once(event: 'close', listener: () => void): this;

    prependListener(event: string, listener: (...args: any[]) => void): this;
    prependListener(event: 'change', listener: (eventType: string, filename: string | Buffer) => void): this;
    prependListener(event: 'error', listener: (error: Error) => void): this;
    prependListener(event: 'close', listener: () => void): this;

    prependOnceListener(event: string, listener: (...args: any[]) => void): this;
    prependOnceListener(event: 'change', listener: (eventType: string, filename: string | Buffer) => void): this;
    prependOnceListener(event: 'error', listener: (error: Error) => void): this;
    prependOnceListener(event: 'close', listener: () => void): this;
}

export * from './type';
export * from './interface';
export * from './helpers';
export * from './models';
export * from './errors';
