import { AssignedEntityType, GenerateUUIDv4, IVC, MintTransactionStatus, PolicyTestStatus, PolicyStatus, SchemaEntity, TokenType, TopicType, ExternalPolicyStatus } from '@guardian/interfaces';
import { TopicId } from '@hashgraph/sdk';
import { FilterObject, FilterQuery, FindAllOptions, MikroORM } from '@mikro-orm/core';
import type { FindOptions } from '@mikro-orm/core/drivers/IDatabaseDriver';
import { MongoDriver, ObjectId, PopulatePath } from '@mikro-orm/mongodb';
import { Binary } from 'bson';
import {
    AggregateVC,
    ApprovalDocument as ApprovalDocumentCollection,
    Artifact as ArtifactCollection,
    ArtifactChunk as ArtifactChunkCollection,
    AssignEntity,
    BlockCache,
    BlockState,
    BlockStateSavepoint,
    Contract as ContractCollection,
    DidDocument as DidDocumentCollection,
    DocumentState,
    DryRun,
    DryRunSavepoint,
    DryRunFiles,
    ExternalDocument,
    Formula,
    MintRequest,
    MintTransaction,
    MultiDocuments,
    MultiPolicy,
    MultiPolicyTransaction,
    Policy,
    PolicyCache,
    PolicyCacheData,
    PolicyCategory,
    PolicyInvitations,
    PolicyLabel,
    PolicyLabelDocument,
    PolicyModule,
    PolicyRoles as PolicyRolesCollection,
    PolicyStatistic,
    PolicyStatisticDocument,
    PolicyTest,
    Record,
    RetirePool,
    Schema as SchemaCollection,
    SchemaRule,
    SplitDocuments,
    SuggestionsConfig,
    Tag,
    TagCache,
    Token as TokenCollection,
    Topic as TopicCollection,
    VcDocument as VcDocumentCollection,
    VpDocument,
    VpDocument as VpDocumentCollection,
    ExternalPolicy,
    PolicyAction,
    PolicyKey,
    PolicyComment,
    PolicyDiscussion,
    GlobalEventsReaderStream, GlobalEventsWriterStream
} from '../entity/index.js';
import { PolicyProperty } from '../entity/policy-property.js';
import { Theme } from '../entity/theme.js';
import { PolicyTool } from '../entity/tool.js';
import { Message } from '../hedera-modules/index.js';
import { DataBaseHelper, MAP_TRANSACTION_SERIALS_AGGREGATION_FILTERS } from '../helpers/index.js';
import { GetConditionsPoliciesByCategories } from '../helpers/policy-category.js';
import { AbstractDatabaseServer, IAddDryRunIdItem, IAuthUser, IGetDocumentAggregationFilters } from '../interfaces/index.js';
import { BaseEntity } from '../models/index.js';
import { DryRunSavepointSnapshot } from '../entity/dry-run-savepoint-snapshot.js';

/**
 * Database server
 */
export class DatabaseServer extends AbstractDatabaseServer {
    /**
     * Max Document Size ~ 16 MB
     */
    private static readonly MAX_DOCUMENT_SIZE = 16000000;
    /**
     * Documents handling chunk size
     */
    private static readonly DOCUMENTS_HANDLING_CHUNK_SIZE = process.env.DOCUMENTS_HANDLING_CHUNK_SIZE
        ? parseInt(process.env.DOCUMENTS_HANDLING_CHUNK_SIZE, 10)
        : 500;

    public static dbID(id: string): ObjectId {
        try {
            return new ObjectId(id);
        } catch (error) {
            return null;
        }
    }

    /**
     * Add dry run id
     * @param item
     * @param dryRunId
     * @param dryRunClass
     * @param systemMode
     */
    private static addDryRunId(
        item: unknown | unknown[],
        dryRunId: string,
        dryRunClass: string,
        systemMode: boolean
    ): unknown | unknown[] {
        const getExtendedItem = (extendedItem: unknown & IAddDryRunIdItem) => {
            extendedItem.systemMode = systemMode;
            extendedItem.dryRunId = dryRunId;
            extendedItem.dryRunClass = dryRunClass;
        };

        if (Array.isArray(item)) {
            for (const i of item) {
                getExtendedItem(i);
            }
        } else {
            getExtendedItem(item as unknown & IAddDryRunIdItem);
        }

        return item;
    }

    /**
     * Grid fs connect
     */
    public static connectGridFS() {
        DataBaseHelper.connectGridFS();
    }

    /**
     * Set Dry Run id
     * @param id
     */
    public static async setSystemMode(dryRunId: string, systemMode: boolean): Promise<void> {
        const items = await new DataBaseHelper(DryRun).find({ dryRunId });
        for (const item of items) {
            item.systemMode = systemMode;
        }
        await new DataBaseHelper(DryRun).update(items);
    }

    /**
     * Get savepoint by id
     * @param policyId
     * @param savepointId
     */
    public static async getSavepointById(
        policyId: string,
        savepointId: string
    ): Promise<DryRunSavepoint | null> {
        return await new DataBaseHelper(DryRunSavepoint)
            .findOne({ id: savepointId, policyId });
    }

    /**
     * Get savepoints by policy id
     * @param policyId
     * @param opts
     */
    public static async getSavepointsByPolicyId(
        policyId: string,
        opts?: { includeDeleted?: boolean }
    ): Promise<DryRunSavepoint[]> {
        const includeDeleted: boolean = !!opts?.includeDeleted;

        const where: any = includeDeleted
            ? { policyId }
            : {
                policyId,
                $or: [
                    { isDeleted: { $exists: false } },
                    { isDeleted: { $ne: true } }
                ]
            };

        return await new DataBaseHelper(DryRunSavepoint).find(
            where,
            { orderBy: { createDate: 'DESC' } }
        );
    }

    /**
     * Get savepoints count by policy id
     * @param policyId
     * @param opts
     */
    public static async getSavepointsCount(
        policyId: string,
        opts: { includeDeleted?: boolean } = {}
    ): Promise<number> {
        const helper = new DataBaseHelper(DryRunSavepoint);
        const filter: any = { policyId };

        if (!opts.includeDeleted) {
            filter.isDeleted = { $ne: true };
        }

        return await helper.count(filter);
    }

    /**
     * Set selected savepoint as current (and unset the rest for this policy)
     * @param policyId
     * @param savepointId
     */
    public static async setCurrentSavepoint(policyId: string, savepointId: string): Promise<void> {
        const repo = new DataBaseHelper(DryRunSavepoint);

        const all = await repo.find({ policyId });

        if (!all?.length) {
            throw new Error('No savepoints for this policy');
        }

        let target: DryRunSavepoint | null = null;
        const toUpdate: DryRunSavepoint[] = [];

        for (const sp of all) {
            const shouldBeCurrent = sp.id === savepointId;

            if (shouldBeCurrent) {
                if (sp.isDeleted === true) {
                    throw new Error('Savepoint is deleted');
                }
                target = sp;
            }

            if (sp.isCurrent !== shouldBeCurrent) {
                sp.isCurrent = shouldBeCurrent;
                toUpdate.push(sp);
            }
        }

        if (!target) {
            throw new Error('Savepoint not found');
        }

        if (toUpdate.length > 0) {
            await repo.saveMany(toUpdate);
        }
    }

    /**
     * Set IPFS metadata for record
     * @param recordId
     * @param metadata
     */
    public static async setRecordIpfsMeta(
        recordId: ObjectId | string,
        metadata: { cid: string, url?: string }
    ): Promise<void> {
        const id = recordId instanceof ObjectId ? recordId : new ObjectId(String(recordId));
        await new DataBaseHelper(Record).updateManyRaw(
            { _id: id },
            {
                $set: {
                    ipfsCid: metadata.cid,
                    ipfsUrl: metadata.url,
                    ipfsTimestamp: new Date()
                }
            }
        );
    }

    public static async removeDryRunWithEmptySavepoint(policyId: string): Promise<void> {
        const filter = {
            dryRunId: policyId,
            $or: [
                { savepointId: { $exists: false } },
                { savepointId: '' }
            ]
        };

        await new DataBaseHelper(DryRun).delete(filter);
    }

    public static async nullifyInitialDryRunSavepointIds(): Promise<void> {
        const dryRun = new DataBaseHelper(DryRun);
        await dryRun.updateManyRaw(
            { savepointId: { $exists: false } },
            { $set: { savepointId: null } }
        );
    }

    /**
     * Create savepoint
     * @param policyId
     * @param savepointProps
     */
    public static async createSavepoint(policyId: string, savepointProps: { name: string, savepointPath: string[] }): Promise<string> {
        const { name, savepointPath = [] } = savepointProps

        const dryRunSavepoint = new DataBaseHelper(DryRunSavepoint);
        await dryRunSavepoint.updateManyRaw(
            { policyId, isCurrent: true },
            { $set: { isCurrent: false } }
        );

        const savepoint = dryRunSavepoint.create({
            policyId,
            name,
            savepointPath: [...savepointPath],
            isCurrent: true
        });
        await dryRunSavepoint.save(savepoint);

        const limit = { limit: DatabaseServer.DOCUMENTS_HANDLING_CHUNK_SIZE };

        const filter = {
            $and: [
                {
                    $or: [
                        { savepointId: { $exists: false } },
                    ]
                }
            ]
        };
        const dryRun = new DataBaseHelper(DryRun);

        const amount = await dryRun.count(filter);

        const naturalCount = Math.floor(amount / DatabaseServer.DOCUMENTS_HANDLING_CHUNK_SIZE);

        for (let i = 0; i < naturalCount; i++) {
            const items = await dryRun.find(filter, limit);

            for (const item of items) {
                if (!item.savepointId) {
                    item.savepointId = savepoint.id;
                }
            }

            await dryRun.update(items);
        }

        const restItems = await dryRun.find(filter);

        for (const item of restItems) {
            if (!item.savepointId) {
                item.savepointId = savepoint.id;
            }
        }

        await dryRun.update(restItems);

        return savepoint.id
    }

    /**
     * Create a full snapshot of DryRun options for the savepoint:
     * collects all DryRun docs visible at this savepoint (its path + itself)
     * and writes them into DryRunSavepointSnapshot.
     */
    public static async createSavepointSnapshot(
        policyId: string,
        savepointId: string
    ): Promise<void> {
        const spRepo = new DataBaseHelper(DryRunSavepoint);
        const snapshotRepo = new DataBaseHelper(DryRunSavepointSnapshot);
        const dryRun = new DataBaseHelper(DryRun);

        const sp = await spRepo.findOne({ policyId, id: savepointId });
        if (!sp) {
            throw new Error('Savepoint not found');
        }

        const path: string[] = Array.isArray(sp.savepointPath) ? [...sp.savepointPath] : [];
        if (!path.includes(savepointId)) {
            path.push(savepointId);
        }
        if (path.length === 0) {
            return;
        }

        const filter: any = {
            dryRunId: policyId,
            $or: [
                { savepointId: { $in: path } },
                { savepointId: { $exists: false } },
                { savepointId: null },
            ],
        };

        const total = await dryRun.count(filter);
        if (!total) {
            return;
        }

        const chunkSize = DatabaseServer.DOCUMENTS_HANDLING_CHUNK_SIZE;
        const pages = Math.ceil(total / chunkSize);

        for (let i = 0; i < pages; i++) {
            const items = await dryRun.find(
                filter,
                { limit: chunkSize, offset: i * chunkSize, orderBy: { _id: 1 } } as any
            );
            if (!items?.length) {
                continue;
            }

            const snapshots = items.map(item =>
                snapshotRepo.create({
                    policyId,
                    savepointId,
                    sourceId: item.id,
                    options: item.option ?? null,
                })
            );

            await snapshotRepo.insertMany(snapshots as unknown as DryRunSavepointSnapshot[]);
        }
    }

    /**
     *  Create Savepoint States
     */
    public static async createSavepointStates(policyId: string, savepointId: string): Promise<void> {
        const dryRunRepo = new DataBaseHelper(DryRun);
        const blockStates = await dryRunRepo.find({ policyId, dryRunClass: 'BlockState' });

        if (!blockStates?.length) {
            return
        }

        const blockStatesSavepoint = new DataBaseHelper(BlockStateSavepoint);

        const fieldsToKeep = [
            '_id',
            'createDate',
            'updateDate',
            'dryRunId',
            'savepointId',
            'dryRunClass',
            'policyId',
            'blockId',
            'blockState',
            'status',
            'signature',
            'option',
            'hederaStatus',
            'uuid',
            'entity',
            'iri',
            'readonly',
            'system',
            'active',
            'codeVersion',
            'isMintNeeded',
            'isTransferNeeded',
            'wasTransferNeeded'
        ];

        const docs = blockStates.map(raw => {
            const clean: any = {};
            for (const key of fieldsToKeep) {
                if (raw[key] !== undefined) {
                    clean[key] = raw[key];
                }
            }

            return blockStatesSavepoint.create({
                policyId,
                savepointId,
                blockId: raw.uuid,
                blockStateDryRunRecord: clean
            });
        });

        if (docs.length) {
            await blockStatesSavepoint.saveMany(docs);
        }
    }

    /**
     *   Update savepoint name
     */
    public static async updateSavepointName(
        policyId: string,
        savepointId: string,
        name: string
    ): Promise<void> {
        const trimmedName: string = (name ?? '').trim();

        if (!trimmedName) {
            throw new Error('Name is required');
        }

        const repo = new DataBaseHelper(DryRunSavepoint);

        const query = {
            policyId,
            id: savepointId
        };

        const sp = await repo.findOne(query);

        if (!sp) {
            throw new Error('Savepoint not found');
        }

        if (sp.isDeleted === true) {
            throw new Error('Savepoint is deleted');
        }

        sp.name = trimmedName;

        await repo.save(sp);
    }

    /**
     *   RestoreSavepointStates
     */
    public static async restoreSavepointStates(policyId: string, savepointId: string): Promise<void> {
        const snapsRepo = new DataBaseHelper(BlockStateSavepoint);

        const snaps = await snapsRepo.find(
            { policyId, savepointId },
            {
                orderBy: {
                    createDate: 1,
                    _id: 1,
                },
            }
        );

        const dryRunRepo = new DataBaseHelper(DryRun);

        await dryRunRepo.delete({
            policyId,
            dryRunClass: 'BlockState',
        });

        if (!snaps?.length) {
            return;
        };

        const docs = snaps.map(snap =>
            dryRunRepo.create(snap.blockStateDryRunRecord)
        );

        if (docs.length > 0) {
            await dryRunRepo.saveMany(docs);
        }
    }

    /**
     * Restore for DryRun documents from savepoint snapshots
     */
    public static async restoreSavepointOptions(policyId: string, savepointId: string): Promise<void> {
        const spRepo = new DataBaseHelper(DryRunSavepoint);
        const sp = await spRepo.findOne({ policyId, id: savepointId });
        if (!sp) {
            throw new Error(`Savepoint not found: ${savepointId}`);
        }
        const path: string[] = sp.savepointPath ?? [savepointId];
        if (!path.length) {
            return;
        }

        const snaps = await new DataBaseHelper(DryRunSavepointSnapshot)
            .find({ policyId, savepointId: { $in: path } }, { fields: ['sourceId', 'options', 'savepointId'] } as any);

        if (!snaps?.length) {
            return;
        }

        const latestOptions = new Map<string, any>();
        for (const spId of path) {
            for (const s of snaps) {
                if (s.savepointId === spId) {
                    latestOptions.set(s.sourceId, s.options);
                }
            }
        }

        const dryRun = new DataBaseHelper(DryRun);
        const docs = [];
        for (const [sourceId, opt] of latestOptions.entries()) {
            const row = await dryRun.findOne({ id: sourceId });
            if (row) {
                row.option = opt;
                docs.push(row);
            }
        }

        if (docs.length) {
            await dryRun.update(docs);
        }
    }

    public static async getCurrentSavepointId(policyId: string): Promise<string | null> {
        const repo = new DataBaseHelper(DryRunSavepoint);
        const sp = await repo.findOne({ policyId, isCurrent: true });
        return sp?.id ?? null;
    }

    public static async ensureCurrentNotInList(
        policyId: string,
        ids: string[] | undefined | null,
        skip?: boolean
    ): Promise<void> {
        if (skip) {
            return;
        }
        if (!Array.isArray(ids) || ids.length === 0) {
            return;
        }

        const currentId = await DatabaseServer.getCurrentSavepointId(policyId);
        if (currentId && ids.includes(currentId)) {
            throw new Error('Cannot delete the current savepoint');
        }
    }

    /**
     * Delete savepoints
     * @param policyId
     * @param savepointIds
     */
    public static async deleteSavepoints(
        policyId: string,
        savepointIds: string[]
    ): Promise<string[]> {
        const ids = Array.isArray(savepointIds)
            ? Array.from(new Set(savepointIds.filter((v) => typeof v === 'string' && v.trim().length > 0)))
            : [];
        if (!ids.length) {
            return [];
        }

        const repo = new DataBaseHelper(DryRunSavepoint);

        const all = await repo.find({ policyId });

        type NodeLite = { id: string; parentId: string | null; isDeleted: boolean };
        const nodes = new Map<string, NodeLite>();
        const childrenCount = new Map<string, number>();

        for (const sp of all) {
            const id = sp.id;
            const parentId = sp.parentSavepointId ?? null;
            const isDeleted = sp.isDeleted === true;
            nodes.set(id, { id, parentId, isDeleted });
            if (parentId) {
                childrenCount.set(parentId, (childrenCount.get(parentId) ?? 0) + 1);
            }
        }

        const toSoftUpdate: NodeLite[] = [];
        const deleted = new Set<string>();

        const softMark = (n: NodeLite) => {
            if (!n.isDeleted) {
                n.isDeleted = true;
                toSoftUpdate.push(n);
            }
        };

        const decChild = (parentId: string | null) => {
            if (!parentId) {
                return;
            }
            const cur = childrenCount.get(parentId) ?? 0;
            childrenCount.set(parentId, Math.max(0, cur - 1));
        };

        const pruneIfLeaf = async (id: string): Promise<void> => {
            const node = nodes.get(id);
            if (!node) {
                return;
            }

            const hasKids = (childrenCount.get(id) ?? 0) > 0;
            if (hasKids) {
                softMark(node);
                return;
            }

            await repo.delete({ policyId, id });
            nodes.delete(id);
            deleted.add(id);
            decChild(node.parentId);

            let parentId = node.parentId;
            while (parentId) {
                const parent = nodes.get(parentId);
                if (!parent) {
                    break;
                }

                if (!parent.isDeleted) {
                    break;
                }

                const parentHasKids = (childrenCount.get(parentId) ?? 0) > 0;
                if (parentHasKids) {
                    break;
                }

                await repo.delete({ policyId, id: parentId });
                nodes.delete(parentId);
                deleted.add(parentId);

                const gp = parent.parentId ?? null;
                decChild(gp);
                parentId = gp;
            }
        };

        for (const id of ids) {
            await pruneIfLeaf(id);
        }

        if (toSoftUpdate.length) {
            const toLoad = toSoftUpdate.map((n) => n.id);
            const ents = await repo.find({ policyId, id: { $in: toLoad } });
            for (const e of ents) {
                (e).isDeleted = true;
            }
            await repo.update(ents);
        }

        return Array.from(deleted);
    }

