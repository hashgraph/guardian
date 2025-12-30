import * as mathjs from 'mathjs';
import { PolicyValidator } from './policy-validator.js';
import { IBlockErrors } from './interfaces/block-errors.interface.js';
import { IBlockProp } from './interfaces/block-prop.interface.js';
import { InterfaceDocumentActionBlock } from './blocks/action-block.js';
import { AggregateBlock } from './blocks/aggregate-block.js';
import { ButtonBlock } from './blocks/button-block.js';
import { CalculateContainerBlock } from './blocks/calculate-block.js';
import { CalculateMathAddon } from './blocks/calculate-math-addon.js';
import { CalculateMathVariables } from './blocks/calculate-math-variables.js';
import { InterfaceContainerBlock } from './blocks/container-block.js';
import { CreateTokenBlock } from './blocks/create-token-block.js';
import { CustomLogicBlock } from './blocks/custom-logic-block.js';
import { DocumentValidatorBlock } from './blocks/document-validator-block.js';
import { InterfaceDocumentsSource } from './blocks/documents-source.js';
import { DocumentsSourceAddon } from './blocks/documents-source-addon.js';
import { ExternalDataBlock } from './blocks/external-data-block.js';
import { FiltersAddonBlock } from './blocks/filters-addon-block.js';
import { GroupManagerBlock } from './blocks/group-manager.js';
import { HistoryAddon } from './blocks/history-addon.js';
import { HttpRequestBlock } from './blocks/http-request-block.js';
import { TokenOperationAddon } from './blocks/impact-addon.js';
import { InformationBlock } from './blocks/information-block.js';
import { MintBlock } from './blocks/mint-block.js';
import { MultiSignBlock } from './blocks/multi-sign-block.js';
import { PaginationAddon } from './blocks/pagination-addon.js';
import { PolicyRolesBlock } from './blocks/policy-roles.js';
import { ReassigningBlock } from './blocks/reassigning.block.js';
import { ReportBlock } from './blocks/report-block.js';
import { ReportItemBlock } from './blocks/report-item-block.js';
import { RequestVcDocumentBlock } from './blocks/request-vc-document-block.js';
import { RetirementBlock } from './blocks/retirement-block.js';
import { RevokeBlock } from './blocks/revoke-block.js';
import { RevocationBlock } from './blocks/revocation-block.js';
import { SelectiveAttributes } from './blocks/selective-attributes-addon.js';
import { SendToGuardianBlock } from './blocks/send-to-guardian-block.js';
import { SetRelationshipsBlock } from './blocks/set-relationships-block.js';
import { SplitBlock } from './blocks/split-block.js';
import { InterfaceStepBlock } from './blocks/step-block.js';
import { SwitchBlock } from './blocks/switch-block.js';
import { TimerBlock } from './blocks/timer-block.js';
import { TokenActionBlock } from './blocks/token-action-block.js';
import { TokenConfirmationBlock } from './blocks/token-confirmation-block.js';
import { ModuleValidator } from './module-validator.js';
import { ModuleBlock } from './blocks/module.js';
import { TagsManagerBlock } from './blocks/tag-manager.js';
import { ExternalTopicBlock } from './blocks/external-topic-block.js';
import { MessagesReportBlock } from './blocks/messages-report-block.js';
import { NotificationBlock } from './blocks/notification.block.js';
import {ISchema, projectRawNode, RawNodeView, SchemaEntity, SchemaField, SchemaHelper} from '@guardian/interfaces';
import { ToolValidator } from './tool-validator.js';
import { ToolBlock } from './blocks/tool.js';
import { ExtractDataBlock } from './blocks/extract-data.js';
import { ButtonBlockAddon } from './blocks/button-block-addon.js';
import { DropdownBlockAddon } from './blocks/dropdown-block-addon.js';
import { RequestVcDocumentBlockAddon } from './blocks/request-vc-document-block-addon.js';
import { DataTransformationAddon } from './blocks/data-transformation-addon.js';
import { TransformationButtonBlock } from './blocks/transformation-button-block.js';
import { IntegrationButtonBlock } from './blocks/integration-button-block.js';
import { HttpRequestUIAddon } from './blocks/http-request-ui-addon.js';
import { TransformationUIAddon } from './blocks/transformation-ui-addon.js';
import {GlobalEventsWriterBlock} from './blocks/global-events-writer-block.js';
import {GlobalEventsReaderBlock} from './blocks/global-events-reader-block.js';

