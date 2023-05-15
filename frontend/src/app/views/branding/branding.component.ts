import { Component, ElementRef, OnInit } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { InformService } from 'src/app/services/inform.service';
import { BrandingService } from 'src/app/services/branding.service';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { BrandingDialogComponent } from '../../components/branding-dialog/branding-dialog.component';

@Component({
  selector: 'app-branding',
  templateUrl: './branding.component.html',
  styleUrls: ['./branding.component.css']
})
export class BrandingComponent implements OnInit {

  isPreviewOn: boolean = false;
  loading: boolean = false;
  public isChangesMade: boolean = false;
  public innerWidth: any;

  initialHeaderColor: string = window.getComputedStyle(document.documentElement).getPropertyValue('--header-background-color');
  initialPrimaryColor: string = window.getComputedStyle(document.documentElement).getPropertyValue('--primary-color');
  initialFontFamily: string = window.getComputedStyle(document.documentElement).getPropertyValue('--app-font-family');
  faviconLinks = document.querySelectorAll<HTMLLinkElement>('link[rel="shortcut icon"],link[rel="icon"]');
  initialFaviconUrl = this.faviconLinks.length > 0 ? this.faviconLinks[0].href : null;

  headerHexColorControl = new FormControl('', [Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]);
  headerColorControl = new FormControl('', [Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]);
  primaryHexColorControl = new FormControl('', [Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]);
  primaryColorControl = new FormControl('#2C78F6', [Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]);

  fonts = [
    {label: 'Roboto', value: 'Roboto'}, 
    {label: 'Open Sans', value: 'Open Sans'}, 
    {label: 'Montserrat', value: 'Montserrat'}
  ];
  fontControl = new FormControl('Roboto');
  selectedFont = this.fonts.find(font => font.value === this.fontControl.value); 

