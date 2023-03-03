import { Component, ElementRef, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-branding',
  templateUrl: './branding.component.html',
  styleUrls: ['./branding.component.css']
})
export class BrandingComponent implements OnInit {

  isPreviewOn: boolean = false;
  initialHeaderColor: string = window.getComputedStyle(document.documentElement).getPropertyValue('--header-background-color');
  initialPrimaryColor: string = window.getComputedStyle(document.documentElement).getPropertyValue('--primary-color');
  initialFontFamily: string = window.getComputedStyle(document.documentElement).getPropertyValue('--app-font-family');
  //initialFavicon: string = window.getComputedStyle(document.documentElement).getPropertyValue('--app-font-family');
  
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
    private http: HttpClient
    ) {
    console.log(this.selectedFont);
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

  handleCompanyLogoInput(files: FileList | null): void {
    if (files && files.length > 0) {
      if (files[0].size > 6000000) {
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
        console.log("File is too large");
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
    console.log('Nope')
    if (files && files.length > 0) {
      console.log('Ok')
      if (files[0].size > 6000000) {
        console.log("File is too large");
      } else {
        console.log('Parece promissor')
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
      headerColor: this.initialHeaderColor,
      primaryColor: this.initialPrimaryColor,
      fontFamily: this.initialFontFamily,
      companyName: this.companyNameControl.value ? this.companyNameControl.value : 'Guardian',
      companyLogoUrl: this.companyLogoUrl ? this.companyLogoUrl : 'http://localhost:4200/favicon.ico',
      loginBannerUrl: this.loginBannerUrl ? this.loginBannerUrl : 'http://localhost:4200/favicon.ico',
      faviconUrl: this.faviconUrl ? this.faviconUrl : 'http://localhost:4200/favicon.ico',
    };

    // send POST request to server
    this.http.post('/api/v1/branding', payload).subscribe(
      (response) => {
        console.log('Variables saved successfully', response);
      },
      (error) => {
        console.error(error);
      }
    );
  }

  favicon: HTMLLinkElement = document.querySelector('#favicon')!;
  onPreview() {
    if (this.isPreviewOn) {
      document.documentElement.style.setProperty('--header-background-color', this.initialHeaderColor);
      document.documentElement.style.setProperty('--primary-color', this.initialPrimaryColor);
      document.documentElement.style.setProperty('--button-primary-color', this.initialPrimaryColor);
      document.documentElement.style.setProperty('--app-font-family', this.initialFontFamily);
      this.favicon.href = 'http://localhost:4200/favicon.ico';

      this.isPreviewOn = false;
    } else {
      document.documentElement.style.setProperty('--header-background-color', this.headerColorControl.value);
      document.documentElement.style.setProperty('--primary-color', this.primaryColorControl.value);
      document.documentElement.style.setProperty('--button-primary-color', this.primaryColorControl.value);
      document.documentElement.style.setProperty('--app-font-family', this.fontControl.value);
      console.log(this.faviconUrl)
      if (this.faviconUrl) {
        console.log(this.faviconUrl)
        this.favicon.href = this.faviconUrl;
      }

      this.isPreviewOn = true;
    }
    
  }

}