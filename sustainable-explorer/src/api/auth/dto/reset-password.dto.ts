import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for the password-reset flow.
 *
 * The token is the raw single-use value sent in the reset-email link.
 * newPassword enforces the same policy as signup (@MinLength(12)).
 */
export class ResetPasswordDto {
    @ApiProperty({ description: 'Single-use password-reset token from the email link', maxLength: 512 })
    @IsString()
    @MaxLength(512)
    token: string;

    @ApiProperty({
        description: 'New password (minimum 12 characters)',
        minLength: 12,
        maxLength: 128,
    })
    @IsString()
    @MinLength(12)
    @MaxLength(128)
    newPassword: string;
}
