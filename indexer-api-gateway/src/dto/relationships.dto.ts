import {
    MessageType,
    Relationship,
    RELATIONSHIP_CATEGORIES,
    RelationshipCategory,
    RelationshipLink,
    Relationships,
} from '@indexer/interfaces';
import { ApiProperty } from '@nestjs/swagger';
import { MessageDTO } from './message.dto.js';

export class RelationshipDTO implements Relationship {
    @ApiProperty({
        description: 'Message identifier',
        example: '1706823227.586179534',
    })
    id: string;
    @ApiProperty({
        description: 'UUID',
        example: '93938a10-d032-4a9b-9425-092e58bffbf7',
    })
    uuid: string;
    @ApiProperty({
        description: 'Type',
        enum: MessageType,
    })
    type: MessageType;
    @ApiProperty({
        description: 'Category',
        example: 1,
    })
    category: number;
    @ApiProperty({
        description: 'Name',
        example: 'Monitoring Report Document',
    })
    name: string;
    @ApiProperty({
        description: 'Tags count',
        example: 1,
    })
    tagsCount: number;
}

export class RelationshipLinkDTO implements RelationshipLink {
    @ApiProperty({
        description: 'Source message identifier',
        example: '1706823227.586179534',
    })
    source: string;
    @ApiProperty({
        description: 'Target message identifier',
        example: '1706823227.586179534',
    })
    target: string;
}

export class RelationshipsDTO implements Relationships {
    @ApiProperty({
        description: 'Message identifier',
        example: '1706823227.586179534',
    })
    id: string;
    @ApiProperty({
        type: MessageDTO,
    })
    item?: MessageDTO;
    @ApiProperty({
        type: RelationshipDTO,
    })
    target?: RelationshipDTO;
    @ApiProperty({
        type: [RelationshipDTO],
    })
    relationships?: RelationshipDTO[];
    @ApiProperty({
        type: [RelationshipLinkDTO],
    })
    links?: RelationshipLinkDTO[];
    @ApiProperty({
        description: 'Categories',
        example: RELATIONSHIP_CATEGORIES,
    })
    categories?: { name: RelationshipCategory }[];
}
