import { BooleanProperty } from "./boolean-prop";
import { ObjectProperty } from "./object-prop";

export class Options {
    private readonly _components: BooleanProperty;
    private readonly _moduleLibrary: BooleanProperty;
    private readonly _toolLibrary: BooleanProperty;
    private readonly _description: BooleanProperty;
    private readonly _roles: BooleanProperty;
    private readonly _navigation: BooleanProperty;
    private readonly _groups: BooleanProperty;
    private readonly _topics: BooleanProperty;
    private readonly _tokens: BooleanProperty;
    private readonly _properties: BooleanProperty;
    private readonly _artifacts: BooleanProperty;
    private readonly _events: BooleanProperty;
    private readonly _json: BooleanProperty;
    private readonly _favoritesGroup: BooleanProperty;
    private readonly _uiGroup: BooleanProperty;
    private readonly _serverGroup: BooleanProperty;
    private readonly _addonsGroup: BooleanProperty;
    private readonly _unGroup: BooleanProperty;
    private readonly _rightTopMenu: BooleanProperty;
    private readonly _rightBottomMenu: BooleanProperty;
    private readonly _favoritesModulesGroup: BooleanProperty;
    private readonly _defaultModulesGroup: BooleanProperty;
    private readonly _customModulesGroup: BooleanProperty;
    private readonly _customToolsGroup: BooleanProperty;
    private readonly _descriptionModule: BooleanProperty;
    private readonly _inputsModule: BooleanProperty;
    private readonly _outputsModule: BooleanProperty;
    private readonly _variablesModule: BooleanProperty;
    private readonly _favorites: ObjectProperty<boolean>;
    private readonly _favoritesModules: ObjectProperty<boolean>;
    private readonly _legendActive: BooleanProperty;

    constructor() {
        const prefix = 'POLICY_CONFIG_';
        this._components = new BooleanProperty(prefix + 'COMPONENTS', true);
        this._moduleLibrary = new BooleanProperty(prefix + 'MODULE_LIBRARY', false);
        this._toolLibrary = new BooleanProperty(prefix + 'TOOL_LIBRARY', false);
        this._description = new BooleanProperty(prefix + 'DESCRIPTION', true);
        this._roles = new BooleanProperty(prefix + 'ROLES', false);
        this._navigation = new BooleanProperty(prefix + 'NAVIGATION', false);
        this._groups = new BooleanProperty(prefix + 'GROUPS', false);
        this._topics = new BooleanProperty(prefix + 'TOPICS', false);
        this._tokens = new BooleanProperty(prefix + 'TOKENS', false);
        this._properties = new BooleanProperty(prefix + 'PROPERTIES', true);
        this._artifacts = new BooleanProperty(prefix + 'ARTIFACTS', false);
        this._events = new BooleanProperty(prefix + 'EVENTS', false);
        this._json = new BooleanProperty(prefix + 'JSON', false);
        this._favoritesGroup = new BooleanProperty(prefix + 'FAVORITES_GROUP', false);
        this._uiGroup = new BooleanProperty(prefix + 'UI_GROUP', false);
        this._serverGroup = new BooleanProperty(prefix + 'SERVER_GROUP', false);
        this._addonsGroup = new BooleanProperty(prefix + 'ADDONS_GROUP', false);
        this._unGroup = new BooleanProperty(prefix + 'UN_GROUP', false);
        this._rightTopMenu = new BooleanProperty(prefix + 'RIGHT_TOP', false);
        this._rightBottomMenu = new BooleanProperty(prefix + 'RIGHT_BOTTOM', false);
        this._favoritesModulesGroup = new BooleanProperty(prefix + 'FAVORITES_MODULES_GROUP', false);
        this._defaultModulesGroup = new BooleanProperty(prefix + 'DEFAULT_MODULES_GROUP', false);
        this._customModulesGroup = new BooleanProperty(prefix + 'CUSTOM_TOOLS_GROUP', false);
        this._customToolsGroup = new BooleanProperty(prefix + 'CUSTOM_MODULES_GROUP', false);
        this._descriptionModule = new BooleanProperty(prefix + 'DESCRIPTION_MODULE', true);
        this._inputsModule = new BooleanProperty(prefix + 'INPUTS_MODULE', false);
        this._outputsModule = new BooleanProperty(prefix + 'OUTPUTS_MODULE', false);
        this._variablesModule = new BooleanProperty(prefix + 'VARIABLES_MODULE', false);
        this._favorites = new ObjectProperty(prefix + 'FAVORITES', {});
        this._favoritesModules = new ObjectProperty(prefix + 'FAVORITES_MODULES', {});
        this._legendActive = new BooleanProperty(prefix + 'LEGEND', true);
    }

