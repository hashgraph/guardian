import { ApiProperty } from '@nestjs/swagger';

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
    context?: string | string[];

    @ApiProperty({ type: 'string', isArray: true, nullable: true })
    alsoKnownAs?: string[];

    @ApiProperty({ type: 'string', isArray: true, nullable: true })
    controller?: string | string[];

    @ApiProperty({ type: 'object', isArray: true, nullable: true })
    verificationMethod?: any[];

    @ApiProperty({ type: 'object', isArray: true, nullable: true })
    authentication?: (any | string)[];

    @ApiProperty({ type: 'object', isArray: true, nullable: true })
    assertionMethod?: (any | string)[];

    @ApiProperty({ type: 'object', isArray: true, nullable: true })
    keyAgreement?: (any | string)[];

    @ApiProperty({ type: 'object', isArray: true, nullable: true })
    capabilityInvocation?: (any | string)[];

    @ApiProperty({ type: 'object', isArray: true, nullable: true })
    capabilityDelegation?: (any | string)[];

    @ApiProperty({ type: 'object', isArray: true, nullable: true })
    service?: any[];
}

export class DidDocumentWithKeyDTO {
    @ApiProperty({ nullable: false, required: true, type: () => DidDocumentDTO })
    document: DidDocumentDTO;

    @ApiProperty({ isArray: true, nullable: false, required: true, type: () => DidKeyDTO })
    keys: DidKeyDTO[];
}

export class DidDocumentStatusDTO {
    @ApiProperty({ type: 'boolean', nullable: false, required: true })
    valid: boolean;

    @ApiProperty({ type: 'string', nullable: true, required: true })
    error: string;

    @ApiProperty({ type: 'object', nullable: false, required: true })
    didDocument: { [methodType: string]: DidKeyDTO[] };
}

export class DidKeyStatusDTO {
    @ApiProperty({ type: 'string', nullable: false, required: true })
    id: string;

    @ApiProperty({ type: 'string', nullable: false, required: true })
    key: string;

    @ApiProperty({ type: 'boolean', nullable: false, required: true })
    valid: boolean;
}

export class ProfileDTO {
    @ApiProperty({ type: 'string', nullable: false, required: true })
    username: string;

    @ApiProperty({ type: 'string', nullable: false, required: true })
    role: string;

    @ApiProperty({ type: 'string', nullable: true, required: false })
    did?: string;

    @ApiProperty({ type: 'string', nullable: true, required: false })
    parent?: string;

    @ApiProperty({ type: 'string', nullable: true, required: false })
    hederaAccountId?: string;

    @ApiProperty({ type: 'boolean', nullable: true, required: false })
    confirmed?: boolean;

    @ApiProperty({ type: 'boolean', nullable: true, required: false })
    failed?: boolean;

    @ApiProperty({ type: 'string', nullable: true, required: false })
    topicId?: string;

    @ApiProperty({ type: 'string', nullable: true, required: false })
    parentTopicId?: string;

    @ApiProperty({ type: 'object', nullable: true, required: false })
    didDocument?: any;

    @ApiProperty({ type: 'object', nullable: true, required: false })
    vcDocument?: any;
}

export class CredentialsDTO {
    @ApiProperty({ type: 'string', nullable: false, required: true })
    entity: string;

    @ApiProperty({ type: 'string', nullable: false, required: true })
    hederaAccountId: string;

    @ApiProperty({ type: 'string', nullable: false, required: true })
    hederaAccountKey: string;

    @ApiProperty({ type: 'string', nullable: true, required: false })
    parent?: string;

    @ApiProperty({ nullable: true, required: false, type: () => SubjectDTO })
    vcDocument?: SubjectDTO;

    @ApiProperty({ nullable: true, required: false, type: () => DidDocumentDTO })
    didDocument?: DidDocumentDTO;

    @ApiProperty({ isArray: true, nullable: true, required: false, type: () => DidKeyDTO })
    didKeys?: DidKeyDTO[];
}