    public static async removeBlockStateSnapshots(savepointIds: string[]): Promise<void> {
        const unique = Array.from(new Set(savepointIds)).filter(Boolean);
        if (unique.length === 0) {
            return;
        }

        const repo = new DataBaseHelper(BlockStateSavepoint);
        await repo.delete({
            savepointId: { $in: unique }
        });
    }

    public static async deleteDryRunBySavepoints(policyId: string, savepointIds: string[]): Promise<void> {
        const unique = Array.from(new Set(savepointIds)).filter(Boolean);
        if (unique.length === 0) {
            return;
        }

        const dryRun = new DataBaseHelper(DryRun);
        await dryRun.delete({
            savepointId: { $in: unique }
        });
    }

    /**
     * Delete snapshots by savepoints
     */
    public static async deleteSnapshotsBySavepoints(policyId: string, savepointIds: string[]): Promise<void> {
        const unique = Array.from(new Set(savepointIds)).filter(Boolean);
        if (unique.length === 0) {
            return;
        }

        const repo = new DataBaseHelper(DryRunSavepointSnapshot);
        await repo.delete({
            savepointId: { $in: unique }
        });
    }

    /**
     * Get schemas
     * @param filters
     */
    public static async getSchema(filters?: FilterObject<SchemaCollection> | string): Promise<SchemaCollection | null> {
        return await new DataBaseHelper(SchemaCollection).findOne(filters);
    }

    /**
     * Create Statistic
     * @param statistic
     */
    public static async createStatistic(
        statistic: FilterObject<PolicyStatistic>
    ): Promise<PolicyStatistic> {
        const item = new DataBaseHelper(PolicyStatistic).create(statistic);
        return await new DataBaseHelper(PolicyStatistic).save(item);
    }

    /**
     * Get Statistics
     * @param filters
     * @param options
     */
    public static async getStatisticsAndCount(
        filters?: FilterObject<PolicyStatistic>,
        options?: FindOptions<object>
    ): Promise<[PolicyStatistic[], number]> {
        return await new DataBaseHelper(PolicyStatistic).findAndCount(filters, options);
    }

    /**
     * Get Statistic By ID
     * @param id
     */
    public static async getStatisticById(id: string): Promise<PolicyStatistic | null> {
        return await new DataBaseHelper(PolicyStatistic).findOne(id);
    }

    /**
     * Get Statistic
     * @param filters
     */
    public static async getStatistic(filters: FilterQuery<PolicyStatistic>): Promise<PolicyStatistic | null> {
        return await new DataBaseHelper(PolicyStatistic).findOne(filters);
    }

    /**
     * Delete Statistic
     * @param statistic
     */
    public static async removeStatistic(statistic: PolicyStatistic): Promise<void> {
        return await new DataBaseHelper(PolicyStatistic).remove(statistic);
    }

    /**
     * Get Statistics
     * @param filters
     * @param options
     */
    public static async getStatistics(
        filters?: FilterQuery<PolicyStatistic>,
        options?: unknown
    ): Promise<PolicyStatistic[]> {
        return await new DataBaseHelper(PolicyStatistic).find(filters, options);
    }

    /**
     * Update Statistic
     * @param row
     */
    public static async updateStatistic(row: PolicyStatistic): Promise<PolicyStatistic> {
        return await new DataBaseHelper(PolicyStatistic).update(row);
    }

    /**
     * Get documents
     * @param filters
     * @param options
     */
    public static async getStatisticDocumentsAndCount(
        filters?: FilterObject<VcDocumentCollection>,
        options?: FindOptions<object>
    ): Promise<[VcDocumentCollection[], number]> {
        return await new DataBaseHelper(VcDocumentCollection).findAndCount(filters, options);
    }

    /**
     * Get documents
     * @param filters
     * @param options
     */
    public static async getStatisticDocuments(
        filters?: FilterQuery<VcDocumentCollection>,
        options?: unknown
    ): Promise<VcDocumentCollection[]> {
        return await new DataBaseHelper(VcDocumentCollection).find(filters, options);
    }

    /**
     * Get document
     * @param filters
     * @param options
     */
    public static async getStatisticDocument(
        filters?: FilterQuery<VcDocumentCollection>,
        options?: unknown
    ): Promise<VcDocumentCollection> {
        return await new DataBaseHelper(VcDocumentCollection).findOne(filters, options);
    }

    /**
     * Create Statistic
     * @param assessment
     */
    public static async createStatisticAssessment(
        assessment: FilterObject<PolicyStatisticDocument>
    ): Promise<PolicyStatisticDocument> {
        const item = new DataBaseHelper(PolicyStatisticDocument).create(assessment);
        return await new DataBaseHelper(PolicyStatisticDocument).save(item);
    }

    /**
     * Get statistic assessment
     * @param filters
     */
    public static async getStatisticAssessment(
        filters: FilterQuery<PolicyStatisticDocument>
    ): Promise<PolicyStatisticDocument | null> {
        return await new DataBaseHelper(PolicyStatisticDocument).findOne(filters);
    }

    /**
     * Get statistic assessments
     * @param filters
     * @param options
     */
    public static async getStatisticAssessmentsAndCount(
        filters?: FilterObject<PolicyStatisticDocument>,
        options?: FindOptions<object>
    ): Promise<[PolicyStatisticDocument[], number]> {
        return await new DataBaseHelper(PolicyStatisticDocument).findAndCount(filters, options);
    }

    /**
     * Get statistic assessment count
     * @param filters
     */
    public static async getStatisticAssessmentCount(
        filters?: FilterObject<PolicyStatisticDocument>
    ): Promise<number> {
        return await new DataBaseHelper(PolicyStatisticDocument).count(filters);
    }

    /**
     * Create Schema Rule
     * @param rule
     */
    public static async createSchemaRule(
        rule: FilterObject<SchemaRule>
    ): Promise<SchemaRule> {
        const item = new DataBaseHelper(SchemaRule).create(rule);
        return await new DataBaseHelper(SchemaRule).save(item);
    }

    /**
     * Get Schema Rule
     * @param filters
     * @param options
     */
    public static async getSchemaRulesAndCount(
        filters?: FilterObject<SchemaRule>,
        options?: FindOptions<object>
    ): Promise<[SchemaRule[], number]> {
        return await new DataBaseHelper(SchemaRule).findAndCount(filters, options);
    }

    /**
     * Get Schema Rule
     * @param filters
     * @param options
     */
    public static async getSchemaRules(
        filters?: FilterObject<SchemaRule>,
        options?: unknown
    ): Promise<SchemaRule[]> {
        return await new DataBaseHelper(SchemaRule).find(filters, options);
    }

    /**
     * Get Schema Rule By ID
     * @param id
     */
    public static async getSchemaRuleById(id: string): Promise<SchemaRule | null> {
        return await new DataBaseHelper(SchemaRule).findOne(id);
    }

    /**
     * Update Schema Rule
     * @param rule
     */
    public static async updateSchemaRule(rule: SchemaRule): Promise<SchemaRule> {
        return await new DataBaseHelper(SchemaRule).update(rule);
    }

    /**
     * Delete Schema Rule
     * @param rule
     */
    public static async removeSchemaRule(rule: SchemaRule): Promise<void> {
        return await new DataBaseHelper(SchemaRule).remove(rule);
    }

    /**
     * Create Policy Label
     * @param label
     */
    public static async createPolicyLabel(
        label: FilterObject<PolicyLabel>
    ): Promise<PolicyLabel> {
        const item = new DataBaseHelper(PolicyLabel).create(label);
        return await new DataBaseHelper(PolicyLabel).save(item);
    }

    /**
     * Get Policy Label
     * @param filters
     * @param options
     */
    public static async getPolicyLabelsAndCount(
        filters?: FilterObject<PolicyLabel>,
        options?: FindOptions<object>
    ): Promise<[PolicyLabel[], number]> {
        return await new DataBaseHelper(PolicyLabel).findAndCount(filters, options);
    }

    /**
     * Get Policy Label
     * @param filters
     * @param options
     */
    public static async getPolicyLabels(
        filters?: FilterObject<PolicyLabel>,
        options?: unknown
    ): Promise<PolicyLabel[]> {
        return await new DataBaseHelper(PolicyLabel).find(filters, options);
    }

    /**
     * Get Policy Label By ID
     * @param id
     */
    public static async getPolicyLabelById(id: string): Promise<PolicyLabel | null> {
        return await new DataBaseHelper(PolicyLabel).findOne(id);
    }

    /**
     * Update Policy Label
     * @param label
     */
    public static async updatePolicyLabel(label: PolicyLabel): Promise<PolicyLabel> {
        return await new DataBaseHelper(PolicyLabel).update(label);
    }

    /**
     * Delete Policy Label
     * @param label
     */
    public static async removePolicyLabel(label: PolicyLabel): Promise<void> {
        return await new DataBaseHelper(PolicyLabel).remove(label);
    }

    /**
     * Create Label Document
     * @param document
     */
    public static async createLabelDocument(
        document: FilterObject<PolicyLabelDocument>
    ): Promise<PolicyLabelDocument> {
        const item = new DataBaseHelper(PolicyLabelDocument).create(document);
        return await new DataBaseHelper(PolicyLabelDocument).save(item);
    }

    /**
     * Get statistic assessments
     * @param filters
     * @param options
     */
    public static async getLabelDocumentsAndCount(
        filters?: FilterObject<PolicyLabelDocument>,
        options?: FindOptions<object>
    ): Promise<[PolicyLabelDocument[], number]> {
        return await new DataBaseHelper(PolicyLabelDocument).findAndCount(filters, options);
    }

    /**
     * Get statistic assessment
     * @param filters
     */
    public static async getLabelDocument(
        filters: FilterQuery<PolicyLabelDocument>
    ): Promise<PolicyLabelDocument | null> {
        return await new DataBaseHelper(PolicyLabelDocument).findOne(filters);
    }

    /**
     * Create Formula
     * @param formula
     */
    public static async createFormula(
        formula: FilterObject<Formula>
    ): Promise<Formula> {
        const item = new DataBaseHelper(Formula).create(formula);
        return await new DataBaseHelper(Formula).save(item);
    }

    /**
     * Get Formulas
     * @param filters
     * @param options
     */
    public static async getFormulasAndCount(
        filters?: FilterObject<Formula>,
        options?: FindOptions<object>
    ): Promise<[Formula[], number]> {
        return await new DataBaseHelper(Formula).findAndCount(filters, options);
    }

    /**
     * Get Formulas
     * @param filters
     * @param options
     */
    public static async getFormulas(
        filters?: FilterObject<Formula>,
        options?: unknown
    ): Promise<Formula[]> {
        return await new DataBaseHelper(Formula).find(filters, options);
    }

    /**
     * Get Formula By ID
     * @param id
     */
    public static async getFormulaById(id: string): Promise<Formula | null> {
        return await new DataBaseHelper(Formula).findOne(id);
    }

    /**
     * Update Formula
     * @param formula
     */
    public static async updateFormula(formula: Formula): Promise<Formula> {
        return await new DataBaseHelper(Formula).update(formula);
    }

    /**
     * Delete Formula
     * @param formula
     */
    public static async removeFormula(formula: Formula): Promise<void> {
        return await new DataBaseHelper(Formula).remove(formula);
    }

    /**
     * Create Policy Comment
     * @param comment
     */
    public static async createPolicyComment(
        comment: FilterObject<PolicyComment>
    ): Promise<PolicyComment> {
        const item = new DataBaseHelper(PolicyComment).create(comment);
        return await new DataBaseHelper(PolicyComment).save(item);
    }

    /**
     * Get Policy Comments
     * @param filters
     * @param options
     */
    public static async getPolicyCommentsAndCount(
        filters?: FilterObject<PolicyComment>,
        options?: FindOptions<object>
    ): Promise<[PolicyComment[], number]> {
        return await new DataBaseHelper(PolicyComment).findAndCount(filters, options);
    }

    /**
     * Get Policy Comments
     * @param filters
     * @param options
     */
    public static async getPolicyCommentsCount(
        filters?: FilterObject<PolicyComment>,
        options?: FindOptions<object>
    ): Promise<number> {
        return await new DataBaseHelper(PolicyComment).count(filters, options);
    }

    /**
     * Get Policy Comment
     * @param filters
     * @param options
     */
    public static async getPolicyComment(
        filters: FilterQuery<PolicyComment>,
        options?: FindOptions<object>
    ): Promise<PolicyComment | null> {
        return await new DataBaseHelper(PolicyComment).findOne(filters, options);
    }

    /**
     * Get Policy Comments
     * @param filters
     * @param options
     */
    public static async getPolicyComments(
        filters: FilterQuery<PolicyComment>,
        options?: FindOptions<object, never, PopulatePath.ALL, never>
    ): Promise<PolicyComment[]> {
        return await new DataBaseHelper(PolicyComment).find(filters, options as any);
    }

    /**
     * Update Policy Comment
     * @param comment
     */
    public static async updatePolicyComment(comment: PolicyComment): Promise<PolicyComment> {
        return await new DataBaseHelper(PolicyComment).update(comment);
    }

    /**
     * Delete Policy Comment
     * @param comment
     */
    public static async removePolicyComment(comment: PolicyComment): Promise<void> {
        return await new DataBaseHelper(PolicyComment).remove(comment);
    }

    /**
     * Create Policy discussion
     * @param discussion
     */
    public static async createPolicyDiscussion(
        discussion: FilterObject<PolicyDiscussion>
    ): Promise<PolicyDiscussion> {
        const item = new DataBaseHelper(PolicyDiscussion).create(discussion);
        return await new DataBaseHelper(PolicyDiscussion).save(item);
    }

    /**
     * Get Policy discussions
     * @param filters
     * @param options
     */
    public static async getPolicyDiscussions(
        filters: FilterQuery<PolicyDiscussion>,
        options?: FindOptions<object, never, PopulatePath.ALL, never>
    ): Promise<PolicyDiscussion[]> {
        return await new DataBaseHelper(PolicyDiscussion).find(filters, options as any);
    }

    /**
     * Get Policy discussion
     * @param filters
     * @param options
     */
    public static async getPolicyDiscussion(
        filters: FilterQuery<PolicyDiscussion>,
        options?: FindOptions<object, never, PopulatePath.ALL, never>
    ): Promise<PolicyDiscussion | null> {
        return await new DataBaseHelper(PolicyDiscussion).findOne(filters, options as any);
    }

    /**
     * Update Policy discussion
     * @param discussion
     */
    public static async updatePolicyDiscussion(discussion: PolicyDiscussion): Promise<PolicyDiscussion> {
        return await new DataBaseHelper(PolicyDiscussion).update(discussion);
    }

    /**
     * Create ExternalPolicy
     * @param externalPolicy
     */
    public static async createExternalPolicy(
        externalPolicy: FilterObject<ExternalPolicy>
    ): Promise<ExternalPolicy> {
        const item = new DataBaseHelper(ExternalPolicy).create(externalPolicy);
        return await new DataBaseHelper(ExternalPolicy).save(item);
    }

    /**
     * Get ExternalPolicies
     * @param filters
     * @param options
     */
    public static async getExternalPoliciesAndCount(
        filters?: FilterObject<ExternalPolicy>,
        options?: FindOptions<object>
    ): Promise<[ExternalPolicy[], number]> {
        return await new DataBaseHelper(ExternalPolicy).findAndCount(filters, options);
    }

    /**
     * Get ExternalPolicies
     * @param filters
     * @param options
     */
    public static async getExternalPolicies(
        filters?: FilterObject<ExternalPolicy>,
        options?: unknown
    ): Promise<ExternalPolicy[]> {
        return await new DataBaseHelper(ExternalPolicy).find(filters, options);
    }

    /**
     * Get ExternalPolicy By ID
     * @param id
     */
    public static async getExternalPolicyById(id: string): Promise<ExternalPolicy | null> {
        return await new DataBaseHelper(ExternalPolicy).findOne(id);
    }

    /**
     * Get ExternalPolicy
     * @param id
     */
    public static async getExternalPolicy(filters: any): Promise<ExternalPolicy | null> {
        return await new DataBaseHelper(ExternalPolicy).findOne(filters);
    }

    /**
     * Update ExternalPolicy
     * @param externalPolicy
     */
    public static async updateExternalPolicy(externalPolicy: ExternalPolicy): Promise<ExternalPolicy> {
        return await new DataBaseHelper(ExternalPolicy).update(externalPolicy);
    }

    /**
     * Delete ExternalPolicy
     * @param externalPolicy
     */
    public static async removeExternalPolicy(externalPolicy: ExternalPolicy): Promise<void> {
        return await new DataBaseHelper(ExternalPolicy).remove(externalPolicy);
    }

