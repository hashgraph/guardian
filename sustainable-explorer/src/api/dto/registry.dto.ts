import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from './pagination.dto';

export class RegistryQueryDto extends PaginationQueryDto {
    @IsOptional()
    @IsString()
    did?: string;

    @IsOptional()
    @IsString()
    geography?: string;
}

export class RegistryResponseDto {
    id: string;
    did: string | null;
    name: string | null;
    topicId: string | null;
    geography: string | null;
    law: string | null;
    tags: string | null;
    action: string | null;
    lang: string | null;
    sourceTimestamp: string;
    createdAt: Date;
    updatedAt: Date;

    static fromBusinessView(bv: any): RegistryResponseDto {
        const data = bv.businessData || {};
        return {
            id: bv.id,
            did: bv.registryDid,
            name: bv.displayName,
            topicId: data.topicId || data.options?.topicId || null,
            geography: data.options?.geography || null,
            law: data.options?.law || null,
            tags: data.options?.tags || null,
            action: data.options?.action || null,
            lang: data.options?.lang || null,
            sourceTimestamp: bv.sourceTimestamp,
            createdAt: bv.createdAt,
            updatedAt: bv.updatedAt,
        };
    }
}
