import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for the email-verification flow.
 *
 * The token is the raw single-use value from the verification email link.
 */
export class VerifyEmailDto {
    @ApiProperty({ description: 'Single-use email-verification token from the verification link', maxLength: 512 })
    @IsString()
    @MaxLength(512)
    token: string;
}
