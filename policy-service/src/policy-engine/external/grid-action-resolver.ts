import crypto from 'node:crypto';
import { MessageError } from '@guardian/common';
import { POLICY_DATA_MAX_PAGE_SIZE, POLICY_DATA_DEFAULT_PAGE_SIZE } from '@guardian/interfaces';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { IPolicyBlock, IPolicyInterfaceBlock } from '../policy-engine.interface.js';
import { PolicyUser } from '../policy-user.js';
import { RecordActionStep } from '../record-action-step.js';

export interface IExternalFilterAddon {
    filterId: string;
    title: string;
    type: 'dropdown' | 'datepicker' | 'input';
    field: string;
    operators: string[];
}

export interface IExternalColumn {
    name: string;
    title: string;
    type: string;
    bindActions: string[];
}

export interface IExternalGrid {
    gridId: string;
    title: string;
    description?: string;
    filterSchema: IExternalFilterAddon[];
    columnSchema: IExternalColumn[];
}

export interface IExternalAction {
    actionId: string;
    label: string;
    requiredRoles: string[];
    appliesTo: 'row';
    inputSchema: object;
}

function stableId(block: IPolicyBlock): string {
    if (block.tag) {
        return block.tag;
    }
    return crypto.createHash('sha256').update(block.uuid ?? '').digest('hex').slice(0, 16);
}

/**
 * Block types that render as a "fill a form and submit a new VC document" action
 * (e.g. "Submit Final Amount"). They share the same `{ document, ref }` setData payload.
 */
const REQUEST_BLOCK_TYPES = new Set(['requestVcDocumentBlock', 'requestVcDocumentBlockAddon']);

function collectBindTags(field: any): string[] {
    const tags: string[] = Array.isArray(field?.bindBlocks) ? [...field.bindBlocks] : [];
    if (field?.bindBlock && !tags.includes(field.bindBlock)) {
        tags.push(field.bindBlock);
    }
    return tags;
}

function setNestedField(obj: any, fieldPath: string, value: any): any {
    const clone = JSON.parse(JSON.stringify(obj));
    const keys = fieldPath.split('.');
    let target = clone;
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (target[key] === null || target[key] === undefined || typeof target[key] !== 'object') {
            target[key] = {};
        }
        target = target[key];
    }
    target[keys[keys.length - 1]] = value;
    return clone;
}

export class GridActionResolver {

    static computeGridId(block: IPolicyBlock): string {
        return stableId(block);
    }

    static resolveGridBlock(policyId: string, gridId: string): IPolicyBlock | null {
        const tagMap = PolicyComponentsUtils.GetTagBlockMap(policyId);
        if (!tagMap) {
            return null;
        }

        // Fast path: gridId matches a tag directly
        if (tagMap.has(gridId)) {
            const uuid = tagMap.get(gridId)!;
            const block = PolicyComponentsUtils.GetBlockByUUID<IPolicyBlock>(uuid);
            if (block && block.blockType === 'interfaceDocumentsSourceBlock') {
                return block;
            }
        }

        // Fallback: scan all tagged blocks for a stableId match
        for (const [, uuid] of tagMap) {
            const block = PolicyComponentsUtils.GetBlockByUUID<IPolicyBlock>(uuid);
            if (block && block.blockType === 'interfaceDocumentsSourceBlock' && stableId(block) === gridId) {
                return block;
            }
        }
        return null;
    }

    static resolveAction(policyId: string, gridId: string, actionId: string): {
        actionBlock: IPolicyBlock;
        actionType: 'selector' | 'button' | 'dropdown' | 'request';
        optionValue?: any;
        field?: string;
        buttonTag?: string;
    } | null {
        const gridBlock = GridActionResolver.resolveGridBlock(policyId, gridId);
        if (!gridBlock) {
            return null;
        }

        const tagMap = PolicyComponentsUtils.GetTagBlockMap(policyId);
        if (!tagMap) {
            return null;
        }

        const fields: any[] = gridBlock.options?.uiMetaData?.fields || [];
        const visited = new Set<string>();

        for (const field of fields) {
            for (const bindTag of collectBindTags(field)) {
                if (visited.has(bindTag) || !tagMap.has(bindTag)) {
                    continue;
                }
                visited.add(bindTag);

                const uuid = tagMap.get(bindTag)!;
                const actionBlock = PolicyComponentsUtils.GetBlockByUUID<IPolicyBlock>(uuid);
                if (!actionBlock) {
                    continue;
                }

                const blockType = actionBlock.blockType;
                const opts = actionBlock.options || {};

                if (blockType === 'interfaceActionBlock') {
                    if (opts.type === 'selector') {
                        for (const opt of (opts.uiMetaData?.options || [])) {
                            if (opt.tag === actionId) {
                                return {
                                    actionBlock,
                                    actionType: 'selector',
                                    optionValue: opt.value,
                                    field: opts.field,
                                };
                            }
                        }
                    } else if (stableId(actionBlock) === actionId) {
                        return { actionBlock, actionType: 'dropdown', field: opts.field };
                    }
                } else if (blockType === 'buttonBlock') {
                    const buttons: any[] = opts.uiMetaData?.buttons || [];
                    for (const btn of buttons) {
                        if (btn.tag === actionId) {
                            return {
                                actionBlock,
                                actionType: 'button',
                                optionValue: btn.value,
                                field: btn.field,
                                buttonTag: btn.tag,
                            };
                        }
                    }
                    if (!buttons.length && stableId(actionBlock) === actionId) {
                        return { actionBlock, actionType: 'button' };
                    }
                } else if (REQUEST_BLOCK_TYPES.has(blockType)) {
                    if (stableId(actionBlock) === actionId) {
                        return { actionBlock, actionType: 'request' };
                    }
                }
            }
        }
        return null;
    }

