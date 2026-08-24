import { Ajv } from 'ajv';
import addFormats from 'ajv-formats';
import * as vcLib from '@digitalbazaar/vc';
import { Ed25519Signature2018 } from '@digitalbazaar/ed25519-signature-2018';
import { Ed25519VerificationKey2018 } from '@digitalbazaar/ed25519-verification-key-2018';
import { PrivateKey } from '@hiero-ledger/sdk';
import { SchemaValidationResult } from './schema-validation-result.js';
import { GenerateUUIDv4, ICredentialSubject, ISchemaArrayDependency, IVC, Schema, SchemaField, SchemaHelper, SignatureType } from '@guardian/interfaces';
import { VcDocument } from './vc-document.js';
import { VpDocument } from './vp-document.js';
import { VcSubject } from './vc-subject.js';
import { TimestampUtils } from '../timestamp-utils.js';
import { DocumentLoaderFunction } from '../document-loader/document-loader-function.js';
import { DocumentLoader } from '../document-loader/document-loader.js';
import { IDocumentFormat } from '../document-loader/document-format.js';
import { SchemaLoader, SchemaLoaderFunction } from '../document-loader/schema-loader.js';
import { Issuer } from './issuer.js';
import axios from 'axios';
import { BbsBlsSignature2020, BbsBlsSignatureProof2020, Bls12381G2KeyPair, KeyPairOptions } from '@mattrglobal/jsonld-signatures-bbs';
import { IPFS } from '../../helpers/index.js';
import { CommonDidDocument, HederaBBSMethod, HederaDidDocument, HederaEd25519Method } from './did/index.js';
import { validateGeoConsistency } from './geo-validator.js';
import { ArrayGroupValidationError, validateArrayGroups } from './array-group-validator.js';

import * as jsigV7Module from 'jsonld-signatures-v7';
import { ContextHelper } from './context-helper.js';
// BbsBlsSignature2020 targets jsonld-signatures@7. Drive its sign/verify with the v7 alias
// (jsonld-signatures@11, used by @digitalbazaar/vc for Ed25519, is incompatible with it).
// Under ESM the CJS named exports live on `.default`, so resolve that before destructuring.
const jsigV7: any = (jsigV7Module as any).default ?? jsigV7Module;
const { sign: signV7, verify: verifyV7, purposes: purposesV7 } = jsigV7;

/**
 * Suite interface
 */
export interface ISuite {
    /**
     * Issuer
     */
    issuer: string;
    /**
     * Suite
     */
    suite: Ed25519Signature2018;
}

/**
 * Suite options
 */
export interface ISuiteOptions {
    /**
     * Issuer
     */
    did: string;
    /**
     * Private key
     */
    key: string | PrivateKey,
    /**
     * Signature type
     */
    signatureType?: SignatureType;
}

/**
 * Document options
 */
export interface IDocumentOptions {
    /**
     * Group
     */
    group?: {
        /**
         * Group ID
         */
        groupId: string;
        /**
         * Group type
         */
        type: string;
        /**
         * Group context
         */
        context: any;
    };
    /**
     * UUID
     */
    uuid?: string;
    /**
     * Evidence entries to embed in the VC before signing
     */
    evidence?: { type: string[]; dataType: string; data: string }[];
    /**
     * JSON-LD context URL for evidence entries
     */
    evidenceContext?: string;
}

/**
 * Connecting VCJS library
 */
export class VCJS {
    /**
     * Document loaders
     * @private
     */
    private readonly documentLoaders: DocumentLoader[];
    /**
     * Schema loaders
     * @private
     */
    private readonly schemaLoaders: SchemaLoader[];
    /**
     * Schema context
     * @private
     */
    private readonly schemaContext: string[];
    /**
     * Loader
     * @private
     */
    protected loader: DocumentLoaderFunction;
    /**
     * Schema loader
     * @private
     */
    private schemaLoader: SchemaLoaderFunction;

    constructor() {
        this.schemaContext = [];
        this.documentLoaders = [];
        this.schemaLoaders = [];
    }

    /**
     * Add Schema context
     *
     * @param {string} context - context
     *
     */
    public addContext(context: string): void {
        this.schemaContext.push(context);
    }

    /**
     * Add DID or Schema document loader
     *
     * @param {DocumentLoader} documentLoader - Document Loader
     *
     */
    public addDocumentLoader(documentLoader: DocumentLoader): void {
        this.documentLoaders.push(documentLoader);
    }

    /**
     * Build Document Loader
     * Builded loader is used to sign and verify documents
     */
    public buildDocumentLoader(): void {
        this.loader = DocumentLoader.build(this.documentLoaders);
    }

    /**
     * Add Schema loader
     *
     * @param {DocumentLoader} documentLoader - Document Loader
     *
     */
    public addSchemaLoader(schemaLoader: SchemaLoader): void {
        this.schemaLoaders.push(schemaLoader);
    }

