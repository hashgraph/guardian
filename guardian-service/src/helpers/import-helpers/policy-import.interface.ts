import { Policy } from "@guardian/common";
import { IFormula } from "@guardian/interfaces";

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