    // ── Grid Fetch ──────────────────────────────────────────────────────

    static async getGrids(policyId: string, user: PolicyUser): Promise<IExternalGrid[]> {
        const tagMap = PolicyComponentsUtils.GetTagBlockMap(policyId);
        if (!tagMap) {
            return [];
        }

        const grids: IExternalGrid[] = [];
        const seenUuids = new Set<string>();

        for (const [, uuid] of tagMap) {
            if (seenUuids.has(uuid)) {
                continue;
            }
            seenUuids.add(uuid);

            const block = PolicyComponentsUtils.GetBlockByUUID<IPolicyBlock>(uuid);
            if (!block || block.blockType !== 'interfaceDocumentsSourceBlock') {
                continue;
            }

            const available = await block.isAvailable(user);
            if (!available) {
                continue;
            }

            grids.push(GridActionResolver.buildGridDescriptor(block));
        }

        return grids;
    }

    static buildGridDescriptor(block: IPolicyBlock): IExternalGrid {
        const uiMeta = block.options?.uiMetaData || {};
        const fields: any[] = uiMeta.fields || [];
        const children: IPolicyBlock[] = (block.children as IPolicyBlock[]) || [];

        const filterSchema: IExternalFilterAddon[] = [];
        for (const child of children) {
            if (child.blockType !== 'filtersAddon') {
                continue;
            }
            const co = child.options || {};
            filterSchema.push({
                filterId: stableId(child),
                title: co.uiMetaData?.title || co.field || stableId(child),
                type: co.type || 'input',
                field: co.field || '',
                operators: co.queryType ? [co.queryType] : ['eq'],
            });
        }

        const columnSchema: IExternalColumn[] = fields.map((f: any) => ({
            name: f.name || '',
            title: f.title || f.name || '',
            type: f.type || 'string',
            bindActions: collectBindTags(f),
        }));

        return {
            gridId: stableId(block),
            title: uiMeta.title || block.tag || 'Grid',
            description: uiMeta.description,
            filterSchema,
            columnSchema,
        };
    }

    // ── Action catalog ────────────────────────────────────────────────────