    /**
     * Get ExternalPolicies
     * @param filters
     * @param options
     */
    public static async groupExternalPoliciesAndCount(
        owner: { owner: string, creator: string },
        skip: number,
        limit: number,
        full: boolean = false
    ): Promise<[ExternalPolicy[], number]> {
        const pipeline: any[] = [];
        pipeline.push({ $sort: { createDate: 1 } });

        if (!full) {
            pipeline.push({
                $match: {
                    creator: { $eq: owner.creator }
                }
            });
        }

        pipeline.push({
            $group: {
                _id: '$messageId',
                createDate: { $first: '$createDate' },
                name: { $first: '$name' },
                description: { $first: '$description' },
                version: { $first: '$version' },
                topicId: { $first: '$topicId' },
                instanceTopicId: { $first: '$instanceTopicId' },
                policyTag: { $first: '$policyTag' },
                owner: { $addToSet: '$owner' },
                creator: { $push: '$creator' },
                status: { $push: '$status' },
                username: { $push: '$username' }
            }
        });
        pipeline.push({
            $project: {
                messageId: '$_id',
                createDate: true,
                name: true,
                description: true,
                version: true,
                topicId: true,
                instanceTopicId: true,
                policyTag: true,
                owner: true,
                creator: true,
                status: true,
                username: true,
                fullStatus: {
                    $switch: {
                        branches: [
                            {
                                case: { $in: [ExternalPolicyStatus.APPROVED, '$status'] },
                                then: ExternalPolicyStatus.APPROVED
                            },
                            {
                                case: { $in: [ExternalPolicyStatus.NEW, '$status'] },
                                then: ExternalPolicyStatus.NEW
                            },
                            {
                                case: { $in: [ExternalPolicyStatus.REJECTED, '$status'] },
                                then: ExternalPolicyStatus.REJECTED
                            }
                        ],
                        default: ExternalPolicyStatus.REJECTED
                    }
                }
            }
        });
        pipeline.push({ $sort: { createDate: -1 } });

        if (full) {
            pipeline.push({
                $match: {
                    owner: { $eq: owner.owner }
                }
            });
        }

        pipeline.push({
            $facet: {
                items: [{ $skip: skip }, { $limit: limit }],
                count: [{ $count: 'count' }]
            }
        });

        const result: any = await new DataBaseHelper(ExternalPolicy).aggregate(pipeline);
        let count: number = 0;
        let items: ExternalPolicy[];
        if (result && result[0]) {
            if (result[0].items) {
                items = result[0].items;
            } else {
                items = [];
            }
            if (
                result[0].count &&
                result[0].count[0]
            ) {
                count = result[0].count[0].count;
            }
        }

        return [items, count];
    }

    /**
     * Dry-run
     * @private
     */
    private dryRun: string = null;
    /**
     * Dry-run
     * @private
     */
    private systemMode: boolean = false;
    /**
     * Dry-run
     * @private
     */
    private readonly classMap: Map<unknown, string> = new Map();

    constructor(dryRun: string = null) {
        super();
        this.dryRun = dryRun || null;

        this.classMap.set(BlockCache, 'BlockCache');
        this.classMap.set(BlockState, 'BlockState');
        this.classMap.set(VcDocumentCollection, 'VcDocumentCollection');
        this.classMap.set(VpDocumentCollection, 'VpDocumentCollection');
        this.classMap.set(DidDocumentCollection, 'DidDocumentCollection');
        this.classMap.set(SchemaCollection, 'SchemaCollection');
        this.classMap.set(DocumentState, 'DocumentState');
        this.classMap.set(Policy, 'Policy');
        this.classMap.set(AggregateVC, 'AggregateVC');
        this.classMap.set(ApprovalDocumentCollection, 'ApprovalDocumentCollection');
        this.classMap.set(TokenCollection, 'TokenCollection');
        this.classMap.set(TopicCollection, 'TopicCollection');
        this.classMap.set(DryRun, 'DryRun');
        this.classMap.set(PolicyRolesCollection, 'PolicyRolesCollection');
        this.classMap.set(PolicyInvitations, 'PolicyInvitations');
        this.classMap.set(MultiDocuments, 'MultiDocuments');
        this.classMap.set(SplitDocuments, 'SplitDocuments');
        this.classMap.set(Tag, 'Tag');
        this.classMap.set(TagCache, 'TagCache');
        this.classMap.set(ExternalDocument, 'ExternalDocument');
        this.classMap.set(PolicyCategory, 'PolicyCategories');
        this.classMap.set(PolicyProperty, 'PolicyProperties');
        this.classMap.set(MintRequest, 'MintRequest');
        this.classMap.set(MintTransaction, 'MintTransaction');
    }

    /**
     * Add dry run id
     * @param entityClass
     * @param item
     */
    private addDryRunId<T extends BaseEntity>(entityClass: new () => T, item: unknown): unknown | unknown[] {
        return DatabaseServer.addDryRunId(
            item, this.dryRun, this.classMap.get(entityClass), this.systemMode
        );
    }

    /**
     * Create much data
     * @param entityClass Entity class
     * @param item Item
     * @param amount Amount
     */
    private async createMuchData<T extends BaseEntity>(entityClass: new () => T, item: Partial<T> & { id: string, _id: string }, amount: number): Promise<void> {
        const naturalCount = Math.floor((amount / DatabaseServer.DOCUMENTS_HANDLING_CHUNK_SIZE));
        const restCount = (amount % DatabaseServer.DOCUMENTS_HANDLING_CHUNK_SIZE);

        if (this.dryRun) {
            this.addDryRunId(entityClass, item);
            for (let i = 0; i < naturalCount; i++) {
                await new DataBaseHelper(DryRun).createMuchData(item, DatabaseServer.DOCUMENTS_HANDLING_CHUNK_SIZE);
            }
            await new DataBaseHelper(DryRun).createMuchData(item, restCount);
        } else {
            for (let i = 0; i < naturalCount; i++) {
                await new DataBaseHelper(entityClass).createMuchData(item, DatabaseServer.DOCUMENTS_HANDLING_CHUNK_SIZE);
            }
            await new DataBaseHelper(entityClass).createMuchData(item, restCount);
        }
    }

    /**
     * Find data by aggregation
     * @param entityClass Entity class
     * @param aggregation aggregate filter
     * @returns
     */
    public async aggregate<T extends BaseEntity>(entityClass: new () => T, aggregation: FilterObject<T>[]): Promise<T[]> {
        if (this.dryRun) {
            const dryRunClass = this.classMap.get(entityClass);

            return await new DataBaseHelper(DryRun).aggregateDryRan(aggregation, this.dryRun, dryRunClass) as unknown as T[];
        } else {
            return await new DataBaseHelper(entityClass).aggregate(aggregation);
        }
    }

    /**
     * Assign entity
     * @param type
     * @param entityId
     * @param assigned
     * @param did
     * @param owner
     */
    public static async assignEntity(
        type: AssignedEntityType,
        entityId: string,
        assigned: boolean,
        did: string,
        owner: string
    ): Promise<AssignEntity> {
        const item = new DataBaseHelper(AssignEntity).create({ type, entityId, assigned, did, owner });
        return await new DataBaseHelper(AssignEntity).save(item);
    }

    /**
     * Check User In Group
     * @param group
     *
     * @virtual
     */
    public async checkUserInGroup(group: { policyId: string, did: string, owner: string, uuid: string }): Promise<PolicyRolesCollection | null> {
        return await this.findOne(PolicyRolesCollection, {
            policyId: group.policyId,
            did: group.did,
            owner: group.owner,
            uuid: group.uuid
        });
    }

    /**
     * Clear Dry Run table
     * @param systemMode
     */
    public async clear(all: boolean) {
        await DatabaseServer.clearDryRun(this.dryRun, all);
    }

    /**
     * Clear Dry Run table
     * @param dryRunId
     * @param systemMode
     */
    public static async clearDryRun(dryRunId: string, all: boolean): Promise<void> {
        const filter = all ? { dryRunId } : { dryRunId, systemMode: { $ne: true } };
        const limit = { limit: DatabaseServer.DOCUMENTS_HANDLING_CHUNK_SIZE };
        const amount = await new DataBaseHelper(DryRun).count(filter);
        const naturalCount = Math.floor(amount / DatabaseServer.DOCUMENTS_HANDLING_CHUNK_SIZE);
        for (let i = 0; i < naturalCount; i++) {
            const items = await new DataBaseHelper(DryRun).find(filter, limit);
            await new DataBaseHelper(DryRun).remove(items);
        }
        const restItems = await new DataBaseHelper(DryRun).find(filter);
        await new DataBaseHelper(DryRun).remove(restItems);

        const files = await new DataBaseHelper(DryRunFiles).find({ policyId: dryRunId });
        await new DataBaseHelper(DryRunFiles).remove(files);
    }

    /**
     * Clear BlockStateSavepoint rows for policy
     */
    public static async clearBlockStateSavepoints(policyId: string): Promise<void> {
        await new DataBaseHelper(BlockStateSavepoint).delete({ policyId });
    }

    /**
     * Clear DryRunSavepointSnapshot rows for policy
     */
    public static async clearDryRunSavepointSnapshots(policyId: string): Promise<void> {
        await new DataBaseHelper(DryRunSavepointSnapshot).delete({ policyId });
    }

    /**
     * Clear DryRunSavepoint rows for policy
     */
    public static async clearDryRunSavepoints(policyId: string): Promise<void> {
        await new DataBaseHelper(DryRunSavepoint).delete({ policyId });
    }

    /**
     * Clear all savepoint-related collections for policy
     */
    public static async clearAllSavepointData(policyId: string): Promise<void> {
        await DatabaseServer.clearBlockStateSavepoints(policyId);
        await DatabaseServer.clearDryRunSavepointSnapshots(policyId);
        await DatabaseServer.clearDryRunSavepoints(policyId);
    }

    /**
     * Clear policy cache data
     * @param cachePolicyId Cache policy id
     */
    public static async clearPolicyCacheData(cachePolicyId: string) {
        const amount = await new DataBaseHelper(PolicyCacheData).count({
            cachePolicyId
        });
        const naturalCount = Math.floor(
            amount / DatabaseServer.DOCUMENTS_HANDLING_CHUNK_SIZE
        );
        for (let i = 0; i < naturalCount; i++) {
            const items = await new DataBaseHelper(PolicyCacheData).find(
                { cachePolicyId },
                { limit: DatabaseServer.DOCUMENTS_HANDLING_CHUNK_SIZE }
            );
            await new DataBaseHelper(PolicyCacheData).remove(
                items.map((item) => {
                    item._id = item.newId;
                    item.id = item.newId.toString();
                    return item;
                })
            );
        }
        const restItems = await new DataBaseHelper(PolicyCacheData).find({
            cachePolicyId
        });
        await new DataBaseHelper(PolicyCacheData).remove(
            restItems.map((item) => {
                item._id = item.newId;
                item.id = item.newId.toString();
                return item;
            })
        );
    }

    /**
     * Clear policy caches
     * @param filters Filters
     */
    public static async clearPolicyCaches(filters?: FilterObject<PolicyCache> | string): Promise<void> {
        const policyCaches = await new DataBaseHelper(PolicyCache).find(
            filters
        );
        if (!policyCaches) {
            return;
        }
        for (const policyCache of policyCaches) {
            const cachePolicyId = policyCache.id;
            await new DataBaseHelper(PolicyCache).remove(policyCache);
            await DatabaseServer.clearPolicyCacheData(cachePolicyId);
        }
    }

    /**
     * Set MongoDriver
     * @param db
     */
    public static connectBD(db: MikroORM<MongoDriver>): void {
        DataBaseHelper.connectBD(db);

        // DatabaseServer.startDryRunShadowUpdateWatcher(db);
    }

    /**
     * Overriding the count method
     * @param entityClass
     * @param filters
     * @param options
     */
    public async count<T extends BaseEntity>(entityClass: new () => T, filters: FilterQuery<T>, options?: FindOptions<object>): Promise<number> {
        if (this.dryRun) {

            const _filters = {
                ...filters as FilterObject<T>,
                dryRunId: this.dryRun,
                dryRunClass: this.classMap.get(entityClass)
            };

            return await new DataBaseHelper(DryRun).count(_filters, options);
        } else {
            return await new DataBaseHelper(entityClass).count(filters, options);
        }
    }

    /**
     * Get MultiPolicyTransaction count
     * @param policyId
     */
    public static async countMultiPolicyTransactions(policyId: string): Promise<number> {
        return await new DataBaseHelper(MultiPolicyTransaction).count({ policyId, status: 'Waiting' });
    }

    /**
     * Overriding the create method
     * @param entityClass
     * @param item
     */
    public create<T extends BaseEntity>(entityClass: new () => T, item: Partial<T>): T {
        if (this.dryRun) {
            return (new DataBaseHelper(DryRun).create(item)) as unknown as T;
        } else {
            return new DataBaseHelper(entityClass).create(item);
        }
    }

    /**
     * Create Aggregate Documents
     * @param item
     * @param blockId
     *
     * @virtual
     */
    public async createAggregateDocuments(item: VcDocumentCollection & { blockId: string }, blockId: string): Promise<void> {
        item.blockId = blockId;
        const newVC = this.create(AggregateVC, item);
        await this.save(AggregateVC, newVC);
    }

    /**
     * Get schema
     * @param item
     */
    public static async createAndSaveSchema(item: Partial<SchemaCollection>): Promise<SchemaCollection> {
        return await new DataBaseHelper(SchemaCollection).save(item);
    }

    /**
     * Create External Topic
     * @param row
     *
     * @virtual
     */
    public async createExternalTopic(row: unknown): Promise<ExternalDocument> {
        const item = this.create(ExternalDocument, row);
        return await this.save(ExternalDocument, item);
    }

    /**
     * Create invite token
     * @param policyId
     * @param uuid
     * @param owner
     * @param role
     *
     * @virtual
     */
    public async createInviteToken(policyId: string, uuid: string, owner: string, role: string): Promise<string> {
        const doc = this.create(PolicyInvitations, {
            uuid,
            policyId,
            owner,
            role,
            active: true
        });
        await this.save(PolicyInvitations, doc);
        return doc.id.toString();
    }

    /**
     * Create mint transactions
     * @param transaction Transaction
     * @param amount Amount
     */
    public async createMintTransactions(transaction: Partial<MintTransaction>, amount: number): Promise<void> {
        await this.createMuchData(MintTransaction, transaction as Partial<MintTransaction> & { id: string, _id: string }, amount);
    }

    /**
     * Create createModules
     * @param module
     */
    public static async createModules(module: PolicyModule): Promise<PolicyModule> {
        module.name = module.name.replace(/\s+/g, ' ').trim();
        const dbHelper = new DataBaseHelper(PolicyModule);
        const item = dbHelper.create(module);
        if (
            (await dbHelper.count({
                name: item.name,
                owner: item.owner
            })) > 0
        ) {
            throw new Error(`Module with name ${item.name} is already exists`);
        }
        return await dbHelper.save(item);
    }

    /**
     * Create Multi Policy object
     * @param multiPolicy
     * @returns MultiPolicy
     */
    public static createMultiPolicy(multiPolicy: MultiPolicy): MultiPolicy {
        return new DataBaseHelper(MultiPolicy).create(multiPolicy);
    }

    /**
     * Create MultiPolicyTransaction
     * @param transaction
     */
    public static async createMultiPolicyTransaction(transaction: FilterObject<MultiPolicyTransaction>): Promise<MultiPolicyTransaction> {
        const item = new DataBaseHelper(MultiPolicyTransaction).create(transaction);
        return await new DataBaseHelper(MultiPolicyTransaction).save(item);
    }

    /**
     * Create policy
     * @param data
     */
    public static createPolicy(data: Partial<Policy>): Policy {
        if (!data.config) {
            data.config = {
                'id': GenerateUUIDv4(),
                'blockType': 'interfaceContainerBlock',
                'permissions': [
                    'ANY_ROLE'
                ]
            };
        }
        const model = new DataBaseHelper(Policy).create(data);
        return model;
    }

    /**
     * Assign entity
     * @param config
     * @param buffer
     */
    public static async createPolicyTest(config: { [key: string]: unknown }, buffer: Buffer): Promise<PolicyTest> {
        const file = await DatabaseServer.saveFile(GenerateUUIDv4(), buffer);
        const item = new DataBaseHelper(PolicyTest).create({ ...config, file });
        return await new DataBaseHelper(PolicyTest).save(item);
    }

    /**
     * Create Record
     * @param record
     */
    public static async createRecord(record: FilterObject<Record>): Promise<Record> {
        const item = new DataBaseHelper(Record).create(record);
        return await new DataBaseHelper(Record).save(item);
    }

    /**
     * Create Residue object
     * @param policyId
     * @param blockId
     * @param userId
     * @param value
     * @param document
     */
    public createResidue(
        policyId: string,
        blockId: string,
        userId: string,
        value: unknown,
        document: unknown
    ): SplitDocuments {
        return this.create(SplitDocuments, {
            policyId,
            blockId,
            userId,
            value,
            document
        });
    }

    /**
     * Get schema
     * @param item
     */
    public static createSchema(item: Partial<SchemaCollection>): SchemaCollection {
        return new DataBaseHelper(SchemaCollection).create(item);
    }

    /**
     * Create tag
     * @param tag
     */
    public async createTag(tag: Tag): Promise<Tag> {
        const item = this.create(Tag, tag);
        return await this.save(Tag, item);
    }

    /**
     * Create tag
     * @param tag
     */
    public static async createTag(tag: FilterObject<Tag>): Promise<Tag> {
        const item = new DataBaseHelper(Tag).create(tag);
        return await new DataBaseHelper(Tag).save(item);
    }

    /**
     * Create tag cache
     * @param tag
     */
    public async createTagCache(tag: Partial<TagCache>): Promise<TagCache> {
        const item = this.create(TagCache, tag);
        return await this.save(TagCache, item);
    }

    /**
     * Create tag cache
     * @param tag
     */
    public static async createTagCache(tag: FilterObject<TagCache>): Promise<TagCache> {
        const item = new DataBaseHelper(TagCache).create(tag);
        return await new DataBaseHelper(TagCache).save(item);
    }

    /**
     * Create Theme
     * @param theme
     */
    public static async createTheme(theme: FilterObject<Theme>): Promise<Theme> {
        const item = new DataBaseHelper(Theme).create(theme);
        return await new DataBaseHelper(Theme).save(item);
    }

    /**
     * Create Token
     * @param token
     * @returns
     */
    public async createToken(token: unknown): Promise<TokenCollection> {
        const newToken = this.create(TokenCollection, token);
        return await this.save(TokenCollection, newToken);
    }

    /**
     * Create Tool
     * @param tool
     */
    public static async createTool(tool: PolicyTool): Promise<PolicyTool> {
        const item = new DataBaseHelper(PolicyTool).create(tool);
        return await new DataBaseHelper(PolicyTool).save(item);
    }

    /**
     * Create Virtual User
     * @param policyId
     * @param username
     * @param did
     * @param hederaAccountId
     * @param hederaAccountKey
     * @param active
     *
     * @virtual
     */
    public static async createVirtualUser(
        policyId: string,
        username: string,
        did: string,
        hederaAccountId: string,
        hederaAccountKey: string,
        active: boolean,
        systemMode?: boolean
    ): Promise<void> {
        await new DataBaseHelper(DryRun).save(DatabaseServer.addDryRunId({
            did,
            username,
            hederaAccountId,
            active
        }, policyId, 'VirtualUsers', !!systemMode));

        if (hederaAccountKey) {
            await new DataBaseHelper(DryRun).save(DatabaseServer.addDryRunId({
                did,
                type: did,
                hederaAccountKey
            }, policyId, 'VirtualKey', !!systemMode));
        }
    }

