import { ApiProperty } from '@nestjs/swagger';
import { ValidationErrorsDTO } from './blocks.js';

export class ModuleDTO {
    @ApiProperty({ type: 'string', nullable: false })
    id?: string;

    @ApiProperty({ type: 'string', nullable: false })
    uuid?: string;

    @ApiProperty({ type: 'string', nullable: false })
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

    @ApiProperty({ type: 'string', nullable: false })
    topicId?: string;

    @ApiProperty({ type: 'string', nullable: false })
    messageId?: string;

    @ApiProperty({ type: 'string', nullable: false })
    codeVersion?: string;

    @ApiProperty({ type: 'string', nullable: false })
    createDate?: string;

    @ApiProperty({ type: 'object', nullable: true })
    config?: any;
}

export class ModulePreviewDTO {
    @ApiProperty({ nullable: false, required: true, type: () => ModuleDTO })
    module: ModuleDTO;

    @ApiProperty({ type: 'string', required: true })
    messageId: string;

    @ApiProperty({ type: 'object', isArray: true, nullable: true })
    schemas?: any[];

    @ApiProperty({ type: 'object', isArray: true, nullable: true })
    tags?: any[];

    @ApiProperty({ type: 'string', nullable: true })
    moduleTopicId?: string;
}

export class ModuleValidationDTO {
    @ApiProperty({ nullable: false, required: true, type: () => ModuleDTO })
    module: ModuleDTO;

    @ApiProperty({ nullable: false, required: true, type: () => ValidationErrorsDTO })
    results: ValidationErrorsDTO;
}