    public load() {
        try {
            this.components = this._components.load();
            this.moduleLibrary = this._moduleLibrary.load();
            this.toolLibrary = this._toolLibrary.load();
            this.description = this._description.load();
            this.roles = this._roles.load();
            this.navigation = this._navigation.load();
            this.groups = this._groups.load();
            this.topics = this._topics.load();
            this.tokens = this._tokens.load();
            this.properties = this._properties.load();
            this.artifacts = this._artifacts.load();
            this.events = this._events.load();
            this.json = this._json.load();
            this.favoritesGroup = this._favoritesGroup.load();
            this.uiGroup = this._uiGroup.load();
            this.serverGroup = this._serverGroup.load();
            this.addonsGroup = this._addonsGroup.load();
            this.unGroup = this._unGroup.load();
            this.rightTopMenu = this._rightTopMenu.load();
            this.rightBottomMenu = this._rightBottomMenu.load();
            this.favoritesModulesGroup = this._favoritesModulesGroup.load();
            this.defaultModulesGroup = this._defaultModulesGroup.load();
            this.customModulesGroup = this._customModulesGroup.load();
            this.customToolsGroup = this._customToolsGroup.load();
            this.descriptionModule = this._descriptionModule.load();
            this.inputsModule = this._inputsModule.load();
            this.outputsModule = this._outputsModule.load();
            this.variablesModule = this._variablesModule.load();
            this.legendActive = this._legendActive.load();
            this._favorites.load();
            this._favoritesModules.load();
        } catch (error) {
            console.error(error);
        }
    }

    public save() {
        try {
            this._components.save();
            this._moduleLibrary.save();
            this._toolLibrary.save();
            this._description.save();
            this._roles.save();
            this._navigation.save();
            this._groups.save();
            this._topics.save();
            this._tokens.save();
            this._properties.save();
            this._artifacts.save();
            this._events.save();
            this._json.save();
            this._favorites.save();
            this._favoritesGroup.save();
            this._uiGroup.save();
            this._serverGroup.save();
            this._addonsGroup.save();
            this._unGroup.save();
            this._rightTopMenu.save();
            this._rightBottomMenu.save();
            this._favoritesModulesGroup.save();
            this._defaultModulesGroup.save();
            this._customModulesGroup.save();
            this._customToolsGroup.save();
            this._favoritesModules.save();
            this._descriptionModule.save();
            this._inputsModule.save();
            this._outputsModule.save();
            this._variablesModule.save();
            this._legendActive.save();
        } catch (error) {
            console.error(error);
        }
    }

    public get components(): boolean {
        return this._components.value;
    }

    public get moduleLibrary(): boolean {
        return this._moduleLibrary.value;
    }

    public get toolLibrary(): boolean {
        return this._toolLibrary.value;
    }

    public get description(): boolean {
        return this._description.value;
    }

    public get roles(): boolean {
        return this._roles.value;
    }

    public get navigation(): boolean {
        return this._navigation.value;
    }

    public get groups(): boolean {
        return this._groups.value;
    }

    public get topics(): boolean {
        return this._topics.value;
    }

    public get tokens(): boolean {
        return this._tokens.value;
    }

    public get properties(): boolean {
        return this._properties.value;
    }

    public get artifacts(): boolean {
        return this._artifacts.value;
    }

    public get events(): boolean {
        return this._events.value;
    }

    public get json(): boolean {
        return this._json.value;
    }

    public get favoritesGroup(): boolean {
        return this._favoritesGroup.value;
    }

    public get uiGroup(): boolean {
        return this._uiGroup.value;
    }

    public get serverGroup(): boolean {
        return this._serverGroup.value;
    }

    public get addonsGroup(): boolean {
        return this._addonsGroup.value;
    }

    public get unGroup(): boolean {
        return this._unGroup.value;
    }