    /**
     * Create Virtual User
     * @param policyId
     * @param username
     * @param did
     * @param hederaAccountId
     * @param hederaAccountKey
     * @param active
     *
     * @virtual
     */
    public async createVirtualUser(
        username: string,
        did: string,
        hederaAccountId: string,
        hederaAccountKey: string,
        active: boolean = false
    ): Promise<void> {
        await DatabaseServer.createVirtualUser(
            this.dryRun,
            username,
            did,
            hederaAccountId,
            hederaAccountKey,
            active,
            this.systemMode
        );
    }

    /**
     * Overriding the create method
     * @param entityClass
     * @param filters
     */
    public deleteEntity<T extends BaseEntity>(entityClass: new () => T, filters: FilterObject<T> | string | ObjectId): Promise<number> {
        return new DataBaseHelper(entityClass).delete(filters);
    }

    /**
     * Delete user
     * @param group
     *
     * @virtual
     */
    public async deleteGroup(group: PolicyRolesCollection): Promise<void> {
        return await this.remove(PolicyRolesCollection, group);
    }

    /**
     * Delete policy
     * @param id Policy ID
     */
    public static async deletePolicy(id: string): Promise<void> {
        await new DataBaseHelper(Policy).delete({ id });
    }

    /**
     * Get policy tests
     * @param policyId
     * @param id
     * @returns tests
     */
    public static async deletePolicyTest(policyId: string, id: string): Promise<void> {
        await new DataBaseHelper(PolicyTest).delete({ id, policyId });
    }

    /**
     * Get policy tests
     * @param policyId
     *
     * @returns tests
     */
    public static async deletePolicyTests(policyId: string): Promise<void> {
        await new DataBaseHelper(PolicyTest).delete({ policyId });
    }

    /**
     * Delete schemas
     * @param id
     */
    public static async deleteSchemas(id: string): Promise<void> {
        await new DataBaseHelper(SchemaCollection).delete({ id });
    }

    /**
     * Overriding the find method
     * @param entityClass
     * @param filters
     * @param options
     */
    public async find<T extends BaseEntity>(entityClass: new () => T, filters: FilterQuery<T> | string | ObjectId, options?: unknown): Promise<T[]> {
        if (this.dryRun) {
            const sp = (options as { savepointId?: string } | undefined)?.savepointId;

            const _filters = {
                ...filters as FilterObject<T>,
                dryRunId: this.dryRun,
                dryRunClass: this.classMap.get(entityClass),
                ...(sp ? { savepointId: sp } : {}),
            };

            return (await new DataBaseHelper(DryRun).find(_filters, options)) as unknown as T[];
        } else {
            return await new DataBaseHelper(entityClass).find(filters, options);
        }
    }

    /**
     * Overriding the findAll method
     * @param entityClass
     * @param options
     */
    public async findAll<T extends BaseEntity>(entityClass: new () => T, options?: FindAllOptions<T>): Promise<T[]> {
        return await new DataBaseHelper(entityClass).findAll(options);
    }

    /**
     * Overriding the findAndCount method
     * @param entityClass
     * @param filters
     * @param options
     */
    public async findAndCount<T extends BaseEntity>(entityClass: new () => T, filters: FilterQuery<T> | string | ObjectId, options?: unknown): Promise<[T[], number]> {
        return await new DataBaseHelper(entityClass).findAndCount(filters, options);
    }

    /**
     * Overriding the findOne method
     * @param entityClass
     * @param filters
     * @param options
     */
    public async findOne<T extends BaseEntity>(entityClass: new () => T, filters: FilterQuery<T>, options: unknown = {}): Promise<T> {
        if (this.dryRun) {
            if (typeof filters === 'string') {
                return (await new DataBaseHelper(DryRun).findOne(filters, options)) as unknown as T;
            }

            const _filters = {
                ...filters as FilterObject<T>,
                dryRunId: this.dryRun,
                dryRunClass: this.classMap.get(entityClass)
            };

            return (await new DataBaseHelper(DryRun).findOne(_filters, options)) as unknown as T;
        } else {
            return await new DataBaseHelper(entityClass).findOne(filters, options);
        }
    }

    /**
     * Get Active External Topic
     * @param policyId
     * @param blockId
     *
     * @virtual
     */
    public async getActiveExternalTopics(
        policyId: string,
        blockId: string
    ): Promise<ExternalDocument[]> {
        return await this.find(ExternalDocument, {
            policyId: { $eq: policyId },
            blockId: { $eq: blockId },
            active: { $eq: true }
        });
    }

    /**
     * Get Active Group By User
     * @param policyId
     * @param did
     *
     * @virtual
     */
    public async getActiveGroupByUser(policyId: string, did: string): Promise<PolicyRolesCollection | null> {
        if (!did) {
            return null;
        }
        return await this.findOne(PolicyRolesCollection, { policyId, did, active: true });
    }

    /**
     * Get Aggregate Documents
     * @param policyId
     * @param blockId
     * @param filters
     *
     * @virtual
     */
    public async getAggregateDocuments(
        policyId: string,
        blockId: string,
        filters: FilterObject<unknown> = {},
    ): Promise<AggregateVC[]> {
        return await this.find(AggregateVC, { policyId, blockId, ...filters });
    }

    /**
     * Get aggregate document by policy identifier
     * @param policyId Policy identifier
     * @returns Aggregate documents
     */
    public async getAggregateDocumentsByPolicy(
        policyId: string,
    ): Promise<AggregateVC[]> {
        return await this.find(AggregateVC, { policyId });
    }

    /**
     * Get members
     *
     * @param group
     *
     * @virtual
     */
    public async getAllMembersByGroup(group: PolicyRolesCollection): Promise<PolicyRolesCollection[]> {
        if (!group.uuid) {
            return [];
        }
        return await this.find(PolicyRolesCollection, {
            policyId: group.policyId,
            uuid: group.uuid
        });
    }

    /**
     * Get all policy users
     * @param policyId
     *
     * @virtual
     */
    public async getAllPolicyUsers(policyId: string): Promise<PolicyRolesCollection[]> {
        return await this.find(PolicyRolesCollection, { policyId, active: true });
    }

    /**
     * Get all policy users
     * @param policyId
     * @param uuid
     * @param role
     *
     * @virtual
     */
    public async getAllUsersByRole(policyId: string, uuid: string, role: string): Promise<PolicyRolesCollection[]> {
        return await this.find(PolicyRolesCollection, { policyId, uuid, role });
    }

    /**
     * get document aggregation filters for analytics
     * @param nameFilter
     * @param uuid
     *
     * @returns Result
     */
    public getAnalyticsDocAggregationFilters(nameFilter: string, uuid: string): unknown[] {
        return DataBaseHelper.getAnalyticsDocAggregationFilters(nameFilter, uuid);
    }

    /**
     * Get and count policy cache data
     * @param filters Filters
     * @param options Options
     * @returns Policy cache data and count
     */
    public static async getAndCountPolicyCacheData(
        filters?: FilterObject<PolicyCacheData>,
        options?: unknown
    ): Promise<[PolicyCacheData[], number]> {
        return await new DataBaseHelper(PolicyCacheData).findAndCount(
            filters,
            options
        );
    }

    /**
     * Get Approval Document
     * @param filters
     *
     * @virtual
     */
    public async getApprovalDocument(filters: FilterQuery<ApprovalDocumentCollection>): Promise<ApprovalDocumentCollection | null> {
        return await this.findOne(ApprovalDocumentCollection, filters);
    }

    /**
     * Get Approval Documents
     * @param filters
     * @param options
     * @param countResult
     * @virtual
     */
    public async getApprovalDocuments(filters: FilterObject<ApprovalDocumentCollection>, options?: FindOptions<object>, countResult?: boolean): Promise<ApprovalDocumentCollection[] | number> {
        if (countResult) {
            return await this.count(ApprovalDocumentCollection, filters, options);
        }
        return await this.find(ApprovalDocumentCollection, filters, options);
    }

    /**
     * Get Approval Documents
     * @param aggregation
     * @virtual
     */
    public async getApprovalDocumentsByAggregation(aggregation: FilterObject<DidDocumentCollection>[]): Promise<ApprovalDocumentCollection[]> {
        return await this.aggregate(ApprovalDocumentCollection, aggregation) as ApprovalDocumentCollection[];
    }

    /**
     * Get Artifact
     * @param filters Filters
     * @returns Artifact
     */
    public static async getArtifact(filters?: FilterQuery<ArtifactCollection>): Promise<ArtifactCollection | null> {
        return await new DataBaseHelper(ArtifactCollection).findOne(filters);
    }

    //Static

    /**
     * Get Artifact File By UUID
     * @param uuid File UUID
     * @returns Buffer
     */
    public static async getArtifactFileByUUID(uuid: string): Promise<Buffer> {
        const artifactChunks = (await new DataBaseHelper(ArtifactChunkCollection).find({
            uuid
        }, {
            orderBy: {
                number: 'ASC'
            }
        })).map(item => item.data.buffer);
        return artifactChunks.length > 0 ? Buffer.concat(artifactChunks) : Buffer.from('');
    }

    /**
     * Get Artifacts
     * @param filters Filters
     * @param options Options
     * @returns Artifacts
     */
    public static async getArtifacts(filters?: FilterQuery<ArtifactCollection>, options?: FindOptions<ArtifactCollection>): Promise<ArtifactCollection[]> {
        return await new DataBaseHelper(ArtifactCollection).find(filters, options);
    }

    /**
     * Get Artifacts
     * @param filters Filters
     * @param options Options
     * @returns Artifacts
     */
    public static async getArtifactsAndCount(filters?: FilterObject<ArtifactCollection>, options?: FindOptions<object>): Promise<[ArtifactCollection[], number]> {
        return await new DataBaseHelper(ArtifactCollection).findAndCount(filters, options);
    }

    /**
     * Get assigned entities
     * @param did
     * @param type
     */
    public static async getAssignedEntities(did: string, type?: AssignedEntityType): Promise<AssignEntity[]> {
        if (type) {
            return await (new DataBaseHelper(AssignEntity)).find({ type, did });
        } else {
            return await (new DataBaseHelper(AssignEntity)).find({ did });
        }
    }

    /**
     * Check entity
     * @param type
     * @param entityId
     * @param did
     */
    public static async getAssignedEntity(type: AssignedEntityType, entityId: string, did: string): Promise<AssignEntity | null> {
        return await (new DataBaseHelper(AssignEntity)).findOne({ type, entityId, did });
    }

    /**
     * get document aggregation filters for analytics
     * @param nameFilterMap
     * @param nameFilterAttributes
     * @param existingAttributes
     *
     * @returns Result
     */
    public getAttributesAggregationFilters(nameFilterMap: string, nameFilterAttributes: string, existingAttributes: string[] | []): unknown[] {
        return DataBaseHelper.getAttributesAggregationFilters(nameFilterMap, nameFilterAttributes, existingAttributes);
    }

    /**
     * Get Block State
     * @param {string} policyId - policy ID
     * @param {string} blockId - block UUID
     * @param {string} did - user DID
     * @param {string} name - variable name
     *
     * @returns {BlockCache | null} - variable value
     * @virtual
     */
    public async getBlockCache(
        policyId: string,
        blockId: string,
        did: string,
        name: string
    ): Promise<BlockCache | null> {
        return await this.findOne(BlockCache, {
            policyId,
            blockId,
            did,
            name
        });
    }

    /**
     * Get block states
     * @param policyId Policy identifier
     * @returns Block states
     */
    public async getBlockStates(policyId: string): Promise<BlockState[]> {
        return await this.find(BlockState, { policyId });
    }

    /**
     * Get Block State
     * @param policyId
     * @param blockId
     * @param blockTag
     *
     * @virtual
     */
    public async getBlockState(
        policyId: string,
        blockId: string,
        blockTag: string
    ): Promise<BlockState | null> {

        const conditions: any[] = [{ blockId }];

        if (blockTag !== null && blockTag !== undefined) {
            conditions.push({ blockTag });
        }

        return await this.findOne(BlockState, {
            policyId,
            $or: conditions
        });
    }

    /**
     * Save Block State
     * @param policyId
     * @param blockId
     * @param blockTag
     * @param state
     *
     * @virtual
     */
    public async saveBlockState(
        policyId: string,
        blockId: string,
        blockTag: string,
        state: unknown
    ): Promise<void> {
        let stateEntity = await this.getBlockState(policyId, blockId, blockTag);
        if (!stateEntity) {
            stateEntity = this.create(BlockState, { policyId, blockId, blockTag });
        }
        stateEntity.blockState = JSON.stringify(state);
        await this.save(BlockState, stateEntity);
    }

    /**
     * Get Contract by ID
     * @param id
     */
    public static async getContractById(id: string | null): Promise<ContractCollection | null> {
        return await new DataBaseHelper(ContractCollection).findOne(id);
    }

    /**
     * Get Did Document
     * @param did
     */
    public async getDidDocument(did: string): Promise<DidDocumentCollection | null> {
        return await this.findOne(DidDocumentCollection, { did });
    }

    /**
     * Get Did Document
     * @param did
     */
    public static async getDidDocument(did: string): Promise<DidDocumentCollection | null> {
        return await (new DataBaseHelper(DidDocumentCollection)).findOne({ did });
    }

    /**
     * Get Did Documents
     * @param filters
     *
     * @param options
     * @param countResult
     * @virtual
     */
    public async getDidDocuments(filters: FilterObject<DidDocumentCollection>, options?: FindOptions<object>, countResult?: boolean): Promise<DidDocumentCollection[] | number> {
        if (countResult) {
            return await this.count(DidDocumentCollection, filters, options);
        }
        return await this.find(DidDocumentCollection, filters, options);
    }

    /**
     * Get Did Documents
     * @param aggregation
     * @virtual
     */
    public async getDidDocumentsByAggregation(aggregation: FilterObject<DidDocumentCollection>[]): Promise<DidDocumentCollection[]> {
        return await this.aggregate(DidDocumentCollection, aggregation) as DidDocumentCollection[];
    }

    /**
     * get document aggregation filters
     * @param props
     *
     * @returns Result
     */
    public getDocumentAggregationFilters(props: IGetDocumentAggregationFilters): void {
        return DataBaseHelper.getDocumentAggregationFilters(props);
    }

    /**
     * Get Document States
     * @param filters
     * @param options
     *
     * @virtual
     */
    public async getDocumentStates(filters: FilterObject<DocumentState>, options?: FindOptions<object>): Promise<DocumentState[]> {
        return await this.find(DocumentState, filters, options);
    }

    /**
     * Get Dry Run id
     * @returns Dry Run id
     */
    public getDryRun(): string {
        return this.dryRun;
    }

    /**
     * Get External Topic
     * @param policyId
     * @param blockId
     * @param userId
     *
     * @virtual
     */
    public async getExternalTopic(
        policyId: string,
        blockId: string,
        userId: string
    ): Promise<ExternalDocument | null> {
        return await this.findOne(ExternalDocument, {
            policyId: { $eq: policyId },
            blockId: { $eq: blockId },
            owner: { $eq: userId }
        });
    }

    /**
     * Get Policies By Category and Name
     * @param {string[]} categoryIds - category ids
     * @param {string} text - part of category name
     *
     * @returns {Policy[]} - found policies
     */
    public static async getFilteredPolicies(categoryIds: string[], text: string): Promise<Policy[]> {
        const conditions = await GetConditionsPoliciesByCategories(categoryIds, text);
        return await new DataBaseHelper(Policy).find({ $and: conditions });
    }

    /**
     * Get Group By Name
     * @param policyId
     * @param groupName
     *
     * @virtual
     */
    public async getGlobalGroup(policyId: string, groupName: string): Promise<PolicyRolesCollection | null> {
        return await this.findOne(PolicyRolesCollection, { policyId, groupName });
    }

    /**
     * Get Group By UUID
     * @param policyId
     * @param uuid
     *
     * @virtual
     */
    public async getGroupByID(policyId: string, uuid: string): Promise<PolicyRolesCollection | null> {
        return await this.findOne(PolicyRolesCollection, { policyId, uuid });
    }

    /**
     * Get Group By UUID
     * @param policyId
     * @param uuid
     *
     * @returns Group
     */
    public static async getGroupByID(policyId: string, uuid: string): Promise<PolicyRolesCollection | null> {
        return await new DataBaseHelper(PolicyRolesCollection).findOne({ policyId, uuid });
    }

    /**
     * Get Groups By User
     * @param policyId
     * @param did
     * @param options
     *
     * @virtual
     */
    public async getGroupsByUser(policyId: string, did: string, options?: unknown): Promise<PolicyRolesCollection[]> {
        if (!did) {
            return [];
        }

        const opt: any =
            options && typeof options === 'object' ? options : undefined;

        const savepointIds: string[] | undefined = opt?.savepointIds

        const where: any = savepointIds
            ? {
                policyId,
                did,
                $or: [
                    { savepointId: { $in: savepointIds } },
                    { savepointId: { $exists: false } },
                    { savepointId: null },
                ],
            }
            : { policyId, did };

        return await this.find(PolicyRolesCollection, where, options);
    }

    /**
     * Get Groups
     * @param policyId
     * @param options
     *
     * @virtual
     */
    public async getPolicyGroups(filters: any, options?: unknown): Promise<PolicyRolesCollection[]> {
        return await this.find(PolicyRolesCollection, filters, options);
    }

    /**
     * Get Groups By User
     * @param policyId
     * @param did
     * @param options
     *
     * @returns Groups
     */
    public static async getGroupsByUser(policyId: string, did: string, options?: FindOptions<PolicyRolesCollection>): Promise<PolicyRolesCollection[]> {
        if (!did) {
            return [];
        }
        return await new DataBaseHelper(PolicyRolesCollection).find({ policyId, did }, options);
    }

    /**
     * Get policies
     * @param filters
     */
    public static async getListOfPolicies(filters?: FilterObject<Policy>): Promise<Policy[]> {
        const options = {
            fields: [
                'id',
                'uuid',
                'name',
                'version',
                'previousVersion',
                'description',
                'status',
                'creator',
                'owner',
                'topicId',
                'policyTag',
                'messageId',
                'codeVersion',
                'createDate'
            ] as unknown as PopulatePath.ALL[],
            limit: 100
        };
        return await new DataBaseHelper(Policy).find(filters, options);
    }

    /**
     * Get mint request minted serials
     * @param mintRequestId Mint request identifier
     * @returns Serials
     */
    public async getMintRequestSerials(mintRequestId: string): Promise<number[]> {
        return await this.getTransactionsSerials(mintRequestId);
    }

    /**
     * Get mint request transfer serials
     * @param mintRequestId Mint request identifier
     * @returns Serials
     */
    public async getMintRequestTransferSerials(mintRequestId: string): Promise<number[]> {
        return await this.getTransactionsSerials(mintRequestId, MintTransactionStatus.SUCCESS);
    }

