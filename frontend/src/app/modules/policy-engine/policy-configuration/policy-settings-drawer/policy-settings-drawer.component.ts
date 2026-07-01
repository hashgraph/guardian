import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IContract } from '@guardian/interfaces';
import { IPolicyCategory, PolicyTemplate } from '../../structures';

/**
 * Drawer that hosts the global policy configuration (description, roles, navigation,
 * groups, topics, tokens). It reuses the existing `policy-properties` section views,
 * relocating them out of the right rail so the rail can focus on the selected block.
 */
@Component({
    selector: 'policy-settings-drawer',
    templateUrl: './policy-settings-drawer.component.html',
    styleUrls: ['./policy-settings-drawer.component.scss'],
    standalone: false
})
export class PolicySettingsDrawerComponent {
    @Input() visible: boolean = false;
    @Output() visibleChange = new EventEmitter<boolean>();

    @Input() policy!: PolicyTemplate;
    @Input() readonly: boolean = false;
    @Input() allCategories: any;
    @Input() policyCategories: IPolicyCategory[] = [];
    @Input() wipeContracts: IContract[] = [];

    public section: string = 'Main';
    public readonly sections: { id: string; label: string; icon: string }[] = [
        { id: 'Main', label: 'Description', icon: 'pi pi-info-circle' },
        { id: 'Role', label: 'Roles', icon: 'pi pi-users' },
        { id: 'Navigation', label: 'Navigation', icon: 'pi pi-compass' },
        { id: 'Groups', label: 'Groups', icon: 'pi pi-sitemap' },
        { id: 'Topics', label: 'Topics', icon: 'pi pi-comments' },
        { id: 'Tokens', label: 'Tokens', icon: 'pi pi-bitcoin' },
    ];

    public selectSection(id: string): void {
        this.section = id;
    }

    public close(): void {
        this.visible = false;
        this.visibleChange.emit(false);
    }
}
