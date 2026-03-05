import { ApiProperty } from '@nestjs/swagger';

export class UpsertFileResponseDTO {
    @ApiProperty({ description: 'File identifier', example: '67b8f31d2a26f8be2a9f0be9' })
    fileId: string;
}

export class ArtifactDTOItem {
    @ApiProperty()
    id: string;

    @ApiProperty()
    name: string;

    @ApiProperty()
    uuid: string;

    @ApiProperty()
    extention: string;

    @ApiProperty()
    type: string;
}
