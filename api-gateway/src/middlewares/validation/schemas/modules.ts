import { ApiProperty } from '@nestjs/swagger';
import { ValidationErrorsDTO } from './blocks.js';

export class ModuleDTO {
    @ApiProperty({ type: 'string', nullable: false })
    id?: string;

    @ApiProperty({ type: 'string', nullable: false })
    uuid?: string;

    @ApiProperty({ type: 'string', nullable: true, required: false })
    type?: string;

    @ApiProperty({ type: 'string', nullable: false })
    name?: string;

    @ApiProperty({ type: 'string', nullable: false })
    description?: string;

    @ApiProperty({ type: 'string', nullable: false })
    status?: string;

    @ApiProperty({ type: 'string', nullable: false })
    creator?: string;

    @ApiProperty({ type: 'string', nullable: false })
    owner?: string;

    @ApiProperty({ type: 'string', nullable: true, required: false })
    topicId?: string;

    @ApiProperty({ type: 'string', nullable: true, required: false })
    messageId?: string;

    @ApiProperty({ type: 'string', nullable: false })
    codeVersion?: string;

    @ApiProperty({ type: 'string', nullable: false })
    createDate?: string;

    @ApiProperty({ type: 'string', nullable: true, required: false })
    updateDate?: string;

    @ApiProperty({ type: 'string', nullable: true, required: false })
    configFileId?: string;

    @ApiProperty({ type: 'string', nullable: true, required: false })
    contentFileId?: string;

    @ApiProperty({ type: 'string', nullable: true, required: false })
    menu?: string;

    @ApiProperty({ type: 'object', additionalProperties: true, nullable: true })
    config?: any;
}

export class ModulePreviewDTO {
    @ApiProperty({ nullable: false, required: true, type: () => ModuleDTO })
    module: ModuleDTO;

    @ApiProperty({ type: 'string', required: true })
    messageId: string;

    @ApiProperty({
        type: 'object',
        additionalProperties: true,
        isArray: true,
        nullable: true
    })
    schemas?: any[];

    @ApiProperty({
        type: 'object',
        additionalProperties: true,
        isArray: true,
        nullable: true
    })
    tags?: any[];

    @ApiProperty({ type: 'string', nullable: true })
    moduleTopicId?: string;
}

export class ModuleImportFileResponseDTO {
    @ApiProperty({ nullable: false, required: true, type: () => ModuleDTO })
    module: ModuleDTO;

    @ApiProperty({
        type: 'object',
        additionalProperties: true,
        isArray: true,
        nullable: true
    })
    schemas?: any[];

    @ApiProperty({
        type: 'object',
        additionalProperties: true,
        isArray: true,
        nullable: true
    })
    tags?: any[];
}

export class ModuleValidationDTO {
    @ApiProperty({ nullable: false, required: true, type: () => ModuleDTO })
    module: ModuleDTO;

    @ApiProperty({ nullable: false, required: true, type: () => ValidationErrorsDTO })
    results: ValidationErrorsDTO;
}

export class ModulePublishResponseDTO {
    @ApiProperty({ nullable: false, required: true, type: () => ModuleDTO })
    module: ModuleDTO;

    @ApiProperty({
        type: 'boolean',
        description: 'Whether validation passed and the module was published'
    })
    isValid: boolean;

    @ApiProperty({
        nullable: false,
        required: true,
        type: () => ValidationErrorsDTO,
        description: 'Validation details used during publish'
    })
    errors: ValidationErrorsDTO;
}
