import { NotificationAction, NotificationType } from '@guardian/interfaces';
import { ApiProperty } from '@nestjs/swagger';
import {
    IsBoolean,
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
} from 'class-validator';
import { Examples } from '../examples.js';

export class NotificationDTO {
    @ApiProperty({
        type: String,
        description: 'Internal database identifier',
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    id?: string;

    @ApiProperty({
        type: String,
        description: 'Creation date in ISO 8601 format',
        example: Examples.DATE
    })
    @IsOptional()
    @IsString()
    createDate?: string;

    @ApiProperty({
        type: String,
        description: 'Last update date in ISO 8601 format',
        example: Examples.DATE
    })
    @IsOptional()
    @IsString()
    updateDate?: string;

    @ApiProperty({
        type: String,
        description: 'User ID who owns this notification',
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    userId?: string;

    @ApiProperty({
        type: String,
        description: 'Notification title (e.g. "Policy published", "Schema created")',
        example: 'Policy published'
    })
    @IsOptional()
    @IsString()
    title?: string;

    @ApiProperty({
        type: String,
        description: 'Detailed notification message',
        example: 'Policy 69b83f18cd6b7c4adf4139bc published'
    })
    @IsOptional()
    @IsString()
    message?: string;

    @ApiProperty({
        description: 'Notification type',
        enum: NotificationType,
        example: 'SUCCESS'
    })
    @IsEnum(NotificationType)
    type: NotificationType;

    @ApiProperty({
        description: 'Action that triggered the notification (used for navigation in UI)',
        enum: NotificationAction,
        example: 'POLICY_CONFIGURATION'
    })
    @IsOptional()
    @IsEnum(NotificationAction)
    action?: NotificationAction;

    @ApiProperty({
        description: 'Result ID (e.g. policy ID, schema ID) for navigation',
        example: Examples.DB_ID
    })
    @IsOptional()
    result?: any;

    @ApiProperty({
        type: Boolean,
        description: 'Whether the notification has been read',
        example: false
    })
    @IsOptional()
    @IsBoolean()
    read?: boolean;

    @ApiProperty({
        type: Boolean,
        description: 'Whether the notification is old (already shown to user)',
        example: false
    })
    @IsOptional()
    @IsBoolean()
    old?: boolean;
}

export class ProgressDTO {
    @ApiProperty({
        type: String,
        description: 'Internal database identifier',
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    id?: string;

    @ApiProperty({
        type: String,
        description: 'Creation date in ISO 8601 format',
        example: Examples.DATE
    })
    @IsOptional()
    @IsString()
    createDate?: string;

    @ApiProperty({
        type: String,
        description: 'Last update date in ISO 8601 format',
        example: Examples.DATE
    })
    @IsOptional()
    @IsString()
    updateDate?: string;

    @ApiProperty({
        type: String,
        description: 'User ID who initiated the action',
        example: Examples.DB_ID
    })
    @IsOptional()
    @IsString()
    userId?: string;

    @ApiProperty({
        type: String,
        description: 'Action being tracked (e.g. "Publish policy")',
        example: 'Publish policy'
    })
    @IsString()
    action: string;

    @ApiProperty({
        type: String,
        description: 'Current progress message',
        example: 'Publishing schemas...'
    })
    @IsOptional()
    @IsString()
    message?: string;

    @ApiProperty({
        type: Number,
        description: 'Progress percentage (0-100)',
        example: 50
    })
    @IsNumber()
    progress: number;

    @ApiProperty({
        description: 'Progress type',
        enum: NotificationType,
        example: 'INFO'
    })
    @IsEnum(NotificationType)
    type: NotificationType;

    @ApiProperty({
        type: String,
        description: 'Associated task ID',
        example: Examples.UUID
    })
    @IsOptional()
    @IsString()
    taskId?: string;
}
