import { RawMessage } from '@indexer/interfaces';
import { ApiProperty } from '@nestjs/swagger';

export class RawMessageDTO implements RawMessage {
    @ApiProperty({
        description: 'Identifier',
        example: '667c240639282050117a1985',
    })
    _id: string;
    @ApiProperty({
        description: 'Identifier',
        example: '667c240639282050117a1985',
    })
    id: string;
    @ApiProperty({
        description: 'Message identifier',
        example: '1706823227.586179534',
    })
    consensusTimestamp: string;
    @ApiProperty({
        description: 'Topic identifier',
        example: '0.0.4481265',
    })
    topicId: string;
    @ApiProperty({
        description: 'Status',
        example: 'LOADED',
    })
    status: string;
    @ApiProperty({
        description: 'Last update',
        example: 1716755852055,
    })
    lastUpdate: number;
    @ApiProperty({
        description: 'Message',
        example:
            'eyJpZCI6ImVhYTYyOWZmLWM4NmItNDEyZS1iYzYwLWM4NDk2OTJkMDBiYiIsInN0YXR1cyI6IklTU1VFIiwidHlwZSI6IlN0YW5kYXJkIFJlZ2lzdHJ5IiwiYWN0aW9uIjoiSW5pdCIsImxhbmciOiJlbi1VUyIsImRpZCI6ImRpZDpoZWRlcmE6dGVzdG5ldDpBYkd6Q3hpRzRlZ0xibldCUERpaHdMUVIza0tLcnNGNmJnSDdUdmVGYjI3bl8wLjAuMjE3NiIsInRvcGljSWQiOiIwLjAuMjE3NiIsImF0dHJpYnV0ZXMiOnsiZ2VvZ3JhcGh5IjoidGVzdCIsImxhdyI6InRlc3R0ZXMiLCJ0YWdzIjoidGVzdCJ9fQ',
    })
    message: string;
    @ApiProperty({
        description: 'Sequence number',
        example: 2,
    })
    sequenceNumber: number;
    @ApiProperty({
        description: 'Owner',
        example: '0.0.1914',
    })
    owner: string;
    @ApiProperty({
        description: 'Chunk identifier',
        example: '1706817694.014944860',
    })
    chunkId: string;
    @ApiProperty({
        description: 'Chunk number',
        example: 1,
    })
    chunkNumber: number;
    @ApiProperty({
        description: 'Chunk total',
        example: 1,
    })
    chunkTotal: number;
    @ApiProperty({
        description: 'Type',
        example: 'Message',
    })
    type: string;
    @ApiProperty({
        description: 'Data',
        example:
            '`{"id":"eaa629ff-c86b-412e-bc60-c849692d00bb","status":"ISSUE","type":"Standard Registry","action":"Init","lang":"en-US","did":"did:hedera:testnet:AbGzCxiG4egLbnWBPDihwLQR3kKKrsF6bgH7TveFb27n_0.0.2176","topicId":"0.0.2176","attributes":{"geography":"test","law":"testtes","tags":"test"}}`',
    })
    data?: string;
}
