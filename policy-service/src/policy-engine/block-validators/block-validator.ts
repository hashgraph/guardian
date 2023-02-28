import * as mathjs from 'mathjs';
import { PolicyValidator } from "./policy-validator";
import { IBlockErrors } from "./interfaces/block-errors.interface";
import { IBlockProp } from "./interfaces/block-prop.interface";

import { InterfaceDocumentActionBlock } from "./blocks/action-block";
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
    SelectiveAttributes,
    SendToGuardianBlock,
    SetRelationshipsBlock,
    SplitBlock,
    InterfaceStepBlock,
    SwitchBlock,
    TimerBlock,
    TokenActionBlock,
    TokenConfirmationBlock,
    ModuleBlock
];

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
    private readonly validator: PolicyValidator | ModuleValidator;
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
        validator: PolicyValidator | ModuleValidator
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

    public addChild(item: BlockValidator): void {
        this.children.push(item);
    }

    private _getRef(): IBlockProp {
        return {
            blockType: this.blockType,
            options: this.options,
            children: []
        };
    }

    public getRef(): IBlockProp {
        return {
            blockType: this.blockType,
            options: this.options,
            children: this.children.map(e => e._getRef())
        };
    }

    public addError(error: string): void {
        this.errors.push(error);
    }

    public clear(): void {
        this.errors.length = 0;
    }

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
     * @param permissions
     */
    public tagNotExist(tag: string): boolean {
        return !this.validator.getTag(tag);
    }

    /**
     * Get Schema
     * @param iri
     */
    public async getSchema(iri: string): Promise<any> {
        return await this.validator.getSchema(iri);
    }

    /**
     * Schema not exist
     * @param iri
     */
    public async schemaNotExist(iri: string): Promise<boolean> {
        return !await this.validator.getSchema(iri);
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
     * Parse formula
     * @param formula
     */
    public validateFormula(formula: string): boolean {
        return (function (_formula: string) {
            try {
                this.validateFormula(_formula);
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
    public checkBlockError(error: string): void {
        if (error !== null) {
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
}