    /**
     * Build Schema Loader
     * Builded loader is used to sign and verify documents
     */
    public buildSchemaLoader(): void {
        this.schemaLoader = SchemaLoader.build(this.schemaLoaders);
    }

    /**
     * Generate new UUIDv4
     *
     * @param {IDocumentOptions} documentOptions - Document Options
     */
    protected generateUUID(documentOptions?: IDocumentOptions): string {
        if (documentOptions && documentOptions.uuid) {
            return documentOptions.uuid;
        } else {
            return `urn:uuid:${GenerateUUIDv4()}`;
        }
    }

    /**
     * Verify VC Document
     *
     * @param {any} json - VC Document
     * @param {DocumentLoaderFunction} documentLoader - Document Loader
     *
     * @returns {boolean} - status
     */
    public async verify(json: any, documentLoader: DocumentLoaderFunction): Promise<boolean> {
        let result: vcLib.VerificationResult;
        const proof = Array.isArray(json?.proof) ? json.proof[0] : json?.proof;
        if (!proof || !proof.type) {
            throw new Error('Verification error: document is missing a proof');
        }
        if (proof.type === SignatureType.Ed25519Signature2018) {
            result = await vcLib.verifyCredential({
                credential: json,
                suite: [new Ed25519Signature2018()],
                documentLoader: this.ed25519VerificationDocumentLoader(documentLoader),
            });
        } else {
            result = await verifyV7(json, {
                purpose: new purposesV7.AssertionProofPurpose(),
                suite: [new BbsBlsSignature2020(), new BbsBlsSignatureProof2020()],
                documentLoader,
            });
        }
        if (result.verified) {
            return true;
        } else {
            if (result.results) {
                for (const element of result.results) {
                    if (!element.verified && element.error && element.error.message) {
                        throw new Error(element.error.message);
                    }
                }
            }
            throw new Error('Verification error');
        }
    }

    /**
     * Adapt a document loader for @digitalbazaar/ed25519-signature-2018 verification.
     *
     * The digitalbazaar suite requires the resolved verification method to carry the
     * suite context, and it authorizes the controller by absolute assertionMethod id.
     * Guardian DID documents declare only the did/v1 context and use relative
     * assertionMethod references, so this wrapper: serves the suite context, returns the
     * requested verification method as a key node carrying that context, and rewrites the
     * controller's relative assertionMethod references to absolute ids. Non-DID documents
     * and non-Ed25519 verification methods pass through unchanged, so the BBS path that
     * shares this loader is unaffected.
     *
     * @param {DocumentLoaderFunction} documentLoader - base document loader
     *
     * @returns {DocumentLoaderFunction} - wrapped document loader
     */
    private ed25519VerificationDocumentLoader(documentLoader: DocumentLoaderFunction): DocumentLoaderFunction {
        const contextUrl = Ed25519Signature2018.CONTEXT_URL;
        const context = Ed25519Signature2018.CONTEXT;
        return async (iri: string): Promise<IDocumentFormat> => {
            if (iri === contextUrl) {
                return { documentUrl: iri, document: context };
            }
            const result = await documentLoader(iri);
            const document = result?.document;
            if (document && Array.isArray(document.verificationMethod)) {
                if (iri.indexOf('#') !== -1) {
                    const method = document.verificationMethod.find((item: any) => item?.id === iri);
                    if (method && method.type === HederaEd25519Method.TYPE) {
                        return { documentUrl: iri, document: { '@context': contextUrl, ...method } };
                    }
                } else if (Array.isArray(document.assertionMethod)) {
                    const assertionMethod = document.assertionMethod.map((reference: any) =>
                        (typeof reference === 'string' && reference.startsWith('#'))
                            ? document.id + reference
                            : reference
                    );
                    return { documentUrl: iri, document: { ...document, assertionMethod } };
                }
            }
            return result;
        };
    }

