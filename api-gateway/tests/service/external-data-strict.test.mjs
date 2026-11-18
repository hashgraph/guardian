import 'reflect-metadata';
import assert from 'node:assert/strict';
import esmock from 'esmock';
import { HttpException, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

describe('external data strict HTTP replies', function () {
    this.timeout(60000);
    let app;
    let server;
    let outcome;
    let calls;
    let swagger;

    before(async () => {
        class Logger {}
        class Document {}
        const { ExternalApi } = await esmock('../../dist/api/service/external.js', {
            '#helpers': {
                InternalException: async (error) => { throw new HttpException(error.message, error.code ?? 500); },
                PolicyEngine: class {
                    async receiveExternalData(...args) { return invoke('tag', args); }
                    async receiveExternalDataCustom(...args) { return invoke('custom', args); }
                },
            },
            '#middlewares': {
                Examples: { DB_ID: 'policy' }, ObjectExamples: {},
                ExternalDocumentDTO: Document, InternalServerErrorDTO: class {}, ResponseDTOWithSyncEvents: class {},
            },
            '@guardian/common/helpers/pino-logger': { PinoLogger: Logger },
        });
        function invoke(route, args) {
            calls.push({ route, args });
            if (outcome instanceof Error) throw outcome;
            return outcome;
        }
        class Application {}
        Module({ controllers: [ExternalApi], providers: [{ provide: Logger, useValue: {} }] })(Application);
        app = await NestFactory.create(Application, new FastifyAdapter(), { logger: false });
        await app.init();
        server = app.getHttpAdapter().getInstance();
        await server.ready();
        swagger = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('API').setVersion('1').build());
    });

    beforeEach(() => { calls = []; outcome = true; });
    after(async () => { await app?.close(); });

    for (const url of ['/external', '/external/policy/external']) {
        const custom = url !== '/external';
        const strictIndex = custom ? 5 : 3;
        const request = (query = '') => server.inject({ method: 'POST', url: url + query, payload: { document: {} } });

        it(`returns 200 true and forwards strict for ${url}`, async () => {
            const response = await request('?strict=true');
            assert.equal(response.statusCode, 200);
            assert.equal(response.json(), true);
            assert.equal(calls[0].args[strictIndex], true);
        });

        it(`returns 202 true when ${url} reports an automatic retry`, async () => {
            outcome = { retrying: true };
            const response = await request('?strict=true');
            assert.equal(response.statusCode, 202);
            assert.equal(response.json(), true);
        });

        for (const query of ['', '?strict=false']) {
            it(`keeps the legacy success and disables strict for ${url}${query}`, async () => {
                const response = await request(query);
                assert.equal(response.statusCode, 200);
                assert.equal(response.json(), true);
                assert.equal(calls[0].args[strictIndex], false);
            });
        }

        for (const code of [404, 422, 503, 504]) {
            it(`returns the existing ${code} error response for ${url}`, async () => {
                outcome = Object.assign(new Error('Delivery error'), { code });
                const response = await request('?strict=true');
                assert.equal(response.statusCode, code);
                assert.equal(response.json().message, 'Delivery error');
            });
        }

        it(`rejects an invalid strict flag for ${url}`, async () => {
            const response = await request('?strict=invalid');
            assert.equal(response.statusCode, 400);
            assert.deepEqual(calls, []);
        });

        it(`documents the strict outcomes for ${url}`, () => {
            const path = custom ? '/external/{policyId}/{blockTag}' : '/external';
            const operation = swagger.paths[path].post;
            const strict = operation.parameters.find((parameter) => parameter.name === 'strict');
            assert.equal(strict.schema.type, 'boolean');
            assert.equal(strict.required, false);
            for (const code of ['200', '202', '404', '422', '503', '504']) {
                assert.ok(operation.responses[code], code);
            }
            assert.match(operation.responses['200'].description, /later policy blocks are not confirmed/);
            assert.match(operation.responses['202'].description, /Do not resend/);
            assert.match(operation.responses['504'].description, /unknown/);
        });
    }

    for (const url of ['/external/sync-events', '/external/policy/external/sync-events']) {
        it(`ignores strict and keeps the legacy reply for ${url}`, async () => {
            const response = await server.inject({ method: 'POST', url: url + '?strict=true&history=true', payload: { document: {} } });
            assert.equal(response.statusCode, 200);
            assert.equal(response.json(), true);
            const args = calls[0].args;
            const index = url.includes('/policy/') ? 3 : 1;
            assert.equal(args[index], true);
            assert.equal(args[index + 1], true);
            assert.equal(args.length, index + 2);
            const path = url.includes('/policy/') ? '/external/{policyId}/{blockTag}/sync-events' : '/external/sync-events';
            assert.equal(swagger.paths[path].post.parameters.some((parameter) => parameter.name === 'strict'), false);
        });
    }
});
