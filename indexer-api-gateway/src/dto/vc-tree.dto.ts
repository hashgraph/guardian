import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * A single node in the VC document tree
 */
export class VcTreeNodeDTO {
    @ApiProperty({ description: 'Message consensus timestamp (unique ID)', example: '1706823227.586179534' })
    messageId: string;

    @ApiProperty({ description: 'Document type', example: 'VC_DOCUMENT' })
    type: string;

    @ApiPropertyOptional({ description: 'Schema name', example: 'Monitoring Report' })
    schemaName?: string;

    @ApiPropertyOptional({ description: 'Schema identifier', example: '1706823227.586179534' })
    schemaId?: string;

    @ApiPropertyOptional({ description: 'Issuer DID', example: 'did:hedera:mainnet:...' })
    issuer?: string;

    @ApiPropertyOptional({ description: 'Policy identifier this document belongs to', example: '1706823227.586179534' })
    policyId?: string;

    @ApiPropertyOptional({ description: 'Topic ID', example: '0.0.12345' })
    topicId?: string;

    @ApiPropertyOptional({ description: 'Consensus timestamp (creation time)', example: '1706823227.586179534' })
    consensusTimestamp?: string;

    @ApiPropertyOptional({ description: 'Token amount if this is a Mint VC', example: 5000 })
    tokenAmount?: number;

    @ApiPropertyOptional({ description: 'Token ID if this is a Mint VC', example: '0.0.12345' })
    tokenId?: string;

    @ApiProperty({ description: 'Child nodes', type: () => [VcTreeNodeDTO] })
    children: VcTreeNodeDTO[];
}

/**
 * Full VC document relationship tree rooted at a given message
 */
export class VcTreeDTO {
    @ApiProperty({ description: 'Root message identifier', example: '1706823227.586179534' })
    rootId: string;

    @ApiProperty({ description: 'Tree depth', example: 4 })
    depth: number;

    @ApiProperty({ description: 'Total number of nodes in the tree', example: 18 })
    nodeCount: number;

    @ApiProperty({ description: 'Root node of the tree', type: VcTreeNodeDTO })
    root: VcTreeNodeDTO;
}