    /**
     * Get mint transactions
     * @param filters Filters
     * @returns Mint transaction
     */
    public async getMintTransaction(filters: FilterObject<MintTransaction>): Promise<MintTransaction> {
        return await this.findOne(MintTransaction, filters);
    }

    /**
     * Get mint transactions
     * @param filters Filters
     * @param options Options
     * @returns Mint transactions
     */
    public async getMintTransactions(filters: FilterObject<MintTransaction>, options?: FindOptions<object>): Promise<MintTransaction[]> {
        return await this.find(MintTransaction, filters, options);
    }

    /**
     * Get Module
     * @param filters
     */
    public static async getModule(filters: FilterQuery<PolicyModule>): Promise<PolicyModule | null> {
        return await new DataBaseHelper(PolicyModule).findOne(filters);
    }

    /**
     * Get Module By ID
     * @param id
     */
    public static async getModuleById(id: string | null): Promise<PolicyModule | null> {
        return await new DataBaseHelper(PolicyModule).findOne(id);
    }

    /**
     * Get Module By UUID
     * @param uuid
     */
    public static async getModuleByUUID(uuid: string): Promise<PolicyModule | null> {
        return await new DataBaseHelper(PolicyModule).findOne({ uuid });
    }

    /**
     * Get Modules
     * @param filters
     * @param options
     */
    public static async getModules(filters?: FilterQuery<PolicyModule>, options?: FindOptions<PolicyModule>): Promise<PolicyModule[]> {
        return await new DataBaseHelper(PolicyModule).find(filters, options);
    }

    /**
     * Get Modules
     * @param filters
     * @param options
     */
    public static async getModulesAndCount(filters?: FilterObject<PolicyModule>, options?: FindOptions<object>): Promise<[PolicyModule[], number]> {
        return await new DataBaseHelper(PolicyModule).findAndCount(filters, options);
    }

    /**
     * Get Multi Policy link
     * @param instanceTopicId
     * @param owner
     * @returns MultiPolicy
     */
    public static async getMultiPolicy(instanceTopicId: string, owner: string): Promise<MultiPolicy | null> {
        return await new DataBaseHelper(MultiPolicy).findOne({ instanceTopicId, owner });
    }

    /**
     * Get MultiPolicyTransaction
     * @param policyId
     * @param owner
     */
    public static async getMultiPolicyTransactions(policyId: string, user: string): Promise<MultiPolicyTransaction[]> {
        return await new DataBaseHelper(MultiPolicyTransaction).find({ policyId, user, status: 'Waiting' });
    }

    /**
     * Get MultiSign Statuses
     * @param uuid
     * @param documentId
     * @param group
     *
     * @virtual
     */
    public async getMultiSignDocuments(uuid: string, documentId: string, group: string): Promise<MultiDocuments[]> {
        return await this.find(MultiDocuments, {
            uuid: { $eq: uuid },
            documentId: { $eq: documentId },
            group: { $eq: group },
            userId: { $ne: 'Group' }
        });
    }

    /**
     * Get multi sign documents by document identifiers
     * @param documentIds Document identifiers
     * @returns Multi sign documents
     */
    public async getMultiSignDocumentsByDocumentIds(
        documentIds: string[]
    ): Promise<MultiDocuments[]> {
        return await this.find(MultiDocuments, {
            documentId: { $in: documentIds },
        });
    }

    /**
     * Get MultiSign Statuses by group
     * @param uuid
     * @param group
     *
     * @virtual
     */
    public async getMultiSignDocumentsByGroup(uuid: string, group: string): Promise<MultiDocuments[]> {
        return await this.find(MultiDocuments, {
            uuid: { $eq: uuid },
            group: { $eq: group },
            userId: { $eq: 'Group' },
            status: { $eq: 'NEW' }
        });
    }

    /**
     * Get MultiSign Status by document or user
     * @param uuid
     * @param documentId
     * @param userId
     *
     * @virtual
     */
    public async getMultiSignStatus(uuid: string, documentId: string, userId: string = 'Group'): Promise<MultiDocuments> {
        return await this.findOne(MultiDocuments, { uuid, documentId, userId });
    }

    /**
     * Get policies
     * @param filters
     * @param options
     */
    public static async getPolicies(filters?: FilterObject<Policy>, options?: unknown): Promise<Policy[]> {
        return await new DataBaseHelper(Policy).find(filters, options);
    }

    /**
     * Get policies and count
     * @param filters
     * @param options
     */
    public static async getPoliciesAndCount(filters: FilterObject<Policy>, options?: FindOptions<object>): Promise<[Policy[], number]> {
        return await new DataBaseHelper(Policy).findAndCount(filters, options);
    }

    /**
     * Get Policy
     * @param policyId
     *
     * @virtual
     */
    public async getPolicy(policyId: string | null, options?: FindOptions<object>): Promise<Policy | null> {
        return await new DataBaseHelper(Policy).findOne(policyId, options);
    }

    /**
     * Get policy
     * @param filters
     */
    public static async getPolicy(filters: FilterObject<Policy>, options?: FindOptions<object>): Promise<Policy | null> {
        return await new DataBaseHelper(Policy).findOne(filters, options);
    }

    /**
     * Get policy by id
     * @param policyId
     */
    public static async getPolicyById(policyId: string | null): Promise<Policy | null> {
        return await new DataBaseHelper(Policy).findOne(policyId);
    }

    /**
     * Get policy by tag
     * @param policyTag
     */
    public static async getPolicyByTag(policyTag: string): Promise<Policy | null> {
        return await new DataBaseHelper(Policy).findOne({ policyTag });
    }

    /**
     * Get policy by uuid
     * @param uuid
     */
    public static async getPolicyByUUID(uuid: string): Promise<Policy | null> {
        return await new DataBaseHelper(Policy).findOne({ uuid });
    }

    /**
     * Get policy cache
     * @param filters Filters
     * @returns Policy cache
     */
    public static async getPolicyCache(filters: FilterObject<PolicyCache>): Promise<PolicyCache> {
        return await new DataBaseHelper(PolicyCache).findOne(filters);
    }

    /**
     * Get policy cache data
     * @param filters Filters
     * @param options Options
     * @returns Policy cache data
     */
    public static async getPolicyCacheData(
        filters?: FilterObject<PolicyCache>,
        options?: FindOptions<PolicyCacheData>
    ): Promise<PolicyCacheData[]> {
        return await new DataBaseHelper(PolicyCacheData).find(filters, options);
    }

    /**
     * Get policy caches
     * @param filters Filters
     * @returns Policy caches
     */
    public static async getPolicyCaches(filters?: FilterObject<PolicyCache>): Promise<PolicyCache[]> {
        return await new DataBaseHelper(PolicyCache).find(filters);
    }

    /**
     * Get Policy Categories
     *
     * @virtual
     */
    public static async getPolicyCategories(): Promise<PolicyCategory[]> {
        return await new DataBaseHelper(PolicyCategory).find(PolicyCategory as FilterQuery<PolicyCategory>);
    }

    /**
     * Get policy count
     * @param filters
     */
    public static async getPolicyCount(filters: FilterObject<Policy>): Promise<number> {
        return await new DataBaseHelper(Policy).count(filters);
    }

    /**
     * Get Policy Properties
     *
     * @virtual
     */
    public static async getPolicyProperties(): Promise<PolicyProperty[]> {
        return await new DataBaseHelper(PolicyProperty).find(PolicyProperty as FilterQuery<PolicyProperty>);
    }

    /**
     * Get policy test
     * @param policyId
     * @param id
     * @returns tests
     */
    public static async getPolicyTest(policyId: string, id: string): Promise<PolicyTest> {
        return await new DataBaseHelper(PolicyTest).findOne({ id, policyId });
    }

    /**
     * Get policy tests
     * @param resultId
     *
     * @returns tests
     */
    public static async getPolicyTestByRecord(resultId: string): Promise<PolicyTest> {
        return await new DataBaseHelper(PolicyTest).findOne({ resultId });
    }

    /**
     * Get policy tests
     * @param policyId
     * @returns tests
     */
    public static async getPolicyTests(policyId: string): Promise<PolicyTest[]> {
        return await new DataBaseHelper(PolicyTest).find({ policyId });
    }

    /**
     * Get policy test
     * @param policyId
     * @param status
     * @returns tests
     */
    public static async getPolicyTestsByStatus(policyId: string, status: PolicyTestStatus): Promise<PolicyTest[]> {
        return await new DataBaseHelper(PolicyTest).find({ status, policyId });
    }

    /**
     * Get Publish Policies
     *
     * @virtual
     */
    public static async getPublishPolicies(): Promise<Policy[]> {
        return await new DataBaseHelper(Policy).find({
            status: { $eq: PolicyStatus.PUBLISH }
        });
    }

    /**
     * Get Record
     * @param filters Filters
     * @param options Options
     * @returns Record
     */
    public static async getRecord(filters?: FilterQuery<Record>, options?: FindOptions<Record>): Promise<Record[]> {
        return await new DataBaseHelper(Record).find(filters, options);
    }

    /**
     * Get Residue objects
     * @param policyId
     * @param blockId
     * @param userId
     */
    public async getResidue(
        policyId: string,
        blockId: string,
        userId: string
    ): Promise<SplitDocuments[]> {
        return await this.find(SplitDocuments, {
            policyId: { $eq: policyId },
            blockId: { $eq: blockId },
            userId: { $eq: userId }
        });
    }

    /**
     * Get retire pools
     * @param tokenIds Token identifiers
     * @returns Retire pools
     */
    public static async getRetirePools(tokenIds: string[]): Promise<RetirePool[]> {
        return await new DataBaseHelper(RetirePool).find({ tokenIds: { $in: tokenIds } });
    }

    /**
     * Get schema
     * @param iri
     * @param topicId
     */
    public async getSchemaByIRI(
        iri: string,
        topicId?: string,
        options?: FindOptions<SchemaCollection>
    ): Promise<SchemaCollection | null> {
        if (topicId) {
            return await new DataBaseHelper(SchemaCollection).findOne({ iri, topicId }, options);
        } else {
            return await new DataBaseHelper(SchemaCollection).findOne({ iri }, options);
        }
    }

    /**
     * Get schema
     * @param id
     */
    public static async getSchemaById(id: string | null): Promise<SchemaCollection | null> {
        return await new DataBaseHelper(SchemaCollection).findOne(id);
    }

    /**
     * Get schema
     * @param topicId
     * @param entity
     */
    public async getSchemaByType(topicId: string, entity: SchemaEntity): Promise<SchemaCollection | null> {
        return await new DataBaseHelper(SchemaCollection).findOne({
            entity,
            readonly: true,
            topicId
        });
    }

    /**
     * Get schema
     * @param topicId
     * @param entity
     */
    public static async getSchemaByType(topicId: string, entity: SchemaEntity): Promise<SchemaCollection | null> {
        return await new DataBaseHelper(SchemaCollection).findOne({
            entity,
            readonly: true,
            topicId
        });
    }

    /**
     * Get schemas
     * @param filters
     * @param options
     */
    public static async getSchemas(filters?: FilterObject<SchemaCollection>, options?: unknown): Promise<SchemaCollection[]> {
        return await new DataBaseHelper(SchemaCollection).find(filters, options);
    }

    /**
     * Get schema
     * @param filters
     * @param options
     */
    public static async getSchemasAndCount(filters?: FilterObject<SchemaCollection>, options?: FindOptions<object>): Promise<[SchemaCollection[], number]> {
        return await new DataBaseHelper(SchemaCollection).findAndCount(filters, options);
    }

    /**
     * Get schema
     * @param ids
     */
    public static async getSchemasByIds(ids: string[]): Promise<SchemaCollection[]> {
        return await new DataBaseHelper(SchemaCollection).find({ id: { $in: ids } });
    }

    /**
     * Get schema
     * @param filters
     */
    public static async getSchemasCount(filters?: FilterObject<SchemaCollection>): Promise<number> {
        return await new DataBaseHelper(SchemaCollection).count(filters);
    }

    /**
     * Get split documents in policy
     * @param policyId Policy identifier
     * @returns Split documents
     */
    public async getSplitDocumentsByPolicy(
        policyId: string,
    ): Promise<SplitDocuments[]> {
        return await this.find(SplitDocuments, {
            policyId
        });
    }

    /**
     * Get suggestions config
     * @param did
     * @returns config
     */
    public static async getSuggestionsConfig(
        did: string
    ): Promise<SuggestionsConfig | null> {
        return await new DataBaseHelper(SuggestionsConfig).findOne({
            user: did
        });
    }

    /**
     * Get system schema
     * @param entity
     */
    public static async getSystemSchema(entity: SchemaEntity): Promise<SchemaCollection | null> {
        return await new DataBaseHelper(SchemaCollection).findOne({
            entity,
            system: true,
            active: true
        });
    }

    /**
     * Get tag By UUID
     * @param uuid
     */
    public async getTagById(uuid: string): Promise<Tag | null> {
        return await this.findOne(Tag, { uuid });
    }

    /**
     * Get tag By UUID
     * @param uuid
     */
    public static async getTagById(uuid: string): Promise<Tag | null> {
        return await new DataBaseHelper(Tag).findOne({ uuid });
    }

    /**
     * Get tags
     * @param filters
     * @param options
     */
    public async getTagCache(filters?: FilterObject<TagCache>, options?: FindOptions<object>): Promise<TagCache[]> {
        return await this.find(TagCache, filters, options);
    }

    /**
     * Get tags
     * @param filters
     * @param options
     */
    public static async getTagCache(filters?: FilterQuery<TagCache>, options?: FindOptions<TagCache>): Promise<TagCache[]> {
        return await new DataBaseHelper(TagCache).find(filters, options);
    }

    /**
     * Get tags
     * @param filters
     * @param options
     */
    public async getTags(filters?: FilterQuery<Tag>, options?: FindOptions<object>): Promise<Tag[]> {
        return await this.find(Tag, filters, options);
    }

    /**
     * Get tags
     * @param filters
     * @param options
     */
    public static async getTags(filters?: FilterQuery<Tag>, options?: unknown): Promise<Tag[]> {
        return await new DataBaseHelper(Tag).find(filters, options);
    }

    /**
     * get tasks aggregation filters
     * @param nameFilter
     * @param processTimeout
     *
     * @returns Result
     */
    public getTasksAggregationFilters(nameFilter: string, processTimeout: number): unknown[] {
        return DataBaseHelper.getTasksAggregationFilters(nameFilter, processTimeout);
    }

    /**
     * Get Theme
     * @param filters
     */
    public static async getTheme(filters: FilterQuery<Theme>): Promise<Theme | null> {
        return await new DataBaseHelper(Theme).findOne(filters);
    }

    /**
     * Get Themes
     * @param filters
     */
    public static async getThemes(filters: FilterQuery<Theme>): Promise<Theme[]> {
        return await new DataBaseHelper(Theme).find(filters);
    }

    /**
     * Get Token
     * @param tokenId
     * @param dryRun
     */
    public async getToken(tokenId: string, dryRun: string = null): Promise<TokenCollection | null> {
        if (dryRun) {
            return this.findOne(TokenCollection, { tokenId });
        } else {
            return await new DataBaseHelper(TokenCollection).findOne({ tokenId });
        }
    }

    /**
     * Get Token
     * @param tokenId
     */
    public static async getToken(tokenId: string): Promise<TokenCollection | null> {
        return await new DataBaseHelper(TokenCollection).findOne({ tokenId });
    }

    /**
     * Get Token by ID
     * @param id
     */
    public static async getTokenById(id: string | null): Promise<TokenCollection | null> {
        return await new DataBaseHelper(TokenCollection).findOne(id);
    }

    /**
     * Get tokens
     * @param filters Filters
     * @returns Tokens
     */
    public static async getTokens(filters?: FilterQuery<TokenCollection>): Promise<TokenCollection[]> {
        return await new DataBaseHelper(TokenCollection).find(filters);
    }

    /**
     * Get Tool
     * @param filters
     */
    public static async getTool(filters: FilterQuery<PolicyTool>): Promise<PolicyTool | null> {
        return await new DataBaseHelper(PolicyTool).findOne(filters);
    }

    /**
     * Get Tool By ID
     * @param id
     */
    public static async getToolById(id: string | null): Promise<PolicyTool | null> {
        return await new DataBaseHelper(PolicyTool).findOne(id);
    }

    /**
     * Get Tool By UUID
     * @param uuid
     */
    public static async getToolByUUID(uuid: string): Promise<PolicyTool | null> {
        return await new DataBaseHelper(PolicyTool).findOne({ uuid });
    }

    /**
     * Get Tools
     * @param filters
     * @param options
     */
    public static async getTools(filters?: FilterQuery<PolicyTool>, options?: unknown): Promise<PolicyTool[]> {
        return await new DataBaseHelper(PolicyTool).find(filters, options);
    }

    /**
     * Get Tools
     * @param filters
     * @param options
     */
    public static async getToolsAndCount(filters?: FilterObject<PolicyTool>, options?: FindOptions<object>): Promise<[PolicyTool[], number]> {
        return await new DataBaseHelper(PolicyTool).findAndCount(filters, options);
    }

    /**
     * Get Topic
     * @param filters
     *
     * @virtual
     */
    public async getTopic(filters: FilterObject<TopicCollection>): Promise<TopicCollection | null> {
        return await this.findOne(TopicCollection, filters);
    }

    /**
     * Get topic by id
     * @param topicId
     */
    public async getTopicById(topicId: string): Promise<TopicCollection | null> {
        return await this.findOne(TopicCollection, { topicId });
    }

    /**
     * Get topic by id
     * @param topicId
     */
    public static async getTopicById(topicId: string): Promise<TopicCollection | null> {
        return await new DataBaseHelper(TopicCollection).findOne({ topicId });
    }

    /**
     * Get topic by type
     * @param owner
     * @param type
     */
    public static async getTopicByType(owner: string, type: TopicType): Promise<TopicCollection | null> {
        return await new DataBaseHelper(TopicCollection).findOne({ owner, type });
    }

    /**
     * Get Topics
     * @param filters
     *
     * @virtual
     */
    public async getTopics(
        filters: {
            /**
             * policyId
             */
            policyId?: string,
            /**
             * type
             */
            type?: TopicType,
            /**
             * name
             */
            name?: string,
            /**
             * owner
             */
            owner?: string,
            /**
             * topicId
             */
            topicId?: string
        }
    ): Promise<TopicCollection[]> {
        return await this.find(TopicCollection, filters);
    }

