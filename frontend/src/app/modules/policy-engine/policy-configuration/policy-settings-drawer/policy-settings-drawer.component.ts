import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IContract } from '@guardian/interfaces';
import { IPolicyCategory, PolicyTemplate } from '../../structures';

/**
 * Drawer that hosts the global configuration of whatever is being edited: a policy
 * (description, roles, navigation, groups, topics, tokens) or a tool/module
 * (description, inputs, outputs, variables). It reuses the existing `policy-properties`
 * and `module-properties` section views, relocating them out of the right rail so the
 * rail can focus on the selected block.
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

    @Input() rootType: 'Policy' | 'Module' | 'Tool' = 'Policy';

    @Input() policy!: PolicyTemplate;
    @Input() readonly: boolean = false;
    @Input() allCategories: any;
    @Input() policyCategories: IPolicyCategory[] = [];
    @Input() wipeContracts: IContract[] = [];

    @Input() module: any;
    @Input() moduleErrors: any;

    public section: string = 'Main';

    private readonly policySections: { id: string; label: string; icon: string }[] = [
        { id: 'Main', label: 'Description', icon: 'pi pi-info-circle' },
        { id: 'Role', label: 'Roles', icon: 'pi pi-users' },
        { id: 'Navigation', label: 'Navigation', icon: 'pi pi-compass' },
        { id: 'Groups', label: 'Groups', icon: 'pi pi-sitemap' },
        { id: 'Topics', label: 'Topics', icon: 'pi pi-comments' },
        { id: 'Tokens', label: 'Tokens', icon: 'pi pi-bitcoin' },
    ];

    private readonly moduleSections: { id: string; label: string; icon: string }[] = [
        { id: 'Main', label: 'Description', icon: 'pi pi-info-circle' },
        { id: 'Inputs', label: 'Inputs', icon: 'pi pi-sign-in' },
        { id: 'Outputs', label: 'Outputs', icon: 'pi pi-sign-out' },
        { id: 'Variables', label: 'Variables', icon: 'pi pi-sliders-h' },
    ];

    public get isPolicy(): boolean {
        return this.rootType === 'Policy';
    }

    public get sections(): { id: string; label: string; icon: string }[] {
        return this.isPolicy ? this.policySections : this.moduleSections;
    }

    public get title(): string {
        switch (this.rootType) {
            case 'Tool':
                return 'Tool Details';
            case 'Module':
                return 'Module Details';
            default:
                return 'Policy Details';
        }
    }

    public selectSection(id: string): void {
        this.section = id;
    }

    public close(): void {
        this.visible = false;
        this.visibleChange.emit(false);
    }
}
