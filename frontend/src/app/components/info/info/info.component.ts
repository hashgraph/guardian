import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-info',
    templateUrl: './info.component.html',
    styleUrls: ['./info.component.scss']
})
export class InfoComponent implements OnInit, OnDestroy {

    private subscription = new Subscription();

    public title: string = '';
    public message: string = '';

    constructor(private route: ActivatedRoute) {
    }

    ngOnInit(): void {
        this.subscription.add(
            this.route.queryParams.subscribe(params => {
                this.title = params['title'];
                this.message = params['message'];
            })
        );
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
    }
}
