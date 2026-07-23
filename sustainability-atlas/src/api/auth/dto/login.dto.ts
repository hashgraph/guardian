import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for session login.
 *
 * Password uses @MinLength(1) only — NOT @MinLength(12). Enforcing the policy
 * minimum on the login path would leak the policy (a 400 on short passwords
 * tells an attacker the account does NOT exist but HAS a short-length hash, or
 * reveals the policy). The service handles all password errors with a generic
 * 'invalid email or password' message.
 */
export class LoginDto {
    @ApiProperty({ description: 'Email address' })
    @IsEmail()
    email: string;

    @ApiProperty({ description: 'Account password' })
    @IsString()
    @MinLength(1)
    password: string;
}