    /**
     * Get transactions count
     * @param filters Mint request identifier
     * @returns Transactions count
     */
    public async getTransactionsCount(filters: FilterObject<MintTransaction>): Promise<number> {
        return await this.count(MintTransaction, filters);
    }

    /**
     * Get transactions serials
     * @param mintRequestId Mint request identifier
     * @param transferStatus Transfer status
     *
     * @returns Serials
     */
    public async getTransactionsSerials(
        mintRequestId: string,
        transferStatus?: MintTransactionStatus | unknown
    ): Promise<number[]> {
        const aggregation = DataBaseHelper._getTransactionsSerialsAggregation(
            mintRequestId,
            transferStatus
        );
        const result = await this.aggregate(MintTransaction, aggregation);
        return result[0]?.serials || [];
    }

    /**
     * Get transactions serials count
     * @param mintRequestId Mint request identifier
     * @param transferStatus Transfer status
     *
     * @returns Serials count
     */
    public async getTransactionsSerialsCount(
        mintRequestId: string,
        transferStatus?: MintTransactionStatus | unknown
    ): Promise<number> {
        const aggregation = DataBaseHelper._getTransactionsSerialsAggregation(
            mintRequestId,
            transferStatus
        );

        DataBaseHelper.getTransactionsSerialsAggregationFilters({
            aggregation,
            aggregateMethod: 'push',
            nameFilter: MAP_TRANSACTION_SERIALS_AGGREGATION_FILTERS.COUNT
        });

        const result = await this.aggregate(MintTransaction, aggregation);

        //todo something wrong with logic, serials is array
        return result[0]?.serials as unknown as number || 0;
    }

    /**
     * Get User In Group
     * @param policyId
     * @param did
     * @param uuid
     *
     * @virtual
     */
    public async getUserInGroup(policyId: string, did: string, uuid: string): Promise<PolicyRolesCollection | null> {
        if (!did && !uuid) {
            return null;
        }
        return await this.findOne(PolicyRolesCollection, { policyId, did, uuid });
    }

    /**
     * Get user role in policy
     * @param policyId
     * @param did
     */
    public static async getUserRole(policyId: string, did: string): Promise<PolicyRolesCollection[]> {
        if (!did) {
            return null;
        }
        return await new DataBaseHelper(PolicyRolesCollection).find({ policyId, did });
    }

    /**
     * Get user roles
     * @param policyId
     * @param did
     * @returns
     *
     * @virtual
     */
    public async getUserRoles(policyId: string, did: string): Promise<PolicyRolesCollection[]> {
        return await this.find(PolicyRolesCollection, { policyId, did });
    }

    /**
     * Get all policy users by role
     * @param policyId
     * @param role
     *
     * @virtual
     */
    public async getUsersByRole(policyId: string, role: string): Promise<PolicyRolesCollection[]> {
        return await this.find(PolicyRolesCollection, { policyId, role });
    }

    /**
     * Get VC
     * @param filters
     * @param options
     */
    public static async getVC(
        filters?: FilterQuery<VcDocumentCollection>,
        options?: FindOptions<VcDocumentCollection>
    ): Promise<VcDocumentCollection | null> {
        return await new DataBaseHelper(VcDocumentCollection).findOne(filters, options);
    }

    /**
     * Get VC
     * @param id
     */
    public static async getVCById(id: string | null): Promise<VcDocumentCollection> | null {
        return await new DataBaseHelper(VcDocumentCollection).findOne(id);
    }

    /**
     * Get VCs
     * @param filters
     * @param options
     */
    public static async getVCs(filters?: FilterQuery<VcDocumentCollection>, options?: FindOptions<VcDocumentCollection>): Promise<VcDocumentCollection[]> {
        return await new DataBaseHelper(VcDocumentCollection).find(filters, options);
    }

    /**
     * Get VCs
     * @param filters
     * @param options
     */
    public static async getVCsAndCount(
        filters?: FilterQuery<VcDocumentCollection>,
        options?: FindOptions<VcDocumentCollection>
    ): Promise<[VcDocumentCollection[], number]> {
        return await new DataBaseHelper(VcDocumentCollection).findAndCount(filters, options);
    }

    /**
     * Get VC
     * @param filters
     * @param options
     */
    public static async getVP(filters?: FilterQuery<VpDocumentCollection>, options?: FindOptions<object>): Promise<VpDocumentCollection | null> {
        return await new DataBaseHelper(VpDocumentCollection).findOne(filters, options);
    }

    /**
     * Get VC
     * @param id
     */
    public static async getVPById(id: string | null): Promise<VpDocumentCollection | null> {
        return await new DataBaseHelper(VpDocumentCollection).findOne(id);
    }

    /**
     * Get VP mint information
     * @param vpDocument VP
     * @returns Serials and amount
     */
    public async getVPMintInformation(
        vpDocument: VpDocument
    ): Promise<
        [
            serials: { serial: number; tokenId: string }[],
            amount: number,
            error: string,
            wasTransferNeeded: boolean,
            transferSerials: number[],
            transferAmount: number,
            tokenIds: string[],
            target: string
        ]
    > {
        const mintRequests = await this.getMintRequests({
            $or: [
                {
                    vpMessageId: vpDocument.messageId,
                },
                {
                    secondaryVpIds: vpDocument.messageId,
                },
            ],
        } as FilterObject<MintRequest>);
        const serials = vpDocument.serials
            ? vpDocument.serials.map((serial) => ({
                serial,
                tokenId: vpDocument.tokenId,
            }))
            : [];
        let amount = Number.isFinite(Number(vpDocument.amount))
            ? Number(vpDocument.amount)
            : serials.length;
        const transferSerials = vpDocument.serials
            ? vpDocument.serials.map((serial) => ({
                serial,
                tokenId: vpDocument.tokenId,
            }))
            : [];
        let transferAmount = amount;
        const errors = [];
        let wasTransferNeeded = false;
        const tokenIds = new Set<string>();
        if (vpDocument.tokenId) {
            tokenIds.add(vpDocument.tokenId);
        }
        const target = mintRequests?.[0]?.target;
        for (const mintRequest of mintRequests) {
            if (mintRequest.error) {
                errors.push(mintRequest.error);
            }
            wasTransferNeeded ||= mintRequest.wasTransferNeeded;
            tokenIds.add(mintRequest.tokenId);
            if (mintRequest.tokenType === TokenType.NON_FUNGIBLE) {
                const requestSerials = await this.getMintRequestSerials(
                    mintRequest.id
                );
                serials.push(
                    ...requestSerials.map((serial) => ({
                        serial,
                        tokenId: mintRequest.tokenId,
                    }))
                );
                amount += requestSerials.length;

                if (wasTransferNeeded) {
                    const requestTransferSerials =
                        await this.getMintRequestTransferSerials(
                            mintRequest.id
                        );
                    transferSerials.push(
                        ...requestTransferSerials.map((serial) => ({
                            serial,
                            tokenId: mintRequest.tokenId,
                        }))
                    );
                    transferAmount += requestTransferSerials.length;
                }
            } else if (mintRequest.tokenType === TokenType.FUNGIBLE) {
                const mintRequestTransaction = await this.getMintTransaction({
                    mintRequestId: mintRequest.id,
                    mintStatus: MintTransactionStatus.SUCCESS,
                });
                if (mintRequestTransaction) {
                    if (mintRequest.decimals > 0) {
                        amount +=
                            mintRequest.amount / Math.pow(10, mintRequest.decimals);
                    } else {
                        amount += mintRequest.amount;
                    }
                }
                if (wasTransferNeeded) {
                    const mintRequestTransferTransaction =
                        await this.getMintTransaction({
                            mintRequestId: mintRequest.id,
                            transferStatus: MintTransactionStatus.SUCCESS,
                        });
                    if (mintRequestTransferTransaction) {
                        if (mintRequest.decimals > 0) {
                            transferAmount +=
                                mintRequest.amount /
                                Math.pow(10, mintRequest.decimals);
                        } else {
                            transferAmount += mintRequest.amount;
                        }
                    }
                }
            }
        }

        return [
            serials,
            amount,
            errors.join(', '),
            wasTransferNeeded,
            transferSerials,
            transferAmount,
            [...tokenIds],
            target,
        ];
    }

    /**
     * Get VCs
     * @param filters
     * @param options
     */
    public static async getVPs(filters?: FilterQuery<VpDocumentCollection>, options?: FindOptions<VpDocumentCollection>): Promise<VpDocumentCollection[]> {
        return await new DataBaseHelper(VpDocumentCollection).find(filters, options);
    }

    /**
     * Get VCs
     * @param filters
     * @param options
     */
    public static async getVPsAndCount(
        filters?: FilterQuery<VpDocumentCollection>,
        options?: FindOptions<VpDocumentCollection>
    ): Promise<[VpDocumentCollection[], number]> {
        return await new DataBaseHelper(VpDocumentCollection).findAndCount(filters, options);
    }

    /**
     * Get Vc Document
     * @param filters
     *
     * @virtual
     */
    public async getVcDocument(filters: FilterQuery<VcDocumentCollection>): Promise<VcDocumentCollection | null> {
        return await this.findOne(VcDocumentCollection, filters);
    }

    /**
     * Get Vc Documents
     * @param filters
     * @param options
     * @param countResult
     * @virtual
     */
    public async getVcDocuments<T extends VcDocumentCollection | number>(
        filters: FilterObject<T>,
        options?: FindOptions<object>,
        countResult?: boolean
    ): Promise<T[] | number> {
        if (countResult) {
            return await this.count(VcDocumentCollection, filters, options);
        }
        return await this.find(VcDocumentCollection, filters, options) as T[];
    }

    /**
     * Get Vc Documents
     * @param aggregation
     * @virtual
     */
    public async getVcDocumentsByAggregation(aggregation: FilterObject<VcDocumentCollection>[]): Promise<VcDocumentCollection[]> {
        return await this.aggregate(VcDocumentCollection, aggregation) as VcDocumentCollection[];
    }

