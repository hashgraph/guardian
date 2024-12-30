import { FormGroup, FormControl, Validators } from "@angular/forms";
import { IPolicyLabel, GenerateUUIDv4, IPolicyLabelConfig, IGroupItemConfig, NavItemType, IRulesItemConfig, ILabelItemConfig, IStatisticItemConfig } from "@guardian/interfaces";
import { TreeDragDropService } from "primeng/api";
import { DialogService } from "primeng/dynamicdialog";
import { Subject } from "rxjs";
import { CustomCustomDialogComponent } from "src/app/modules/common/custom-confirm-dialog/custom-confirm-dialog.component";
import { NavMenu, NavItem, NavTree } from "./nav-item";

export class LabelConfig {
    public show: boolean = false;
    public readonly: boolean = false;
    public stepper = [true, false, false];
    public policy: any;

    public readonly step = new Subject<number>();

    public groupTypes: any[] = [{
        label: 'At least one',
        value: 'one'
    }, {
        label: 'Every',
        value: 'every'
    }];

    constructor(
        private dialogService: DialogService,
        private dragDropService: TreeDragDropService
    ) {
    }

    public overviewForm = new FormGroup({
        name: new FormControl<string>('', Validators.required),
        description: new FormControl<string>(''),
        policy: new FormControl<string>('', Validators.required),
    });

    public menu = new NavMenu();

    public selectedNavItem: NavItem | null = null;
    public draggedMenuItem: NavItem | null = null;
    public navigationTree: NavTree = new NavTree();

    public setData(item: IPolicyLabel) {
        this.overviewForm.setValue({
            name: item.name || '',
            description: item.description || '',
            policy: this.policy?.name || '',
        });

        this.menu = NavMenu.from(item);
        this.navigationTree = NavTree.from(item);
        this.navigationTree.update();
        this.updateSelected();
    }

    public setPolicy(relationships: any) {
        this.policy = relationships?.policy || {};
    }

    public isActionStep(index: number): boolean {
        return this.stepper[index];
    }

    public async goToStep(index: number) {
        for (let i = 0; i < this.stepper.length; i++) {
            this.stepper[i] = (i == index);
        }
        return this.refreshView();
    }

    public async refreshView() {
        return new Promise<void>((resolve, reject) => {
            setTimeout(() => {
                resolve();
            }, 400);
        });
    }

    public onStep(index: number) {
        this.step.next(index);
    }

    public dragMenuStart(item: NavItem) {
        this.draggedMenuItem = item.clone();
        this.draggedMenuItem.setId(GenerateUUIDv4());
        this.dragDropService.startDrag({
            tree: null,
            node: this.draggedMenuItem,
            subNodes: [this.draggedMenuItem],
            index: 0,
            scope: "navigationTree"
        });
    }

    public dragMenuEnd() {
        this.draggedMenuItem = null;
    }

    public onDrop() {
        if (this.draggedMenuItem) {
            this.navigationTree.add(this.draggedMenuItem);
            this.navigationTree.update();
            this.draggedMenuItem = null;
        }
    }

    public onDropValidator($event: any) {
        if ($event.dropNode.freezed) {
            return;
        }
        $event.accept();
        this.navigationTree.update();
    }

    public onClearNavItem() {
        this.selectedNavItem = null;
    }

    public onNavItemSelect(node: NavItem) {
        this.selectedNavItem = node;
    }

    public updateSelected() {
        if (this.selectedNavItem) {
            const key = this.selectedNavItem.key;
            this.selectedNavItem = this.navigationTree.getItem(key);
        }
    }

    public ifNavSelected(node: NavItem) {
        if (this.selectedNavItem) {
            return this.selectedNavItem.key === node.key;
        }
        return false;
    }

    public onDeleteNavItem(node: NavItem) {
        const dialogRef = this.dialogService.open(CustomCustomDialogComponent, {
            showHeader: false,
            width: '640px',
            styleClass: 'guardian-dialog',
            data: {
                header: 'Delete item',
                text: 'Are you sure want to delete item?',
                buttons: [{
                    name: 'Close',
                    class: 'secondary'
                }, {
                    name: 'Delete',
                    class: 'delete'
                }]
            },
        });
        dialogRef.onClose.subscribe((result: string) => {
            if (result === 'Delete') {
                this.selectedNavItem = null;
                this.navigationTree.delete(node);
                this.navigationTree.update();
            }
        });
    }

    public toJson(): IPolicyLabelConfig {
        const imports = this.menu.toJson();
        const children = this.navigationTree.toJson();
        const json: IPolicyLabelConfig = {
            imports,
            children
        };
        return json;
    }

    public getGroupConfig(selectedNavItem: NavItem | null): IGroupItemConfig | null {
        if (selectedNavItem && selectedNavItem.blockType === NavItemType.Group) {
            return selectedNavItem.config as IGroupItemConfig;
        }
        return null;
    }

    public getRuleConfig(selectedNavItem: NavItem | null): IRulesItemConfig | null {
        if (selectedNavItem && selectedNavItem.blockType === NavItemType.Rules) {
            return selectedNavItem.config as IRulesItemConfig;
        }
        return null;
    }

    public getLabelConfig(selectedNavItem: NavItem | null): ILabelItemConfig | null {
        if (selectedNavItem && selectedNavItem.blockType === NavItemType.Label) {
            return selectedNavItem.config as ILabelItemConfig;
        }
        return null;
    }

    public getStatisticConfig(selectedNavItem: NavItem | null): IStatisticItemConfig | null {
        if (selectedNavItem && selectedNavItem.blockType === NavItemType.Statistic) {
            return selectedNavItem.config as IStatisticItemConfig;
        }
        return null;
    }
}
