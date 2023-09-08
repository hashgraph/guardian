import { Component, OnInit } from '@angular/core';
import { SettingsService } from 'src/app/services/settings.service';
import { AboutInterface } from '@guardian/interfaces';

@Component({
  selector: 'app-about-view',
  templateUrl: './about-view.component.html',
  styleUrls: ['./about-view.component.css']
})
export class AboutViewComponent implements OnInit {
  isLoading: boolean = true;

  public about: AboutInterface;

  constructor(
      private settingsService: SettingsService) {
  }

  ngOnInit() {
    this.settingsService.getAbout().subscribe(about => {
      this.about = about;
      this.isLoading = false;
    })
  }
}
