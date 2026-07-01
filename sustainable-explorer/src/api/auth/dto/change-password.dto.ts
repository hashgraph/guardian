import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Body for an authenticated user changing their own password (used by the
 * forced "must change password" flow for admin-created / seeded accounts, and
 * for voluntary password changes from account settings).
 */
export class ChangePasswordDto {
    @ApiProperty({ description: 'The current password' })
    @IsString()
    @MinLength(1)
    currentPassword: string;

    @ApiProperty({ description: 'The new password (minimum 12 characters)', minLength: 12, maxLength: 128 })
    @IsString()
    @MinLength(12)
    @MaxLength(128)
    newPassword: string;
}
