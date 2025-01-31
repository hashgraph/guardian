import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class RegisteredUsersDTO {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    username: string;

    @ApiProperty()
    @IsString()
    did?: string;

    @ApiProperty()
    @IsString()
    parent?: string;

    @ApiProperty()
    @IsString()
    role?: string;

    @ApiProperty()
    @IsArray()
    policyRoles?: string[];
}