    /**
     * Verify Schema
     *
     * @param {HcsVcDocument<VcSubject>} vcDocument - VC Document
     *
     * @returns {SchemaValidationResult} - is verified
     */
    public async verifySchema(vcDocument: VcDocument | any): Promise<SchemaValidationResult> {
        let vc: IVC;
        if (vcDocument && typeof vcDocument.toJsonTree === 'function') {
            vc = vcDocument.toJsonTree();
        } else {
            vc = vcDocument;
        }

        if (!vc.credentialSubject) {
            throw new Error('"credentialSubject" property is required.');
        }

        const vcObject = JSON.parse(JSON.stringify(vc));

        const subjects = vcObject.credentialSubject;
        const subject = Array.isArray(subjects) ? subjects[0] : subjects;

        if (!this.schemaLoader) {
            throw new Error('Schema Loader not found');
        }

        const loadedSchema = await this.schemaLoader(subject['@context'], subject.type, 'vc');

        if (!loadedSchema) {
            throw new Error('Schema not found');
        }

        // prepareSchema/coerceConditionConsts rewrite the document in place; the loader may
        // hand back a cached instance shared with other callers, so validate against a copy.
        const schema = JSON.parse(JSON.stringify(loadedSchema));

        const ajv = new Ajv({
            loadSchema: this.loadSchema
        });
        addFormats.default(ajv);

        this.prepareSchema(schema);
        this.coerceConditionConsts(schema);

        const schemaObject = Schema.fromVc(schema);

        ContextHelper.setContext(subject, schemaObject);

        const validate = await ajv.compileAsync(schema);
        const valid = validate(vcObject);
        let errors = this.enhanceConditionErrors(validate.errors as any[], schema);
        const geoErrors = validateGeoConsistency(subject, schemaObject?.fields || []);
        const groupErrors = validateArrayGroups(subject, schemaObject?.arrayDependencies || []);
        const conditionErrors = VCJS.conditionErrors(subject, schemaObject);
        errors = [...(errors || []), ...geoErrors, ...groupErrors, ...conditionErrors];

        return new SchemaValidationResult(
            valid && !geoErrors.length && !groupErrors.length && !conditionErrors.length,
            'JSON_SCHEMA_VALIDATION_ERROR',
            errors as any
        );
    }

    /**
     * Verify VC Document
     *
     * @param {HcsVcDocument<VcSubject>} vcDocument - VC Document
     *
     * @param loader
     * @returns {Promise<boolean>} - is verified
     */
    public async verifyVC(vcDocument: VcDocument | any, loader?: DocumentLoaderFunction): Promise<boolean> {
        let vc: IVC;
        if (vcDocument && typeof vcDocument.toJsonTree === 'function') {
            vc = vcDocument.toJsonTree();
        } else {
            vc = vcDocument;
        }
        if (!loader) {
            return await this.verify(vc, this.loader);
        } else {
            return await this.verify(vc, loader)
        }
    }

    /**
     * $ref sits directly on the property for objects, under `items` for arrays.
     *
     * @param prop Schema property
     * @returns Referenced $defs key, if any
     */
    private readRef(prop: any): string | undefined {
        return prop?.$ref ?? prop?.items?.$ref;
    }

