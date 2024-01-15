import { ApiProperty } from '@nestjs/swagger';

export class PolicyCategoryDTO {
    @ApiProperty()
    id: string;

    @ApiProperty()
    name: string;

    @ApiProperty()
    type: string;
}
