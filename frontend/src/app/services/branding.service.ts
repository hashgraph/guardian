import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface BrandingPayload {
    headerColor: string
    primaryColor: string
    companyName: string
    companyLogoUrl: string
    loginBannerUrl: string
    faviconUrl: string
}

@Injectable({
  providedIn: 'root'
})
export class BrandingService {
    private brandingData: BrandingPayload = {
        headerColor: '',
        primaryColor: '',
        companyName: '',
        companyLogoUrl: '',
        loginBannerUrl: '',
        faviconUrl: '',
    };

    constructor(
        private http: HttpClient
        ) { }

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

    loadBrandingData(width: number): Promise<BrandingPayload> {
        // send GET request
        return this.getBrandingData()
        .then((data: any) => {
            this.brandingData = data as any;
            this.applyBranding(this.brandingData, width);
            return data
        })
        .catch((error: any) => {
            console.log(error)
            return this.brandingData;
        });
    }

    private applyBranding(brandingData: any, width: number) {
        const favicon = document.querySelectorAll<HTMLLinkElement>('link[rel="shortcut icon"],link[rel="icon"]');
        const loginBanner = document.querySelector<HTMLElement>('.background')!;
        const companyLogo = document.querySelector<HTMLImageElement>('.company-logo')!;
        const companyName = document.querySelector<HTMLElement>('.company-name')!;

        if (brandingData.headerColor) {
            document.documentElement.style.setProperty('--header-background-color', brandingData.headerColor);
        }
        if (brandingData.primaryColor) {
            document.documentElement.style.setProperty('--primary-color', brandingData.primaryColor);
            document.documentElement.style.setProperty('--button-primary-color', brandingData.primaryColor);
        }
        if (brandingData.companyName) {
            companyName.innerHTML = brandingData.companyName;
            document.title = brandingData.companyName;
        }
        companyLogo.style.display = 'none';
        if (brandingData.companyLogoUrl && width > 810) {
            companyLogo.style.display = 'block';
            companyLogo.src = brandingData.companyLogoUrl;
        }
        if (this.brandingData?.loginBannerUrl) {
            loginBanner.style.background = `center/cover no-repeat url(${this.brandingData.loginBannerUrl})`;
        }
        if (this.brandingData?.faviconUrl) {
            favicon[0].href = this.brandingData.faviconUrl;
        }
    }
}
