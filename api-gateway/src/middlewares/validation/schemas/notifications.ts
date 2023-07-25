import { NotificationAction, NotificationType } from '@guardian/interfaces';
import { ApiProperty } from '@nestjs/swagger';
import {
    IsBoolean,
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
} from 'class-validator';

export class NotificationDTO {
    @ApiProperty()
    @IsOptional()
    @IsString()
    title?: string;

    @ApiProperty()
    @IsOptional()
    @IsString()
    message?: string;

    @ApiProperty({
        enum: NotificationType,
    })
    @IsEnum(NotificationType)
    type: NotificationType;

    @ApiProperty({
        enum: NotificationAction,
    })
    @IsOptional()
    @IsEnum(NotificationAction)
    action?: NotificationAction;

    @ApiProperty()
    @IsOptional()
    result?: any;

    @ApiProperty()
    @IsOptional()
    @IsBoolean()
    read?: boolean;

    @ApiProperty()
    @IsOptional()
    @IsBoolean()
    old?: boolean;
}

export class ProgressDTO {
    @ApiProperty()
    @IsString()
    action: string;

    @ApiProperty()
    @IsOptional()
    @IsString()
    message?: string;

    @ApiProperty()
    @IsNumber()
    progress: number;

    @ApiProperty({
        enum: NotificationType,
    })
    @IsEnum(NotificationType)
    type: NotificationType;

    @ApiProperty()
    @IsOptional()
    @IsString()
    taskId?: string;
}
