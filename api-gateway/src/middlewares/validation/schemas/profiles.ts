import { ApiProperty, getSchemaPath } from '@nestjs/swagger';

export class SubjectDTO {
    @ApiProperty({ type: 'string', isArray: true, nullable: true })
    '@context'?: string | string[];

    @ApiProperty({ type: 'string', nullable: true, required: false })
    id?: string;

    @ApiProperty({ type: 'string', nullable: true, required: false })
    type?: string;

    [key: string]: any;
}

export class DidKeyDTO {
    @ApiProperty({ type: 'string', nullable: false, required: true })
    id: string;

    @ApiProperty({ type: 'string', nullable: false, required: true })
    key: string;
}

export class DidDocumentDTO {
    @ApiProperty({ type: 'string', nullable: false, required: true })
    id: string;

    @ApiProperty({ type: 'string', isArray: true, nullable: true })
    '@context'?: string | string[];

    @ApiProperty({ type: 'string', isArray: true, nullable: true })
    alsoKnownAs?: string[];

    @ApiProperty({ type: 'string', isArray: true, nullable: true })
    controller?: string | string[];

    @ApiProperty({
        type: 'object',
        additionalProperties: true,
        isArray: true,
        nullable: true
    })
    verificationMethod?: any[];

    @ApiProperty({
        type: 'object',
        additionalProperties: true,
        isArray: true,
        nullable: true
    })
    authentication?: (any | string)[];

    @ApiProperty({
        type: 'object',
        additionalProperties: true,
        isArray: true,
        nullable: true
    })
    assertionMethod?: (any | string)[];

    @ApiProperty({
        type: 'object',
        additionalProperties: true,
        isArray: true,
        nullable: true
    })
    keyAgreement?: (any | string)[];

    @ApiProperty({
        type: 'object',
        additionalProperties: true,
        isArray: true,
        nullable: true
    })
    capabilityInvocation?: (any | string)[];

    @ApiProperty({
        type: 'object',
        additionalProperties: true,
        isArray: true,
        nullable: true
    })
    capabilityDelegation?: (any | string)[];

    @ApiProperty({
        type: 'object',
        additionalProperties: true,
        isArray: true,
        nullable: true
    })
    service?: any[];
}

export class DidDocumentWithKeyDTO {
    @ApiProperty({ nullable: false, required: true, type: () => DidDocumentDTO })
    document: DidDocumentDTO;

    @ApiProperty({ isArray: true, nullable: false, required: true, type: () => DidKeyDTO })
    keys: DidKeyDTO[];
}

/** One verification method entry (name + id) under `keys` in `DidDocumentStatusDTO`. */
export class DidVerificationMethodEntryDTO {
    @ApiProperty({ description: 'Fragment/name reference (e.g. `#did-root-key`).' })
    name: string;

    @ApiProperty({ description: 'Full verification method id URI.' })
    id: string;
}

export class DidDocumentStatusDTO {
    @ApiProperty({ type: 'boolean', nullable: false, required: true })
    valid: boolean;

    @ApiProperty({
        type: 'string',
        nullable: true,
        required: true,
        description: 'Error message when `valid` is false; empty string when valid.'
    })
    error: string;

    @ApiProperty({
        type: 'object',
        nullable: false,
        description:
            'Verification methods grouped by key type (e.g. Ed25519VerificationKey2018, Bls12381G2Key2020). Matches runtime `keys` in the guardian response.',
        additionalProperties: {
            type: 'array',
            items: { $ref: getSchemaPath(DidVerificationMethodEntryDTO) }
        }
    })
    keys: { [methodType: string]: DidVerificationMethodEntryDTO[] };
}

export class DidKeyStatusDTO {
    @ApiProperty({ type: 'string', nullable: false, required: true })
    id: string;

    @ApiProperty({ type: 'string', nullable: false, required: true })
    key: string;

    @ApiProperty({ type: 'boolean', nullable: false, required: true })
    valid: boolean;
}

/** Fireblocks signing configuration when `useFireblocksSigning` is true. */
export class FireblocksConfigDTO {
    @ApiProperty({ type: 'string', required: false, example: '' })
    fireBlocksVaultId?: string;

    @ApiProperty({ type: 'string', required: false, example: '' })
    fireBlocksAssetId?: string;

    @ApiProperty({ type: 'string', required: false, example: '' })
    fireBlocksApiKey?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        example: '',
        description: 'API property name is `fireBlocksPrivateiKey` (typo preserved for compatibility).'
    })
    fireBlocksPrivateiKey?: string;
}

/**
 * Body for connecting Hedera credentials / publishing DID–VC (PUT profile).
 * Many fields are optional depending on role and local vs remote flow.
 */
export class CredentialsDTO {
    @ApiProperty({
        type: 'string',
        required: false,
        description: 'Schema entity label; often inferred from the user role when omitted.'
    })
    entity?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        description: 'Hedera topic id (e.g. restore / profile flows).',
        example: '0.0.7813042'
    })
    topicId?: string;

    @ApiProperty({ type: 'string', nullable: false, required: true })
    hederaAccountId: string;

    @ApiProperty({
        type: 'string',
        nullable: true,
        required: false,
        description: 'Hedera private key (local signing). May be omitted for some remote flows.'
    })
    hederaAccountKey?: string;

    @ApiProperty({ type: 'string', nullable: true, required: false })
    parent?: string;

    @ApiProperty({
        nullable: true,
        required: false,
        type: () => SubjectDTO,
        description: 'VC credential subject fields (e.g. OrganizationName, Website, Tags) for Standard Registry.'
    })
    vcDocument?: SubjectDTO;

    @ApiProperty({
        nullable: true,
        required: false,
        type: () => DidDocumentDTO,
        description: 'DID document to publish, or null to skip in this request.'
    })
    didDocument?: DidDocumentDTO | null;

    @ApiProperty({ isArray: true, nullable: true, required: false, type: () => DidKeyDTO })
    didKeys?: DidKeyDTO[];

    @ApiProperty({ type: 'boolean', required: false, example: false })
    useFireblocksSigning?: boolean;

    @ApiProperty({ required: false, type: () => FireblocksConfigDTO })
    fireblocksConfig?: FireblocksConfigDTO;
}