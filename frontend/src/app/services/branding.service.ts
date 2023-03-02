import { Injectable, ViewChildren, QueryList , ElementRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root'
})
export class BrandingService {
  private brandingData: any;
  //@ViewChildren('btnHome') btnHomes!: QueryList<ElementRef>;

  constructor(
    private http: HttpClient
    ) { }

  saveBrandingData(payload: any) {
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

  loadBrandingData() {
    // send GET request 
    return this.http.get('/assets/branding.json')
      .toPromise()
      .then(data => {
        this.brandingData = data;
        //console.log(this.brandingData)
        this.applyBranding(this.brandingData);
        /*
        setTimeout(() => {
          this.applyBranding(this.btnHomes, this.brandingData);
        }, 0); // defer the function call to the next event loop iteration
      */
      })
      .catch(error => {
        console.log(error)
        return {}
      });
  }

  private applyBranding(brandingData: any) {
    const favicon = document.querySelectorAll<HTMLLinkElement>('link[rel="shortcut icon"],link[rel="icon"]');
    const loginBanner = document.querySelector<HTMLElement>('.background')!;
    const homeButton = document.querySelectorAll<HTMLLinkElement>('.btn-home')!;
    //const appName = homeButton.querySelector('.btn-home-name')!;
    //const companyLogo = homeButton.querySelector('img');

    /*
    console.log(brandingData.headerColor)
    console.log(brandingData.primaryColor)
    console.log(brandingData.companyName)

    console.log(brandingData.companyLogoUrl)
    console.log(brandingData.loginBannerUrl)
    console.log(brandingData.faviconUrl)
    */

    if (brandingData.headerColor) {
      //console.log('HeaderColor lets go')
      document.documentElement.style.setProperty('--header-background-color', brandingData.headerColor);
    }
    if (brandingData.primaryColor) {
      //console.log('PrimaryColor lets go')
      document.documentElement.style.setProperty('--primary-color', brandingData.primaryColor);
      document.documentElement.style.setProperty('--button-primary-color', brandingData.primaryColor);
    }
    if (brandingData.companyName) {
      //console.log('CompanyName lets go')
      for (let button of homeButton) {
        let appName = button.querySelector('.btn-home-name')!;
        appName.innerHTML = brandingData.companyName;
      }
      document.title = brandingData.companyName;
    }
    if (brandingData.companyLogoUrl) {
      for (let button of homeButton) {
        console.log("Bora bora")
        button.style.display = 'flex';
        button.style.alignItems = 'center';
        //button.style.fontSize = '18px';
        button.style.margin = '0 0 0 22px';
        let imgElement = document.createElement('img');
        imgElement.src = brandingData.companyLogoUrl;
        imgElement.style.width = '45px';
        imgElement.style.height = '45px';
        imgElement.style.margin = 'auto 10px auto 0';
        //homeButton.parentNode!.insertBefore(imgElement, homeButton);
        button.insertBefore(imgElement, button.firstChild);
        /*
        console.log(btnHomes)
        btnHomes.forEach((elementRef: ElementRef) => {
          // access the nativeElement property to get the underlying DOM element
          const element = elementRef.nativeElement;
          // do something with the element
          console.log("Bora bora")
          element.style.display = 'flex';
          element.style.alignItems = 'center';
          //button.style.fontSize = '18px';
          element.style.margin = '0 0 0 22px';
          let imgElement = document.createElement('img');
          imgElement.src = brandingData.companyLogoUrl;
          imgElement.style.width = '45px';
          imgElement.style.height = '45px';
          imgElement.style.margin = 'auto 10px auto 0';
          //homeButton.parentNode!.insertBefore(imgElement, homeButton);
          button.insertBefore(imgElement, element.firstChild);
        });
        */
      }
      /*
      homeButton.style.display = 'flex';
      homeButton.style.alignItems = 'center';
      //homeButton.style.fontSize = '18px';
      homeButton.style.margin = '0 0 0 22px';
      const imgElement = document.createElement('img');
      imgElement.src = brandingData.companyLogoUrl;
      imgElement.style.width = '45px';
      imgElement.style.height = '45px';
      imgElement.style.margin = 'auto 10px auto 0';
      //homeButton.parentNode!.insertBefore(imgElement, homeButton);
      homeButton.insertBefore(imgElement, homeButton.firstChild);
      //console.log('CompanyLogo lets go')
      //companyLogo.style.setProperty('--btn-home-before-content', `url(${this.companyLogoUrl})`);
      //companyLogo.style.setProperty('--btn-home-before-size', '20px');      
      */
    }
    if (this.brandingData.loginBannerUrl) {
      //console.log('LoginBanner lets go')
      loginBanner.style.background = `center/cover no-repeat url(${this.brandingData.loginBannerUrl})`;
    }
    if (this.brandingData.faviconUrl) {
      //console.log('Favicon lets go')
      favicon[0].href = this.brandingData.faviconUrl;
    }
  }
}
