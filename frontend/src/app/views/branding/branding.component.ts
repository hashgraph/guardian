import { Component, ElementRef, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { InformService } from 'src/app/services/inform.service';
import { BrandingService } from 'src/app/services/branding.service';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  selector: 'app-branding',
  templateUrl: './branding.component.html',
  styleUrls: ['./branding.component.css']
})
export class BrandingComponent implements OnInit {

  isPreviewOn: boolean = false;
  loading: boolean = false;
  initialHeaderColor: string = window.getComputedStyle(document.documentElement).getPropertyValue('--header-background-color');
  initialPrimaryColor: string = window.getComputedStyle(document.documentElement).getPropertyValue('--primary-color');
  initialFontFamily: string = window.getComputedStyle(document.documentElement).getPropertyValue('--app-font-family');
  faviconLinks = document.querySelectorAll<HTMLLinkElement>('link[rel="shortcut icon"],link[rel="icon"]');
  initialFaviconUrl = this.faviconLinks.length > 0 ? this.faviconLinks[0].href : null;
  
  headerHexColorControl = new FormControl('');
  headerColorControl = new FormControl('');
  primaryHexColorControl = new FormControl('');
  primaryColorControl = new FormControl('#2C78F6');

  fonts = [
    {label: 'Roboto', value: 'Roboto'}, 
    {label: 'Open Sans', value: 'Open Sans'}, 
    {label: 'Montserrat', value: 'Montserrat'}
  ];
  fontControl = new FormControl('Roboto');
  selectedFont = this.fonts.find(font => font.value === this.fontControl.value); 

  /*
  companyLogoUrl: string | undefined;
  loginBannerUrl: string | undefined;
  faviconUrl: string | undefined;
  */

  companyNameControl = new FormControl('');

  constructor(
    private router: Router,
    private elRef: ElementRef,
    private http: HttpClient,
    private informService: InformService,
    private brandingService: BrandingService
    ) {
    console.log(this.selectedFont);
    console.log(this.initialFaviconUrl);
    this.fontControl.valueChanges.subscribe((value) => {
      this.selectedFont = this.fonts.find(font => font.value === value);
    });
    console.log(this.selectedFont);
  }

  ngOnInit(): void {
    const root = this.elRef.nativeElement.ownerDocument.documentElement;
  }


  // Handling the colors

  updateColorFromHex(hexColorControl: FormControl, colorControl: FormControl) {
    const hexColor = hexColorControl.value;
    colorControl.setValue(hexColor);
    console.log(hexColor);
  }

  updateHexFromColor(hexColorControl: FormControl, colorControl: FormControl) {
    const color = colorControl.value;
    hexColorControl.setValue(color);
  }


  updateCompanyName(companyNameControl: FormControl) {
    const companyName = companyNameControl.value;
    console.log(companyName);
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

  /*
  handleImageInputChange(files: FileList, max_width: number, max_height: number, allowed_types: string[], max_size: number): string {
    //const fileInput = event.target;
    console.log(files)
    console.log(files[0])
    this.imageError = null;
    if (files && files[0]) {

      if (files[0].size > max_size) {
        this.imageError = 'Maximum size allowed is ' + max_size / 1000 + 'Mb';
        this.informService.errorMessage(this.imageError, 'Invalid image');
        return '';
      }

      if (!allowed_types.includes(files[0].type)) {
        this.imageError = 'Only Images are allowed ( JPG | PNG )';
        this.informService.errorMessage(this.imageError, 'Invalid image');
        return '';
      }

      const reader = new FileReader();
      reader.onload = (e: any) => {
        const image = new Image();
        image.src = e.target.result;
        image.onload = (rs: any) => {
          const img_height = image.height;
          const img_width = image.width;

          console.log(img_height, img_width);

          if (img_height > max_height || img_width > max_width) {
            this.imageError = 'Maximum dimensions allowed ' + max_height + '*' + max_width + 'px';
            this.informService.errorMessage(this.imageError, 'Invalid image');
            return '';
          } else {
            const imgBase64Path = e.target.result;
            //this.cardImageBase64 = imgBase64Path;
            //this.isImageSaved = true;
            console.log(imgBase64Path)
            return imgBase64Path;
            // this.previewImagePath = imgBase64Path;
          }
        };
      };
      reader.readAsDataURL(files[0]);
      return '';
    }
    return '';
  }
  */

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
  
              console.log(img_height, img_width);
  
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
    const max_size = 0.32 * 1024 * 1024; // 20MB in bytes
    this.handleImageInputChange(files, max_width, max_height, allowed_types, max_size)
      .then((imgBase64Path: string) => {
        this.companyLogoUrl = imgBase64Path;
        console.log(this.companyLogoUrl)
      })
      .catch((error: string) => {
        console.log(error);
      });
  }
  
  handleLoginBannerInput(event: any) {
    const max_width = 25600;
    const max_height = 15200;
    const allowed_types = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
    const max_size = 0.32 * 1024 * 1024; // 20MB in bytes
    this.handleImageInputChange(event, max_width, max_height, allowed_types, max_size)
      .then((imgBase64Path: string) => {
        this.loginBannerUrl = imgBase64Path;
      })
      .catch((error: string) => {
        console.log(error);
      });
  }
  
  handleFaviconInput(event: any) {
    const max_width = 25600;
    const max_height = 25600;
    const allowed_types = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
    const max_size = 0.32 * 1024 * 1024; // 5MB in bytes
    this.handleImageInputChange(event, max_width, max_height, allowed_types, max_size)
      .then((imgBase64Path: string) => {
        this.faviconUrl = imgBase64Path;
      })
      .catch((error: string) => {
        console.log(error);
      });
  }
  
  

