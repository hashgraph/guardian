import { AsyncLocalStorage } from 'node:async_hooks';
import { GenerateUUIDv4, LocationType } from '@guardian/interfaces';
import { MessageError, MessageResponse } from '@guardian/common/models/message-response';
import { PolicyInputEventType, PolicyOutputEventType } from '../interfaces/policy-event-type.js';
import { AnyBlockType, IPolicyDocument, IPolicyInterfaceBlock } from '../policy-engine.interface.js';
import { PolicyUser } from '../policy-user.js';
import { IPreviewCalculation, RecordActionStep } from '../record-action-step.js';
import { PolicyUtils } from './utils.js';
import { getDocumentValueByPath, MathEngine, MathItemType } from './math-model/index.js';

export const PREVIEW_BLOCK_TYPES: ReadonlySet<string> = new Set([
    'mathBlock',
    'calculateContainerBlock',
    'customLogicBlock',
    'switchBlock',
    'documentValidatorBlock',
    'tool',
    'module'
]);

export const PREVIEW_SKIPPED_OUTPUTS: ReadonlySet<string> = new Set<string>([
    PolicyOutputEventType.RefreshEvent,
    PolicyOutputEventType.ReleaseEvent,
    PolicyOutputEventType.ErrorEvent,
    PolicyOutputEventType.ReferenceEvent,
    PolicyOutputEventType.DraftEvent
]);

const PREVIEW_KNOWN_INPUTS: ReadonlySet<string> = new Set<string>(Object.values(PolicyInputEventType));

export function isPreviewInputAllowed(input: string): boolean {
    return input === PolicyInputEventType.RunEvent || !PREVIEW_KNOWN_INPUTS.has(input);
}

const previewStorage = new AsyncLocalStorage<RecordActionStep>();

export class PreviewScope {
    public static run<T>(actionStatus: RecordActionStep, callback: () => Promise<T>): Promise<T> {
        return previewStorage.run(actionStatus, callback);
    }

    public static current(): RecordActionStep | undefined {
        return previewStorage.getStore();
    }
}

export function getPreviewDocumentId(idType: string, user: PolicyUser): string | undefined {
    if (idType === 'OWNER') {
        return user.did;
    }
    if (idType === 'UUID' || idType === 'DID') {
        return GenerateUUIDv4();
    }
    return undefined;
}

export function createPreviewDocument(
    ref: AnyBlockType,
    owner: PolicyUser | null,
    subject: any,
    schema: string | null,
    issuer: string | null,
    recordActionId: string | null
): IPolicyDocument {
    const item = PolicyUtils.createUnsignedVC(ref, PolicyUtils.createVcFromSubject(subject), recordActionId);
    if (issuer) {
        item.document.issuer = issuer;
    }
    if (owner) {
        item.owner = owner.did;
        item.group = owner.group;
    }
    if (schema) {
        item.schema = schema;
        item.type = schema;
    }
    return item;
}

export function buildMathPreviewCalculation(
    source: string | null,
    expression: unknown,
    scope: Record<string, unknown>,
    result: unknown
): IPreviewCalculation {
    const calculation: IPreviewCalculation = {
        source,
        blockType: 'mathBlock',
        inputs: [],
        values: [],
        outputs: []
    };
    const engine = MathEngine.from(expression);
    if (!engine) {
        return calculation;
    }
    engine.validate();
    for (const link of engine.variables.getItems()) {
        if (link.name) {
            calculation.inputs.push({
                name: link.name,
                path: link.path,
                value: scope[link.name] ?? null
            });
        }
    }
    for (const formula of engine.formulas.getItems()) {
        if (formula.type === MathItemType.VARIABLE) {
            calculation.values.push({
                name: formula.functionName,
                description: formula.description || '',
                formula: formula.functionBodyText || '',
                value: scope[formula.functionName] ?? null
            });
        }
    }
    for (const link of engine.outputs.getItems()) {
        calculation.outputs.push({
            name: link.name,
            path: link.path,
            value: getDocumentValueByPath(result, link.path) ?? null
        });
    }
    return calculation;
}

export function buildCalculatePreviewCalculation(
    source: string | null,
    inputFields: { name: string; value: string }[] | undefined,
    outputFields: { name: string; value: string }[] | undefined,
    formulas: Record<string, unknown>,
    inputScope: Record<string, unknown>,
    scope: Record<string, unknown>
): IPreviewCalculation {
    return {
        source,
        blockType: 'calculateContainerBlock',
        inputs: (inputFields || []).map((field) => ({
            name: field.value,
            path: field.name,
            value: inputScope[field.value] ?? null
        })),
        values: Object.keys(formulas).map((name) => ({
            name,
            description: '',
            formula: String(formulas[name] ?? ''),
            value: scope[name] ?? null
        })),
        outputs: (outputFields || []).map((field) => ({
            name: field.value,
            path: field.name,
            value: scope[field.value] ?? null
        }))
    };
}

export function buildPreviewResponse(actionStatus: RecordActionStep, input: unknown) {
    return {
        trackingId: actionStatus.id,
        preview: true,
        input,
        documents: actionStatus.getPreviewDocuments(),
        calculations: actionStatus.getPreviewCalculations(),
        steps: actionStatus.getResults(),
        errors: actionStatus.getErrors().map((error) => error.message)
    };
}

export type PreviewSetBlockData = (
    block: IPolicyInterfaceBlock,
    user: PolicyUser,
    data: any,
    actionStatus: RecordActionStep
) => Promise<MessageResponse<any> | MessageError<any>>;

export async function runPreview(
    block: IPolicyInterfaceBlock,
    user: PolicyUser,
    data: any,
    setBlockData: PreviewSetBlockData
): Promise<MessageResponse<any> | MessageError<any>> {
    if (block.blockType !== 'requestVcDocumentBlock') {
        return new MessageError('Preview is available only for a Request document block', 422);
    }
    if (block.locationType === LocationType.REMOTE) {
        return new MessageError('Preview is not available for a remote policy', 422);
    }

    let complete: () => void = () => undefined;
    const completed = new Promise<void>((resolve) => {
        complete = resolve;
    });
    const actionStatus = new RecordActionStep(() => complete(), 0, true, true, undefined, true);
    const previewData = { ...data, draft: false, draftId: null, relayerAccount: null };

    let response: MessageResponse<any> | MessageError<any>;
    try {
        response = await PreviewScope.run(actionStatus, () => setBlockData(block, user, previewData, actionStatus));
    } catch (error) {
        actionStatus.cancel();
        throw error;
    }

    if (response instanceof MessageError) {
        actionStatus.cancel();
        return response;
    }

    actionStatus.finish();
    await completed;

    return new MessageResponse(buildPreviewResponse(actionStatus, response.body), response.code);
}
