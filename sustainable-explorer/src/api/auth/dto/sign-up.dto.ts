import {
    IsEmail,
    IsString,
    MinLength,
    MaxLength,
    IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for self-service user registration.
 *
 * Exposes ONLY the fields a self-signup user may supply. Privileged fields
 * (role, isActive, apiQuotaPerHour, tokenVersion) are intentionally absent
 * from this class. Because ValidationPipe runs with forbidNonWhitelisted:true,
 * any extra field in the request body — including {role:'admin'} — causes an
 * automatic HTTP 400 before the service is reached.
 *
 * VARCHAR limits match the users entity / bootstrapSystemSchema column sizes.
 */
export class SignUpDto {
    @ApiProperty({ description: 'Email address (used as login identifier)' })
    @IsEmail()
    email: string;

    @ApiProperty({
        description: 'Password (minimum 12 characters)',
        minLength: 12,
        maxLength: 128,
    })
    @IsString()
    @MinLength(12)
    @MaxLength(128)
    password: string;

    @ApiProperty({ description: 'First name', maxLength: 120 })
    @IsString()
    @MaxLength(120)
    firstName: string;

    @ApiProperty({ description: 'Last name', maxLength: 120 })
    @IsString()
    @MaxLength(120)
    lastName: string;

    @ApiPropertyOptional({ description: 'Organisation name', maxLength: 200 })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    organisation?: string;

    @ApiPropertyOptional({ description: 'Job title', maxLength: 120 })
    @IsOptional()
    @IsString()
    @MaxLength(120)
    jobTitle?: string;

    @ApiProperty({ description: 'Country', maxLength: 100 })
    @IsString()
    @MaxLength(100)
    country: string;
}
