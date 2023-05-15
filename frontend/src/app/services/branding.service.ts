import { Injectable, ViewChildren, QueryList , ElementRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root'
})
export class BrandingService {
    private brandingData: any;

    constructor(
        private http: HttpClient
        ) { }

    saveBrandingData(payload: any): boolean {
        // send POST request to server
        this.http.post('/api/v1/branding', payload).subscribe(
        (response) => {
            console.log('Variables saved successfully', response);
            location.reload();
        },
        (error) => {
            console.error(error);
            return false;
        }
        );
        return true;
    }

    getBrandingData() {
        // send GET request
        return this.http.get('/api/v1/branding')
        .toPromise()
        .then(data => {
            this.brandingData = data as any;
            return this.brandingData;
        })
        .catch(error => {
            console.log(error)
            return {}
        });
    }

    loadBrandingData(width: number) {
        // send GET request
        this.getBrandingData()
        .then(data => {
            this.brandingData = data as any;
            this.applyBranding(this.brandingData, width);
        })
        .catch(error => {
            console.log(error)
            return {}
        });
    }

    private applyBranding(brandingData: any, width: number) {
        const favicon = document.querySelectorAll<HTMLLinkElement>('link[rel="shortcut icon"],link[rel="icon"]');
        const loginBanner = document.querySelector<HTMLElement>('.background')!;
        const homeButton = document.querySelectorAll<HTMLLinkElement>('.btn-home')!;
        const brandingCompanyLogo = document.querySelector<HTMLElement>('.btn-home > img')!;

        if (brandingData.headerColor) {
            document.documentElement.style.setProperty('--header-background-color', brandingData.headerColor);
        }
        if (brandingData.primaryColor) {
            document.documentElement.style.setProperty('--primary-color', brandingData.primaryColor);
            document.documentElement.style.setProperty('--button-primary-color', brandingData.primaryColor);
        }
        if (brandingData.companyName) {
            for (const button of homeButton) {
                const appName = button.querySelector('.btn-home-name')!;
                appName.innerHTML = brandingData.companyName;
            }
            document.title = brandingData.companyName;
        }
        if (brandingData.companyLogoUrl && width > 810 && !brandingCompanyLogo) {
            for (const button of homeButton) {
                button.className = 'branding-company-logo';
                button.style.display = 'flex';
                button.style.alignItems = 'center';
                button.style.margin = '0 0 0 22px';

                const imgElement = document.createElement('img');
                imgElement.src = brandingData.companyLogoUrl;
                imgElement.style.width = '45px';
                imgElement.style.height = '45px';
                imgElement.style.margin = 'auto 10px auto 0';
                button.insertBefore(imgElement, button.firstChild);
            }
        }
        if (this.brandingData.loginBannerUrl) {
            loginBanner.style.background = `center/cover no-repeat url(${this.brandingData.loginBannerUrl})`;
        }
        if (this.brandingData.faviconUrl) {
            favicon[0].href = this.brandingData.faviconUrl;
        }
    }
}
