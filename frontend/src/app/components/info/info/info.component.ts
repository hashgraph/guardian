import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-info',
    templateUrl: './info.component.html',
    styleUrls: ['./info.component.css']
})
export class InfoComponent implements OnInit, OnDestroy {

    private subscription = new Subscription();

    public message: string = '';

    constructor(private route: ActivatedRoute) {
    }

    ngOnInit(): void {
        this.subscription.add(
            this.route.queryParams.subscribe(params => {
                this.message = params['message'];
            })
        );
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
    }
}
