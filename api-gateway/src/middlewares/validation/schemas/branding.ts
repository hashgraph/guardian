import { ApiProperty } from '@nestjs/swagger';

export class BrandingDTO {
    @ApiProperty()
    headerColor: string;
    @ApiProperty()
    primaryColor: string;
    @ApiProperty()
    companyName: string;
    @ApiProperty()
    companyLogoUrl: string;
    @ApiProperty()
    loginBannerUrl: string;
    @ApiProperty()
    faviconUrl: string;
    @ApiProperty()
    headerColor1: string;
    @ApiProperty()
    termsAndConditions: string;
}
