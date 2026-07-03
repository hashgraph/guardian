import { Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { colorToGradient } from '../static/color-remoter.function';
import { disableGlobalLoader } from '../static/global-loader.function';
import { SILENT_HTTP_ERRORS } from '../constants';

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

/**
 * Fallback branding applied when the backend is unreachable or returns no data.
 * Mirrors the initial branding defined server-side (guardian-service branding.service.ts).
 */
const DEFAULT_BRANDING: BrandingPayload = {
    headerColor: '#0031ff',
    headerColor1: '#8259ef',
    primaryColor: '#0031ff',
    companyName: 'GUARDIAN',
    companyLogoUrl: '/assets/images/logo.png',
    loginBannerUrl: '/assets/bg.jpg',
    faviconUrl: 'favicon.ico',
    termsAndConditions: '',
};

@Injectable({
    providedIn: 'root'
})
export class BrandingService {
    private brandingData: BrandingPayload = { ...DEFAULT_BRANDING };

    // Shared in-flight fetch so the several components that request branding on
    // startup reuse a single HTTP call instead of each firing their own.
    private brandingRequest?: Promise<BrandingPayload>;

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
        // Reuse the in-flight request if branding is already being fetched.
        if (this.brandingRequest) {
            return this.brandingRequest;
        }

        // send GET request. Errors are handled here (falling back to defaults),
        // so mark the request silent to keep the global error interceptor from
        // showing a toast when the backend is unavailable.
        const request = this.http
            .get('/api/v1/branding', {
                context: new HttpContext().set(SILENT_HTTP_ERRORS, true)
            })
            .toPromise()
            .then((data: any) => {
                this.brandingData = data || { ...DEFAULT_BRANDING };
                return this.brandingData as BrandingPayload;
            })
            .catch((error: any) => {
                console.log(error)
                this.brandingData = { ...DEFAULT_BRANDING };
                return this.brandingData;
            })
            .finally(() => {
                this.brandingRequest = undefined;
            });

        this.brandingRequest = request;
        return request;
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
            if (brandingData.headerColor1) {
                document.body.style.setProperty('--guardian-menu-color-2', brandingData.headerColor1);
            }
            if (brandingData.companyName) {
                if (companyName) {
                    companyName.textContent = brandingData.companyName;
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
