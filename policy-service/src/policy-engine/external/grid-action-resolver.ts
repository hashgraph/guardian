import crypto from 'node:crypto';
import { MessageError } from '@guardian/common';
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
        if (!tagMap) return null;

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
        actionType: 'selector' | 'button' | 'dropdown';
        optionValue?: any;
        field?: string;
    } | null {
        const gridBlock = GridActionResolver.resolveGridBlock(policyId, gridId);
        if (!gridBlock) return null;

        const tagMap = PolicyComponentsUtils.GetTagBlockMap(policyId);
        if (!tagMap) return null;

        const fields: any[] = gridBlock.options?.uiMetaData?.fields || [];
        const visited = new Set<string>();

        for (const field of fields) {
            for (const bindTag of (field.bindBlocks || [])) {
                if (visited.has(bindTag) || !tagMap.has(bindTag)) continue;
                visited.add(bindTag);

                const uuid = tagMap.get(bindTag)!;
                const actionBlock = PolicyComponentsUtils.GetBlockByUUID<IPolicyBlock>(uuid);
                if (!actionBlock) continue;

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
                        return { actionBlock, actionType: 'dropdown' };
                    }
                } else if (blockType === 'buttonBlock' && stableId(actionBlock) === actionId) {
                    return { actionBlock, actionType: 'button' };
                }
            }
        }
        return null;
    }

    // ── Grid Fetch ──────────────────────────────────────────────────────

    static async getGrids(policyId: string, user: PolicyUser): Promise<IExternalGrid[]> {
        const tagMap = PolicyComponentsUtils.GetTagBlockMap(policyId);
        if (!tagMap) return [];

        const grids: IExternalGrid[] = [];
        const seenUuids = new Set<string>();

        for (const [, uuid] of tagMap) {
            if (seenUuids.has(uuid)) continue;
            seenUuids.add(uuid);

            const block = PolicyComponentsUtils.GetBlockByUUID<IPolicyBlock>(uuid);
            if (!block || block.blockType !== 'interfaceDocumentsSourceBlock') continue;

            const available = await block.isAvailable(user);
            if (!available) continue;

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
            if (child.blockType !== 'filtersAddon') continue;
            const co = child.options || {};
            filterSchema.push({
                filterId: stableId(child),
                title: co.uiMetaData?.title || co.field || stableId(child),
                type: co.type || 'input',
                field: co.field || '',
                operators: co.queryType ? [co.queryType] : [],
            });
        }

        const columnSchema: IExternalColumn[] = fields.map((f: any) => ({
            name: f.name || '',
            title: f.title || f.name || '',
            type: f.type || 'string',
            bindActions: (f.bindBlocks || []) as string[],
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
        if (!tagMap) return [];

        const fields: any[] = gridBlock.options?.uiMetaData?.fields || [];
        const visited = new Set<string>();
        const actions: IExternalAction[] = [];

        for (const field of fields) {
            for (const bindTag of (field.bindBlocks || [])) {
                if (visited.has(bindTag) || !tagMap.has(bindTag)) continue;
                visited.add(bindTag);

                const uuid = tagMap.get(bindTag)!;
                const actionBlock = PolicyComponentsUtils.GetBlockByUUID<IPolicyBlock>(uuid);
                if (!actionBlock) continue;

                const blockAvailable = await actionBlock.isAvailable(user);
                if (!blockAvailable) continue;

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
                        actions.push({
                            actionId: stableId(actionBlock),
                            label: opts.uiMetaData?.title || stableId(actionBlock),
                            requiredRoles,
                            appliesTo: 'row',
                            inputSchema: { type: 'object', properties: {} },
                        });
                    }
                    // 'download' is excluded — not a workflow action
                } else if (blockType === 'buttonBlock') {
                    actions.push({
                        actionId: stableId(actionBlock),
                        label: opts.uiMetaData?.title || stableId(actionBlock),
                        requiredRoles,
                        appliesTo: 'row',
                        inputSchema: { type: 'object', properties: {} },
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

        const result = await PolicyComponentsUtils.blockGetData(gridBlock as IPolicyInterfaceBlock, user, params);
        const data = result.body;

        if (Array.isArray(data?.data)) {
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
    ): Promise<any> {
        // 1. Resolve grid
        const gridBlock = GridActionResolver.resolveGridBlock(policyId, gridId);
        if (!gridBlock) {
            throw Object.assign(new Error('Grid not found'), { code: 404 });
        }

        // 2. Resolve action
        const resolution = GridActionResolver.resolveAction(policyId, gridId, actionId);
        if (!resolution) {
            throw Object.assign(new Error('Action not found'), { code: 404 });
        }
        const { actionBlock, actionType, optionValue, field } = resolution;

        // 3. Permission gate on action block
        const actionError = await PolicyComponentsUtils.isAvailableSetData(
            actionBlock as IPolicyInterfaceBlock, user
        );
        if (actionError) {
            throw Object.assign(new Error(actionError.message), { code: actionError.code });
        }

        // 4. Look up the document directly by ID — access is already gated by
        //    isAvailableGetData (grid) and isAvailableSetData (action block) above.
        const ref = (gridBlock as any);
        const document = await ref.databaseServer.getVcDocument({
            id: recordId,
            policyId: { $eq: policyId },
        } as any);
        if (!document) {
            throw Object.assign(new Error('Record not found'), { code: 404 });
        }

        // 5. Prepare payload based on action type
        let payload: any;
        if (actionType === 'selector' && field && optionValue !== undefined) {
            payload = setNestedField(document, field, optionValue);
        } else if (actionType === 'button') {
            payload = { document, tag: actionId };
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
