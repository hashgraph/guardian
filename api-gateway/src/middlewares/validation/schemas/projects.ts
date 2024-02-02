import { ApiProperty } from '@nestjs/swagger';

export class ProjectDTO {
    @ApiProperty()
    id: string;

    @ApiProperty()
    policyId: string;

    @ApiProperty()
    policyName: string;

    @ApiProperty()
    registered: string;

    @ApiProperty()
    title: string;

    @ApiProperty()
    companyName: string;

    @ApiProperty()
    sectoralScope: string;
}

export class PropertiesDTO {
    @ApiProperty()
    id: string;

    @ApiProperty()
    title: string;

    @ApiProperty()
    value: string;
}
