import {
    SchemaTree,
    SchemaTreeNode,
    SchemaTreeNodeData,
} from '@indexer/interfaces';
import { ApiProperty } from '@nestjs/swagger';
import { SchemaDTO } from './details/schema.details.js';

export class SchemaTreeNodeDataDTO implements SchemaTreeNodeData {
    @ApiProperty({
        description: 'Message identifier',
        example: '1706823227.586179534',
    })
    id: string;
    @ApiProperty({
        description: 'Color',
        example: '#FFFFFF',
    })
    color: string;
}

export class SchemaTreeNodeDTO implements SchemaTreeNode {
    @ApiProperty({
        description: 'Label',
        example: 'Monitoring Report',
    })
    label: string;
    @ApiProperty({
        description: 'Expanded',
        example: true,
    })
    expanded: boolean;
    @ApiProperty({
        type: SchemaTreeNodeDataDTO,
    })
    data: SchemaTreeNodeDataDTO;
    @ApiProperty({
        description: 'Schema tree node children',
        type: 'object',
    })
    children: SchemaTreeNode[];
}

export class SchemaTreeDTO implements SchemaTree {
    @ApiProperty({
        description: 'Message identifier',
        example: '1706823227.586179534',
    })
    id: string;
    @ApiProperty({
        type: SchemaDTO,
    })
    item?: SchemaDTO;
    @ApiProperty({
        type: SchemaTreeNodeDTO,
    })
    root?: SchemaTreeNodeDTO;
}
