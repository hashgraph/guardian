import * as yup from 'yup';
import fieldsValidation from '../fields-validation.js'
import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { UserRole } from '@guardian/interfaces';

export const schemaSchema = () => {
    const { messageId } = fieldsValidation
    return yup.object({
        body: yup.object({
            messageId
        }),
    });
}

export const systemEntitySchema = () => {
    const { name, entity } = fieldsValidation
    return yup.object({
        body: yup.object({
            name, entity
        }),
    });
}

export class SystemSchemaDTO {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @IsIn([UserRole.STANDARD_REGISTRY, UserRole.USER])
    entity: string;

    [key: string]: any
}

export class SchemaDTO {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    id: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty()
    @IsString()
    description: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    entity: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    document: string;

    @ApiProperty()
    @IsString()
    uuid: string;

    @ApiProperty()
    @IsString()
    iri: string;

    @ApiProperty()
    @IsString()
    hash: string;

    @ApiProperty()
    @IsString()
    status: string;

    @ApiProperty()
    @IsString()
    topicId: string;

    @ApiProperty()
    @IsString()
    version: string;

    @ApiProperty()
    @IsString()
    owner: string;

    @ApiProperty()
    @IsString()
    messageId: string;
}

export class ExportSchemaDTO {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    id: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty()
    @IsString()
    description: string;

    @ApiProperty()
    @IsString()
    version: string;

    @ApiProperty()
    @IsString()
    owner: string;

    @ApiProperty()
    @IsString()
    messageId: string;
}

export class VersionSchemaDTO {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    version: string;
}

export class MessageSchemaDTO {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    messageId: string;
}