export const validators = [
    InterfaceDocumentActionBlock,
    AggregateBlock,
    ButtonBlock,
    TransformationButtonBlock,
    IntegrationButtonBlock,
    CalculateContainerBlock,
    CalculateMathAddon,
    CalculateMathVariables,
    InterfaceContainerBlock,
    CreateTokenBlock,
    CustomLogicBlock,
    DocumentValidatorBlock,
    DocumentsSourceAddon,
    InterfaceDocumentsSource,
    ExternalDataBlock,
    FiltersAddonBlock,
    GroupManagerBlock,
    HistoryAddon,
    HttpRequestBlock,
    TokenOperationAddon,
    InformationBlock,
    MintBlock,
    MultiSignBlock,
    PaginationAddon,
    PolicyRolesBlock,
    ReassigningBlock,
    ReportBlock,
    ReportItemBlock,
    RequestVcDocumentBlock,
    RetirementBlock,
    RevokeBlock,
    RevocationBlock,
    SelectiveAttributes,
    SendToGuardianBlock,
    SetRelationshipsBlock,
    SplitBlock,
    InterfaceStepBlock,
    SwitchBlock,
    TimerBlock,
    TokenActionBlock,
    TokenConfirmationBlock,
    ModuleBlock,
    TagsManagerBlock,
    ExternalTopicBlock,
    MessagesReportBlock,
    NotificationBlock,
    ToolBlock,
    ExtractDataBlock,
    ButtonBlockAddon,
    DropdownBlockAddon,
    RequestVcDocumentBlockAddon,
    DataTransformationAddon,
    HttpRequestUIAddon,
    TransformationUIAddon,
    GlobalEventsWriterBlock,
    GlobalEventsReaderBlock,
];

/**
 * Block Validator
 */
export class BlockValidator {
    /**
     * Errors
     * @private
     */
    private readonly errors: string[];
    /**
     * Errors
     * @private
     */
    private readonly validator: PolicyValidator | ModuleValidator | ToolValidator;
    /**
     * UUID
     * @private
     */
    private readonly uuid: string;
    /**
     * Type
     * @private
     */
    private readonly blockType: string;
    /**
     * Tag
     * @private
     */
    private readonly tag: string;
    /**
     * Permissions
     * @private
     */
    private readonly permissions: string[];
    /**
     * Options
     * @private
     */
    private readonly options: any;
    /**
     * Options
     * @private
     */
    private readonly children: BlockValidator[];

    /**
     * Storage for structured messages and their string representations used for serialization.
     */
    private readonly warningMessagesText: string[] = [];
    private readonly infoMessagesText: string[] = [];

    /**
     * Parent id
     * @private
     */
    private parentId?: string;

    /**
     * Raw Node View
     * @private
     */
    private readonly rawNodeView: RawNodeView;

    constructor(
        config: any,
        validator: PolicyValidator | ModuleValidator | ToolValidator,
    ) {
        this.errors = [];
        this.validator = validator;
        this.uuid = config.id;
        this.blockType = config.blockType;
        this.tag = config.tag;
        this.permissions = config.permissions;

        const { blockType, children, ...params } = config;
        let options = params as any;
        if (options.options) {
            options = Object.assign(options, options.options);
        }
        this.options = options;
        this.children = [];

        this.rawNodeView = projectRawNode(config);
    }

    /**
     * Is Dry Run
     */
    public get isDryRun(): boolean {
        return (this.validator instanceof PolicyValidator) && this.validator.isDryRun;
    }

    /**
     * Add child block
     */
    public addChild(item: BlockValidator): void {
        this.children.push(item);
    }

    /**
     * Get Properties
     * @private
     */
    private _getRef(): IBlockProp {
        return {
            blockType: this.blockType,
            options: this.options,
            children: []
        };
    }

    /**
     * Get Properties
     */
    public getRef(): IBlockProp {
        return {
            blockType: this.blockType,
            options: this.options,
            children: this.children.map(e => e._getRef())
        };
    }

    /**
     * Add error
     */
    public addError(error: string): void {
        this.errors.push(error);
    }

    /**
     * Clear errors
     */
    public clear(): void {
        this.errors.length = 0;
    }

    /**
     * Get id
     */
    public getId(): string {
        return this.uuid;
    }

    /**
     * Get tag
     */
    public getTag(): string {
        return this.tag;
    }

    /**
     * Get block type
     */
    public getBlockType(): string {
        return this.blockType;
    }

    /**
     * Get options
     */
    public getOptions(): unknown {
        return this.options;
    }