  companyNameControl = new FormControl('');

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
    const root = this.elRef.nativeElement.ownerDocument.documentElement;
    this.innerWidth = window.innerWidth;
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        // Loads saved data
        this.brandingService.loadBrandingData(this.innerWidth);
      }
    });
  }


  // Handling the colors

  updateColorFromHex(hexColorControl: FormControl, colorControl: FormControl) {
    const hexColor = hexColorControl.value;
    colorControl.setValue(hexColor);
    this.isChangesMade = true;
  }

  updateHexFromColor(hexColorControl: FormControl, colorControl: FormControl) {
    const color = colorControl.value;
    hexColorControl.setValue(color);
    this.isChangesMade = true;
  }


  updateCompanyName(companyNameControl: FormControl) {
    const companyName = companyNameControl.value;
    this.isChangesMade = true;
  }


  companyLogoFile: File | null = null;
  loginBannerFile: File | null = null;
  faviconFile: File | null = null;

  companyLogoUrl: string | null = null;
  loginBannerUrl: string | null = null;
  faviconUrl: string | null = null;

  imageLabel = {
    companyLogo: "Company Logo",
    loginBanner: "Login Banner",
    favicon: "Favicon"
  }


  // Handling the images

  imageError: any;

  handleImageInputChange(files: FileList, max_width: number, max_height: number, allowed_types: string[], max_size: number): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this.imageError = null;
      if (files && files[0]) {
        if (files[0].size > max_size) {
          this.imageError = 'Maximum size allowed is ' + Math.round(max_size / 1000) + 'KB';
          this.informService.errorMessage(this.imageError, 'Invalid image');
          reject(this.imageError);
        } else if (!allowed_types.includes(files[0].type)) {
          this.imageError = 'Only JPEG, JPG, GIF and PNG images are allowed.';
          this.informService.errorMessage(this.imageError, 'Invalid image');
          reject(this.imageError);
        } else {
          const reader = new FileReader();
          reader.onload = (e: any) => {
            const image = new Image();
            image.src = e.target.result;
            image.onload = (rs: any) => {
              const img_height = image.height;
              const img_width = image.width;

              if (img_height > max_height || img_width > max_width) {
                this.imageError = 'Maximum dimensions allowed ' + max_height + '*' + max_width + ' pixels.';
                this.informService.errorMessage(this.imageError, 'Invalid image');
                reject(this.imageError);
              } else {
                const imgBase64Path = e.target.result;
                resolve(imgBase64Path);
              }
            };
          };
          reader.readAsDataURL(files[0]);
        }
      } else {
        resolve('');
      }
    });
  }

  handleCompanyLogoInput(files: FileList) {
    const max_width = 25600;
    const max_height = 15200;
    const allowed_types = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
    const max_size = 0.32 * 1024 * 1024;
    this.handleImageInputChange(files, max_width, max_height, allowed_types, max_size)
      .then((imgBase64Path: string) => {
        this.companyLogoUrl = imgBase64Path;
      })
      .catch((error: string) => {
        console.log(error);
      });
    this.isChangesMade = true;
  }

  handleLoginBannerInput(event: any) {
    const max_width = 25600;
    const max_height = 15200;
    const allowed_types = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
    const max_size = 0.32 * 1024 * 1024;
    this.handleImageInputChange(event, max_width, max_height, allowed_types, max_size)
      .then((imgBase64Path: string) => {
        this.loginBannerUrl = imgBase64Path;
      })
      .catch((error: string) => {
        console.log(error);
      });
    this.isChangesMade = true;
  }

  handleFaviconInput(event: any) {
    const max_width = 25600;
    const max_height = 25600;
    const allowed_types = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
    const max_size = 0.32 * 1024 * 1024;
    this.handleImageInputChange(event, max_width, max_height, allowed_types, max_size)
      .then((imgBase64Path: string) => {
        this.faviconUrl = imgBase64Path;
      })
      .catch((error: string) => {
        console.log(error);
      });
    this.isChangesMade = true;
  }

  clearCompanyLogo(): void {
    this.companyLogoFile = null;
    this.companyLogoUrl = null;
    this.isChangesMade = false;

    // Reset file input element
    const companyLogoInput = document.getElementById('companyLogoInput') as HTMLInputElement;
    companyLogoInput.value = ''; // Clear the input value
    const newCompanyLogoInput = companyLogoInput.cloneNode(true) as HTMLInputElement;
    companyLogoInput.parentNode?.replaceChild(newCompanyLogoInput, companyLogoInput);
  }

  clearLoginBanner(): void {
    this.loginBannerFile = null;
    this.loginBannerUrl = null;
    this.isChangesMade = false;

    // Reset file input element
    const loginBannerInput = document.getElementById('loginBannerInput') as HTMLInputElement;
    loginBannerInput.value = ''; // Clear the input value
    const newLoginBannerInput = loginBannerInput.cloneNode(true) as HTMLInputElement;
    loginBannerInput.parentNode?.replaceChild(newLoginBannerInput, loginBannerInput);
  }

  clearFavicon(): void {
    this.faviconFile = null;
    this.faviconUrl = null;
    this.isChangesMade = false;

    // Reset file input element
    const faviconInput = document.getElementById('faviconInput') as HTMLInputElement;
    faviconInput.value = ''; // Clear the input value
    const newFaviconInput = faviconInput.cloneNode(true) as HTMLInputElement;
    faviconInput.parentNode?.replaceChild(newFaviconInput, faviconInput);
  }


  /* Buttons */

  onCancel() {
    this.isChangesMade = false;
    this.router.navigate(['/config']);
  }

  async onSave() {
    // create JSON payload with variables
    const brandingData = await this.brandingService.getBrandingData();
    const payload = {
      headerColor: this.headerColorControl.value ? this.headerColorControl.value : brandingData.headerColor,
      primaryColor: this.primaryColorControl.value ? this.primaryColorControl.value : brandingData.primaryColor ,
      companyName: this.companyNameControl.value ? this.companyNameControl.value : brandingData.companyName,
      companyLogoUrl: this.companyLogoUrl ? this.companyLogoUrl : brandingData.companyLogoUrl,
      loginBannerUrl: this.loginBannerUrl ? this.loginBannerUrl : brandingData.loginBannerUrl,
      faviconUrl: this.faviconUrl ? this.faviconUrl : ''
    };

    const jsonString = JSON.stringify(payload);
    this.brandingService.saveBrandingData(payload);
    this.loading = true;
    this.isChangesMade = false;
  }


  async onPreview() {
    const favicon = document.querySelectorAll<HTMLLinkElement>('link[rel="shortcut icon"],link[rel="icon"]');
    const loginBanner = document.querySelector<HTMLElement>('.background')!;
    const homeButton = document.querySelector<HTMLElement>('.btn-home')!;
    const appName = homeButton.querySelector('.btn-home-name')!;
    const companyLogo = homeButton.querySelector('img');
    const brandingData = await this.brandingService.getBrandingData();

    if (this.isPreviewOn) {
      document.documentElement.style.setProperty('--header-background-color', brandingData.headerColor);
      document.documentElement.style.setProperty('--primary-color', brandingData.primaryColor);
      document.documentElement.style.setProperty('--button-primary-color', brandingData.primaryColor);
      appName.innerHTML = brandingData.companyName;
      document.title = brandingData.companyName;
      if (companyLogo) {
        homeButton.removeChild(companyLogo);
      }
      if (brandingData.companyLogoUrl) {
        homeButton.style.display = 'flex';
        homeButton.style.alignItems = 'center';
        homeButton.style.margin = '0 0 0 22px';
        const imgElement = document.createElement('img');
        imgElement.src = brandingData.companyLogoUrl;
        imgElement.style.width = '45px';
        imgElement.style.height = '45px';
        imgElement.style.margin = 'auto 10px auto 0';
        homeButton.insertBefore(imgElement, homeButton.firstChild);  
      }
      loginBanner.style.background = `center/cover no-repeat url(${brandingData.loginBannerUrl})`;
      favicon[0].href = brandingData.faviconUrl;
      
      this.isPreviewOn = false;
    } else {
      const headerColor = this.headerColorControl.value ? this.headerColorControl.value : brandingData.headerColor;
      const primaryColor = this.primaryColorControl.value ? this.primaryColorControl.value : brandingData.primaryColor;

      document.documentElement.style.setProperty('--header-background-color', headerColor);
      document.documentElement.style.setProperty('--primary-color', primaryColor);
      document.documentElement.style.setProperty('--button-primary-color', primaryColor);
      if (this.companyNameControl.value) {
        appName.innerHTML = this.companyNameControl.value;
        document.title = this.companyNameControl.value;
      }
      if (this.companyLogoUrl) {
        if (companyLogo) {
          homeButton.removeChild(companyLogo);
        }
        homeButton.style.display = 'flex';
        homeButton.style.alignItems = 'center';
        homeButton.style.margin = '0 0 0 22px';
        const imgElement = document.createElement('img');
        imgElement.src = this.companyLogoUrl;
        imgElement.style.width = '45px';
        imgElement.style.height = '45px';
        imgElement.style.margin = 'auto 10px auto 0';
        homeButton.insertBefore(imgElement, homeButton.firstChild);  
      }
      if (this.loginBannerUrl) {
        loginBanner.style.background = `center/cover no-repeat url(${this.loginBannerUrl})`;
      }
      if (this.faviconUrl) {
        favicon[0].href = this.faviconUrl;
      }

      this.isPreviewOn = true;
    }

  }

  reset() {
    const dialogRef: MatDialogRef<any> = this.dialog.open(BrandingDialogComponent, {
      width: '400px',
      data: {
        message: 'You are about to revert your custom branding to what was preconfigured when you first built Guardian.\n\nAre you sure you want to proceed?'
      }
    });
  
    dialogRef.afterClosed().subscribe(result => {
      if (result === 'proceed') {
        // create JSON payload with variables
        const payload = {
          headerColor: '#000',
          primaryColor: '#2C78F6',
          companyName: 'Guardian',
          companyLogoUrl: '',
          loginBannerUrl: 'bg.jpg',
          faviconUrl: 'favicon.ico'
        };

        const jsonString = JSON.stringify(payload);
        this.brandingService.saveBrandingData(payload);
        this.loading = true;
      }
    });
  }

  public isSaveEnabled(): boolean {
    return (
      this.isChangesMade ||
      this.headerHexColorControl.dirty ||
      this.headerColorControl.dirty ||
      this.primaryHexColorControl.dirty ||
      this.primaryColorControl.dirty ||
      this.companyNameControl.dirty ||
      !!this.companyLogoUrl ||
      !!this.loginBannerUrl ||
      !!this.faviconUrl
    );
  }

}
