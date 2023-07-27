import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty, IsString } from 'class-validator';
import { Expose } from 'class-transformer';

/**
 * Rate
 */
export class RateDTO {
    @ApiProperty()
    @IsString()
    @Expose()
    name: string;

    @ApiProperty()
    @IsNumber()
    @Expose()
    value: number;
}

/**
 * Report Data
 */
export class ReportDataDTO {
    @ApiProperty()
    @IsNumber()
    @Expose()
    messages: number;

    @ApiProperty()
    @IsNumber()
    @Expose()
    topics: number;

    @ApiProperty()
    @IsNumber()
    @Expose()
    standardRegistries: number;

    @ApiProperty()
    @IsNumber()
    @Expose()
    users: number;

    @ApiProperty()
    @IsNumber()
    @Expose()
    policies: number;

    @ApiProperty()
    @IsNumber()
    @Expose()
    instances: number;

    @ApiProperty()
    @IsNumber()
    @Expose()
    modules: number;

    @ApiProperty()
    @IsNumber()
    @Expose()
    documents: number;

    @ApiProperty()
    @IsNumber()
    @Expose()
    vcDocuments: number;

    @ApiProperty()
    @IsNumber()
    @Expose()
    vpDocuments: number;

    @ApiProperty()
    @IsNumber()
    @Expose()
    didDocuments: number;

    @ApiProperty()
    @IsNumber()
    @Expose()
    userTopic: number;

    @ApiProperty()
    @IsNumber()
    @Expose()
    tokens: number;

    @ApiProperty()
    @IsNumber()
    @Expose()
    fTokens: number;

    @ApiProperty()
    @IsNumber()
    @Expose()
    nfTokens: number;

    @ApiProperty()
    @IsNumber()
    @Expose()
    tags: number;

    @ApiProperty()
    @IsNumber()
    @Expose()
    schemas: number;

    @ApiProperty()
    @IsNumber()
    @Expose()
    systemSchemas: number;

    @ApiProperty()
    @IsNumber()
    @Expose()
    revokeDocuments: number;

    @ApiProperty()
    @IsNumber()
    @Expose()
    fTotalBalances: number;

    @ApiProperty()
    @IsNumber()
    @Expose()
    nfTotalBalances: number;

    @ApiProperty()
    @IsNumber()
    @Expose()
    topSize: number;

    @ApiProperty()
    topSRByUsers: RateDTO;

    @ApiProperty()
    topSRByPolicies: RateDTO;

    @ApiProperty()
    topTagsByLabel: RateDTO;

    @ApiProperty()
    topAllSchemasByName: RateDTO;

    @ApiProperty()
    topSystemSchemasByName: RateDTO;

    @ApiProperty()
    topSchemasByName: RateDTO;

    @ApiProperty()
    topModulesByName: RateDTO;

    @ApiProperty()
    topPoliciesByName: RateDTO;

    @ApiProperty()
    topVersionsByName: RateDTO;

    @ApiProperty()
    topPoliciesByDocuments: RateDTO;

    @ApiProperty()
    topPoliciesByDID: RateDTO;

    @ApiProperty()
    topPoliciesByVC: RateDTO;

    @ApiProperty()
    topPoliciesByVP: RateDTO;

    @ApiProperty()
    topPoliciesByRevoked: RateDTO;

    @ApiProperty()
    topTokensByName: RateDTO;

    @ApiProperty()
    topFTokensByName: RateDTO;

    @ApiProperty()
    topNFTokensByName: RateDTO;

    @ApiProperty()
    topFTokensByBalance: RateDTO;

    @ApiProperty()
    topNFTokensByBalance: RateDTO;
}

/**
 *  Data Container
 */
export class DataContainerDTO {
    @ApiProperty()
    @IsString()
    @Expose()
    @IsNotEmpty()
    uuid: string;

    @ApiProperty()
    @IsString()
    @Expose()
    @IsNotEmpty()
    root: string;

    @ApiProperty()
    report: ReportDataDTO;
}