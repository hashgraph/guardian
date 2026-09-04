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

    @ApiProperty({
        description: 'IWA dMRV specification version this property belongs to',
        example: '3.0.0',
        required: false
    })
    iwaVersion?: string;

    @ApiProperty({
        description: 'What this property means, sourced from the IWA dMRV specification. Empty for IWA v1 properties.',
        required: false
    })
    description?: string;
}
