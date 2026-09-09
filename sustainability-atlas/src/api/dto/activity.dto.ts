import { IsArray, ArrayMaxSize, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { ActivityRow } from '../repositories/pg-activity.repository';

export class NetworkActivityRequestDto {
    @ApiProperty({
        type: [String],
        description: 'Watchlist project keys (credentialSubject.id) to scope the feed to. ' +
            'An empty array returns an empty feed rather than an error.',
    })
    @IsArray()
    @ArrayMaxSize(200)
    @IsString({ each: true })
    projectKeys: string[];
}

export class NetworkActivityItemDto {
    @ApiProperty({
        enum: ['project_registered', 'methodology_registered', 'registry_registered', 'credit_minted', 'credit_retired', 'other'],
    })
    category: string;

    @ApiProperty({ description: 'ISO timestamp derived from the HCS consensus timestamp' })
    occurredAt: string;

    @ApiProperty({ nullable: true })
    title: string | null;

    @ApiProperty({ nullable: true })
    subtitle: string | null;

    @ApiProperty({ nullable: true, description: 'Minted/retired amount, when applicable' })
    amount: number | null;

    @ApiProperty({ nullable: true })
    projectKey: string | null;

    @ApiProperty({ nullable: true })
    topicId: string | null;

    @ApiProperty({ nullable: true, description: "Raw Guardian message type — populated only for category='other'" })
    messageType: string | null;

    static fromRow(row: ActivityRow): NetworkActivityItemDto {
        const seconds = parseFloat(row.consensusTimestamp);
        const occurredAt = Number.isFinite(seconds)
            ? new Date(seconds * 1000).toISOString()
            : new Date(0).toISOString();
        const amount = row.amount != null ? Number(row.amount) : null;

        return {
            category: row.category,
            occurredAt,
            title: row.title,
            subtitle: row.subtitle,
            amount: amount !== null && Number.isFinite(amount) ? amount : null,
            projectKey: row.projectKey,
            topicId: row.topicId,
            messageType: row.messageType,
        };
    }
}
