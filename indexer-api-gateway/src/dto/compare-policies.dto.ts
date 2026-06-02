import { ApiProperty } from "@nestjs/swagger";
import { IsObject } from "class-validator";

export class ComparePoliciesDTO {
    @ApiProperty()
    @IsObject()
    blocks: any;

    @ApiProperty()
    @IsObject()
    groups: any;

    @ApiProperty()
    @IsObject()
    left: any;

    @ApiProperty()
    @IsObject()
    right: any;

    @ApiProperty()
    @IsObject()
    roles: any;

    @ApiProperty()
    @IsObject()
    tokens: any;

    @ApiProperty()
    @IsObject()
    topics: any;

    @ApiProperty()
    @IsObject()
    total: any;
}