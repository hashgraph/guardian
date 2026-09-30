import 'reflect-metadata';
import assert from 'node:assert/strict';
import moduleAlias from 'module-alias';
import dotenv from 'dotenv';

dotenv.config();

moduleAlias.addAliases({
    '@api': process.cwd() + '/dist' + '/api',
    '@entity': process.cwd() + '/dist' + '/entity',
    '@helpers': process.cwd() + '/dist' + '/helpers',
    '@auth': process.cwd() + '/dist' + '/auth',
    '@policy-engine': process.cwd() + '/dist' + '/policy-engine',
    '@hedera-modules': process.cwd() + '/dist' + '/hedera-modules/index',
    '@document-loader': process.cwd() + '/dist' + '/document-loader',
    '@database-modules': process.cwd() + '/dist' + '/database-modules',
});

import { PolicyEngineEvents } from '@guardian/interfaces';
import { PolicyEngineService } from '../../dist/policy-engine/policy-engine.service.js';
import {
    DatabaseServer,
    DataBaseHelper,
    ensureOrm,
    restoreStubs,
    silentLogger,
    stub,
    stubProto,
} from '../_handler-harness.mjs';

const user = { hederaAccountId: '0.0.1001' };

/**
 * Register the real PolicyEngineService listeners against a capturing channel,
 * so the tests cover the wiring of the handlers and not only their bodies.
 */
function registerHandlers() {
    const handlers = {};
    const service = Object.create(PolicyEngineService.prototype);
    service.channel = {
        getMessages: (event, cb) => { handlers[event] = cb; },
        sendMessage: () => { },
    };
    service.policyEngine = {};
    service.registerListeners(silentLogger());
    return handlers;
}

