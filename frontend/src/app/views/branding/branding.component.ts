import { Component, ElementRef, OnInit } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { InformService } from 'src/app/services/inform.service';
import { BrandingPayload, BrandingService } from 'src/app/services/branding.service';
import { MatDialog } from '@angular/material/dialog';
import { colorToGradient } from '../../static/color-remoter.function';

@Component({
    selector: 'app-branding',
    templateUrl: './branding.component.html',
    styleUrls: ['./branding.component.scss']
})
export class BrandingComponent implements OnInit {

    isPreviewOn: boolean = false;
    loading: boolean = false;
    public isChangesMade: boolean = false;
    public innerWidth: any;

    faviconLinks = document.querySelectorAll<HTMLLinkElement>('link[rel="shortcut icon"],link[rel="icon"]');

    headerHexColorControl = new FormControl('', [Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]);
    headerColorControl = new FormControl('', [Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]);
    headerColor1Control = new FormControl('', [Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]);
    primaryHexColorControl = new FormControl('', [Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]);
    primaryColorControl = new FormControl('', [Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]);

    fonts = [
        {label: 'Roboto', value: 'Roboto'},
        {label: 'Open Sans', value: 'Open Sans'},
        {label: 'Montserrat', value: 'Montserrat'}
    ];
    fontControl = new FormControl('Roboto');
    selectedFont = this.fonts.find(font => font.value === this.fontControl.value);

    companyNameControl = new FormControl('');

    companyLogoFile: File | null = null;
    loginBannerFile: File | null = null;
    faviconFile: File | null = null;

    companyLogoUrl: string | null = null;
    loginBannerUrl: string | null = null;
    faviconUrl: string | null = null;

    imageLabel = {
        companyLogo: 'Company Logo',
        loginBanner: 'Login Banner',
        favicon: 'Favicon'
    }

    imageError: any;

    initResetDialog: boolean = false;

    constructor(
        private router: Router,
        private elRef: ElementRef,
        private http: HttpClient,
        private informService: InformService,
        private brandingService: BrandingService,
        private dialog: MatDialog
    ) {
        this.fontControl.valueChanges.subscribe((value) => {
            this.selectedFont = this.fonts.find(font => font.value === value);
        });
    }

    ngOnInit(): void {
        this.loading = true;
        this.innerWidth = window.innerWidth;
        this.brandingService.loadBrandingData(this.innerWidth).then((brandingData: BrandingPayload) => {
            this.companyLogoUrl = brandingData.companyLogoUrl;
            this.loginBannerUrl = brandingData.loginBannerUrl;
            this.faviconUrl = brandingData.faviconUrl;
            this.headerHexColorControl.setValue(brandingData.headerColor);
            this.headerColorControl.setValue(brandingData.headerColor);
            this.headerColor1Control.setValue(brandingData.headerColor1);
            this.primaryHexColorControl.setValue(brandingData.primaryColor);
            this.primaryColorControl.setValue(brandingData.primaryColor);
            this.companyNameControl.setValue(brandingData.companyName || 'GUARDIAN');
            this.loading = false;
        });
    }

    updateCompanyName(companyNameControl: FormControl) {
        this.isChangesMade = true;
    }