    public get rightTopMenu(): boolean {
        return this._rightTopMenu.value;
    }

    public get rightBottomMenu(): boolean {
        return this._rightBottomMenu.value;
    }

    public get favoritesModulesGroup(): boolean {
        return this._favoritesModulesGroup.value;
    }

    public get defaultModulesGroup(): boolean {
        return this._defaultModulesGroup.value;
    }

    public get customModulesGroup(): boolean {
        return this._customModulesGroup.value;
    }

    public get customToolsGroup(): boolean {
        return this._customToolsGroup.value;
    }

    public get descriptionModule(): boolean {
        return this._descriptionModule.value;
    }

    public get inputsModule(): boolean {
        return this._inputsModule.value;
    }

    public get outputsModule(): boolean {
        return this._outputsModule.value;
    }

    public get variablesModule(): boolean {
        return this._variablesModule.value;
    }

    public get legendActive(): boolean {
        return this._legendActive.value;
    }

    public set components(value: boolean) {
        if (value) {
            this._components.value = true;
            this._moduleLibrary.value = false;
            this._toolLibrary.value = false;
        }
    }

    public set moduleLibrary(value: boolean) {
        if (value) {
            this._components.value = false;
            this._moduleLibrary.value = true;
            this._toolLibrary.value = false;
        }
    }

    public set toolLibrary(value: boolean) {
        if (value) {
            this._components.value = false;
            this._moduleLibrary.value = false;
            this._toolLibrary.value = true;
        }
    }

    public set description(value: boolean) {
        if (value) {
            this._description.value = true;
            this._roles.value = false;
            this._navigation.value = false;
            this._groups.value = false;
            this._topics.value = false;
            this._tokens.value = false;
        }
    }

    public set roles(value: boolean) {
        if (value) {
            this._description.value = false;
            this._roles.value = true;
            this._navigation.value = false;
            this._groups.value = false;
            this._topics.value = false;
            this._tokens.value = false;
        }
    }

    public set navigation(value: boolean) {
        if (value) {
            this._description.value = false;
            this._roles.value = false;
            this._navigation.value = true;
            this._groups.value = false;
            this._topics.value = false;
            this._tokens.value = false;
        }
    }

    public set groups(value: boolean) {
        if (value) {
            this._description.value = false;
            this._roles.value = false;
            this._navigation.value = false;
            this._groups.value = true;
            this._topics.value = false;
            this._tokens.value = false;
        }
    }

    public set topics(value: boolean) {
        if (value) {
            this._description.value = false;
            this._roles.value = false;
            this._navigation.value = false;
            this._groups.value = false;
            this._topics.value = true;
            this._tokens.value = false;
        }
    }

    public set tokens(value: boolean) {
        if (value) {
            this._description.value = false;
            this._roles.value = false;
            this._navigation.value = false;
            this._groups.value = false;
            this._topics.value = false;
            this._tokens.value = true;
        }
    }

    public set properties(value: boolean) {
        if (value) {
            this._properties.value = true;
            this._events.value = false;
            this._artifacts.value = false;
            this._json.value = false;
        }
    }
    public set events(value: boolean) {
        if (value) {
            this._properties.value = false;
            this._events.value = true;
            this._artifacts.value = false;
            this._json.value = false;
        }
    }
    public set artifacts(value: boolean) {
        if (value) {
            this._properties.value = false;
            this._events.value = false;
            this._artifacts.value = true;
            this._json.value = false;
        }
    }
    public set json(value: boolean) {
        if (value) {
            this._properties.value = false;
            this._events.value = false;
            this._artifacts.value = false;
            this._json.value = true;
        }
    }

    public set descriptionModule(value: boolean) {
        if (value) {
            this._descriptionModule.value = true;
            this._inputsModule.value = false;
            this._outputsModule.value = false;
            this._variablesModule.value = false;
        }
    }

    public set inputsModule(value: boolean) {
        if (value) {
            this._descriptionModule.value = false;
            this._inputsModule.value = true;
            this._outputsModule.value = false;
            this._variablesModule.value = false;
        }
    }

    public set outputsModule(value: boolean) {
        if (value) {
            this._descriptionModule.value = false;
            this._inputsModule.value = false;
            this._outputsModule.value = true;
            this._variablesModule.value = false;
        }
    }

