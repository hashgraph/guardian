import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
    selector: 'app-schemas-configuration',
    templateUrl: './schemas-configuration.component.html',
    styleUrls: ['./schemas-configuration.component.scss'],
    standalone: false
})
export class SchemasConfigurationComponent implements OnInit, OnDestroy {
    public policyId: string;
    public loading: boolean = true;

    private destroy$ = new Subject<void>();

    constructor(private route: ActivatedRoute) {}

    public ngOnInit(): void {
        this.route.params
            .pipe(takeUntil(this.destroy$))
            .subscribe(params => {
                this.policyId = params['policyId'];
                this.loading = false;
            });
    }

    public ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
