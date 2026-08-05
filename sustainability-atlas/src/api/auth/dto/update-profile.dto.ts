import {
    IsString,
    MaxLength,
    IsOptional,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for an authenticated user updating their OWN profile.
 *
 * Exposes ONLY the editable profile fields. Privileged / identity fields
 * (email, role, isActive, apiQuotaPerHour, tokenVersion, password) are
 * intentionally absent. Because ValidationPipe runs with
 * forbidNonWhitelisted:true, any extra field in the request body — including
 * {role:'admin'} or {email:'…'} — causes an automatic HTTP 400 before the
 * service is reached. Email is the login identifier and is immutable here.
 *
 * Each field is optional: omit it to leave it unchanged, or send "" / null to
 * clear it (the service maps both to null). Note @IsOptional() skips validation
 * for null as well as undefined, so the service tolerates a null value rather
 * than relying on validation to reject it.
 *
 * VARCHAR limits match the users entity / bootstrapSystemSchema column sizes
 * (and the matching fields on SignUpDto).
 */
export class UpdateProfileDto {
    @ApiPropertyOptional({ description: 'First name', maxLength: 120 })
    @IsOptional()
    @IsString()
    @MaxLength(120)
    firstName?: string;

    @ApiPropertyOptional({ description: 'Last name', maxLength: 120 })
    @IsOptional()
    @IsString()
    @MaxLength(120)
    lastName?: string;

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

    @ApiPropertyOptional({ description: 'Country', maxLength: 100 })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    country?: string;
}
