import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Examples } from '../examples.js';

export class DemoTaskResponseDTO {
    @ApiProperty({
        example: Examples.UUID,
        description: 'Task ID'
    })
    taskId: string;

    @ApiProperty({
        example: 3,
        description: 'Expected count of task phases'
    })
    expectation: number;

    @ApiProperty({
        example: 'Create random key',
        description: 'Task action'
    })
    action: string;

    @ApiProperty({
        example: Examples.DB_ID,
        description: 'User ID'
    })
    userId: string;
}

export class DemoKeyResponseDTO {
    @ApiProperty({
        example: Examples.ACCOUNT_ID,
        description: 'Demo account ID'
    })
    @IsString()
    id: string;

    @ApiProperty({
        example: '302e020100300506032b657004220420f6168da5cd88b85151e9735252419f0768b87b1a800f7e3b7908d15fa1f358a2',
        description: 'Demo account private key'
    })
    @IsString()
    key: string;
}

export class PolicyRoleDTO {
    @ApiProperty({
        example: 'CDM AMS-III.AR Policy'
    })
    @IsString()
    name: string;

    @ApiProperty({
        example: '1.0.0'
    })
    @IsString()
    version: string;

    @ApiProperty({
        example: 'Project Participant'
    })
    @IsString()
    role: string;
}

export class RegisteredUserDTO {
    @ApiProperty({
        example: Examples.DID
    })
    @IsString()
    did: string;

    @ApiProperty({
        example: Examples.USER_NAME_SR_1
    })
    @IsString()
    @IsNotEmpty()
    username: string;

    @ApiProperty({
        example: Examples.USER_ROLE_SR
    })
    @IsString()
    role: string;

    @ApiProperty({
        type: [PolicyRoleDTO],
        default: []
    })
    @IsArray()
    policyRoles: PolicyRoleDTO[];

    @ApiProperty({
        example: Examples.DID,
        required: false,
        description: 'Parent DID for child users'
    })
    @IsString()
    @IsOptional()
    parent?: string;
}
