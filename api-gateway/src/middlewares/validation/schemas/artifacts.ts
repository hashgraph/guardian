import { ApiProperty } from '@nestjs/swagger';
import { Examples } from '../examples.js';

export class UpsertFileResponseDTO {
    @ApiProperty({ description: 'File identifier', example: '67b8f31d2a26f8be2a9f0be9' })
    fileId: string;

    @ApiProperty({ description: 'Saved file name', example: 'file' })
    filename: string;

    @ApiProperty({ description: 'Saved file content type', example: 'application/json' })
    contentType: string;
}

export class UploadArtifactsDTO {
    @ApiProperty({
        type: 'string',
        format: 'binary',
        isArray: true,
        description: 'Artifact files'
    })
    artifacts: any[];
}

export class ArtifactDTOItem {
    @ApiProperty({
        type: String,
        example: '2026-03-19T11:23:34.247Z'
    })
    createDate: string;

    @ApiProperty({
        type: String,
        example: '2026-03-19T11:23:34.247Z'
    })
    updateDate: string;

    @ApiProperty({
        type: String,
        example: Examples.UUID
    })
    uuid: string;

    @ApiProperty({
        type: String,
        example: Examples.DB_ID
    })
    policyId: string;

    @ApiProperty({
        type: String,
        example: 'country_emission_factors'
    })
    name: string;

    @ApiProperty({
        type: String,
        enum: ['JSON', 'Executable Code'],
        example: 'JSON'
    })
    type: string;

    @ApiProperty({
        type: String,
        example: Examples.DID
    })
    owner: string;

    @ApiProperty({
        type: String,
        example: 'json'
    })
    extention: string;

    @ApiProperty({
        type: String,
        enum: ['policy', 'tool'],
        required: false,
        example: 'policy'
    })
    category?: string;

    @ApiProperty({
        type: String,
        required: false,
        example: Examples.DID
    })
    creator?: string;

   @ApiProperty({
        type: String,
        example: Examples.DB_ID
    })
    id: string;
}
