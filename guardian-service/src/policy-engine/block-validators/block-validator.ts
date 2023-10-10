import * as mathjs from 'mathjs';
import { PolicyValidator } from './policy-validator';
import { IBlockErrors } from './interfaces/block-errors.interface';
import { IBlockProp } from './interfaces/block-prop.interface';
import { InterfaceDocumentActionBlock } from './blocks/action-block';
import { AggregateBlock } from './blocks/aggregate-block';
import { ButtonBlock } from './blocks/button-block';
import { CalculateContainerBlock } from './blocks/calculate-block';
import { CalculateMathAddon } from './blocks/calculate-math-addon';
import { CalculateMathVariables } from './blocks/calculate-math-variables';
import { InterfaceContainerBlock } from './blocks/container-block';
import { CreateTokenBlock } from './blocks/create-token-block';
import { CustomLogicBlock } from './blocks/custom-logic-block';
import { DocumentValidatorBlock } from './blocks/document-validator-block';
import { InterfaceDocumentsSource } from './blocks/documents-source';
import { DocumentsSourceAddon } from './blocks/documents-source-addon';
import { ExternalDataBlock } from './blocks/external-data-block';
import { FiltersAddonBlock } from './blocks/filters-addon-block';
import { GroupManagerBlock } from './blocks/group-manager';
import { HistoryAddon } from './blocks/history-addon';
import { HttpRequestBlock } from './blocks/http-request-block';
import { TokenOperationAddon } from './blocks/impact-addon';
import { InformationBlock } from './blocks/information-block';
import { MintBlock } from './blocks/mint-block';
import { MultiSignBlock } from './blocks/multi-sign-block';
import { PaginationAddon } from './blocks/pagination-addon';
import { PolicyRolesBlock } from './blocks/policy-roles';
import { ReassigningBlock } from './blocks/reassigning.block';
import { ReportBlock } from './blocks/report-block';
import { ReportItemBlock } from './blocks/report-item-block';
import { RequestVcDocumentBlock } from './blocks/request-vc-document-block';
import { RetirementBlock } from './blocks/retirement-block';
import { RevokeBlock } from './blocks/revoke-block';
import { RevocationBlock } from './blocks/revocation-block';
import { SelectiveAttributes } from './blocks/selective-attributes-addon';
import { SendToGuardianBlock } from './blocks/send-to-guardian-block';
import { SetRelationshipsBlock } from './blocks/set-relationships-block';
import { SplitBlock } from './blocks/split-block';
import { InterfaceStepBlock } from './blocks/step-block';
import { SwitchBlock } from './blocks/switch-block';
import { TimerBlock } from './blocks/timer-block';
import { TokenActionBlock } from './blocks/token-action-block';
import { TokenConfirmationBlock } from './blocks/token-confirmation-block';
import { ModuleValidator } from './module-validator';
import { ModuleBlock } from './blocks/module';
import { TagsManagerBlock } from './blocks/tag-manager';
import { ExternalTopicBlock } from './blocks/external-topic-block';
import { MessagesReportBlock } from './blocks/messages-report-block';
import { NotificationBlock } from './blocks/notification.block';
import { ISchema, SchemaField, SchemaHelper } from '@guardian/interfaces';
import { ToolValidator } from './tool-validator';
import { ToolBlock } from './blocks/tool';
import { ExtractDataBlock } from './blocks/extract-data';

export const validators = [
    InterfaceDocumentActionBlock,
    AggregateBlock,
    ButtonBlock,
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
    ExtractDataBlock
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

    constructor(
        config: any,
        validator: PolicyValidator | ModuleValidator | ToolValidator
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
            return SchemaHelper.parseFields(document, null, null, false);
        } catch (error) {
            return null;
        }
    }
}
