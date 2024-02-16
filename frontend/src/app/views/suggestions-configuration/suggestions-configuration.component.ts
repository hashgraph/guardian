import {
    CdkDragDrop,
    moveItemInArray,
    transferArrayItem,
} from '@angular/cdk/drag-drop';
import { Component } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ModulesService } from 'src/app/services/modules.service';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { ConfigType, IUser, sortObjectsArray } from '@guardian/interfaces';
import { SuggestionsService } from 'src/app/services/suggestions.service';
import { ProfileService } from 'src/app/services/profile.service';
import { DndDropEvent } from 'ngx-drag-drop';

interface SuggestionsOrderPriorityItem {
    id: string;
    name: string;
    type: ConfigType;
}

@Component({
    selector: 'app-suggestions-configuration',
    templateUrl: './suggestions-configuration.component.html',
    styleUrls: ['./suggestions-configuration.component.scss'],
})
export class SuggestionsConfigurationComponent {
    isConfirmed: boolean = false;
    loading: boolean = false;
    policies: any[] = [];
    modules: any[] = [];
    policiesAndModules: SuggestionsOrderPriorityItem[] = [];
    suggestionsOrderPriority: SuggestionsOrderPriorityItem[] = [];

    constructor(
        private engineService: PolicyEngineService,
        private suggestionsService: SuggestionsService,
        private moduleService: ModulesService,
        private profileService: ProfileService
    ) {}

    ngOnInit() {
        this.loadProfile();
    }

    loadPoliciesAndModules() {
        this.loading = true;
        forkJoin([
            this.engineService.all(),
            this.suggestionsService.getSuggestionsConfig(),
            this.moduleService.menuList(),
        ]).subscribe(
            (result) => {
                this.loading = false;
                this.policies = result[0].map((item) => ({
                    id: item.id,
                    name: item.version
                        ? `${item.name} (${item.version})`
                        : item.name,
                    type: ConfigType.POLICY,
                }));
                this.modules = result[2].map((item) => ({
                    id: item.id,
                    name: item.version
                        ? `${item.name} (${item.version})`
                        : item.name,
                    type: ConfigType.MODULE,
                }));
                const suggestionsOrderPriorities = sortObjectsArray(
                    result[1].items,
                    'index'
                );
                this.suggestionsOrderPriority = suggestionsOrderPriorities
                    .map((suggestionsOrderPriority) =>
                        suggestionsOrderPriority.type === ConfigType.POLICY
                            ? this.policies.find(
                                  (item) =>
                                      item.id === suggestionsOrderPriority.id
                              )
                            : this.modules.find(
                                  (item) =>
                                      item.id === suggestionsOrderPriority.id
                              )
                    )
                    .filter((item) => !!item);
                const suggestionsOrderPriorityIds =
                    suggestionsOrderPriorities.map((item) => item.id);
                this.policiesAndModules = this.policies
                    .filter(
                        (item) => !suggestionsOrderPriorityIds.includes(item.id)
                    )
                    .concat(
                        this.modules.filter(
                            (item) =>
                                !suggestionsOrderPriorityIds.includes(item.id)
                        )
                    );
            },
            () => (this.loading = false)
        );
    }

    loadProfile() {
        this.loading = true;
        forkJoin([this.profileService.getProfile()]).subscribe(
            (value) => {
                this.loading = false;
                const profile: IUser | null = value[0];
                this.isConfirmed = !!(profile && profile.confirmed);
                if (this.isConfirmed) {
                    this.loadPoliciesAndModules();
                }
            },
            (error) => {
                this.loading = false;
                console.error(error);
            }
        );
    }

    drop(event: CdkDragDrop<SuggestionsOrderPriorityItem[]>) {
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
        this.suggestionsService
            .setSuggestionsConfig(
                this.suggestionsOrderPriority.map((item, index) => ({
                    id: item.id,
                    type: item.type as any,
                    index,
                }))
            )
            .subscribe({
                complete: () => (this.loading = false),
            });
    }

    clear() {
        this.policiesAndModules = [...this.policies, ...this.modules];
        this.suggestionsOrderPriority = [];
    }

    move(item: any) {
        transferArrayItem(
            this.policiesAndModules,
            this.suggestionsOrderPriority,
            this.policiesAndModules.indexOf(item),
            0
        );
    }

    remove(item: any) {
        transferArrayItem(
            this.suggestionsOrderPriority,
            this.policiesAndModules,
            this.suggestionsOrderPriority.indexOf(item),
            0
        );
    }

    onLeftDrop(event: DndDropEvent, policiesAndModules: SuggestionsOrderPriorityItem[]) {
        console.log('123');
    }
}