    /**
     * Delete system fields from schema defs
     *
     * @param schema Schema
     */
    private prepareSchema(schema: any) {
        this.stripIfOnly(schema);
        this.stripTemplateFieldIds(schema);

        const defsObj = schema.$defs;
        if (!defsObj) {
            return;
        }

        const defsKeys = Object.keys(defsObj);
        for (const key of defsKeys) {
            const nestedSchema = defsObj[key];
            this.stripIfOnly(nestedSchema);
            const required = nestedSchema.required;
            if (!required || required.length === 0) {
                continue;
            }
            nestedSchema.required = required.filter((field: any) => !nestedSchema.properties[field] || !nestedSchema.properties[field].readOnly);
        }

        if (!Array.isArray(schema.allOf)) {
            return;
        }
        const rootProperties = schema.properties || {};

        // Collect fields to strip keyed by container dot-path (not by IRI).
        // Multiple conditions targeting the same container accumulate into one Set.
        const stripByPath = new Map<string, Set<string>>();

        const withRef = (prop: any, newRef: string): any => {
            if (prop?.$ref) { return { ...prop, $ref: newRef }; }
            if (prop?.items?.$ref) { return { ...prop, items: { ...prop.items, $ref: newRef } }; }
            return prop;
        };

        const collectPath = (constraint: any, pathSoFar: string[], currentProps: any) => {
            if (!constraint?.properties) { return; }
            for (const [propKey, val] of Object.entries(constraint.properties) as [string, any][]) {
                if (!val || typeof val !== 'object') { continue; }
                const ref = this.readRef(currentProps[propKey]);
                if (!ref || !defsObj[ref]) { continue; }
                const containerPath = [...pathSoFar, propKey];
                const pathKey = containerPath.join('.');
                if (Array.isArray(val.required)) {
                    if (!stripByPath.has(pathKey)) { stripByPath.set(pathKey, new Set()); }
                    for (const f of val.required) { stripByPath.get(pathKey)!.add(f); }
                }
                if (val.properties) {
                    for (const [fieldName, fieldVal] of Object.entries(val.properties) as [string, any][]) {
                        if (fieldVal === false) {
                            if (!stripByPath.has(pathKey)) { stripByPath.set(pathKey, new Set()); }
                            stripByPath.get(pathKey)!.add(fieldName);
                        }
                    }
                    collectPath(val, containerPath, defsObj[ref]?.properties || {});
                }
            }
        };

        for (const condEntry of schema.allOf) {
            if (!condEntry?.if) { continue; }
            for (const branch of [condEntry.then, condEntry.else]) {
                collectPath(branch, [], rootProperties);
            }
        }

        if (!stripByPath.size) { return; }

        // Pre-compute original IRIs for every path and its ancestors before any $ref rewrite.
        const originalIriByPath = new Map<string, string>();
        const computeOriginalIri = (pathArr: string[]): string | undefined => {
            let props = rootProperties;
            for (let i = 0; i < pathArr.length; i++) {
                const ref = this.readRef(props[pathArr[i]]);
                if (!ref || !defsObj[ref]) { return undefined; }
                if (i === pathArr.length - 1) { return ref; }
                props = defsObj[ref]?.properties || {};
            }
            return undefined;
        };

        // Include all ancestor paths so passthrough clones can be created for them.
        const allPathsNeeded = new Set<string>();
        for (const pathKey of stripByPath.keys()) {
            const parts = pathKey.split('.');
            for (let d = 1; d <= parts.length; d++) {
                allPathsNeeded.add(parts.slice(0, d).join('.'));
            }
        }
        for (const pathKey of allPathsNeeded) {
            const iri = computeOriginalIri(pathKey.split('.'));
            if (iri) { originalIriByPath.set(pathKey, iri); }
        }

        // Process shortest paths first so parent clones exist before children need them.
        const cloneKeys = new Map<string, string>();
        const sortedPaths = [...allPathsNeeded].sort(
            (a, b) => a.split('.').length - b.split('.').length
        );

        for (const pathKey of sortedPaths) {
            const iri = originalIriByPath.get(pathKey);
            if (!iri) { continue; }
            const pathArr = pathKey.split('.');
            const fieldsToStrip = stripByPath.get(pathKey);
            const cloneKey = `${iri}__${pathArr.join('__')}`;

            // Deep-copy original def so the shared entry is never mutated.
            const clone = JSON.parse(JSON.stringify(defsObj[iri]));
            // Give the clone a unique $id so AJV can resolve the rewritten $ref to
            // it, without conflicting with the original entry's $id anchor.
            clone.$id = cloneKey;
            delete clone.$anchor;
            delete clone.$dynamicAnchor;
            if (fieldsToStrip?.size && Array.isArray(clone.required)) {
                clone.required = clone.required.filter((r: string) => !fieldsToStrip.has(r));
                if (!clone.required.length) { delete clone.required; }
            }
            defsObj[cloneKey] = clone;
            cloneKeys.set(pathKey, cloneKey);

            // Rewrite the $ref on this specific container only.
            if (pathArr.length === 1) {
                if (rootProperties[pathArr[0]]) {
                    rootProperties[pathArr[0]] = withRef(rootProperties[pathArr[0]], cloneKey);
                }
            } else {
                const parentPathKey = pathArr.slice(0, -1).join('.');
                const parentCloneKey = cloneKeys.get(parentPathKey);
                const leafProp = pathArr[pathArr.length - 1];
                if (parentCloneKey && defsObj[parentCloneKey]?.properties?.[leafProp]) {
                    defsObj[parentCloneKey].properties[leafProp] = withRef(
                        defsObj[parentCloneKey].properties[leafProp],
                        cloneKey
                    );
                }
            }
        }
    }

    /**
     * Remove the schema-editor-only `templateFieldId` annotation from every property.
     *
     * @param schema Schema
     */
    private stripTemplateFieldIds(schema: any) {
        const stripProperties = (properties: any) => {
            if (!properties || typeof properties !== 'object') {
                return;
            }
            for (const property of Object.values<any>(properties)) {
                if (!property || typeof property !== 'object') {
                    continue;
                }

                delete property.templateFieldId;

                if (property.properties) {
                    stripProperties(property.properties);
                }
                if (property.items?.properties) {
                    stripProperties(property.items.properties);
                }
            }
        };

        stripProperties(schema?.properties);
        if (schema?.$defs) {
            for (const nestedSchema of Object.values<any>(schema.$defs)) {
                stripProperties(nestedSchema?.properties);
            }
        }
    }

    private stripIfOnly(schema: any) {
        if (!Array.isArray(schema?.allOf)) {
            return;
        }
        schema.allOf = schema.allOf.filter(
            (entry: any) => !entry?.if || entry.then !== undefined || entry.else !== undefined
        );
        if (schema.allOf.length === 0) {
            delete schema.allOf;
        }
    }

    /**
     * Converts the nested JSON Schema `if` node into a readable condition string
     */
    private describeIfCondition(node: any): string {
        if (!node) { return ''; }
        if (Array.isArray(node.anyOf)) {
            return node.anyOf.map((b: any) => this.describeIfCondition(b)).filter(Boolean).join(' OR ');
        }
        if (Array.isArray(node.allOf)) {
            return node.allOf.map((b: any) => this.describeIfCondition(b)).filter(Boolean).join(' AND ');
        }
        if (node.properties) {
            return Object.entries(node.properties as Record<string, any>)
                .map(([key, val]) => this.describeIfConditionLeaf(val, key))
                .filter(Boolean)
                .join(', ');
        }
        return '';
    }

