import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional } from 'class-validator';
import { Expose } from 'class-transformer';

export class InternalServerErrorDTO {
    @ApiProperty({
        type: Number,
        required: true,
        example: 500
    })
    @IsNumber()
    @Expose()
    statusCode: number;

    @ApiProperty({
        type: String,
        required: true,
        example: 'Error message'
    })
    @IsString()
    @Expose()
    message: string;
}

export class ServiceUnavailableErrorDTO {
    @ApiProperty({
        type: Number,
        required: true,
        example: 503
    })
    @IsNumber()
    @Expose()
    statusCode: number;

    @ApiProperty({
        type: String,
        required: true,
        example: 'Error message'
    })
    @IsString()
    @Expose()
    message: string;
}

export class UnprocessableEntityErrorDTO {
    @ApiProperty({
        type: Number,
        required: true,
        example: 422
    })
    @IsNumber()
    @Expose()
    statusCode: number;

    @ApiProperty({
        oneOf: [
            { type: 'string' },
            { type: 'array', items: { type: 'string' } }
        ],
        required: true,
        example: 'Error message'
    })
    @Expose()
    message: string | string[];

    @ApiProperty({
        type: String,
        required: false,
        example: 'Unprocessable Entity'
    })
    @IsString()
    @Expose()
    @IsOptional()
    error?: string;
}

export class UnauthorizedErrorDTO {
    @ApiProperty({
        type: Number,
        required: true,
        example: 401
    })
    @IsNumber()
    @Expose()
    statusCode: number;

    @ApiProperty({
        type: String,
        required: true,
        example: 'Unauthorized request'
    })
    @IsString()
    @Expose()
    message: string;
}

export class ForbiddenErrorDTO {
    @ApiProperty({
        type: Number,
        required: true,
        example: 403
    })
    @IsNumber()
    @Expose()
    statusCode: number;

    @ApiProperty({
        type: String,
        required: true,
        example: 'Forbidden resource'
    })
    @IsString()
    @Expose()
    message: string;

    @ApiProperty({
        type: String,
        required: false,
        example: 'Forbidden'
    })
    @IsString()
    @Expose()
    @IsOptional()
    error?: string;
}

export class ConflictErrorDTO {
    @ApiProperty({
        type: Number,
        required: true,
        example: 409
    })
    @IsNumber()
    @Expose()
    statusCode: number;

    @ApiProperty({
        type: String,
        required: true,
        example: 'Conflict'
    })
    @IsString()
    @Expose()
    message: string;
}

export class NotFoundErrorDTO {
    @ApiProperty({
        type: Number,
        required: true,
        example: 404
    })
    @IsNumber()
    @Expose()
    statusCode: number;

    @ApiProperty({
        type: String,
        required: true,
        example: 'Error message'
    })
    @IsString()
    @Expose()
    message: string;
}

export class BadRequestErrorDTO {
    @ApiProperty({
        type: Number,
        required: true,
        example: 400
    })
    @IsNumber()
    @Expose()
    statusCode: number;

    @ApiProperty({
        oneOf: [
            { type: 'string' },
            { type: 'array', items: { type: 'string' } }
        ],
        required: true,
        example: 'Error message'
    })
    @Expose()
    message: string | string[];

    @ApiProperty({
        type: String,
        required: false,
        example: 'Bad Request'
    })
    @IsString()
    @Expose()
    @IsOptional()
    error?: string;
}