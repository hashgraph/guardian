import assert from 'node:assert/strict';
import { MetadataStorage } from '@mikro-orm/core';
import { DataBaseHelper, ProjectCoordinates } from '@indexer/common';
import { MessageType } from '@indexer/interfaces';
import { ProjectCoordinatesMigration } from '../dist/migrations/v3-7-1-project-coordinates.js';
import { SynchronizationProjects } from '../dist/helpers/synchronizers/synchronize-projects.js';

describe('Project coordinates shared centers', () => {
    it('declares uniqueness by coordinate and document together', () => {
        const metadata = MetadataStorage.getMetadataFromDecorator(ProjectCoordinates);
        assert.notEqual(metadata.properties.coordinates.unique, true);
        assert.ok(metadata.uniques.some(index =>
            index.name === 'project_coordinates_per_document' &&
            JSON.stringify(index.properties) === JSON.stringify(['coordinates', 'projectId'])
        ));
    });

    it('creates the compound index, removes only the old coordinate index, then clears the rows', async () => {
        const calls = [];
        const migration = Object.create(ProjectCoordinatesMigration.prototype);
        migration.getCollection = name => {
            assert.equal(name, 'project_coordinates');
            return {
                createIndex: async (key, options) => calls.push(['create', key, options]),
                indexes: async () => [
                    { name: '_id_', key: { _id: 1 }, unique: true },
                    { name: 'coordinates_1', key: { coordinates: 1 }, unique: true },
                    { name: 'projectId_1', key: { projectId: 1 } },
                    { name: 'project_coordinates_per_document', key: { coordinates: 1, projectId: 1 }, unique: true },
                ],
                dropIndex: async name => calls.push(['drop', name]),
                deleteMany: async filter => calls.push(['delete', filter]),
            };
        };
        await migration.up();
        assert.deepEqual(calls, [
            ['create', { coordinates: 1, projectId: 1 },
                { unique: true, name: 'project_coordinates_per_document' }],
            ['drop', 'coordinates_1'],
            ['delete', {}],
        ]);
    });

    it('can run on an already upgraded collection without deleting any index', async () => {
        const migration = Object.create(ProjectCoordinatesMigration.prototype);
        migration.getCollection = () => ({
            createIndex: async () => undefined,
            indexes: async () => [
                { name: '_id_', key: { _id: 1 }, unique: true },
                { name: 'project_coordinates_per_document', key: { coordinates: 1, projectId: 1 }, unique: true },
            ],
            dropIndex: async () => assert.fail('no old index remains'),
            deleteMany: async () => undefined,
        });
        await migration.up();
    });

    it('restores a shared center lost by a partly indexed document after the upgrade', async () => {
        const documents = [
            { _id: 'a', consensusTimestamp: 'document-a', files: ['vc-a'] },
            { _id: 'b', consensusTimestamp: 'document-b', files: ['vc-b'] },
        ];
        const rows = [
            { coordinates: '36|-1', projectId: 'document-a' },
            { coordinates: '37|-2', projectId: 'document-b' },
        ];
        const cursor = items => {
            let index = 0;
            return { hasNext: async () => index < items.length, next: async () => items[index++] };
        };
        const manager = {
            getCollection: name => name === 'project_coordinates'
                ? { distinct: async () => [...new Set(rows.map(row => row.projectId))] }
                : { find: filter => cursor(name === 'message' && filter?.type === MessageType.VC_DOCUMENT
                    ? documents.filter(document =>
                        !filter.consensusTimestamp.$nin.includes(document.consensusTimestamp))
                    : []) },
            create: (entity, value) => value,
            persistAndFlush: async row => {
                if (rows.some(existing => existing.coordinates === row.coordinates &&
                    existing.projectId === row.projectId)) {
                    throw new Error('duplicate key');
                }
                rows.push(row);
            },
            getReference: () => ({}),
            persist: () => undefined,
            flush: async () => undefined,
        };
        const migration = Object.create(ProjectCoordinatesMigration.prototype);
        migration.getCollection = () => ({
            createIndex: async () => undefined,
            indexes: async () => [],
            dropIndex: async () => undefined,
            deleteMany: async () => rows.splice(0),
        });
        const original = DataBaseHelper.getEntityManager;
        DataBaseHelper.getEntityManager = () => manager;
        try {
            await migration.up();
            const synchronizer = Object.create(SynchronizationProjects.prototype);
            synchronizer.updateGeoCoordinates = document => document.consensusTimestamp === 'document-a'
                ? [{ coordinates: '36|-1', projectId: 'document-a' }]
                : [
                    { coordinates: '36|-1', projectId: 'document-b' },
                    { coordinates: '37|-2', projectId: 'document-b' },
                ];
            await synchronizer.sync();
            await synchronizer.sync();
        } finally {
            DataBaseHelper.getEntityManager = original;
        }
        assert.deepEqual(rows, [
            { coordinates: '36|-1', projectId: 'document-a' },
            { coordinates: '36|-1', projectId: 'document-b' },
            { coordinates: '37|-2', projectId: 'document-b' },
        ]);
    });

    it('writes both documents at one center and writes each document-center pair once', async () => {
        const documents = [
            { _id: 'a', consensusTimestamp: 'document-a', files: ['vc-a'] },
            { _id: 'b', consensusTimestamp: 'document-b', files: ['vc-b'] },
        ];
        const cursor = rows => {
            let index = 0;
            return { hasNext: async () => index < rows.length, next: async () => rows[index++] };
        };
        const saved = [];
        const manager = {
            getCollection: name => name === 'project_coordinates'
                ? { distinct: async () => [] }
                : { find: filter => cursor(name === 'message' && filter?.type === MessageType.VC_DOCUMENT
                    ? documents : []) },
            create: (entity, value) => {
                assert.equal(entity, ProjectCoordinates);
                return value;
            },
            persistAndFlush: async row => saved.push(row),
            getReference: () => ({}),
            persist: () => undefined,
            flush: async () => undefined,
        };
        const original = DataBaseHelper.getEntityManager;
        DataBaseHelper.getEntityManager = () => manager;
        try {
            const synchronizer = Object.create(SynchronizationProjects.prototype);
            synchronizer.updateGeoCoordinates = document => [
                { coordinates: '36|-1', projectId: document.consensusTimestamp },
                { coordinates: '36|-1', projectId: document.consensusTimestamp },
            ];
            await synchronizer.sync();
        } finally {
            DataBaseHelper.getEntityManager = original;
        }
        assert.deepEqual(saved, [
            { coordinates: '36|-1', projectId: 'document-a' },
            { coordinates: '36|-1', projectId: 'document-b' },
        ]);
    });
});
