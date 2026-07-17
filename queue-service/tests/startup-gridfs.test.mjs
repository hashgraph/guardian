import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Regression guard for #1385.
//
// queue-service persists `TaskEntity`, whose @BeforeCreate offloads large `data`
// (> TASK_DATA_GRIDFS_LIMIT, 5MB) to GridFS via `_createFile` ->
// `DataBaseHelper.gridFS.openUploadStream`. If the process never calls
// `DatabaseServer.connectGridFS()`, `DataBaseHelper.gridFS` is undefined and publishing a
// large / tool-heavy policy (e.g. AMS-IIIv5, VM0051) crashes the enqueue with
// "Cannot read properties of undefined (reading 'openUploadStream')".
//
// guardian-service and policy-service already connect GridFS at startup; queue-service did
// not (the #1231 offload change wired the entity but not the connection). The bootstrap in
// app.ts is a top-level IIFE that connects to Mongo/NATS on import, so it cannot be imported
// in a unit test — we assert the wiring at the source level instead.
describe('queue-service startup wiring (#1385)', () => {
    const appSrc = readFileSync(new URL('../src/app.ts', import.meta.url), 'utf8');

    it('connects the DB at startup', () => {
        assert.match(appSrc, /DatabaseServer\.connectBD\s*\(/);
    });

    it('connects GridFS so TaskEntity can offload large task payloads', () => {
        assert.match(
            appSrc,
            /DatabaseServer\.connectGridFS\s*\(/,
            'queue-service must call DatabaseServer.connectGridFS() at startup (see #1385)'
        );
    });

    it('connects GridFS after the DB (connectGridFS reads the ORM set by connectBD)', () => {
        const bd = appSrc.indexOf('connectBD');
        const grid = appSrc.indexOf('connectGridFS');
        assert.ok(
            bd !== -1 && grid !== -1 && grid > bd,
            'connectGridFS() must be called after connectBD() because it reads DataBaseHelper.orm'
        );
    });
});