    static async getActions(policyId: string, gridId: string, user: PolicyUser): Promise<IExternalAction[]> {
        const gridBlock = GridActionResolver.resolveGridBlock(policyId, gridId);
        if (!gridBlock) {
            throw Object.assign(new Error('Grid not found'), { code: 404 });
        }

        const gridAvailable = await gridBlock.isAvailable(user);
        if (!gridAvailable) {
            throw Object.assign(new Error('Block Unavailable'), { code: 503 });
        }

        const tagMap = PolicyComponentsUtils.GetTagBlockMap(policyId);
        if (!tagMap) {
            return [];
        }

        const fields: any[] = gridBlock.options?.uiMetaData?.fields || [];
        const visited = new Set<string>();
        const actions: IExternalAction[] = [];

        for (const field of fields) {
            for (const bindTag of collectBindTags(field)) {
                if (visited.has(bindTag) || !tagMap.has(bindTag)) {
                    continue;
                }
                visited.add(bindTag);

                const uuid = tagMap.get(bindTag)!;
                const actionBlock = PolicyComponentsUtils.GetBlockByUUID<IPolicyBlock>(uuid);
                if (!actionBlock) {
                    continue;
                }

                const blockAvailable = await actionBlock.isAvailable(user);
                if (!blockAvailable) {
                    continue;
                }

                const blockType = actionBlock.blockType;
                const opts = actionBlock.options || {};
                const requiredRoles: string[] = [...(actionBlock.permissions || [])];

                if (blockType === 'interfaceActionBlock') {
                    if (opts.type === 'selector') {
                        for (const opt of (opts.uiMetaData?.options || [])) {
                            actions.push({
                                actionId: opt.tag,
                                label: String(opt.value ?? opt.tag),
                                requiredRoles,
                                appliesTo: 'row',
                                inputSchema: { type: 'object', properties: {} },
                            });
                        }
                    } else if (opts.type === 'dropdown') {
                        let options: { name: any; value: any }[] = [];
                        try {
                            const dataResult = await PolicyComponentsUtils.blockGetData(
                                actionBlock as IPolicyInterfaceBlock, user, {}
                            );
                            options = dataResult.body?.options || [];
                        } catch (_e) {
                            // best effort — action is still listed even if options can't be resolved
                        }
                        actions.push({
                            actionId: stableId(actionBlock),
                            label: opts.uiMetaData?.content || opts.uiMetaData?.title || stableId(actionBlock),
                            requiredRoles,
                            appliesTo: 'row',
                            inputSchema: {
                                type: 'object',
                                required: ['value'],
                                properties: {
                                    value: {
                                        description: `Value to set on field "${opts.field}"`,
                                        enum: options.map((o) => o.value),
                                        options,
                                    },
                                },
                            },
                        });
                    }
                    // 'download' is excluded — not a workflow action
                } else if (blockType === 'buttonBlock') {
                    const buttons: any[] = opts.uiMetaData?.buttons || [];
                    if (buttons.length) {
                        for (const btn of buttons) {
                            actions.push({
                                actionId: btn.tag,
                                label: btn.name || btn.tag,
                                requiredRoles,
                                appliesTo: 'row',
                                inputSchema: { type: 'object', properties: {} },
                            });
                        }
                    } else {
                        actions.push({
                            actionId: stableId(actionBlock),
                            label: opts.uiMetaData?.title || stableId(actionBlock),
                            requiredRoles,
                            appliesTo: 'row',
                            inputSchema: { type: 'object', properties: {} },
                        });
                    }
                } else if (REQUEST_BLOCK_TYPES.has(blockType)) {
                    const ui = opts.uiMetaData || {};
                    actions.push({
                        actionId: stableId(actionBlock),
                        label: ui.content || ui.title || stableId(actionBlock),
                        requiredRoles,
                        appliesTo: 'row',
                        inputSchema: {
                            type: 'object',
                            required: ['document'],
                            properties: {
                                document: {
                                    type: 'object',
                                    description: opts.schema
                                        ? `Credential subject conforming to schema ${opts.schema}`
                                        : 'Credential subject to submit',
                                },
                            },
                        },
                    });
                }
            }
        }

        return actions;
    }

    // ── Record retrieval ──────────────────────────────────────────────────

    static async getRecords(policyId: string, gridId: string, user: PolicyUser, params: any): Promise<any> {
        const gridBlock = GridActionResolver.resolveGridBlock(policyId, gridId);
        if (!gridBlock) {
            throw Object.assign(new Error('Grid not found'), { code: 404 });
        }

        const error = await PolicyComponentsUtils.isAvailableGetData(gridBlock as IPolicyInterfaceBlock, user);
        if (error) {
            throw Object.assign(new Error(error.message), { code: error.code });
        }

        const page = Math.max(1, parseInt(params?.page, 10) || 1);
        const pageSize = Math.min(
            POLICY_DATA_MAX_PAGE_SIZE,
            Math.max(1, parseInt(params?.pageSize, 10) || POLICY_DATA_DEFAULT_PAGE_SIZE)
        );

        const blockParams: any = { ...(params || {}) };
        blockParams.page = page - 1;
        blockParams.itemsPerPage = pageSize;
        delete blockParams.pageSize;

        const result = await PolicyComponentsUtils.blockGetData(gridBlock as IPolicyInterfaceBlock, user, blockParams);
        const data = result.body;

        if (Array.isArray(data?.data)) {
            if (typeof data.page === 'number') {
                data.page += 1;
            } else {
                const totalCount = data.data.length;
                const start = (page - 1) * pageSize;
                data.data = data.data.slice(start, start + pageSize);
                data.page = page;
                data.pageSize = pageSize;
                data.totalCount = totalCount;
                data.hasPreviousPage = page > 1;
                data.hasNextPage = start + pageSize < totalCount;
            }

            const actions = await GridActionResolver.getActions(policyId, gridId, user);
            const actionIds = actions.map((a) => a.actionId);
            data.data = data.data.map((doc: any) => ({ ...doc, _actions: actionIds }));
        }

        return data;
    }

    // ── Action execution ──────────────────────────────────────────────────