    /**
     * Get parent id
     */
    public getParentId(): string | undefined {
        return this.parentId;
    }

    /**
     * Get children ids
     */
    public getChildrenIds(): string[] {
        return this.children.map(child => child.getId());
    }

    /**
     * Set parent id
     */
    public setParentId(parentId: string | undefined): void {
        this.parentId = parentId;
    }

    /**
     * Dividing messages by severity
     */
    public addPrecomputedMessagesAsText(messages: ReadonlyArray<string>, severity: 'warning' | 'info'): void {
        if (severity === 'warning') {
            this.warningMessagesText.push(...messages);
        } else {
            this.infoMessagesText.push(...messages);
        }
    }

    /**
     * Get Raw Config
     */
    public getRawConfig(): RawNodeView {
        return this.rawNodeView;
    }

    /**
     * Validate
     */
    public async validate(): Promise<void> {
        try {
            if (this.validator.tagCount(this.tag) > 1) {
                this.addError(`Tag ${this.tag} already exist`);
            }

            const permission = this.validator.permissionsNotExist(this.permissions);
            if (permission) {
                this.addError(`Permission ${permission} not exist`);
            }

            for (const v of validators) {
                if (v.blockType === this.blockType) {
                    await v.validate(this, this.getRef());
                }
            }
        } catch (error) {
            this.addError(typeof error === 'string' ? error : error.message);
        }
    }

    /**
     * Get serialized errors
     */
    public getSerializedErrors(): IBlockErrors {
        return {
            id: this.uuid,
            name: this.blockType,
            errors: this.errors.slice(),
            warnings: this.warningMessagesText.slice(),
            infos: this.infoMessagesText.slice(),
            isValid: !this.errors.length
        };
    }

    /**
     * Tag not exist
     * @param tag
     */
    public tagNotExist(tag: string): boolean {
        return !this.validator.getTag(tag);
    }

    /**
     * Get Schema
     * @param iri
     */
    public getSchema(iri: string): ISchema {
        return this.validator.getSchema(iri);
    }

    /**
     * Permission not exist
     * @param permission
     */
    public permissionNotExist(permission: string): boolean {
        return !this.validator.getPermission(permission);
    }

    /**
     * Schema not exist by entity
     * @param entity
     */
    public schemaNotExistByEntity(entity: SchemaEntity): boolean {
        return !(this.validator as PolicyValidator).schemaExistByEntity?.(entity);
    }

    /**
     * Schema not exist
     * @param iri
     */
    public schemaNotExist(iri: string): boolean {
        return !this.validator.schemaExist(iri);
    }

    /**
     * Schema exist
     * @param iri
     */
    public schemaExist(iri: string): boolean {
        return this.validator.schemaExist(iri);
    }

    /**
     * Validate schema
     * @param iri
     */
    public validateSchema(iri: string): string | null {
        if (this.validator.unsupportedSchema(iri)) {
            return `Schema with id "${iri}" refers to non-existing schema`;
        }
        if (this.validator.schemaExist(iri)) {
            return null;
        } else {
            return `Schema with id "${iri}" does not exist`;
        }
    }

    /**
     * Validate schema variable
     * @param name
     * @param value
     * @param required
     */
    public validateSchemaVariable(
        name: string,
        value: any,
        required: boolean = false
    ): string | null {
        if (!value) {
            if (required) {
                return `Option "${name}" is not set`;
            } else {
                return null;
            }
        }
        if (typeof value !== 'string') {
            return `Option "${name}" must be a string`;
        }
        return this.validateSchema(value);
    }

    /**
     * Validate base schema
     * @param iri
     */
    public validateBaseSchema(
        baseSchema: ISchema | string,
        schema: ISchema | string
    ): string | null {
        if (!baseSchema) {
            return null;
        }
        let baseSchemaObject: ISchema;
        if (typeof baseSchema === 'string') {
            baseSchemaObject = this.getSchema(baseSchema);
        } else {
            baseSchemaObject = baseSchema;
        }

        let schemaObject: ISchema;
        if (typeof schema === 'string') {
            schemaObject = this.getSchema(schema);
        } else {
            schemaObject = schema;
        }

        if (!baseSchemaObject) {
            return `Schema with id "${baseSchema}" does not exist`;
        }

        if (!schemaObject) {
            return `Schema with id "${schema}" does not exist`;
        }

        if (!this.compareSchema(baseSchemaObject, schemaObject)) {
            return `Schema is not supported`;
        }

        return null;
    }

