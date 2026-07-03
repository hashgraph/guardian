import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { colorToGradient, isLightColor } from '../static/color-remoter.function';
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
    useCustomMenuColors?: boolean
    useSolidBackground?: boolean
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
                // PrimeNG (--primary-color) and the guardian theme
                // (--guardian-primary-color) resolve their primary tokens on
                // :root, so a body-level override never reaches them — the
                // branded primary must be written on the root element too.
                const rootStyle = document.documentElement.style;
                rootStyle.setProperty('--primary-color', brandingData.primaryColor);
                rootStyle.setProperty('--guardian-primary-color', brandingData.primaryColor);
                rootStyle.setProperty('--button-primary-color-hover', brandingData.primaryColor);
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
            // Custom menu colors are driven by the stored flags; configs saved
            // before the flags existed fall back to "enabled when a menu color
            // is set" so existing installations keep their current look.
            const useCustomMenuColors = brandingData.useCustomMenuColors ?? !!brandingData.headerColor;
            const useSolidBackground = brandingData.useSolidBackground
                ?? (!brandingData.headerColor1 || brandingData.headerColor1 === brandingData.headerColor);
            if (useCustomMenuColors && brandingData.headerColor) {
                const bodyStyle = document.body.style;
                const sidebarBg = (brandingData.headerColor1 && !useSolidBackground)
                    ? colorToGradient(brandingData.headerColor, brandingData.headerColor1)
                    : brandingData.headerColor;
                bodyStyle.setProperty('--sidebar-bg', sidebarBg);
                if (isLightColor(brandingData.headerColor)) {
                    bodyStyle.setProperty('--sidebar-item-color', '#3A4A73');
                    bodyStyle.setProperty('--sidebar-section-color', 'rgba(38, 33, 92, 0.65)');
                    bodyStyle.setProperty('--sidebar-item-hover', 'rgba(0, 0, 0, 0.08)');
                    bodyStyle.setProperty('--sidebar-border', 'rgba(0, 0, 0, 0.12)');
                    bodyStyle.setProperty('--sidebar-logo-color', '#26215C');
                    bodyStyle.setProperty('--sidebar-accent', '#26215C');
                    bodyStyle.setProperty('--sidebar-active-bg', 'rgba(0, 0, 0, 0.10)');
                    bodyStyle.setProperty('--sidebar-active-color', '#26215C');
                } else {
                    bodyStyle.setProperty('--sidebar-item-color', '#FFFFFF');
                    bodyStyle.setProperty('--sidebar-section-color', 'rgba(255, 255, 255, 0.65)');
                    bodyStyle.setProperty('--sidebar-item-hover', 'rgba(255, 255, 255, 0.12)');
                    bodyStyle.setProperty('--sidebar-border', 'rgba(255, 255, 255, 0.16)');
                    bodyStyle.setProperty('--sidebar-logo-color', '#FFFFFF');
                    bodyStyle.setProperty('--sidebar-accent', '#FFFFFF');
                    bodyStyle.setProperty('--sidebar-active-bg', 'rgba(255, 255, 255, 0.16)');
                    bodyStyle.setProperty('--sidebar-active-color', '#FFFFFF');
                }
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
