import {
    CdkDragDrop,
    moveItemInArray,
    transferArrayItem,
} from '@angular/cdk/drag-drop';
import { Component } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ModulesService } from 'src/app/services/modules.service';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { ConfigType, sortObjectsArray } from '@guardian/interfaces';

interface SuggestionOrderPriorityItem {
    id: string;
    name: string;
    type: ConfigType;
}

@Component({
    selector: 'app-suggestion-configuration',
    templateUrl: './suggestion-configuration.component.html',
    styleUrls: ['./suggestion-configuration.component.scss'],
})
export class SuggestionConfigurationComponent {
    loading: boolean = false;
    policies: any[] = [];
    modules: any[] = [];
    policiesAndModules: SuggestionOrderPriorityItem[] = [];
    suggestionOrderPriority: SuggestionOrderPriorityItem[] = [];

    constructor(
        private engineService: PolicyEngineService,
        private moduleService: ModulesService
    ) {}

    ngOnInit() {
        this.loading = true;
        forkJoin([
            this.engineService.all(),
            this.engineService.getSuggestionConfig(),
            this.moduleService.menuList(),
        ]).subscribe((result) => {
            this.loading = false;
            this.policies = result[0].map((item) => ({
                id: item.id,
                name: item.name,
                type: ConfigType.POLICY,
            }));
            this.modules = result[2].map((item) => ({
                id: item.id,
                name: item.name,
                type: ConfigType.MODULE,
            }));
            const suggestionOrderPriorities = sortObjectsArray(
                result[1],
                'index'
            );
            this.suggestionOrderPriority = suggestionOrderPriorities.map(
                (suggestionOrderPriority) =>
                    suggestionOrderPriority.type === ConfigType.POLICY
                        ? this.policies.find(
                              (item) => item.id === suggestionOrderPriority.id
                          )
                        : this.modules.find(
                              (item) => item.id === suggestionOrderPriority.id
                          )
            );
            const suggestionOrderPriorityIds = suggestionOrderPriorities.map(
                (item) => item.id
            );
            this.policiesAndModules = this.policies
                .filter((item) => !suggestionOrderPriorityIds.includes(item.id))
                .concat(
                    this.modules.filter(
                        (item) => !suggestionOrderPriorityIds.includes(item.id)
                    )
                );
        });
    }

    drop(event: CdkDragDrop<SuggestionOrderPriorityItem[]>) {
        if (event.previousContainer === event.container) {
            moveItemInArray(
                event.container.data,
                event.previousIndex,
                event.currentIndex
            );
        } else {
            transferArrayItem(
                event.previousContainer.data,
                event.container.data,
                event.previousIndex,
                event.currentIndex
            );
        }
    }

    apply() {
        this.loading = true;
        this.engineService
            .setSuggestionConfig(
                this.suggestionOrderPriority.map((item, index) => ({
                    id: item.id,
                    type: item.type as any,
                    index,
                }))
            )
            .subscribe(
                () => {},
                () => {},
                () => (this.loading = false)
            );
    }

    clear() {
        this.policiesAndModules = [...this.policies, ...this.modules];
        this.suggestionOrderPriority = [];
    }

    move(item: any) {
        transferArrayItem(
            this.policiesAndModules,
            this.suggestionOrderPriority,
            this.policiesAndModules.indexOf(item),
            0
        );
    }

    remove(item: any) {
        transferArrayItem(
            this.suggestionOrderPriority,
            this.policiesAndModules,
            this.suggestionOrderPriority.indexOf(item),
            0
        );
    }
}