    /**
     * Get token template
     * @param templateName
     * @returns Token template
     */
    public getTokenTemplate(templateName: string) {
        return this.validator.getTokenTemplate(templateName);
    }

    /**
     * Token not exist
     * @param templateName
     */
    public tokenTemplateNotExist(templateName: string) {
        return !this.validator.getTokenTemplate(templateName);
    }

    /**
     * Token not exist
     * @param tokenId
     */
    public async tokenNotExist(tokenId: string) {
        return !await this.validator.getToken(tokenId);
    }

    /**
     * Topic not exist
     * @param topicName
     */
    public topicTemplateNotExist(topicName: string) {
        return !this.validator.getTopicTemplate(topicName);
    }

    /**
     * Group not exist
     * @param group
     */
    public groupNotExist(group: string) {
        return !this.validator.getGroup(group);
    }

    /**
     * Get artifact
     * @param uuid
     */
    public async getArtifact(uuid: string) {
        return await this.validator.getArtifact(uuid);
    }

    /**
     * Parse formula
     * @param formula
     */
    public validateFormula(formula: string): boolean {
        return (function (_formula: string) {
            try {
                this.parse(_formula);
                return true;
            } catch (error) {
                return false;
            }
        }).call(mathjs, formula);
    }

    /**
     * Get Variables
     * @param formula
     */
    public parsFormulaVariables(formula: string): string[] {
        const variables = [];
        try {
            mathjs.parse(formula).traverse((node: any) => {
                if (node.isSymbolNode && !mathjs[node.name]) {
                    variables.push(node.name);
                }
            });
            return variables;
        } catch (error) {
            return variables;
        }
    }

    /**
     * Check block error
     * @param uuid
     * @param error
     */
    public checkBlockError(error: string | null): void {
        if (error) {
            this.addError(error);
        }
    }

    /**
     * Get error message
     * @param error
     */
    public getErrorMessage(error: string | Error | any): string {
        if (typeof error === 'string') {
            return error;
        } else if (error.message) {
            return error.message;
        } else if (error.error) {
            return error.error;
        } else if (error.name) {
            return error.name;
        } else {
            console.error(error);
            return 'Unidentified error';
        }
    }

    public compareSchema(baseSchema: ISchema, schema: ISchema): boolean {
        if (!baseSchema) {
            return true
        }
        const baseFields = this.getSchemaFields(baseSchema.document);
        const schemaFields = this.getSchemaFields(schema.document);
        return this.ifExtendFields(schemaFields, baseFields);
    }

    /**
     * Compare Schema Fields
     * @param f1
     * @param f2
     * @private
     */
    private compareFields(f1: SchemaField, f2: SchemaField): boolean {
        if (
            f1.name !== f2.name ||
            f1.title !== f2.title ||
            f1.description !== f2.description ||
            f1.required !== f2.required ||
            f1.isArray !== f2.isArray ||
            f1.isRef !== f2.isRef
        ) {
            return false;
        }
        if (f1.isRef) {
            return true;
        } else {
            return (
                f1.type === f2.type &&
                f1.format === f2.format &&
                f1.pattern === f2.pattern &&
                f1.unit === f2.unit &&
                f1.unitSystem === f2.unitSystem &&
                f1.customType === f2.customType
            );
        }
        // remoteLink?: string;
        // enum?: string[];
    }

    /**
     * Compare Schemas
     * @param extension
     * @param base
     * @private
     */
    private ifExtendFields(extension: SchemaField[], base: SchemaField[]): boolean {
        try {
            if (!extension || !base) {
                return false;
            }
            const map = new Map<string, SchemaField>();
            for (const f of extension) {
                map.set(f.name, f);
            }
            for (const baseField of base) {
                const extensionField = map.get(baseField.name)
                if (!extensionField) {
                    return false;
                }
                if (!this.compareFields(baseField, extensionField)) {
                    return false;
                }
                if (baseField.isRef) {
                    if (!this.ifExtendFields(extensionField.fields, baseField.fields)) {
                        return false;
                    }
                }
            }
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get Schema Fields
     * @param document
     * @private
     */
    private getSchemaFields(document: any): SchemaField[] {
        try {
            if (typeof document === 'string') {
                document = JSON.parse(document);
            }
            const schemaCache = new Map<string, any>();
            return SchemaHelper.parseFields(document, null, schemaCache, null, false);
        } catch (error) {
            return null;
        }
    }
}