    public set variablesModule(value: boolean) {
        if (value) {
            this._descriptionModule.value = false;
            this._inputsModule.value = false;
            this._outputsModule.value = false;
            this._variablesModule.value = true;
        }
    }

    public set favoritesGroup(value: boolean) {
        this._favoritesGroup.value = value;
    }

    public set uiGroup(value: boolean) {
        this._uiGroup.value = value;
    }

    public set serverGroup(value: boolean) {
        this._serverGroup.value = value;
    }

    public set addonsGroup(value: boolean) {
        this._addonsGroup.value = value;
    }

    public set unGroup(value: boolean) {
        this._unGroup.value = value;
    }

    public set rightTopMenu(value: boolean) {
        this._rightTopMenu.value = value;
    }

    public set rightBottomMenu(value: boolean) {
        this._rightBottomMenu.value = value;
    }

    public set favoritesModulesGroup(value: boolean) {
        this._favoritesModulesGroup.value = value;
    }

    public set defaultModulesGroup(value: boolean) {
        this._defaultModulesGroup.value = value;
    }

    public set customModulesGroup(value: boolean) {
        this._customModulesGroup.value = value;
    }

    public set customToolsGroup(value: boolean) {
        this._customToolsGroup.value = value;
    }

    public set legendActive(value: boolean) {
        this._legendActive.value = value;
    }

    public getFavorite(name: string): boolean {
        return !!this._favorites.get(name);
    }

    public setFavorite(name: string, value: boolean): void {
        this._favorites.set(name, value);
    }

    public getModuleFavorite(name: string): boolean {
        return !!this._favoritesModules.get(name);
    }

    public setModuleFavorite(name: string, value: boolean): void {
        if (value) {
            this._favoritesModules.set(name, value);
        } else {
            this._favoritesModules.delete(name);
        }
    }

    public select(name: string) {
        switch (name) {
            case 'components':
                this.components = true;
                break;
            case 'moduleLibrary':
                this.moduleLibrary = true;
                break;
            case 'toolLibrary':
                this.toolLibrary = true;
                break;
            case 'description':
                this.description = true;
                break;
            case 'roles':
                this.roles = true;
                break;
            case 'navigation':
                this.navigation = true;
                break;
            case 'groups':
                this.groups = true;
                break;
            case 'topics':
                this.topics = true;
                break;
            case 'tokens':
                this.tokens = true;
                break;
            case 'properties':
                this.properties = true;
                break;
            case 'artifacts':
                this.artifacts = true;
                break;
            case 'events':
                this.events = true;
                break;
            case 'json':
                this.json = true;
                break;
            case 'descriptionModule':
                this.descriptionModule = true;
                break;
            case 'inputsModule':
                this.inputsModule = true;
                break;
            case 'outputsModule':
                this.outputsModule = true;
                break;
            case 'variablesModule':
                this.variablesModule = true;
                break;
            default:
                return;
        }
    }

    public collapse(name: string) {
        if (name === 'favoritesGroup') {
            this.favoritesGroup = !this.favoritesGroup;
        } else if (name === 'uiGroup') {
            this.uiGroup = !this.uiGroup;
        } else if (name === 'serverGroup') {
            this.serverGroup = !this.serverGroup;
        } else if (name === 'addonsGroup') {
            this.addonsGroup = !this.addonsGroup;
        } else if (name === 'unGroup') {
            this.unGroup = !this.unGroup;
        } else if (name === 'rightTopMenu') {
            this.rightTopMenu = !this.rightTopMenu;
        } else if (name === 'rightBottomMenu') {
            this.rightBottomMenu = !this.rightBottomMenu;
        } else if (name === 'customModulesGroup') {
            this.customModulesGroup = !this.customModulesGroup;
        } else if (name === 'defaultModulesGroup') {
            this.defaultModulesGroup = !this.defaultModulesGroup;
        } else if (name === 'favoritesModulesGroup') {
            this.favoritesModulesGroup = !this.favoritesModulesGroup;
        } else if (name === 'customToolsGroup') {
            this.customToolsGroup = !this.customToolsGroup;
        } else {
            return;
        }
    }
    public change(name: string) {
        switch (name) {
            case 'legendActive':
                this.legendActive = !this.legendActive;
                break;
            default:
                return;
        }
    }
}
