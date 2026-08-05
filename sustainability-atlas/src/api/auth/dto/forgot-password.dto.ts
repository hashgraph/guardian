import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for the forgot-password flow.
 *
 * The endpoint ALWAYS returns the same neutral 200 response regardless of
 * whether the email address is registered — this prevents account enumeration.
 */
export class ForgotPasswordDto {
    @ApiProperty({ description: 'Email address associated with the account' })
    @IsEmail()
    email: string;
}