    static async executeAction(
        policyId: string,
        gridId: string,
        recordId: string,
        actionId: string,
        _body: any,
        user: PolicyUser,
        actionStatus: RecordActionStep,
        resolution?: ReturnType<typeof GridActionResolver.resolveAction>,
    ): Promise<any> {
        // 1. Resolve grid
        const gridBlock = GridActionResolver.resolveGridBlock(policyId, gridId);
        if (!gridBlock) {
            throw Object.assign(new Error('Grid not found'), { code: 404 });
        }

        // 2. Resolve action (skip if the caller already resolved it, e.g. to build
        //    a RecordActionStep closure ahead of this call)
        if (resolution === undefined) {
            resolution = GridActionResolver.resolveAction(policyId, gridId, actionId);
        }
        if (!resolution) {
            throw Object.assign(new Error('Action not found'), { code: 404 });
        }
        const { actionBlock, actionType, optionValue, field, buttonTag } = resolution;

        // 3. Permission gate on action block
        const actionError = await PolicyComponentsUtils.isAvailableSetData(
            actionBlock as IPolicyInterfaceBlock, user
        );
        if (actionError) {
            throw Object.assign(new Error(actionError.message), { code: actionError.code });
        }

        // 4. Look up the document directly by ID.
        const ref = (gridBlock as any);
        const document = await ref.databaseServer.getVcDocument({
            id: recordId,
            policyId: { $eq: policyId },
        } as any);
        if (!document) {
            throw Object.assign(new Error('Record not found'), { code: 404 });
        }

        // 4b. Authorize the record against the grid's own scoped query: page through in
        //     POLICY_DATA_MAX_PAGE_SIZE chunks until the record's id turns up, the grid
        //     reports no more pages, or MAX_PAGES is reached.
        const scopeError = await PolicyComponentsUtils.isAvailableGetData(gridBlock as IPolicyInterfaceBlock, user);
        if (scopeError) {
            throw Object.assign(new Error(scopeError.message), { code: scopeError.code });
        }
        let authorized = false;
        let exhaustedPageLimit = false;
        const MAX_PAGES = 1000; // safety ceiling: 1000 * 200 = 200k records
        for (let pageIndex = 0; ; pageIndex++) {
            if (pageIndex >= MAX_PAGES) {
                exhaustedPageLimit = true;
                break;
            }
            const scoped = await PolicyComponentsUtils.blockGetData(
                gridBlock as IPolicyInterfaceBlock, user,
                { page: pageIndex, itemsPerPage: POLICY_DATA_MAX_PAGE_SIZE }
            );
            const body = scoped.body || {};
            const rows: any[] = body.data || [];
            if (rows.some((row: any) => row.id === document.id)) {
                authorized = true;
                break;
            }
            const paginatesNatively = typeof body.page === 'number';
            if (!paginatesNatively || rows.length < POLICY_DATA_MAX_PAGE_SIZE || body.hasNextPage === false) {
                break;
            }
        }
        // Hitting the page cap means we genuinely don't know if the record is further in —
        // that's not the same as having confirmed it's absent, so don't report it as a 404.
        if (exhaustedPageLimit) {
            throw Object.assign(
                new Error(`Could not verify record access: grid exceeds ${MAX_PAGES * POLICY_DATA_MAX_PAGE_SIZE} scannable records`),
                { code: 500 }
            );
        }
        if (!authorized) {
            throw Object.assign(new Error('Record not found'), { code: 404 });
        }

        // 5. Prepare payload based on action type
        let payload: any;
        if (actionType === 'selector' && field && optionValue !== undefined) {
            payload = setNestedField(document, field, optionValue);
        } else if (actionType === 'dropdown') {
            const value = (_body && typeof _body === 'object') ? _body.value : undefined;
            if (value === undefined) {
                throw Object.assign(
                    new Error('This action requires a "value" body field with the selected option value'),
                    { code: 400 },
                );
            }
            payload = field ? setNestedField(document, field, value) : document;
        } else if (actionType === 'button') {
            const doc = (field && optionValue !== undefined)
                ? setNestedField(document, field, optionValue)
                : document;
            payload = { document: doc, tag: buttonTag ?? actionId };
        } else if (actionType === 'request') {
            // Request blocks submit a NEW VC (the form supplied in the body),
            // referencing the grid record via `ref`.
            const submitted = (_body && typeof _body === 'object' && _body.document !== undefined)
                ? _body.document
                : _body;
            if (!submitted || typeof submitted !== 'object') {
                throw Object.assign(
                    new Error('This action requires a "document" body with the form fields to submit'),
                    { code: 400 },
                );
            }
            payload = { document: submitted, ref: document };
        } else {
            payload = document;
        }

        // 6. Execute via existing block engine (fires selector events / button triggers)
        const result = await PolicyComponentsUtils.blockSetData(
            actionBlock as IPolicyInterfaceBlock, user, payload, actionStatus
        );

        if (result instanceof MessageError) {
            throw Object.assign(new Error(result.message), { code: result.code });
        }

        return result.body ?? {};
    }
}
