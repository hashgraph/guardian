import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { colorToGradient } from '../static/color-remoter.function';
import { disableGlobalLoader } from '../static/global-loader.function';

export interface BrandingPayload {
    headerColor: string
    headerColor1: string
    primaryColor: string
    companyName: string
    companyLogoUrl: string
    loginBannerUrl: string
    faviconUrl: string,
    termsAndConditions: string
}

@Injectable({
    providedIn: 'root'
})
export class BrandingService {
    private brandingData: BrandingPayload = {
        headerColor: '',
        headerColor1: '',
        primaryColor: '',
        companyName: '',
        companyLogoUrl: '',
        loginBannerUrl: '',
        faviconUrl: '',
        termsAndConditions: '',
    };

    constructor(
        private http: HttpClient
    ) {
    }

    get termsAndConditions(): string {
        return this.brandingData.termsAndConditions;
    }

    saveBrandingData(payload: any): boolean {
        // send POST request to server
        this.http.post('/api/v1/branding', payload).subscribe(
            (response: any) => {
                console.log('Variables saved successfully', response);
                location.reload();
            },
            (error: any) => {
                console.error(error);
                return false;
            }
        );
        return true;
    }

    getBrandingData(): Promise<BrandingPayload> {
        // send GET request
        return this.http.get('/api/v1/branding')
            .toPromise()
            .then((data: any) => {
                this.brandingData = data;
                return this.brandingData as BrandingPayload;
            })
            .catch((error: any) => {
                console.log(error)
                return this.brandingData;
            });
    }

    loadBrandingData(width?: number): Promise<BrandingPayload> {
        // send GET request
        return this.getBrandingData()
            .then((data: any) => {
                this.brandingData = data as any;
                this.applyBranding(this.brandingData);
                return data
            })
            .catch((error: any) => {
                console.log(error)
                return this.brandingData;
            });
    }

    private applyBranding(brandingData: any) {
        try {
            const favicon = document.querySelectorAll<HTMLLinkElement>('link[rel="shortcut icon"],link[rel="icon"]');
            const loginBanner = document.querySelector<HTMLElement>('.background')!;
            const companyLogo = (document.getElementById('company-logo') as HTMLImageElement)!;
            const companyName = document.getElementById('company-name')!;

            if (brandingData.primaryColor) {
                document.body.style.setProperty('--color-primary', brandingData.primaryColor);
            }
            if (brandingData.headerColor && brandingData.headerColor1) {
                const gradientData = colorToGradient(brandingData.headerColor, brandingData.headerColor1);
                const shadow = colorToGradient(brandingData.headerColor, brandingData.headerColor1);
                document.body.style.setProperty('--linear-gradient', gradientData);
                // document.body.style.setProperty('--header-color-shadow', shadow);
            }
            if (brandingData.companyName) {
                if (companyName) {
                    companyName.innerHTML = brandingData.companyName;
                }
                document.title = brandingData.companyName;
            }
            if (companyLogo) {
                companyLogo.style.display = 'none';
                if (brandingData.companyLogoUrl) {
                    companyLogo.style.display = 'block';
                    companyLogo.src = brandingData.companyLogoUrl;
                }
            }
            if (this.brandingData?.companyLogoUrl) {
                favicon[0].href = this.brandingData.companyLogoUrl;
            }
            // if (this.brandingData?.faviconUrl) {
            //     favicon[0].href = this.brandingData.faviconUrl;
            // }
        } finally {
            disableGlobalLoader();
        }
    }
}
