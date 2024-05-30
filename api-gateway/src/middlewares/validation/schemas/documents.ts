import { ApiProperty } from '@nestjs/swagger';

export class VCDocumentDTO {
    @ApiProperty({ type: 'string', nullable: false })
    id?: string;

    @ApiProperty({ type: 'string', isArray: true, required: true })
    '@context': string | string[];

    @ApiProperty({ type: 'string', isArray: true, required: true })
    type: string[];

    @ApiProperty({ type: 'object', isArray: true, required: true })
    credentialSubject: any | any[];

    @ApiProperty({ type: 'object', required: true })
    issuer: any | string;

    @ApiProperty({ type: 'string', required: true })
    issuanceDate: string;

    @ApiProperty({ type: 'object', nullable: true })
    proof?: any;
}

export class ExternalDocumentDTO {
    @ApiProperty({ required: true })
    owner: string;

    @ApiProperty({ required: true })
    policyTag: string;

    @ApiProperty({ nullable: false, required: true, type: () => VCDocumentDTO })
    document: VCDocumentDTO;
}