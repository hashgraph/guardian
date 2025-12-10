import { IPolicyComponents, PinoLogger, Policy } from '@guardian/common';
import { IFormula, IOwner, PolicyToolMetadata } from '@guardian/interfaces';

export interface ImportPolicyError {
    /**
     * Entity type
     */
    type?: string;
    /**
     * Schema uuid
     */
    uuid?: string;
    /**
     * Schema name
     */
    name?: string;
    /**
     * Error message
     */
    error?: string;
}

export interface ImportPolicyResult {
    /**
     * New Policy
     */
    policy: Policy,
    /**
     * Errors
     */
    errors: ImportPolicyError[]
}

export interface ImportTestResult {
    /**
     * New schema uuid
     */
    testsMap: Map<string, string>;
    /**
     * Errors
     */
    errors: any[];
    /**
     * Errors
     */
    files: [any, Buffer][];
}

export interface ImportFormulaResult {
    /**
     * New schema uuid
     */
    formulasMap: Map<string, string>;
    /**
     * Errors
     */
    errors: any[];
    /**
     * Errors
     */
    files: IFormula[];
}

export class ImportPolicyOptions {
    public policyComponents: IPolicyComponents;
    public user: IOwner;
    public versionOfTopicId: string | null;
    public additionalPolicyConfig: Partial<Policy> | null;
    public metadata: PolicyToolMetadata | null;
    public logger: PinoLogger;
    public importRecords: boolean;
    public fromMessageId: string;

    constructor(logger: PinoLogger) {
        this.logger = logger;
    }

    public setComponents(policyComponents: IPolicyComponents): ImportPolicyOptions {
        this.policyComponents = policyComponents;
        return this;
    }

    public setUser(user: IOwner): ImportPolicyOptions {
        this.user = user;
        return this;
    }

    public setParentPolicyTopic(topicId: string | null): ImportPolicyOptions {
        this.versionOfTopicId = topicId;
        return this;
    }

    public setAdditionalPolicy(policy: Partial<Policy> | null): ImportPolicyOptions {
        this.additionalPolicyConfig = policy;
        return this;
    }

    public setMetadata(metadata: PolicyToolMetadata | null): ImportPolicyOptions {
        this.metadata = metadata;
        return this;
    }

    public setImportRecords(importRecords?: boolean): ImportPolicyOptions {
        this.importRecords = !!importRecords;
        return this;
    }

    public setFromMessageId(fromMessageId = ''): ImportPolicyOptions {
        this.fromMessageId = fromMessageId;
        return this;
    }

    public validate(): ImportPolicyOptions {
        if (!this.policyComponents) {
            throw new Error('Invalid import parameters: policy components')
        }
        if (!this.user) {
            throw new Error('Invalid import parameters: user')
        }
        return this;
    }
}