    private describeIfConditionLeaf(node: any, leafKey: string): string {
        if (!node) { return ''; }
        if (node.const !== undefined) {
            return `${leafKey} = '${node.const}'`;
        }
        if (node.properties) {
            return Object.entries(node.properties as Record<string, any>)
                .map(([key, val]) => this.describeIfConditionLeaf(val, key))
                .filter(Boolean)
                .join(', ');
        }
        if (Array.isArray(node.anyOf)) {
            return node.anyOf.map((b: any) => this.describeIfConditionLeaf(b, leafKey)).filter(Boolean).join(' OR ');
        }
        if (Array.isArray(node.allOf)) {
            return node.allOf.map((b: any) => this.describeIfConditionLeaf(b, leafKey)).filter(Boolean).join(' AND ');
        }
        return '';
    }

    private coerceConditionConsts(schema: any): void {
        const rootDefs = schema.$defs || {};

        const coerceConst = (value: any, type: string): any => {
            if (type === 'number' || type === 'integer') {
                const n = Number(value);
                return isNaN(n) ? value : n;
            }
            if (type === 'boolean') {
                if (typeof value === 'boolean') { return value; }
                const s = String(value).trim().toLowerCase();
                if (s === 'true' || s === '1') { return true; }
                if (s === 'false' || s === '0') { return false; }
                return value;
            }
            if (type === 'string' && value !== null && value !== undefined) {
                return String(value);
            }
            return value;
        };

        // Mirrors describeIfConditionLeaf's shape: const, nested container, or anyOf/allOf of either.
        const coerceValueNode = (val: any, contextProp: any, context: any): void => {
            if (!val || typeof val !== 'object') { return; }
            if ('const' in val) {
                const type = contextProp?.type === 'array'
                    ? contextProp?.items?.type
                    : contextProp?.type;
                if (type) { val.const = coerceConst(val.const, type); }
                return;
            }
            if (val.properties) {
                const ref = this.readRef(contextProp);
                const subContext = ref ? (context.$defs?.[ref] ?? rootDefs[ref]) : null;
                if (subContext) { walkIfNode(val, subContext); }
                return;
            }
            if (Array.isArray(val.anyOf)) {
                for (const branch of val.anyOf) { coerceValueNode(branch, contextProp, context); }
            }
            if (Array.isArray(val.allOf)) {
                for (const branch of val.allOf) { coerceValueNode(branch, contextProp, context); }
            }
        };

        const walkIfNode = (node: any, context: any): void => {
            if (!node || typeof node !== 'object') { return; }
            // allOf/anyOf may both be present on a node, so neither branch may return early.
            if (Array.isArray(node.allOf)) {
                for (const child of node.allOf) { walkIfNode(child, context); }
            }
            if (Array.isArray(node.anyOf)) {
                for (const child of node.anyOf) { walkIfNode(child, context); }
            }
            if (!node.properties) { return; }
            for (const [key, val] of Object.entries(node.properties) as [string, any][]) {
                coerceValueNode(val, context?.properties?.[key], context);
            }
        };

        const walkAllOf = (s: any, context: any): void => {
            if (!Array.isArray(s?.allOf)) { return; }
            for (const entry of s.allOf) {
                if (entry?.if) { walkIfNode(entry.if, context); }
            }
        };

        walkAllOf(schema, schema);
        for (const def of Object.values(rootDefs) as any[]) {
            if (def && typeof def === 'object') { walkAllOf(def, def); }
        }
    }