    /**
     * Get Virtual Documents
     * @param policyId
     * @param type
     * @param pageIndex
     * @param pageSize
     *
     * @virtual
     */
    public static async getVirtualDocuments(
        policyId: string,
        type: string,
        pageIndex?: string,
        pageSize?: string
    ): Promise<[DryRun[], number]> {
        const filters = {
            dryRunId: policyId,
            dryRunClass: null
        }
        const otherOptions: { orderBy?: unknown, limit?: number, offset?: number, fields?: string[] } = {};
        const _pageSize = parseInt(pageSize, 10);
        const _pageIndex = parseInt(pageIndex, 10);
        if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
            otherOptions.orderBy = { createDate: 'DESC' };
            otherOptions.limit = _pageSize;
            otherOptions.offset = _pageIndex * _pageSize;
        }
        if (type === 'artifacts') {
            filters.dryRunClass = {
                $in: [
                    'VcDocumentCollection',
                    'VpDocumentCollection',
                    'DidDocumentCollection',
                    'ApprovalDocumentCollection'
                ]
            };
        } else if (type === 'transactions') {
            filters.dryRunClass = { $eq: 'Transactions' };
            otherOptions.fields = [
                'id',
                'createDate',
                'type',
                'hederaAccountId'
            ];
        } else if (type === 'ipfs') {
            filters.dryRunClass = { $eq: 'Files' };
            otherOptions.fields = [
                'id',
                'createDate',
                'document',
                'documentURL'
            ];
        }
        return await new DataBaseHelper(DryRun).findAndCount(filters, otherOptions);
    }

    /**
     * Get Virtual Hedera Account
     * @param hederaAccountId
     *
     * @virtual
     */
    public async getVirtualHederaAccountInfo(hederaAccountId: string): Promise<DryRun> {
        const item = (await new DataBaseHelper(DryRun).findOne({
            dryRunId: this.dryRun,
            dryRunClass: 'HederaAccountInfo',
            hederaAccountId
        }));
        return item?.tokenMap || {};
    }

    /**
     * Get Key from Virtual User
     * @param did
     * @param keyName
     *
     * @virtual
     */
    public async getVirtualKey(did: string, keyName: string): Promise<string | null> {
        const item = (await new DataBaseHelper(DryRun).findOne({
            dryRunId: this.dryRun,
            dryRunClass: 'VirtualKey',
            did,
            type: keyName
        }));
        return item?.hederaAccountKey;
    }

    /**
     * Get virtual keys
     * @param filters Filters
     * @returns Virtual keys
     */
    public async getVirtualKeys(filters: FilterQuery<DryRun>): Promise<DryRun[]> {
        const extendedFilters = filters as FilterQuery<DryRun> & {
            dryRunId?: string;
            dryRunClass?: string;
        };

        extendedFilters.dryRunId = this.dryRun;
        extendedFilters.dryRunClass = 'VirtualKey';

        return await new DataBaseHelper(DryRun).find(filters);
    }

    /**
     * Get Virtual Message
     * @param dryRun
     * @param messageId
     *
     * @virtual
     */
    public static async getVirtualMessage(dryRun: string, messageId: string): Promise<DryRun | null> {
        return (await new DataBaseHelper(DryRun).findOne({
            dryRunId: dryRun,
            dryRunClass: 'Message',
            messageId
        }));
    }

    /**
     * Get Virtual Messages
     * @param dryRun
     * @param topicId
     *
     * @virtual
     */
    public static async getVirtualMessages(dryRun: string, topicId: string | TopicId): Promise<DryRun[]> {
        return (await new DataBaseHelper(DryRun).find({
            dryRunId: dryRun,
            dryRunClass: 'Message',
            topicId
        }));
    }

    /**
     * Get Virtual User
     * @param did
     *
     * @virtual
     */
    public async getVirtualUser(did: string): Promise<IAuthUser | null> {
        return (await new DataBaseHelper(DryRun).findOne({
            dryRunId: this.dryRun,
            dryRunClass: 'VirtualUsers',
            did
        })) as unknown as IAuthUser;
    }

    /**
     * Get Virtual User
     * @param did
     *
     * @virtual
     */
    public async getVirtualUserByAccount(accountId: string): Promise<IAuthUser | null> {
        return (await new DataBaseHelper(DryRun).findOne({
            dryRunId: this.dryRun,
            dryRunClass: 'VirtualUsers',
            hederaAccountId: accountId
        })) as unknown as IAuthUser;
    }

    /**
     * Get Current Virtual User
     * @param policyId
     *
     * @virtual
     */
    public static async getVirtualUser(policyId: string): Promise<DryRun | null> {
        return await new DataBaseHelper(DryRun).findOne({
            dryRunId: policyId,
            dryRunClass: 'VirtualUsers',
            active: true
        }, {
            fields: [
                'id',
                'did',
                'username',
                'hederaAccountId',
                'active'
            ]
        } as unknown as FindOptions<object>);
    }

    /**
     * Get All Virtual Users
     * @param policyId
     * @param savepointIds
     * @virtual
     */
    public static async getVirtualUsers(policyId: string, savepointIds?: string[]): Promise<DryRun[]> {
        const filter: any = {
            dryRunId: policyId,
            dryRunClass: 'VirtualUsers',
            $or: [
                { savepointId: null },
                { savepointId: { $exists: false } }
            ]
        };

        if (savepointIds) {
            filter.$or.push({ savepointId: { $in: savepointIds } });
        }

        return await new DataBaseHelper(DryRun).find(filter, {
            fields: [
                'id',
                'did',
                'username',
                'hederaAccountId',
                'active'
            ] as unknown as PopulatePath.ALL[],
            orderBy: {
                createDate: 1
            }
        });
    }

    /**
     * Get Vp Document
     * @param filters
     *
     * @virtual
     */
    public async getVpDocument(filters: FilterQuery<VpDocumentCollection>): Promise<VpDocumentCollection | null> {
        return await this.findOne(VpDocumentCollection, filters);
    }

    /**
     * Get Vp Documents
     * @param filters
     *
     * @param options
     * @param countResult
     * @virtual
     */
    public async getVpDocuments<T extends VpDocumentCollection | number>(
        filters: FilterObject<T>,
        options?: FindOptions<object>,
        countResult?: boolean
    ): Promise<T[] | number> {
        if (countResult) {
            return await this.count(VpDocumentCollection, filters, options);
        }
        return await this.find(VpDocumentCollection, filters, options) as T[];
    }

    /**
     * Get Vp Documents
     * @param aggregation
     * @virtual
     */
    public async getVpDocumentsByAggregation(aggregation: FilterObject<VpDocumentCollection>[]): Promise<VpDocumentCollection[]> {
        return await this.aggregate(VpDocumentCollection, aggregation) as VpDocumentCollection[];
    }

    /**
     * Load file
     * @param id
     *
     * @returns file ID
     */
    public static async loadFile(id: ObjectId): Promise<Buffer> {
        return DataBaseHelper.loadFile(id);
    }

    /**
     * Parse invite token
     * @param policyId
     * @param invitationId
     *
     * @virtual
     */
    public async parseInviteToken(policyId: string, invitationId: string): Promise<PolicyInvitations | null> {
        const invitation = await this.findOne(PolicyInvitations, invitationId);
        if (invitation && invitation.policyId === policyId && invitation.active === true) {
            invitation.active = false;
            await this.save(PolicyInvitations, invitation);
            return invitation;
        } else {
            return null;
        }
    }

    /**
     * Overriding the remove method
     * @param entityClass
     * @param entities
     */
    public async remove<T extends BaseEntity>(entityClass: new () => T, entities: T | T[]): Promise<void> {
        if (this.dryRun) {
            await new DataBaseHelper(DryRun).remove(entities as unknown as DryRun | DryRun[]);
        } else {
            await new DataBaseHelper(entityClass).remove(entities);
        }
    }

    /**
     * Remove Aggregate Document
     * @param hash
     * @param blockId
     *
     * @virtual
     */
    public async removeAggregateDocument(hash: string, blockId: string): Promise<void> {
        const item = await this.find(AggregateVC, { blockId, hash });
        await this.remove(AggregateVC, item);
    }

    /**
     * Remove Aggregate Documents
     * @param removeMsp
     *
     * @virtual
     */
    public async removeAggregateDocuments(removeMsp: AggregateVC[]): Promise<void> {
        await this.remove(AggregateVC, removeMsp);
    }

    /**
     * Remove Artifact
     * @param artifact Artifact
     */
    public static async removeArtifact(artifact?: ArtifactCollection): Promise<void> {
        await new DataBaseHelper(ArtifactCollection).remove(artifact)
        await new DataBaseHelper(ArtifactChunkCollection).delete({
            uuid: artifact.uuid
        });
    }

    /**
     * Remove assign entity
     * @param type
     * @param entityId
     * @param did
     * @param owner
     */
    public static async removeAssignEntity(
        type: AssignedEntityType,
        entityId: string,
        did: string,
        owner?: string
    ): Promise<boolean> {
        const filters: { type: AssignedEntityType, entityId: string, did: string, owner?: string } = { type, entityId, did };

        if (owner) {
            filters.owner = owner;
        }
        const item = await (new DataBaseHelper(AssignEntity)).findOne(filters);
        if (item) {
            await (new DataBaseHelper(AssignEntity)).remove(item);
        }
        return true;
    }

    /**
     * Delete Module
     * @param module
     */
    public static async removeModule(module: PolicyModule): Promise<void> {
        return await new DataBaseHelper(PolicyModule).remove(module);
    }

    /**
     * Get policy tests
     * @returns tests
     */
    public static async removePolicyTests(tests: PolicyTest[]): Promise<void> {
        await new DataBaseHelper(PolicyTest).remove(tests);
    }

    /**
     * Remove Residue objects
     * @param residue
     */
    public async removeResidue(residue: SplitDocuments[]): Promise<void> {
        await this.remove(SplitDocuments, residue);
    }

    /**
     * Delete tag
     * @param tag
     */
    public async removeTag(tag: Tag): Promise<void> {
        return await this.remove(Tag, tag);
    }

    /**
     * Delete tag
     * @param tag
     */
    public static async removeTag(tag: Tag): Promise<void> {
        return await new DataBaseHelper(Tag).remove(tag);
    }

    /**
     * Delete Theme
     * @param theme
     */
    public static async removeTheme(theme: Theme): Promise<void> {
        return await new DataBaseHelper(Theme).remove(theme);
    }

    /**
     * Delete Tool
     * @param tool
     */
    public static async removeTool(tool: PolicyTool): Promise<void> {
        return await new DataBaseHelper(PolicyTool).remove(tool);
    }

    /**
     * Overriding the save method
     * @param entityClass
     * @param item
     * @param filter
     */
    async save<T extends BaseEntity>(entityClass: new () => T, item: unknown | unknown[], filter?: FilterObject<T>): Promise<T> {
        if (Array.isArray(item)) {
            return await this.saveMany(entityClass, item, filter) as any;
        }

        if (this.dryRun) {
            this.addDryRunId(entityClass, item);
            return await new DataBaseHelper(DryRun).save(item, filter) as unknown as T;
        }

        return await new DataBaseHelper(entityClass).save(item as Partial<T>, filter);
    }

    /**
     * Save Approval VC
     * @param row
     *
     * @virtual
     */
    public async saveApproval(row: Partial<ApprovalDocumentCollection>): Promise<ApprovalDocumentCollection> {
        const doc = this.create(ApprovalDocumentCollection, row);
        return await this.save(ApprovalDocumentCollection, doc);
    }

    /**
     * Save Artifact
     * @param artifact Artifact
     * @returns Saved Artifact
     */
    public static async saveArtifact(artifact: ArtifactCollection): Promise<ArtifactCollection> {
        return await new DataBaseHelper(ArtifactCollection).save(artifact);
    }

    /**
     * Save Artifact File
     * @param uuid File UUID
     * @param data Data
     */
    public static async saveArtifactFile(uuid: string, data: Buffer): Promise<void> {
        let offset = 0;
        let fileNumber = 1;
        while (offset < data.length) {
            await new DataBaseHelper(ArtifactChunkCollection).save({
                uuid,
                number: fileNumber,
                data: new Binary(data.subarray(offset, offset + DatabaseServer.MAX_DOCUMENT_SIZE > data.length ? data.length : offset + DatabaseServer.MAX_DOCUMENT_SIZE))
            });
            offset = offset + DatabaseServer.MAX_DOCUMENT_SIZE;
            fileNumber++;
        }
    }

    /**
     * Save Artifacts
     * @param artifacts Artifacts
     * @returns Saved Artifacts
     */
    public static async saveArtifacts(artifacts: ArtifactCollection[]): Promise<ArtifactCollection[]> {
        return await new DataBaseHelper(ArtifactCollection).saveMany(artifacts);
    }

    /**
     * Save Block State
     * @param {string} policyId - policy ID
     * @param {string} blockId - block UUID
     * @param {string} did - user DID
     * @param {string} name - variable name
     * @param {unknown} value - variable value
     * @param {boolean} isLongValue - if long value
     * @virtual
     */
    public async saveBlockCache(
        policyId: string,
        blockId: string,
        did: string,
        name: string,
        value: unknown,
        isLongValue: boolean
    ): Promise<void> {
        let stateEntity = await this.findOne(BlockCache, {
            policyId,
            blockId,
            did,
            name
        });
        if (stateEntity) {
            stateEntity.value = value;
            stateEntity.isLongValue = isLongValue;
        } else {
            stateEntity = this.create(BlockCache, {
                policyId,
                blockId,
                did,
                name,
                value,
                isLongValue
            });
        }
        await this.save(BlockCache, stateEntity);
    }

    /**
     * Save Did
     * @param row
     *
     * @virtual
     */
    public async saveDid(row: Partial<DidDocumentCollection>): Promise<DidDocumentCollection> {
        const doc = this.create(DidDocumentCollection, row);
        return await this.save(DidDocumentCollection, doc);
    }

    /**
     * Save Document State
     * @param row
     *
     * @virtual
     */
    public async saveDocumentState(row: Partial<DocumentState>): Promise<DocumentState> {
        const item = this.create(DocumentState, row);
        return await this.save(DocumentState, item);
    }

    /**
     * Save file
     * @param uuid
     * @param buffer
     *
     * @returns file ID
     */
    public static async saveFile(uuid: string, buffer: Buffer): Promise<ObjectId> {
        return DataBaseHelper.saveFile(uuid, buffer);
    }

    public static async upsertGridFile(params: {
        buffer: Buffer,
        fileId?: string,
        filename?: string,
        contentType?: string
    }): Promise<{ fileId: string; filename: string; contentType: string }> {
        const { buffer, fileId, filename, contentType } = params;

        const uuid = GenerateUUIDv4();
        const name = (filename || 'file').trim();
        const type = contentType || 'application/octet-stream';

        if (fileId) {
            const _id = new ObjectId(String(fileId));
            await DataBaseHelper.overwriteFile(_id, uuid, buffer);
            return { fileId: _id.toString(), filename: name, contentType: type };
        } else {
            const id = await DataBaseHelper.saveFile(uuid, buffer);
            return { fileId: id.toString(), filename: name, contentType: type };
        }
    }

    /**
     * Get file
     * @param fileId
     */
    public static async getGridFile(fileId: string): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
        const _id = new ObjectId(String(fileId));
        const buffer = await DataBaseHelper.loadFile(_id);

        return { buffer, filename: 'file', contentType: 'application/octet-stream' };
    }

    /**
     * Save file
     * @param fileId
     */
    public static async deleteGridFile(fileId: string): Promise<void> {
        const _id = new ObjectId(String(fileId));
        await DataBaseHelper.deleteFile(_id);
    }

    /**
     * Save many
     * @param entityClass
     * @param item
     * @param filter
     */
    async saveMany<T extends BaseEntity>(entityClass: new () => T, item: unknown[], filter?: FilterObject<T>): Promise<T[]> {
        if (this.dryRun) {
            this.addDryRunId(entityClass, item);
            return await new DataBaseHelper(DryRun).saveMany(item, filter) as unknown as T[];
        }
        return await new DataBaseHelper(entityClass).saveMany(item as Partial<T>[], filter);
    }

    /**
     * Save mint request
     * @param data Mint request
     * @returns Saved mint request
     */
    public async saveMintRequest(data: Partial<MintRequest>): Promise<MintRequest> {
        return await this.save(MintRequest, data);
    }

    /**
     * Save mint transaction
     * @param transaction Transaction
     * @returns Saved transaction
     */
    public async saveMintTransaction(transaction: Partial<MintTransaction>): Promise<MintTransaction> {
        return this.save(MintTransaction, transaction);
    }

    /**
     * Save Multi Policy object
     * @param multiPolicy
     * @returns multiPolicy
     */
    public static async saveMultiPolicy(multiPolicy: MultiPolicy): Promise<MultiPolicy> {
        return await new DataBaseHelper(MultiPolicy).save(multiPolicy);
    }

    /**
     * Update policies
     * @param models
     */
    public static async savePolicies(models: Policy[]): Promise<Policy[]> {
        return await new DataBaseHelper(Policy).saveMany(models);
    }

    /**
     * Save policy cache
     * @param entity Entity
     * @returns Policy cache
     */
    public static async savePolicyCache(entity: Partial<PolicyCache>): Promise<PolicyCache> {
        return await new DataBaseHelper(PolicyCache).save(entity);
    }

    /**
     * Save policy cache data
     * @param entity Policy cache data
     * @returns Policy cache data
     */
    public static async savePolicyCacheData(
        entity: Partial<PolicyCacheData>
    ): Promise<PolicyCacheData> {
        return await new DataBaseHelper(PolicyCacheData).save(entity);
    }

    /**
     * Save schema
     * @param item
     */
    public static async saveSchema(item: SchemaCollection): Promise<SchemaCollection> {
        return await new DataBaseHelper(SchemaCollection).save(item);
    }

    /**
     * Save schemas
     * @param items
     */
    public static async saveSchemas(items: SchemaCollection[]): Promise<SchemaCollection[]> {
        return await new DataBaseHelper(SchemaCollection).saveMany(items);
    }

    /**
     * Save Topic
     * @param topic
     *
     * @virtual
     */
    public async saveTopic(topic: TopicCollection): Promise<TopicCollection> {
        const topicObject = this.create(TopicCollection, topic);
        return await this.save(TopicCollection, topicObject);
    }

    /**
     * Save topic
     * @param row
     */
    public static async saveTopic(row: Partial<TopicCollection>): Promise<TopicCollection> {
        return await new DataBaseHelper(TopicCollection).save(row);
    }

    /**
     * Save VC
     * @param row
     *
     * @virtual
     */
    public async saveVC(row: Partial<VcDocumentCollection>): Promise<VcDocumentCollection> {
        const doc = this.create(VcDocumentCollection, row);
        return await this.save(VcDocumentCollection, doc);
    }

    /**
     * Save VC
     * @param row
     */
    public static async saveVC(row: Partial<VcDocumentCollection>): Promise<VcDocumentCollection> {
        return await new DataBaseHelper(VcDocumentCollection).save(row);
    }

    /**
     * Save VCs
     * @param data
     *
     * @returns VCs
     */
    // tslint:disable-next-line:adjacent-overload-signatures
    public static async saveVCs<T extends VcDocumentCollection | VcDocumentCollection[]>(data: Partial<T>): Promise<VcDocumentCollection> {
        return (await new DataBaseHelper(VcDocumentCollection).save(data));
    }

    /**
     * Save VP
     * @param row
     *
     * @virtual
     */
    public async saveVP(row: Partial<VpDocumentCollection>): Promise<VpDocumentCollection> {
        const doc = this.create(VpDocumentCollection, row);
        return await this.save(VpDocumentCollection, doc);
    }

    /**
     * Save VPs
     * @param data
     *
     * @returns VPs
     */
    public static async saveVPs<T extends VpDocumentCollection | VpDocumentCollection[]>(data: Partial<T>): Promise<VpDocumentCollection> {
        return (await new DataBaseHelper(VpDocumentCollection).save(data));
    }

    /**
     * Save Virtual Message
     * @param dryRun
     * @param message
     *
     * @virtual
     */
    public static async saveVirtualMessage<T>(dryRun: string, message: Message): Promise<void> {
        const document = message.toMessage();
        const messageId = message.getId();
        const topicId = message.getTopicId();

        await new DataBaseHelper(DryRun).save(DatabaseServer.addDryRunId({
            document,
            topicId,
            messageId
        }, dryRun, 'Message', false));
    }

    /**
     * Set Active Group
     *
     * @param policyId
     * @param did
     * @param uuid
     *
     * @virtual
     */
    public async setActiveGroup(policyId: string, did: string, uuid: string): Promise<void> {
        const groups = await this.find(PolicyRolesCollection, { policyId, did });
        for (const group of groups) {
            group.active = group.uuid === uuid;
        }
        await this.saveMany(PolicyRolesCollection, groups);
    }

    /**
     * Set Dry Run id
     * @param id
     */
    public setDryRun(id: string): void {
        this.dryRun = id;
    }

    /**
     * Set MultiSign Status by user
     * @param uuid
     * @param documentId
     * @param user
     * @param status
     * @param document
     *
     * @virtual
     */
    public async setMultiSigDocument(
        uuid: string,
        policyId: string,
        documentId: string,
        user: { id: string, did: string, group: string, username: string },
        status: string,
        document: IVC
    ): Promise<MultiDocuments> {
        const doc = this.create(MultiDocuments, {
            uuid,
            policyId,
            documentId,
            status,
            document,
            userId: user.id,
            did: user.did,
            group: user.group,
            username: user.username
        });
        await this.save(MultiDocuments, doc);
        return doc;
    }

    /**
     * Set MultiSign Status by document
     * @param uuid
     * @param documentId
     * @param group
     * @param status
     *
     * @virtual
     */
    public async setMultiSigStatus(
        uuid: string,
        policyId: string,
        documentId: string,
        group: string,
        status: string
    ): Promise<MultiDocuments> {
        let item = await this.findOne(MultiDocuments, {
            uuid: { $eq: uuid },
            documentId: { $eq: documentId },
            group: { $eq: group },
            userId: { $eq: 'Group' }
        });
        if (item) {
            item.status = status;
            await this.update(MultiDocuments, item.id, item);
        } else {
            item = this.create(MultiDocuments, {
                uuid,
                policyId,
                documentId,
                status,
                document: null,
                userId: 'Group',
                did: null,
                group,
                username: null
            });
            await this.save(MultiDocuments, item);
        }
        return item;
    }

    /**
     * Set Residue objects
     * @param residue
     */
    public async setResidue(residue: SplitDocuments[]): Promise<void> {
        await this.saveMany(SplitDocuments, residue);
    }

    /**
     * Save suggestions config
     * @param config
     * @returns config
     */
    public static async setSuggestionsConfig(
        config: Partial<SuggestionsConfig>
    ): Promise<SuggestionsConfig> {
        const existingConfig = await DatabaseServer.getSuggestionsConfig(
            config.user
        );
        if (existingConfig) {
            existingConfig.items = config.items;
        }
        return await new DataBaseHelper(SuggestionsConfig).save(
            existingConfig || config
        );
    }

    /**
     * Set Dry Run id
     * @param id
     */
    public setSystemMode(systemMode: boolean): void {
        this.systemMode = systemMode;
    }

    /**
     * Set user in group
     *
     * @param group
     *
     * @virtual
     */
    public async setUserInGroup(group: unknown): Promise<PolicyRolesCollection> {
        const doc = this.create(PolicyRolesCollection, group);
        await this.save(PolicyRolesCollection, doc);
        return doc;
    }

    /**
     * Save Virtual File
     * @param policyId
     * @param file
     * @param url
     *
     * @virtual
     */
    public static async setVirtualFile(
        policyId: string,
        file: ArrayBuffer,
        url: { url: string }
    ): Promise<void> {
        await new DataBaseHelper(DryRun).save(DatabaseServer.addDryRunId({
            document: {
                size: file?.byteLength
            },
            documentURL: url?.url
        }, policyId, 'Files', false));
    }

    /**
     * Set Key from Virtual User
     * @param did
     * @param keyName
     * @param key
     *
     * @virtual
     */
    public async setVirtualKey(did: string, keyName: string, key: string): Promise<void> {
        await new DataBaseHelper(DryRun).save({
            dryRunId: this.dryRun,
            dryRunClass: 'VirtualKey',
            did,
            type: keyName,
            hederaAccountKey: key
        } as Partial<DryRun>);
    }

    /**
     * Save Virtual Transaction
     * @param policyId
     * @param type
     * @param operatorId
     *
     * @virtual
     */
    public static async setVirtualTransaction(
        policyId: string,
        type: string,
        operatorId?: string
    ): Promise<void> {
        await new DataBaseHelper(DryRun).save(DatabaseServer.addDryRunId({
            type,
            hederaAccountId: operatorId
        }, policyId, 'Transactions', false));
    }

    /**
     * Set Current Virtual User
     * @param policyId
     * @param did
     *
     * @virtual
     */
    public static async setVirtualUser(policyId: string, did: string): Promise<void> {
        const items = (await new DataBaseHelper(DryRun).find({
            dryRunId: policyId,
            dryRunClass: 'VirtualUsers'
        }));
        for (const item of items) {
            item.active = item.did === did;
            await new DataBaseHelper(DryRun).save(item);
        }
    }

    /**
     * Overriding the update method
     * @param entityClass
     * @param criteria
     * @param row
     */
    async update<T extends BaseEntity>(
        entityClass: new () => T,
        criteria: FilterQuery<T>,
        row: unknown | unknown[]
    ): Promise<T> {
        if (Array.isArray(criteria)) {
            return await this.updateMany(entityClass, row as unknown as T[], criteria) as any;
        }

        if (this.dryRun) {
            this.addDryRunId(entityClass, row);
            return (await new DataBaseHelper(DryRun).update(row as DryRun, criteria as FilterQuery<DryRun>)) as unknown as T;
        } else {
            return await new DataBaseHelper(entityClass).update(row as T, criteria);
        }
    }

    /**
     * Update Approval VC
     * @param row
     *
     * @virtual
     */
    public async updateApproval(row: ApprovalDocumentCollection): Promise<ApprovalDocumentCollection> {
        await this.update(ApprovalDocumentCollection, row.id, row);
        return row;
    }

    /**
     * Update Did
     * @param row
     *
     * @virtual
     */
    public async updateDid(row: DidDocumentCollection): Promise<DidDocumentCollection> {
        await this.update(DidDocumentCollection, row.id, row);
        return row;
    }

    /**
     * Update External Topic
     * @param item
     *
     * @virtual
     */
    public async updateExternalTopic(item: ExternalDocument): Promise<ExternalDocument> {
        return await this.save(ExternalDocument, item);
    }

    /**
     * Update many method
     * @param entityClass
     * @param entities
     * @param filter
     */
    async updateMany<T extends BaseEntity>(
        entityClass: new () => T,
        entities: T[],
        filter?: FilterQuery<T>
    ): Promise<DryRun[] | T[]> {
        if (this.dryRun) {
            this.addDryRunId(entityClass, entities);
            return (await new DataBaseHelper(DryRun).updateMany(entities as unknown as DryRun[], filter as FilterQuery<DryRun>));
        } else {
            return await new DataBaseHelper(entityClass).updateMany(entities as T[], filter);
        }
    }

    /**
     * Update Module
     * @param row
     */
    public static async updateModule(row: PolicyModule): Promise<PolicyModule> {
        row.name = row.name.replace(/\s+/g, ' ').trim();
        const dbHelper = new DataBaseHelper(PolicyModule);
        if (
            (await dbHelper.count({
                id: { $ne: row.id },
                name: row.name,
                owner: row.owner,
            })) > 0
        ) {
            throw new Error(`Module with name ${row.name} is already exists`);
        }
        return await dbHelper.update(row);
    }

    /**
     * Update MultiPolicyTransaction
     * @param item
     */
    public static async updateMultiPolicyTransactions(item: MultiPolicyTransaction): Promise<void> {
        await new DataBaseHelper(MultiPolicyTransaction).update(item);
    }

    /**
     * Update policy
     * @param model
     */
    public static async updatePolicy(model: Policy): Promise<Policy> {
        return await new DataBaseHelper(Policy).save(model);
    }

    /**
     * Update policy
     * @param policyId
     * @param data
     */
    public static async updatePolicyConfig(policyId: string, data: Policy): Promise<Policy> {
        const model = await new DataBaseHelper(Policy).findOne(policyId);
        model.config = data.config;
        model.name = data.name;
        model.version = data.version;
        model.description = data.description;
        model.topicDescription = data.topicDescription;
        model.policyRoles = data.policyRoles;
        model.policyNavigation = data.policyNavigation;
        model.policyTopics = data.policyTopics;
        model.policyTokens = data.policyTokens;
        model.policyGroups = data.policyGroups;
        model.categories = data.categories;
        model.projectSchema = data.projectSchema;

        return await new DataBaseHelper(Policy).save(model);
    }

    /**
     * Get policy tests
     * @param test
     *
     * @returns tests
     */
    public static async updatePolicyTest(test: PolicyTest): Promise<PolicyTest> {
        return await new DataBaseHelper(PolicyTest).save(test);
    }

    /**
     * Update schema
     * @param id
     * @param item
     */
    public static async updateSchema(id: string, item: SchemaCollection): Promise<void> {
        await new DataBaseHelper(SchemaCollection).update(item, { id });
    }

    /**
     * Update schemas
     * @param items Schemas
     */
    public static async updateSchemas(items: SchemaCollection[]): Promise<void> {
        await new DataBaseHelper(SchemaCollection).update(items);
    }

    /**
     * Update tag
     * @param tag
     */
    public async updateTag(tag: Tag): Promise<Tag> {
        return await this.update(Tag, tag.id, tag);
    }

    /**
     * Update tag
     * @param tag
     */
    public static async updateTag(tag: Tag): Promise<Tag> {
        return await new DataBaseHelper(Tag).update(tag);
    }

    /**
     * Update tag cache
     * @param row
     */
    public async updateTagCache(row: TagCache): Promise<TagCache> {
        return await this.update(TagCache, row.id, row);
    }

    /**
     * Update tag cache
     * @param row
     */
    public static async updateTagCache(row: TagCache): Promise<TagCache> {
        return await new DataBaseHelper(TagCache).update(row);
    }

    /**
     * Update tags
     * @param tags
     */
    public async updateTags(tags: Tag[]): Promise<DryRun[] | Tag[]> {
        return await this.updateMany(Tag, tags);
    }

    /**
     * Update tags
     * @param tags
     */
    public static async updateTags(tags: Tag[]): Promise<Tag[]> {
        return await new DataBaseHelper(Tag).updateMany(tags);
    }

    /**
     * Update tags cache
     * @param rows
     */
    public static async updateTagsCache(rows: TagCache[]): Promise<TagCache[]> {
        return await new DataBaseHelper(TagCache).updateMany(rows);
    }

    /**
     * Update Theme
     * @param row
     */
    public static async updateTheme(row: Theme): Promise<Theme> {
        return await new DataBaseHelper(Theme).update(row);
    }

    /**
     * Update Tool
     * @param row
     */
    public static async updateTool(row: PolicyTool): Promise<PolicyTool> {
        return await new DataBaseHelper(PolicyTool).update(row);
    }

    /**
     * Update topic
     * @param row
     */
    public static async updateTopic(row: TopicCollection): Promise<void> {
        await new DataBaseHelper(TopicCollection).update(row);
    }

    /**
     * Update VC
     * @param row
     *
     * @virtual
     */
    public async updateVC(row: VcDocumentCollection): Promise<VcDocumentCollection> {
        await this.update(VcDocumentCollection, row.id, row);
        return row;
    }

    /**
     * Update VP
     * @param row
     *
     * @virtual
     */
    public async updateVP(row: VpDocumentCollection): Promise<VpDocumentCollection> {
        await this.update(VpDocumentCollection, row.id, row);
        return row;
    }

    /**
     * Update VP DOcuments
     * @param value
     * @param filters
     * @param dryRun
     */
    public static async updateVpDocuments(value: unknown, filters: FilterQuery<VpDocumentCollection>, dryRun?: string): Promise<void> {
        if (dryRun) {
            const extendedFilters = filters as FilterQuery<DryRun> & {
                dryRunId?: string;
                dryRunClass?: string;
            };

            extendedFilters.dryRunId = dryRun;
            extendedFilters.dryRunClass = 'VpDocumentCollection';

            const items = await new DataBaseHelper(DryRun).find(extendedFilters);

            for (const item of items) {
                Object.assign(item, value);
            }
            await new DataBaseHelper(DryRun).update(items);
        } else {
            const items = await new DataBaseHelper(VpDocumentCollection).find(filters);
            for (const item of items) {
                Object.assign(item, value);
            }
            await new DataBaseHelper(VpDocumentCollection).update(items);
        }
    }

    /**
     * Virtual Associate Token
     * @param hederaAccountId
     * @param token
     *
     * @virtual
     */
    public async virtualAssociate(hederaAccountId: string, token: TokenCollection): Promise<boolean> {
        const item = await new DataBaseHelper(DryRun).findOne({
            dryRunId: this.dryRun,
            dryRunClass: 'HederaAccountInfo',
            hederaAccountId
        });
        if (item) {
            if (item.tokenMap[token.tokenId]) {
                throw new Error('Token already associated');
            } else {
                item.tokenMap[token.tokenId] = {
                    frozen: token.enableFreeze ? false : null,
                    kyc: token.enableKYC ? false : null
                };
                await new DataBaseHelper(DryRun).update(item);
            }
        } else {
            const tokenMap = {};
            tokenMap[token.tokenId] = {
                frozen: token.enableFreeze ? false : null,
                kyc: token.enableKYC ? false : null
            };
            await new DataBaseHelper(DryRun).save({
                dryRunId: this.dryRun,
                dryRunClass: 'HederaAccountInfo',
                hederaAccountId,
                tokenMap
            });
        }
        return true;
    }

    /**
     * Virtual Dissociate Token
     * @param hederaAccountId
     * @param tokenId
     *
     * @virtual
     */
    public async virtualDissociate(hederaAccountId: string, tokenId: string): Promise<boolean> {
        const item = await new DataBaseHelper(DryRun).findOne({
            dryRunId: this.dryRun,
            dryRunClass: 'HederaAccountInfo',
            hederaAccountId
        });
        if (!item || !item.tokenMap[tokenId]) {
            throw new Error('Token is not associated');
        }
        delete item.tokenMap[tokenId];
        await new DataBaseHelper(DryRun).update(item);
        return true;
    }

    /**
     * Virtual Freeze Token
     * @param hederaAccountId
     * @param tokenId
     *
     * @virtual
     */
    public async virtualFreeze(hederaAccountId: string, tokenId: string): Promise<boolean> {
        const item = await new DataBaseHelper(DryRun).findOne({
            dryRunId: this.dryRun,
            dryRunClass: 'HederaAccountInfo',
            hederaAccountId
        });
        if (!item || !item.tokenMap[tokenId]) {
            throw new Error('Token is not associated');
        }
        if (item.tokenMap[tokenId].frozen === null) {
            throw new Error('Can not be frozen');
        }
        if (item.tokenMap[tokenId].frozen === true) {
            throw new Error('Token already frozen');
        }
        item.tokenMap[tokenId].frozen = true;
        await new DataBaseHelper(DryRun).update(item);
        return true;
    }

    /**
     * Virtual GrantKyc Token
     * @param hederaAccountId
     * @param tokenId
     *
     * @virtual
     */
    public async virtualGrantKyc(hederaAccountId: string, tokenId: string): Promise<boolean> {
        const item = await new DataBaseHelper(DryRun).findOne({
            dryRunId: this.dryRun,
            dryRunClass: 'HederaAccountInfo',
            hederaAccountId
        });
        if (!item || !item.tokenMap[tokenId]) {
            throw new Error('Token is not associated');
        }
        if (item.tokenMap[tokenId].kyc === null) {
            throw new Error('Can not be granted kyc');
        }
        if (item.tokenMap[tokenId].kyc === true) {
            throw new Error('Token already granted kyc');
        }
        item.tokenMap[tokenId].kyc = true;
        await new DataBaseHelper(DryRun).update(item);
        return true;
    }

    /**
     * Virtual RevokeKyc Token
     * @param hederaAccountId
     * @param tokenId
     *
     * @virtual
     */
    public async virtualRevokeKyc(hederaAccountId: string, tokenId: string): Promise<boolean> {
        const item = await new DataBaseHelper(DryRun).findOne({
            dryRunId: this.dryRun,
            dryRunClass: 'HederaAccountInfo',
            hederaAccountId
        });
        if (!item || !item.tokenMap[tokenId]) {
            throw new Error('Token is not associated');
        }
        if (item.tokenMap[tokenId].kyc === null) {
            throw new Error('Can not be revoked kyc');
        }
        if (item.tokenMap[tokenId].kyc === false) {
            throw new Error('Token already revoked kyc');
        }
        item.tokenMap[tokenId].kyc = false;
        await new DataBaseHelper(DryRun).update(item);
        return true;
    }

    /**
     * Virtual Unfreeze Token
     * @param hederaAccountId
     * @param tokenId
     *
     * @virtual
     */
    public async virtualUnfreeze(hederaAccountId: string, tokenId: string): Promise<boolean> {
        const item = await new DataBaseHelper(DryRun).findOne({
            dryRunId: this.dryRun,
            dryRunClass: 'HederaAccountInfo',
            hederaAccountId
        });
        if (!item || !item.tokenMap[tokenId]) {
            throw new Error('Token is not associated');
        }
        if (item.tokenMap[tokenId].frozen === null) {
            throw new Error('Can not be unfrozen');
        }
        if (item.tokenMap[tokenId].frozen === false) {
            throw new Error('Token already unfrozen');
        }
        item.tokenMap[tokenId].frozen = false;
        await new DataBaseHelper(DryRun).update(item);
        return true;
    }

    /**
     * Get mint request
     * @param filters Filters
     * @returns Mint request
     */
    public async getMintRequests(filters: FilterObject<MintRequest>): Promise<MintRequest[]> {
        return await this.find(MintRequest, filters);
    }

    /**
     * Get remote requests
     * @param filters
     */
    public static async getRemoteRequest(filters: FilterQuery<PolicyAction>): Promise<PolicyAction | null> {
        return await new DataBaseHelper(PolicyAction).findOne(filters);
    }

    /**
     * Get remote request by ID
     * @param id
     */
    public static async getRemoteRequestId(messageId: string | null): Promise<PolicyAction | null> {
        return await new DataBaseHelper(PolicyAction).findOne({ messageId });
    }

    /**
     * Get remote requests
     * @param filters
     * @param options
     */
    public static async getRemoteRequests(filters?: FilterQuery<PolicyAction>, options?: unknown): Promise<PolicyAction[]> {
        return await new DataBaseHelper(PolicyAction).find(filters, options);
    }

    /**
     * Get remote requests
     * @param filters
     * @param options
     */
    public static async getRemoteRequestsAndCount(filters?: FilterObject<PolicyAction>, options?: FindOptions<object>): Promise<[PolicyAction[], number]> {
        return await new DataBaseHelper(PolicyAction).findAndCount(filters, options);
    }

    /**
     * Get remote requests
     * @param filters
     * @param options
     */
    public static async getRemoteRequestsCount(filters?: FilterObject<PolicyAction>, options?: FindOptions<object>): Promise<number> {
        return await new DataBaseHelper(PolicyAction).count(filters, options);
    }

    /**
     * Save PolicyKey
     * @param row
     *
     * @virtual
     */
    public static async saveKey(row: Partial<PolicyKey>): Promise<PolicyKey> {
        const item = new DataBaseHelper(PolicyKey).create(row);
        return await new DataBaseHelper(PolicyKey).save(item);
    }

    /**
     * Get PolicyKeys
     * @param filters
     * @param options
     */
    public static async getKeys(filters?: FilterQuery<PolicyKey>, options?: unknown): Promise<PolicyKey[]> {
        return await new DataBaseHelper(PolicyKey).find(filters, options);
    }

    /**
     * Get PolicyKeys
     * @param filters
     * @param options
     */
    public static async getKeysAndCount(filters?: FilterObject<PolicyKey>, options?: FindOptions<object>): Promise<[PolicyKey[], number]> {
        return await new DataBaseHelper(PolicyKey).findAndCount(filters, options);
    }

    /**
     * Get key By ID
     * @param id
     */
    public static async getKeyById(id: string): Promise<PolicyKey | null> {
        return await new DataBaseHelper(PolicyKey).findOne(id);
    }

    /**
     * Delete key
     * @param key
     */
    public static async deleteKey(key: PolicyKey): Promise<void> {
        return await new DataBaseHelper(PolicyKey).remove(key);
    }

    /**
     * Save debug context
     * @param row
     *
     * @virtual
     */
    public static async saveDebugContext(row: Partial<DryRun>): Promise<DryRun> {
        row.dryRunId = row.policyId;
        row.dryRunClass = 'DebugContext';
        const item = new DataBaseHelper(DryRun).create(row);
        return await new DataBaseHelper(DryRun).save(item);
    }

    /**
     * Get debug context
     * @param filters
     * @param options
     */
    public static async getDebugContext(id: string): Promise<DryRun> {
        return await new DataBaseHelper(DryRun).findOne(id);
    }

    /**
     * Get debug context
     * @param filters
     * @param options
     */
    public static async getDebugContexts(policyId: string, tag: string): Promise<DryRun[]> {
        return await new DataBaseHelper(DryRun).find({ policyId, tag });
    }

    /**
     * Get Groups
     * @param filters
     * @param options
     *
     */
    public static async getPolicyGroups(filters: any, options?: unknown): Promise<PolicyRolesCollection[]> {
        return await new DataBaseHelper(PolicyRolesCollection).find(filters, options);
    }

    public async getGlobalEventsStreamsByUser(
        policyId: string,
        blockId: string,
        userId: string
    ): Promise<GlobalEventsReaderStream[]> {
        const helper = new DataBaseHelper<GlobalEventsReaderStream>(GlobalEventsReaderStream);
        return await helper.find({
            policyId,
            blockId,
            userId,
        });
    }

    public async getActiveGlobalEventsStreamsByUser(
        policyId: string,
        blockId: string,
        userId: string
    ): Promise<GlobalEventsReaderStream[]> {
        const helper = new DataBaseHelper<GlobalEventsReaderStream>(GlobalEventsReaderStream);
        return await helper.find({
            policyId,
            blockId,
            userId,
            active: true,
        });
    }

    public async getActiveGlobalEventsStreams(
        policyId: string,
        blockId: string
    ): Promise<GlobalEventsReaderStream[]> {
        const helper = new DataBaseHelper<GlobalEventsReaderStream>(GlobalEventsReaderStream);
        return await helper.find({
            policyId,
            blockId,
            active: true,
        });
    }

    public async createGlobalEventsStream(
        data: Partial<GlobalEventsReaderStream>
    ): Promise<GlobalEventsReaderStream> {
        const helper = new DataBaseHelper<GlobalEventsReaderStream>(GlobalEventsReaderStream);
        return await helper.save(data as any) as GlobalEventsReaderStream;
    }

    public async updateGlobalEventsStream(
        stream: GlobalEventsReaderStream
    ): Promise<GlobalEventsReaderStream> {
        const helper = new DataBaseHelper<GlobalEventsReaderStream>(GlobalEventsReaderStream);
        return await helper.save(stream);
    }

    public async deleteGlobalEventsStream(
        stream: GlobalEventsReaderStream
    ): Promise<void> {
        const helper = new DataBaseHelper<GlobalEventsReaderStream>(GlobalEventsReaderStream);

        await helper.delete(stream);
    }

    public async getGlobalEventsStreamByUserTopic(
        policyId: string,
        blockId: string,
        userId: string,
        globalTopicId: string
    ): Promise<GlobalEventsReaderStream | null> {
        const helper = new DataBaseHelper<GlobalEventsReaderStream>(GlobalEventsReaderStream);

        return await helper.findOne({
            policyId,
            blockId,
            userId,
            globalTopicId,
        });
    }

    public async getGlobalEventsWriterStreamsByUser(
        policyId: string,
        blockId: string,
        userId: string
    ): Promise<GlobalEventsWriterStream[]> {
        const helper = new DataBaseHelper<GlobalEventsWriterStream>(GlobalEventsWriterStream);
        return await helper.find({ policyId, blockId, userId });
    }

    public async getGlobalEventsWriterStreamByUserTopic(
        policyId: string,
        blockId: string,
        userId: string,
        globalTopicId: string
    ): Promise<GlobalEventsWriterStream | null> {
        const helper = new DataBaseHelper<GlobalEventsWriterStream>(GlobalEventsWriterStream);
        return await helper.findOne({ policyId, blockId, userId, globalTopicId });
    }

    public async createGlobalEventsWriterStream(
        data: Partial<GlobalEventsWriterStream>
    ): Promise<GlobalEventsWriterStream> {
        const helper = new DataBaseHelper<GlobalEventsWriterStream>(GlobalEventsWriterStream);
        return await helper.save(data as any) as GlobalEventsWriterStream;
    }

    public async updateGlobalEventsWriterStream(
        stream: GlobalEventsWriterStream
    ): Promise<GlobalEventsWriterStream> {
        const helper = new DataBaseHelper<GlobalEventsWriterStream>(GlobalEventsWriterStream);
        return await helper.save(stream);
    }

    public async deleteGlobalEventsWriterStream(
        stream: GlobalEventsWriterStream
    ): Promise<void> {
        const helper = new DataBaseHelper<GlobalEventsWriterStream>(GlobalEventsWriterStream);
        await helper.delete(stream);
    }
}
