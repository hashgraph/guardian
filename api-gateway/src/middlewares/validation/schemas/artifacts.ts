import { ApiProperty } from '@nestjs/swagger';

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
