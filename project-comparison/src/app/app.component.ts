import { Component, HostListener, OnChanges, OnDestroy, OnInit } from '@angular/core';
import { environment } from '../environments/environment';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnChanges, OnDestroy {
    applicationName: string = 'GUARDIAN';
    whiteMenuActive: boolean = false;
    private loginUrl: string = environment.loginUrl;

    constructor(private router: Router,
                private titleService: Title) {
    }

    ngOnInit(): void {
        this.router.events
            .pipe(
                filter((event) => event instanceof NavigationEnd),
                map(() => {
                    let route: ActivatedRoute = this.router.routerState.root;
                    let routeTitle = '';
                    while (route!.firstChild) {
                        route = route.firstChild;
                    }
                    if (route.snapshot.data['title']) {
                        routeTitle = route!.snapshot.data['title'];
                    }
                    return routeTitle;
                })
            )
            .subscribe((title: string) => {
                if (title) {
                    this.titleService.setTitle(`${title}`);
                }
            });
    }

    ngOnChanges(): void {
        return;
    }

    ngOnDestroy(): void {
        return;
    }

    navigateToLogin() {
        window.open(this.loginUrl, '_blank');
    }

    @HostListener('window:scroll', ['$event'])
    public onScroll($event: Event) {
        const verticalOffset = document.documentElement.scrollTop || document.body.scrollTop || 0;
        this.whiteMenuActive = verticalOffset > 300;
    }
}