  // O QUE TINHA NANTES
  /*
  handleCompanyLogoInput(files: FileList | null): void {
    if (files && files.length > 0) {
      if (files[0].size > 6000000) {
        this.informService.errorMessage("File is too large", 'The policy is invalid');
        console.log("File is too large");
      } else {
        this.companyLogoFile = files[0];
        const reader = new FileReader();
        reader.readAsDataURL(this.companyLogoFile);
        reader.onload = () => {
          this.companyLogoUrl = reader.result as string;
        };
      }
    }
  }

  handleLoginBannerInput(files: FileList | null): void {
    if (files && files.length > 0) {
      if (files[0].size > 6000000) {
        this.informService.errorMessage("File is too large", 'The policy is invalid');
      } else {
        this.loginBannerFile = files[0];
        const reader = new FileReader();
        reader.readAsDataURL(this.loginBannerFile);
        reader.onload = () => {
          this.loginBannerUrl = reader.result as string;
        };
      }
    }
  }

  handleFaviconInput(files: FileList | null): void {
    if (files && files.length > 0) {
      if (files[0].size > 6000000) {
        this.informService.errorMessage("File is too large", 'The policy is invalid');
      } else {
        this.faviconFile = files[0];
        const reader = new FileReader();
        console.log(reader)
        reader.readAsDataURL(this.faviconFile);
        reader.onload = () => {
          this.faviconUrl = reader.result as string;
        };
      }
    }
  }
  */

  clearCompanyLogo(): void {
    this.companyLogoFile = null;
    this.companyLogoUrl = null;
  }

  clearLoginBanner(): void {
    this.loginBannerFile = null;
    this.loginBannerUrl = null;
  }

  clearFavicon(): void {
    this.faviconFile = null;
    this.faviconUrl = null;
  }


  /* Buttons */

  onCancel() {
    this.router.navigate(['/config']);
  }

  onSave() {
    // create JSON payload with variables
    const payload = {
      headerColor: this.headerColorControl.value,
      primaryColor: this.primaryColorControl.value,
      //fontFamily: this.initialFontFamily,
      companyName: this.companyNameControl.value ? this.companyNameControl.value : 'Guardian',
      companyLogoUrl: this.companyLogoUrl ? this.companyLogoUrl : '',
      loginBannerUrl: this.loginBannerUrl ? this.loginBannerUrl : 'http://localhost:4200/bg.jpg',
      faviconUrl: this.faviconUrl ? this.faviconUrl : 'http://localhost:4200/favicon.ico'
    };

    /*
    // send POST request to server
    this.http.post('/api/v1/branding', payload).subscribe(
      (response) => {
        console.log('Variables saved successfully', response);
      },
      (error) => {
        console.error(error);
      }
    );
    */
    const jsonString = JSON.stringify(payload);
    console.log(payload)
    console.log(jsonString)
    console.log('Payload size:', jsonString.length, 'bytes') // 1.518.761 bytes
    this.brandingService.saveBrandingData(payload);          // 1.215.304 bytes
    this.loading = true;
  }

  
  //const faviconLinks = document.querySelectorAll('link[rel="shortcut icon"],link[rel="icon"]');
  onPreview() {
    const favicon = document.querySelectorAll<HTMLLinkElement>('link[rel="shortcut icon"],link[rel="icon"]');
    const loginBanner = document.querySelector<HTMLElement>('.background')!;
    const homeButton = document.querySelector<HTMLElement>('.btn-home')!;
    const appName = homeButton.querySelector('.btn-home-name')!;
    const companyLogo = homeButton.querySelector('img');

    if (this.isPreviewOn) {
      document.documentElement.style.setProperty('--header-background-color', this.initialHeaderColor);
      document.documentElement.style.setProperty('--primary-color', this.initialPrimaryColor);
      document.documentElement.style.setProperty('--button-primary-color', this.initialPrimaryColor);
      document.documentElement.style.setProperty('--app-font-family', this.initialFontFamily);
      appName.innerHTML = 'Guardian';
      document.title = 'Guardian';
      if (companyLogo) {
        //homeButton.parentNode!.removeChild(companyLogo);
        homeButton.removeChild(companyLogo);
      }
      loginBanner.style.background = 'center/cover no-repeat url(http://localhost:4200/bg.jpg)';
      favicon[0].href = 'http://localhost:4200/favicon.ico';

      this.isPreviewOn = false;
    } else {
      document.documentElement.style.setProperty('--header-background-color', this.headerColorControl.value);
      document.documentElement.style.setProperty('--primary-color', this.primaryColorControl.value);
      document.documentElement.style.setProperty('--button-primary-color', this.primaryColorControl.value);
      document.documentElement.style.setProperty('--app-font-family', this.fontControl.value);
      if (this.companyNameControl.value) {
        appName.innerHTML = this.companyNameControl.value;
        document.title = this.companyNameControl.value;
      }
      if (this.companyLogoUrl) {
        homeButton.style.display = 'flex';
        homeButton.style.alignItems = 'center';
        //homeButton.style.fontSize = '18px';
        homeButton.style.margin = '0 0 0 22px';
        const imgElement = document.createElement('img');
        imgElement.src = this.companyLogoUrl;
        imgElement.style.width = '45px';
        imgElement.style.height = '45px';
        imgElement.style.margin = 'auto 10px auto 0';
        //homeButton.parentNode!.insertBefore(imgElement, homeButton);
        homeButton.insertBefore(imgElement, homeButton.firstChild);

        //companyLogo.style.setProperty('--btn-home-before-content', `url(${this.companyLogoUrl})`);
        //companyLogo.style.setProperty('--btn-home-before-size', '20px');      
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

}