    handleImageInputChange(files: FileList, maxWidth: number, maxHeight: number, allowedTypes: string[], maxSize: number): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            this.imageError = null;
            if (files && files[0]) {
                if (files[0].size > maxSize) {
                    this.imageError = 'Maximum size allowed is ' + Math.round(maxSize / 1000) + 'KB';
                    this.informService.errorMessage(this.imageError, 'Invalid image');
                    reject(this.imageError);
                } else if (!allowedTypes.includes(files[0].type)) {
                    this.imageError = 'Only JPEG, JPG, GIF and PNG images are allowed.';
                    this.informService.errorMessage(this.imageError, 'Invalid image');
                    reject(this.imageError);
                } else {
                    const reader = new FileReader();
                    reader.onload = (e: any) => {
                        const image = new Image();
                        image.src = e.target.result;
                        image.onload = (rs: any) => {
                            const imgHeight = image.height;
                            const imgWidth = image.width;

                            if (imgHeight > maxHeight || imgWidth > maxWidth) {
                                this.imageError = 'Maximum dimensions allowed ' + maxHeight + '*' + maxWidth + ' pixels.';
                                this.informService.errorMessage(this.imageError, 'Invalid image');
                                reject(this.imageError);
                            } else {
                                const imgBase64Path = e.target.result;
                                resolve(imgBase64Path);
                            }
                        };
                    };
                    this.isChangesMade = true;
                    reader.readAsDataURL(files[0]);
                }
            } else {
                resolve('');
            }
        });
    }

    handleCompanyLogoInput(files: FileList) {
        const maxWidth = 25600;
        const maxHeight = 15200;
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
        const maxSize = 0.32 * 1024 * 1024;
        this.handleImageInputChange(files, maxWidth, maxHeight, allowedTypes, maxSize)
            .then((imgBase64Path: string) => {
                this.companyLogoUrl = imgBase64Path;
            })
            .catch((error: string) => {
                console.log(error);
            });
    }

    handleLoginBannerInput(event: any) {
        const maxWidth = 25600;
        const maxHeight = 15200;
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
        const maxSize = 1024 * 1024;
        this.handleImageInputChange(event, maxWidth, maxHeight, allowedTypes, maxSize)
            .then((imgBase64Path: string) => {
                this.loginBannerUrl = imgBase64Path;
            })
            .catch((error: string) => {
                console.log(error);
            });
    }

    handleFaviconInput(event: any) {
        const maxWidth = 25600;
        const maxHeight = 25600;
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
        const maxSize = 0.32 * 1024 * 1024;
        this.handleImageInputChange(event, maxWidth, maxHeight, allowedTypes, maxSize)
            .then((imgBase64Path: string) => {
                this.faviconUrl = imgBase64Path;
            })
            .catch((error: string) => {
                console.log(error);
            });
    }

    clearCompanyLogo(): void {
        this.companyLogoUrl = null;
    }

    clearLoginBanner(): void {
        this.loginBannerFile = null;
        this.loginBannerUrl = null;
    }

    async onSave() {
        // create JSON payload with variables
        const brandingData = await this.brandingService.getBrandingData();
        const payload = {
            headerColor: this.headerColorControl.value ? this.headerColorControl.value : brandingData.headerColor,
            headerColor1: this.headerColor1Control.value ? this.headerColor1Control.value : brandingData.headerColor1,
            primaryColor: this.primaryColorControl.value ? this.primaryColorControl.value : brandingData.primaryColor,
            companyName: this.companyNameControl.value ? this.companyNameControl.value : brandingData.companyName,
            companyLogoUrl: this.companyLogoUrl,
            loginBannerUrl: this.loginBannerUrl,
            faviconUrl: this.faviconUrl ? this.faviconUrl : ''
        };

        this.brandingService.saveBrandingData(payload);
        this.loading = true;
        this.isChangesMade = false;
    }

    async onPreview() {
        const favicon = document.querySelectorAll<HTMLLinkElement>('link[rel="shortcut icon"],link[rel="icon"]');
        const loginBanner = document.querySelector<HTMLElement>('.background')!;
        const companyLogo = document.querySelector<HTMLImageElement>('#company-logo')!;
        const companyName = document.querySelector<HTMLElement>('#company-name')!;
        const brandingData = await this.brandingService.getBrandingData();
        const gradientData = colorToGradient(this.headerColorControl.value, this.headerColor1Control.value);
        const shadow = colorToGradient(this.headerColorControl.value, this.headerColor1Control.value);

        if (this.isPreviewOn) {
            document.body.style.setProperty('--linear-gradient', gradientData);
            document.body.style.setProperty('--header-color-shadow', shadow);
            document.body.style.setProperty('--color-primary', this.primaryHexColorControl.value);
            companyName.innerHTML = brandingData.companyName;
            document.title = brandingData.companyName;

            if (brandingData.companyLogoUrl) {
                companyLogo.style.display = 'block';
                companyLogo.src = brandingData.companyLogoUrl;
            } else {
                companyLogo.style.display = 'none';
            }
            favicon[0].href = brandingData.faviconUrl;

            this.isPreviewOn = false;
            return
        }
        const headerColor = this.headerColorControl.value ? this.headerColorControl.value : brandingData.headerColor;
        const primaryColor = this.primaryColorControl.value ? this.primaryColorControl.value : brandingData.primaryColor;

        document.body.style.setProperty('--linear-gradient', gradientData);
        document.body.style.setProperty('--header-color-shadow', shadow);
        document.body.style.setProperty('--color-primary', primaryColor);
        //document.documentElement.style.setProperty('--button-primary-color', primaryColor);
        if (this.companyNameControl.value) {
            companyName.innerHTML = this.companyNameControl.value;
            document.title = this.companyNameControl.value;
        }
        if (this.companyLogoUrl) {
            companyLogo.style.display = 'block';
            companyLogo.src = this.companyLogoUrl || brandingData.companyLogoUrl;
        } else {
            companyLogo.style.display = 'none';
        }

        if (this.faviconUrl) {
            favicon[0].href = this.faviconUrl;
        }

        this.isPreviewOn = true;
    }

    reset(reset: boolean) {
        if (!reset) {
            this.initResetDialog = false;
            return;
        }
        this.initResetDialog = false;
        const payload = {
            headerColor: '#0681EE',
            headerColor1: '#0A467C',
            primaryColor: '#0681EE',
            companyName: 'GUARDIAN',
            companyLogoUrl: '',
            loginBannerUrl: '',
            faviconUrl: 'favicon.ico'
        };

        this.brandingService.saveBrandingData(payload);
        this.isChangesMade = false;
        this.loading = true;
    }

    public isSaveEnabled(): boolean {
        return (
            this.isChangesMade ||
            this.headerColorControl.value !== '#000' ||
            this.headerColor1Control.value !== '#000' ||
            this.primaryColorControl.value !== '#2C78F6' ||
            this.companyNameControl.value !== 'GUARDIAN'
        );
    }

    public onDestroy() {
        this.brandingService.getBrandingData().then((payload) => {

        })
    }
}