    private enhanceConditionErrors(errors: any[] | null | undefined, schema: any): any[] | null | undefined {
        if (!errors?.length) { return errors; }
        // Condition owner/index live in schemaPath (base "#..." is the $defs entry's own $id, never a literal "/$defs/").
        const defs = schema.$defs ?? {};
        return errors.map(error => {
            if (error.keyword !== 'false schema') { return error; }
            const match = (error.schemaPath as string)
                ?.match(/^(#[^/]*)\/allOf\/(\d+)\/(then|else)\//);
            if (!match) { return error; }
            const [, base, idx] = match;
            const owner = base === '#' ? schema : (defs[base] ?? schema);
            if (!Array.isArray(owner?.allOf)) { return error; }
            const condEntry = owner.allOf[parseInt(idx, 10)];
            if (!condEntry?.if) { return error; }
            const fieldName = (error.instancePath as string).split('/').filter(Boolean).pop() || 'field';
            const condition = this.describeIfCondition(condEntry.if) || 'condition not met';
            return {
                ...error,
                message: `Field '${fieldName}' is not allowed unless: ${condition}`,
            };
        });
    }

    /**
     * Verify Subject
     *
     * @param {any} subject - subject
     *
     * @returns {SchemaValidationResult} - is verified
     */
    public async verifySubject(subject: any): Promise<SchemaValidationResult> {
        if (!this.schemaLoader) {
            throw new Error('Schema Loader not found');
        }

        const loadedSchema = await this.schemaLoader(subject['@context'], subject.type, 'subject');

        if (!loadedSchema) {
            throw new Error('Schema not found');
        }

        // prepareSchema/coerceConditionConsts rewrite the document in place; the loader may
        // hand back a cached instance shared with other callers, so validate against a copy.
        const schema = JSON.parse(JSON.stringify(loadedSchema));

        const ajv = new Ajv({
            loadSchema: this.loadSchema
        });
        addFormats.default(ajv);

        this.prepareSchema(schema);
        this.coerceConditionConsts(schema);

        const schemaObject = Schema.fromVc(schema);

        const validate = await ajv.compileAsync(schema);
        const valid = validate(subject);
        let errors = this.enhanceConditionErrors(validate.errors as any[], schema);
        const geoErrors = validateGeoConsistency(subject, schemaObject?.fields || []);
        const groupErrors = validateArrayGroups(subject, this.readArrayDependencies(schema));
        const conditionErrors = VCJS.conditionErrors(subject, schemaObject);
        errors = [...(errors || []), ...geoErrors, ...groupErrors, ...conditionErrors];

        return new SchemaValidationResult(
            valid && !geoErrors.length && !groupErrors.length && !conditionErrors.length,
            'JSON_SCHEMA_VALIDATION_ERROR',
            errors as any
        );
    }

    /**
     * Validate the fields a schema's conditions reveal.
     *
     * The schema document declares each branch but does not mark its fields required:
     * JSON Schema applies `else` whenever `if` fails, including when the field the `if`
     * reads was never asked, which would demand fields the form never showed. Those rules
     * are enforced here instead, in the same shape ajv reports.
     *
     * `schemaObject.conditions` only holds the root document's own conditions — a `$ref`
     * field's sub-schema keeps its own conditions on `field.conditions`, so they are walked
     * here as well, recursively, against the matching slice of the submitted data.
     * @param subject credential subject
     * @param schemaObject parsed schema
     */
    private static conditionErrors(subject: any, schemaObject: Schema): ArrayGroupValidationError[] {
        const out: ArrayGroupValidationError[] = [];
        VCJS.pushConditionErrors(schemaObject?.conditions || [], subject, '', out);
        VCJS.collectNestedConditionErrors(schemaObject?.fields || [], subject, '', out);
        return out;
    }

    /**
     * Recurse into `$ref` fields to validate the conditions declared inside their own
     * sub-schemas, which `schemaObject.conditions` never sees.
     * @param fields fields of the (sub-)schema currently being walked
     * @param data matching slice of the submitted data
     * @param path JSON-pointer path to `data`, for error reporting
     * @param out accumulator for produced errors
     */
    private static collectNestedConditionErrors(
        fields: SchemaField[],
        data: any,
        path: string,
        out: ArrayGroupValidationError[]
    ): void {
        if (!Array.isArray(fields) || !data || typeof data !== 'object') {
            return;
        }
        for (const field of fields) {
            if (!field?.isRef) {
                continue;
            }
            const value = data[field.name];
            const entries: { entry: any; entryPath: string }[] = field.isArray
                ? (Array.isArray(value) ? value : []).map((entry: any, index: number) => ({
                    entry,
                    entryPath: `${path}/${field.name}/${index}`,
                }))
                : [{ entry: value, entryPath: `${path}/${field.name}` }];

            for (const { entry, entryPath } of entries) {
                if (!entry || typeof entry !== 'object') {
                    continue;
                }
                VCJS.pushConditionErrors(field.conditions || [], entry, entryPath, out);
                VCJS.collectNestedConditionErrors(field.fields || [], entry, entryPath, out);
            }
        }
    }

    /**
     * Run `validateConditionFields` for one (sub-)schema's conditions and append the
     * results, in the shape ajv reports, to `out`.
     * @param conditions conditions of the (sub-)schema being validated
     * @param data matching slice of the submitted data
     * @param instancePath JSON-pointer path to `data`
     * @param out accumulator for produced errors
     */
    private static pushConditionErrors(
        conditions: any[],
        data: any,
        instancePath: string,
        out: ArrayGroupValidationError[]
    ): void {
        for (const message of SchemaHelper.validateConditionFields(conditions, data)) {
            out.push({
                instancePath,
                schemaPath: '#/allOf',
                message,
                keyword: 'conditionFields' as any,
                params: {} as Record<string, never>,
            });
        }
    }

    /**
     * Read array dependencies from the loaded schema document
     * @param schema
     */
    private readArrayDependencies(schema: any): ISchemaArrayDependency[] {
        try {
            const { arrayDependencies } = SchemaHelper.parseSchemaComment(schema?.$comment);
            return Array.isArray(arrayDependencies) ? arrayDependencies : [];
        } catch (error) {
            return [];
        }
    }

    /**
     * Add Context
     *
     * @param {any} subject - subject
     * @param {any} context - new context
     * @returns {any} - subject
     */
    public addContextInSubject(subject: any, context: string): any {
        if (subject['@context']) {
            if (Array.isArray(subject['@context'])) {
                subject['@context'].push(context);
            } else {
                subject['@context'] = [subject['@context'], context];
            }
        } else {
            subject['@context'] = [context];
        }
        return subject
    }

    /**
     * Add Context
     *
     * @param {any} subject - subject
     * @returns {any} - subject
     */
    public addDryRunContext(subject: any, context?: string[]): any {
        if (!subject || typeof subject !== 'object') {
            return subject;
        }

        if (Array.isArray(subject)) {
            for (const subjectItem of subject) {
                this.addDryRunContext(subjectItem, context);
            }
            return subject;
        }

        if (!subject.type) {
            return subject;
        }

        subject['@context'] = context || [`schema:${subject.type}`];

        for (const value of Object.values(subject)) {
            this.addDryRunContext(value, subject['@context']);
        }

        return subject;
    }

    /**
     * Load schema by URI
     * @param uri URI
     * @returns Schema
     */
    public async loadSchema(uri: string) {
        try {
            let response: any;
            if (uri.startsWith(IPFS.IPFS_PROTOCOL)) {
                const cidMatches = uri.match(IPFS.CID_PATTERN);
                response = JSON.parse(
                    Buffer.from(
                        await IPFS.getFile(
                            (cidMatches && cidMatches[0]) || '',
                            'raw',
                            IPFS.DEFAULT_OPTIONS
                        )
                    ).toString()
                );
            } else {
                response = (await axios.get(uri)).data;
            }
            return response;
        } catch (err) {
            throw new Error('Can not resolve reference: ' + uri);
        }
    }

    /**
     * Create Ed25519 Suite by DID
     *
     * @param {any} verificationMethod - Verification Method
     *
     * @returns {Ed25519Signature2018} - Ed25519Signature2018
     */
    public async createEd25519Suite(verificationMethod: KeyPairOptions): Promise<Ed25519Signature2018> {
        const key = await Ed25519VerificationKey2018.from(verificationMethod);
        return new Ed25519Signature2018({ key });
    }

    /**
     * Create BBS Suite by DID
     *
     * @param {any} verificationMethod - Verification Method
     *
     * @returns {BbsBlsSignature2020} - BbsBlsSignature2020
     */
    public async createBBSSuite(verificationMethod: KeyPairOptions): Promise<BbsBlsSignature2020> {
        const key = await Bls12381G2KeyPair.from(verificationMethod);
        return new BbsBlsSignature2020({ key });
    }

    /**
     * Issue VC Document
     *
     * @param {HcsVcDocument<T>} vcDocument - VC Document
     * @param {Ed25519Signature2018} suite - suite
     * @param {DocumentLoaderFunction} documentLoader - Document Loader
     *
     * @returns {HcsVcDocument<T>} - VC Document
     */
    public async issue(
        vcDocument: VcDocument,
        suite: Ed25519Signature2018 | BbsBlsSignature2020,
        documentLoader: DocumentLoaderFunction
    ): Promise<VcDocument> {
        const vc: any = vcDocument.getDocument();
        ContextHelper.clearContext(vc);
        let verifiableCredential: any;
        if (suite instanceof BbsBlsSignature2020) {
            // BbsBlsSignature2020 must be signed with the v7 driver; @digitalbazaar/vc's
            // issue() (jsonld-signatures@11) calls APIs the v7-era suite does not implement.
            verifiableCredential = await signV7(vc, {
                suite,
                purpose: new purposesV7.AssertionProofPurpose(),
                documentLoader,
            });
            if (verifiableCredential.proof?.type) {
                verifiableCredential.proof.type = SignatureType.BbsBlsSignature2020;
            }
        } else {
            verifiableCredential = await vcLib.issue({
                credential: vc,
                suite,
                documentLoader,
            });
        }
        vcDocument.proofFromJson(verifiableCredential);
        return vcDocument;
    }

    /**
     * Issue VP Document
     *
     * @param {HcsVpDocument} vpDocument - VP Document
     * @param {Ed25519Signature2018} suite - suite
     * @param {DocumentLoaderFunction} documentLoader - Document Loader
     *
     * @returns {HcsVpDocument} - VP Document
     */
    public async issuePresentation(
        vpDocument: VpDocument,
        suite: Ed25519Signature2018,
        documentLoader: DocumentLoaderFunction
    ): Promise<VpDocument> {
        // signPresentation attaches a proof to an already-formed VP; it does not build one.
        const vp = vpDocument.toJsonTree();
        const verifiablePresentation = await vcLib.signPresentation({
            presentation: vp,
            challenge: '123',
            suite,
            documentLoader,
        });
        vpDocument.proofFromJson(verifiablePresentation);
        return vpDocument;
    }

    /**
     * Create Suite by Method
     *
     * @param {SignatureType} type - Signature type
     *
     * @returns {Ed25519Signature2018 | BbsBlsSignature2020} - Ed25519Signature2018 | BbsBlsSignature2020
     */
    public async createSuiteByMethod(
        didDocument: CommonDidDocument,
        type: SignatureType
    ): Promise<Ed25519Signature2018 | BbsBlsSignature2020> {
        switch (type) {
            case SignatureType.BbsBlsSignature2020: {
                const verificationMethod = didDocument.getMethodByType(HederaBBSMethod.TYPE);
                if (!verificationMethod) {
                    throw new Error('Verification method not found.');
                }
                if (!verificationMethod.hasPrivateKey()) {
                    throw new Error('Private key not found.');
                }
                const option: any = verificationMethod.toObject(true);
                return this.createBBSSuite(option);
            }
            default: {
                const verificationMethod = didDocument.getMethodByType(HederaEd25519Method.TYPE);
                if (!verificationMethod) {
                    throw new Error('Verification method not found.');
                }
                if (!verificationMethod.hasPrivateKey()) {
                    throw new Error('Private key not found.');
                }
                const option: any = verificationMethod.toObject(true);
                return this.createEd25519Suite(option);
            }
        }
    }

    /**
     * Generate verification method by Hedera key
     *
     * @param {ISuiteOptions} suiteOptions - Suite Options (DID, Private Key, Signature Type)
     *
     * @returns {HederaDidDocument} - DID Document
     */
    public async generateDid(suiteOptions: ISuiteOptions): Promise<HederaDidDocument> {
        return await HederaDidDocument.generateByDid(suiteOptions.did, suiteOptions.key);
    }

    /**
     * Create VC Document
     *
     * @param {ICredentialSubject} subject - Credential Object
     * @param {CommonDidDocument} didDocument - DID Document
     * @param {SignatureType} signatureType - Signature type (Ed25519Signature2018, BbsBlsSignature2020)
     * @param {IDocumentOptions} [documentOptions] - Document Options (UUID, Group)
     *
     * @returns {VcDocument} - VC Document
     */
    public async createVerifiableCredential(
        subject: ICredentialSubject,
        didDocument: CommonDidDocument,
        signatureType: SignatureType,
        documentOptions?: IDocumentOptions
    ): Promise<VcDocument> {
        const vcSubject = VcSubject.create(subject);
        const vc = new VcDocument(signatureType);
        vc.addCredentialSubject(vcSubject);
        vc.addContexts(subject['@context']);
        vc.addContexts(this.schemaContext);
        if (documentOptions && documentOptions.group) {
            vc.setIssuer(new Issuer(didDocument.getDid(), documentOptions.group.groupId));
            vc.addType(documentOptions.group.type);
            vc.addContext(documentOptions.group.context);
        } else {
            vc.setIssuer(new Issuer(didDocument.getDid()));
        }
        if (documentOptions?.evidenceContext) {
            vc.addContext(documentOptions.evidenceContext);
        }
        if (documentOptions?.evidence?.length) {
            for (const entry of documentOptions.evidence) {
                vc.addEvidence(entry);
            }
        }
        return await this.issueVerifiableCredential(vc, didDocument, signatureType, documentOptions);
    }

    /**
     * Create VC Document
     *
     * @param {VcDocument} verifiableCredential - VC Document
     * @param {CommonDidDocument} didDocument - DID Document
     * @param {SignatureType} signatureType - Signature type (Ed25519Signature2018, BbsBlsSignature2020)
     * @param {IDocumentOptions} [documentOptions] - Document Options (UUID, Group)
     *
     * @returns {VcDocument} - VC Document
     */
    public async issueVerifiableCredential(
        verifiableCredential: VcDocument,
        didDocument: CommonDidDocument,
        signatureType: SignatureType,
        documentOptions?: IDocumentOptions
    ): Promise<VcDocument> {
        const id = this.generateUUID(documentOptions);
        const suite = await this.createSuiteByMethod(didDocument, signatureType);
        verifiableCredential.setId(id);
        verifiableCredential.setIssuanceDate(TimestampUtils.now());
        verifiableCredential.setProof(null);
        return await this.issue(verifiableCredential, suite, this.loader);
    }

    /**
     * Create VP Document
     *
     * @param {VcDocument[]} vcs - VC Documents
     * @param {ISuiteOptions} suiteOptions - Suite Options (Issuer, Private Key)
     * @param {IDocumentOptions} [documentOptions] - Document Options (UUID, Group)
     *
     * @returns {VpDocument} - VP Document
     */
    public async createVerifiablePresentation(
        vcs: VcDocument[],
        didDocument: CommonDidDocument,
        signatureType: SignatureType,
        documentOptions?: IDocumentOptions
    ): Promise<VpDocument> {
        const id: string = this.generateUUID(documentOptions);
        const suite = await this.createSuiteByMethod(didDocument, SignatureType.Ed25519Signature2018) as Ed25519Signature2018;
        const vp = new VpDocument();
        vp.setId(id);
        vp.addVerifiableCredentials(vcs);
        return await this.issuePresentation(vp, suite, this.loader);
    }
}
