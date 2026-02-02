import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AnalyticsService } from '@services/analytics.service';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { CommonModule } from '@angular/common';
import { ComparePolicyComponent } from '../compare-policy/compare-policy/compare-policy.component';
import { MergeLevel } from '@indexer/common';

enum ItemType {
    Document = 'document',
    Policy = 'policy',
    Module = 'module',
    Schema = 'schema',
    Tool = 'tool'
}

@Component({
    selector: 'app-compare',
    standalone: true,
    templateUrl: './compare.component.html',
    styleUrls: ['./compare.component.scss'],
    imports: [FormsModule, DropdownModule, CommonModule, ComparePolicyComponent]
})
export class CompareComponent implements OnInit {
    @Input() messageId!: string;

    public eventOptions = [
        { label: 'Exclude events', value: '0' },
        { label: 'Loose comparison', value: '1' },
        { label: 'Strict comparison', value: '2' }
    ];

    public propertyOptions = [
        { label: 'Exclude properties', value: '0' },
        { label: 'Loose comparison', value: '1' },
        { label: 'Strict comparison', value: '2' }
    ];

    public childrenOptions = [
        { label: 'Exclude child blocks', value: '0' },
        { label: 'Loose comparison', value: '1' },
        { label: 'Strict comparison', value: '2' }
    ];

    public uuidOptions = [
        { label: 'Exclude ID', value: '0' },
        { label: 'Strict comparison', value: '1' }
    ];

    public typeOptions: any[] = [
        { label: 'Tree', value: 'tree' },
        { label: 'Table', value: 'table' }
    ];

    public loading: boolean = true;
    public visibleType: string = this.typeOptions[0].value;
    public eventsLvl: string = this.eventOptions[2].value;
    public propLvl: string = this.propertyOptions[2].value;
    public childrenLvl: string = this.childrenOptions[2].value;
    public idLvl: string = this.uuidOptions[0].value;
    public needApplyFilters: boolean = false;
    public result: any;
    public total: any;

    public type: ItemType;
    public items: any[] = [];
    public parent: any;
    public error: any;

    public get isEventsLvl(): boolean {
        return this.type === ItemType.Policy;
    }

    public get isPropertiesLvl(): boolean {
        return this.type === ItemType.Policy;
    }

    public get isChildrenLvl(): boolean {
        return this.type === ItemType.Policy;
    }

    public get isUUIDLvl(): boolean {
        return this.type !== ItemType.Document;
    }

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private analyticsService: AnalyticsService,
    ) {
        this.type = ItemType.Policy;
    }

    ngOnInit() {
        this.route.queryParams.subscribe(_=> {
            this.loadData();
        });
    }

    loadData() {
        if(this.messageId) {
            this.loadOriginalPolicy(this.messageId);
        }

        this.needApplyFilters = false;
        this.loading = true;
        this.type = this.route.snapshot.queryParams['type'] || '';
        this.result = null;
    }
 
    private loadOriginalPolicy(messageId: string) {
        this.error = null;
        const options = {
            eventsLvl: this.eventsLvl,
            propLvl: this.propLvl,
            childrenLvl: this.childrenLvl,
            idLvl: this.idLvl,
        }

        this.analyticsService.comparePolicyOriginal(messageId, options).subscribe((value: any) => {
            this.result = value;
            this.total = this.result?.total;
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, ({ message }) => {
            this.loading = false;
            console.error(message);
        });
    }

    onChange(event: any) {
        if (event.type === 'params') {
            this.onFilters(event);
        }  
    }

    onFilters(event: MergeLevel) {
        this.eventsLvl = event.eventsLvl;
        this.propLvl = event.propLvl;
        this.childrenLvl = event.childrenLvl;
        this.idLvl = event.idLvl;
        this.loadData();
    }

    onBack() {
        const items = btoa(JSON.stringify(this.parent));
        this.router.navigate(['/compare'], {
            queryParams: {
                type: 'policy',
                items
            }
        });
    }

    onApply() {
        this.loadData();
    }

    onFilterChange() {
        this.needApplyFilters = true;
    }
}
