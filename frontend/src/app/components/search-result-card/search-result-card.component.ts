import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';

/**
 * The page with guided policy search
 */
@Component({
    selector: 'app-search-result-card',
    templateUrl: './search-result-card.component.html',
    styleUrls: ['./search-result-card.component.scss']
})
export class SearchResultCardComponent implements OnInit {

    @Input() id: string;
    @Input() label: string;
    @Input() text: string;
    @Input() detailsUrl!: string;

    constructor(private router: Router) {
    }

    ngOnInit() {

    }

    ngOnDestroy(): void {
    }

    onRegisterProject(id: string): void {
        this.router.navigate(['/policy-viewer', id]);
    };

    onLearnMore(): void {
        let url: string = '';
        if (!/^http[s]?:\/\//.test(this.detailsUrl)) {
            url += 'http://';
        }
        url += this.detailsUrl;
        window.open(url, '_blank');
    };
}
