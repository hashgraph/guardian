export class Options {
    private _components: boolean;
    private _library: boolean;
    private _description: boolean;
    private _roles: boolean;
    private _groups: boolean;
    private _topics: boolean;
    private _tokens: boolean;
    private _properties: any;
    private _artifacts: any;
    private _events: any;
    private _json: any;
    private _favorites: any;

    private _favoritesGroup: boolean;
    private _uiGroup: boolean;
    private _serverGroup: boolean;
    private _addonsGroup: boolean;
    private _unGroup: boolean;

    private _rightTopMenu: boolean;
    private _rightBottomMenu: boolean;

    private _favoritesModulesGroup: boolean;
    private _defaultModulesGroup: boolean;
    private _customModulesGroup: boolean;

    private _descriptionModule: boolean;
    private _inputsModule: boolean;
    private _outputsModule: boolean;
    private _variablesModule: boolean;

    private _favoritesModules: any;

    constructor() {
        this._components = true;
        this._library = false;

        this._description = true;
        this._roles = false;
        this._groups = false;
        this._topics = false;
        this._tokens = false;

        this._properties = true;
        this._artifacts = false;
        this._events = false;
        this._json = false;

        this._favoritesGroup = false;
        this._uiGroup = false;
        this._serverGroup = false;
        this._addonsGroup = false;
        this._unGroup = false;

        this._rightTopMenu = false;
        this._rightBottomMenu = false;

        this._favoritesModulesGroup = false;
        this._defaultModulesGroup = false;
        this._customModulesGroup = false;

        this._descriptionModule = true;
        this._inputsModule = false;
        this._outputsModule = false;
        this._variablesModule = false;

        this._favorites = {};
        this._favoritesModules = {};
    }

    public load() {
        try {
            this.components = localStorage.getItem('POLICY_CONFIG_COMPONENTS') === 'true';
            this.library = localStorage.getItem('POLICY_CONFIG_LIBRARY') === 'true';
            this.description = localStorage.getItem('POLICY_CONFIG_DESCRIPTION') === 'true';
            this.roles = localStorage.getItem('POLICY_CONFIG_ROLES') === 'true';
            this.groups = localStorage.getItem('POLICY_CONFIG_GROUPS') === 'true';
            this.topics = localStorage.getItem('POLICY_CONFIG_TOPICS') === 'true';
            this.tokens = localStorage.getItem('POLICY_CONFIG_TOKENS') === 'true';
            this.properties = localStorage.getItem('POLICY_CONFIG_PROPERTIES') === 'true';
            this.artifacts = localStorage.getItem('POLICY_CONFIG_ARTIFACTS') === 'true';
            this.events = localStorage.getItem('POLICY_CONFIG_EVENTS') === 'true';
            this.json = localStorage.getItem('POLICY_CONFIG_JSON') === 'true';
            this.favoritesGroup = localStorage.getItem('POLICY_CONFIG_FAVORITES_GROUP') === 'true';
            this.uiGroup = localStorage.getItem('POLICY_CONFIG_UI_GROUP') === 'true';
            this.serverGroup = localStorage.getItem('POLICY_CONFIG_SERVER_GROUP') === 'true';
            this.addonsGroup = localStorage.getItem('POLICY_CONFIG_ADDONS_GROUP') === 'true';
            this.unGroup = localStorage.getItem('POLICY_CONFIG_UN_GROUP') === 'true';
            this.rightTopMenu = localStorage.getItem('POLICY_CONFIG_RIGHT_TOP') === 'true';
            this.rightBottomMenu = localStorage.getItem('POLICY_CONFIG_RIGHT_BOTTOM') === 'true';
            this.favoritesModulesGroup = localStorage.getItem('POLICY_CONFIG_FAVORITES_MODULES_GROUP') === 'true';
            this.defaultModulesGroup = localStorage.getItem('POLICY_CONFIG_DEFAULT_MODULES_GROUP') === 'true';
            this.customModulesGroup = localStorage.getItem('POLICY_CONFIG_CUSTOM_MODULES_GROUP') === 'true';
            this.descriptionModule = localStorage.getItem('POLICY_CONFIG_DESCRIPTION_MODULE') === 'true';
            this.inputsModule = localStorage.getItem('POLICY_CONFIG_INPUTS_MODULE') === 'true';
            this.outputsModule = localStorage.getItem('POLICY_CONFIG_OUTPUTS_MODULE') === 'true';
            this.variablesModule = localStorage.getItem('POLICY_CONFIG_VARIABLES_MODULE') === 'true';

            const json1 = localStorage.getItem('POLICY_CONFIG_FAVORITES');
            if (typeof json1 === 'string' && json1.startsWith('{')) {
                const favorites = JSON.parse(json1);
                if (typeof favorites === 'object') {
                    this._favorites = favorites;
                }
            }

            const json2 = localStorage.getItem('POLICY_CONFIG_FAVORITES_MODULES');
            if (typeof json2 === 'string' && json2.startsWith('{')) {
                const favorites = JSON.parse(json2);
                if (typeof favorites === 'object') {
                    this._favoritesModules = favorites;
                }
            }
        } catch (error) {
            console.error(error);
        }
    }

    public save() {
        try {
            localStorage.setItem('POLICY_CONFIG_COMPONENTS', String(this.components));
            localStorage.setItem('POLICY_CONFIG_LIBRARY', String(this.library));
            localStorage.setItem('POLICY_CONFIG_DESCRIPTION', String(this.description));
            localStorage.setItem('POLICY_CONFIG_ROLES', String(this.roles));
            localStorage.setItem('POLICY_CONFIG_GROUPS', String(this.groups));
            localStorage.setItem('POLICY_CONFIG_TOPICS', String(this.topics));
            localStorage.setItem('POLICY_CONFIG_TOKENS', String(this.tokens));
            localStorage.setItem('POLICY_CONFIG_PROPERTIES', String(this.properties));
            localStorage.setItem('POLICY_CONFIG_ARTIFACTS', String(this.artifacts));
            localStorage.setItem('POLICY_CONFIG_EVENTS', String(this.events));
            localStorage.setItem('POLICY_CONFIG_JSON', String(this.json));
            localStorage.setItem('POLICY_CONFIG_FAVORITES', JSON.stringify(this._favorites));
            localStorage.setItem('POLICY_CONFIG_FAVORITES_GROUP', String(this.favoritesGroup));
            localStorage.setItem('POLICY_CONFIG_UI_GROUP', String(this.uiGroup));
            localStorage.setItem('POLICY_CONFIG_SERVER_GROUP', String(this.serverGroup));
            localStorage.setItem('POLICY_CONFIG_ADDONS_GROUP', String(this.addonsGroup));
            localStorage.setItem('POLICY_CONFIG_UN_GROUP', String(this.unGroup));
            localStorage.setItem('POLICY_CONFIG_JSON', String(this.rightTopMenu));
            localStorage.setItem('POLICY_CONFIG_JSON', String(this.rightBottomMenu));
            localStorage.setItem('POLICY_CONFIG_FAVORITES_MODULES_GROUP', String(this.favoritesModulesGroup));
            localStorage.setItem('POLICY_CONFIG_DEFAULT_MODULES_GROUP', String(this.defaultModulesGroup));
            localStorage.setItem('POLICY_CONFIG_CUSTOM_MODULES_GROUP', String(this.customModulesGroup));
            localStorage.setItem('POLICY_CONFIG_FAVORITES_MODULES', JSON.stringify(this._favoritesModules));
            localStorage.setItem('POLICY_CONFIG_DESCRIPTION_MODULE', String(this.descriptionModule));
            localStorage.setItem('POLICY_CONFIG_INPUTS_MODULE', String(this.inputsModule));
            localStorage.setItem('POLICY_CONFIG_OUTPUTS_MODULE', String(this.outputsModule));
            localStorage.setItem('POLICY_CONFIG_VARIABLES_MODULE', String(this.variablesModule));
        } catch (error) {
            console.error(error);
        }
    }

    public get components() {
        return this._components;
    }

    public get library() {
        return this._library;
    }

    public get description() {
        return this._description;
    }

    public get roles() {
        return this._roles;
    }

    public get groups() {
        return this._groups;
    }

    public get topics() {
        return this._topics;
    }

    public get tokens() {
        return this._tokens;
    }

    public get properties() {
        return this._properties;
    }

    public get artifacts() {
        return this._artifacts;
    }

    public get events() {
        return this._events;
    }

    public get json() {
        return this._json;
    }

    public get favoritesGroup() {
        return this._favoritesGroup;
    }
    public get uiGroup() {
        return this._uiGroup;
    }
    public get serverGroup() {
        return this._serverGroup;
    }
    public get addonsGroup() {
        return this._addonsGroup;
    }
    public get unGroup() {
        return this._unGroup;
    }
    public get rightTopMenu() {
        return this._rightTopMenu;
    }
    public get rightBottomMenu() {
        return this._rightBottomMenu;
    }
    public get favoritesModulesGroup() {
        return this._favoritesModulesGroup;
    }
    public get defaultModulesGroup() {
        return this._defaultModulesGroup;
    }
    public get customModulesGroup() {
        return this._customModulesGroup;
    }
    public get descriptionModule() {
        return this._descriptionModule;
    }
    public get inputsModule() {
        return this._inputsModule;
    }
    public get outputsModule() {
        return this._outputsModule;
    }
    public get variablesModule() {
        return this._variablesModule;
    }

    public set components(value: boolean) {
        if (value) {
            this._components = true;
            this._library = false;
        }
    }

    public set library(value: boolean) {
        if (value) {
            this._components = false;
            this._library = true;
        }
    }

    public set description(value: boolean) {
        if (value) {
            this._description = true;
            this._roles = false;
            this._groups = false;
            this._topics = false;
            this._tokens = false;
        }
    }

    public set roles(value: boolean) {
        if (value) {
            this._description = false;
            this._roles = true;
            this._groups = false;
            this._topics = false;
            this._tokens = false;
        }
    }

    public set groups(value: boolean) {
        if (value) {
            this._description = false;
            this._roles = false;
            this._groups = true;
            this._topics = false;
            this._tokens = false;
        }
    }

    public set topics(value: boolean) {
        if (value) {
            this._description = false;
            this._roles = false;
            this._groups = false;
            this._topics = true;
            this._tokens = false;
        }
    }

    public set tokens(value: boolean) {
        if (value) {
            this._description = false;
            this._roles = false;
            this._groups = false;
            this._topics = false;
            this._tokens = true;
        }
    }

    public set properties(value: boolean) {
        if (value) {
            this._properties = true;
            this._events = false;
            this._artifacts = false;
            this._json = false;
        }
    }
    public set events(value: boolean) {
        if (value) {
            this._properties = false;
            this._events = true;
            this._artifacts = false;
            this._json = false;
        }
    }
    public set artifacts(value: boolean) {
        if (value) {
            this._properties = false;
            this._events = false;
            this._artifacts = true;
            this._json = false;
        }
    }
    public set json(value: boolean) {
        if (value) {
            this._properties = false;
            this._events = false;
            this._artifacts = false;
            this._json = true;
        }
    }

    public set descriptionModule(value: boolean) {
        if (value) {
            this._descriptionModule = true;
            this._inputsModule = false;
            this._outputsModule = false;
            this._variablesModule = false;
        }
    }

    public set inputsModule(value: boolean) {
        if (value) {
            this._descriptionModule = false;
            this._inputsModule = true;
            this._outputsModule = false;
            this._variablesModule = false;
        }
    }

    public set outputsModule(value: boolean) {
        if (value) {
            this._descriptionModule = false;
            this._inputsModule = false;
            this._outputsModule = true;
            this._variablesModule = false;
        }
    }

    public set variablesModule(value: boolean) {
        if (value) {
            this._descriptionModule = false;
            this._inputsModule = false;
            this._outputsModule = false;
            this._variablesModule = true;
        }
    }

    public set favoritesGroup(value: boolean) {
        this._favoritesGroup = value;
    }

    public set uiGroup(value: boolean) {
        this._uiGroup = value;
    }

    public set serverGroup(value: boolean) {
        this._serverGroup = value;
    }

    public set addonsGroup(value: boolean) {
        this._addonsGroup = value;
    }

    public set unGroup(value: boolean) {
        this._unGroup = value;
    }

    public set rightTopMenu(value: boolean) {
        this._rightTopMenu = value;
    }

    public set rightBottomMenu(value: boolean) {
        this._rightBottomMenu = value;
    }

    public set favoritesModulesGroup(value: boolean) {
        this._favoritesModulesGroup = value;
    }

    public set defaultModulesGroup(value: boolean) {
        this._defaultModulesGroup = value;
    }

    public set customModulesGroup(value: boolean) {
        this._customModulesGroup = value;
    }

    public getFavorite(name: string): boolean {
        return !!this._favorites[name];
    }

    public setFavorite(name: string, value: boolean): void {
        this._favorites[name] = value;
    }

    public getModuleFavorite(name: string): boolean {
        return !!this._favoritesModules[name];
    }

    public setModuleFavorite(name: string, value: boolean): void {
        if (value) {
            this._favoritesModules[name] = value;
        } else {
            delete this._favoritesModules[name];
        }
    }

    public select(name: string) {
        switch (name) {
            case 'components':
                this.components = true;
                break;
            case 'library':
                this.library = true;
                break;
            case 'description':
                this.description = true;
                break;
            case 'roles':
                this.roles = true;
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
        } else {
            return;
        }
    }
}