describe('incoming requests handlers', () => {
    let handlers;

    before(() => {
        ensureOrm();
        handlers = registerHandlers();
    });

    afterEach(() => restoreStubs());

    describe('GET_REMOTE_REQUESTS', () => {
        const run = async (aggregateResult, options = {}, legacyRows = []) => {
            const pipelines = [];
            const reads = [];
            const batches = [];
            stubProto(DataBaseHelper, 'aggregate', async (pipeline) => {
                pipelines.push(pipeline);
                return aggregateResult;
            });
            stubProto(DataBaseHelper, 'count', async () => {
                throw new Error('the page is counted by the aggregation, not by a separate query');
            });
            stub(DatabaseServer, 'getRemoteRequest', async (filters) => {
                reads.push(filters);
                return { document: { type: 'from-n+1' } };
            });
            stub(DatabaseServer, 'getRemoteRequests', async (filters) => {
                batches.push(filters);
                return legacyRows;
            });
            stub(DatabaseServer, 'getPolicies', async () => [
                { id: 'p1', name: 'Policy 1', description: 'd', version: '1.0.0' }
            ]);
            const result = await handlers[PolicyEngineEvents.GET_REMOTE_REQUESTS]({
                options: { filters: {}, pageIndex: '0', pageSize: '10', ...options },
                user
            });
            return { result, pipelines, reads, batches };
        };

        const stageName = (stage) => Object.keys(stage)[0];

        it('matches the account before projecting', async () => {
            const { pipelines } = await run([{ items: [], total: [] }]);
            const names = pipelines[0].map(stageName);
            assert.ok(names.indexOf('$match') < names.indexOf('$project'));
            assert.deepEqual(pipelines[0][0].$match, { accountId: user.hederaAccountId });
        });

        it('takes the page and the total from one $facet over the grouped rows', async () => {
            const { result, pipelines } = await run([{
                items: [{ startMessageId: '1.1', policyId: 'p1', documentType: 'sign-vc', type: 'REQUEST' }],
                total: [{ count: 42 }]
            }]);
            assert.equal(pipelines.length, 1);
            const names = pipelines[0].map(stageName);
            assert.equal(names[names.length - 1], '$facet');
            assert.ok(names.indexOf('$group') < names.indexOf('$facet'));
            assert.deepEqual(Object.keys(pipelines[0][names.length - 1].$facet), ['items', 'total']);
            assert.equal(result.body.count, 42);
            assert.equal(result.body.items.length, 1);
            assert.equal(result.body.items[0].policyName, 'Policy 1');
        });

        it('reports a zero total for an empty result', async () => {
            const { result } = await run([{ items: [], total: [] }]);
            assert.equal(result.body.count, 0);
            assert.deepEqual(result.body.items, []);
        });

        it('does not read the request again for every row', async () => {
            const { result, reads } = await run([{
                items: [
                    { startMessageId: '1.1', policyId: 'p1', documentType: 'sign-vc', type: 'REQUEST' },
                    { startMessageId: '1.2', policyId: 'p1', documentType: 'create-topic', type: 'REQUEST' },
                ],
                total: [{ count: 2 }]
            }]);
            assert.equal(reads.length, 0);
            assert.deepEqual(result.body.items.map((r) => r.documentType), ['sign-vc', 'create-topic']);
            assert.deepEqual(result.body.items.map((r) => r.document.type), ['sign-vc', 'create-topic']);
        });

        it('loads the operation of legacy rows in one batched query', async () => {
            const { result, reads, batches } = await run([{
                items: [
                    { startMessageId: '1.1', policyId: 'p1', documentType: 'sign-vc', type: 'REQUEST' },
                    { startMessageId: '1.2', policyId: 'p1', type: 'REQUEST' },
                    { startMessageId: '1.3', policyId: 'p1', type: 'REQUEST' },
                    { startMessageId: '1.4', policyId: 'p1', type: 'REQUEST' },
                ],
                total: [{ count: 4 }]
            }], {}, [
                { startMessageId: '1.2', document: { type: 'create-topic' } },
                { startMessageId: '1.3', document: { type: 'generate-did' } },
            ]);
            assert.equal(reads.length, 0);
            assert.equal(batches.length, 1);
            assert.deepEqual(batches[0], { startMessageId: { $in: ['1.2', '1.3', '1.4'] }, status: 'NEW' });
            assert.deepEqual(result.body.items.map((r) => r.document.type), ['sign-vc', 'create-topic', 'generate-did', undefined]);
            assert.deepEqual(result.body.items.map((r) => r.documentType), ['sign-vc', 'create-topic', 'generate-did', undefined]);
        });

        it('does not query legacy rows when every row has documentType', async () => {
            const { batches, reads } = await run([{
                items: [{ startMessageId: '1.1', policyId: 'p1', documentType: 'sign-vc', type: 'REQUEST' }],
                total: [{ count: 1 }]
            }]);
            assert.equal(batches.length, 0);
            assert.equal(reads.length, 0);
        });

        it('applies skip and limit from the page parameters', async () => {
            const { pipelines } = await run([{ items: [], total: [] }], { pageIndex: '2', pageSize: '5' });
            const facet = pipelines[0][pipelines[0].length - 1].$facet;
            assert.deepEqual(facet.items, [{ $sort: { startMessageId: -1 } }, { $skip: 10 }, { $limit: 5 }]);
        });

        it('sorts by the requested field with startMessageId as a tie-breaker', async () => {
            const { pipelines } = await run([{ items: [], total: [] }], { sortField: 'createDate', sortDirection: 'asc' });
            const facet = pipelines[0][pipelines[0].length - 1].$facet;
            assert.deepEqual(facet.items[0], { $sort: { createDate: 1, startMessageId: -1 } });
        });

        it('ignores a sort field that is not allowed', async () => {
            const { pipelines } = await run([{ items: [], total: [] }], { sortField: 'document.secret', sortDirection: 'asc' });
            const facet = pipelines[0][pipelines[0].length - 1].$facet;
            assert.deepEqual(facet.items[0], { $sort: { startMessageId: -1 } });
        });

        it('matches policy and type before grouping and status after it', async () => {
            const { pipelines } = await run([{ items: [], total: [] }], {
                filters: { policyId: 'p1', status: 'NEW', type: 'REQUEST' }
            });
            const pipeline = pipelines[0];
            const names = pipeline.map(stageName);
            assert.deepEqual(pipeline[0].$match, { accountId: user.hederaAccountId, policyId: 'p1', type: 'REQUEST' });
            const last = pipeline[names.lastIndexOf('$match')].$match;
            assert.deepEqual(last, { status: 'NEW' });
            assert.ok(names.lastIndexOf('$match') > names.indexOf('$group'));
            assert.equal(names.indexOf('$match'), 0);
            assert.equal(names.filter((n) => n === '$match').length, 2);
        });
    });

    describe('GET_REMOTE_REQUEST_DOCUMENT', () => {
        const run = async (rows) => {
            stub(DatabaseServer, 'getRemoteRequests', async () => rows);
            const result = await handlers[PolicyEngineEvents.GET_REMOTE_REQUEST_DOCUMENT]({
                options: { startMessageId: '1.1' },
                user
            });
            return result.body;
        };

        it('prefers ERROR over every other status', async () => {
            const rows = [
                { status: 'COMPLETED', id: 'completed' },
                { status: 'REJECTED', id: 'rejected' },
                { status: 'ERROR', id: 'error' },
                { status: 'NEW', id: 'new' },
            ];
            assert.equal((await run(rows)).id, 'error');
        });

        it('follows the ERROR > CANCELED > REJECTED > COMPLETED precedence', async () => {
            assert.equal((await run([
                { status: 'NEW', id: 'new' },
                { status: 'COMPLETED', id: 'completed' },
                { status: 'REJECTED', id: 'rejected' },
                { status: 'CANCELED', id: 'canceled' },
            ])).id, 'canceled');
            assert.equal((await run([
                { status: 'NEW', id: 'new' },
                { status: 'COMPLETED', id: 'completed' },
                { status: 'REJECTED', id: 'rejected' },
            ])).id, 'rejected');
            assert.equal((await run([
                { status: 'NEW', id: 'new' },
                { status: 'COMPLETED', id: 'completed' },
            ])).id, 'completed');
        });

        it('keeps the most recent row of the winning status', async () => {
            const rows = [
                { status: 'ERROR', id: 'newest' },
                { status: 'ERROR', id: 'older' },
            ];
            assert.equal((await run(rows)).id, 'newest');
        });

        it('falls back to the first row when no status has priority', async () => {
            assert.equal((await run([{ status: 'NEW', id: 'new' }])).id, 'new');
        });
    });

    describe('GET_REMOTE_REQUESTS_COUNT', () => {
        it('computes every counter in one aggregation', async () => {
            const pipelines = [];
            stubProto(DataBaseHelper, 'aggregate', async (pipeline) => {
                pipelines.push(pipeline);
                return [{ requestsCount: 3, actionsCount: 2, delayCount: 1, total: 9 }];
            });
            stubProto(DataBaseHelper, 'count', async () => {
                throw new Error('counters are computed by the aggregation, not by separate queries');
            });
            stub(DatabaseServer, 'getRemoteRequestsCount', async () => {
                throw new Error('counters are computed by the aggregation, not by separate queries');
            });

            const result = await handlers[PolicyEngineEvents.GET_REMOTE_REQUESTS_COUNT]({
                options: { filters: {}, policyId: 'p1' },
                user
            });

            assert.equal(pipelines.length, 1);
            assert.deepEqual(pipelines[0][0].$match, { accountId: user.hederaAccountId, policyId: 'p1' });
            assert.deepEqual(result.body, { requestsCount: 3, actionsCount: 2, delayCount: 1, total: 9 });
        });

        it('returns zeros when the account has no rows', async () => {
            stubProto(DataBaseHelper, 'aggregate', async () => []);
            const result = await handlers[PolicyEngineEvents.GET_REMOTE_REQUESTS_COUNT]({
                options: { filters: {} },
                user
            });
            assert.deepEqual(result.body, { requestsCount: 0, actionsCount: 0, delayCount: 0, total: 0 });
        });
    });
});
