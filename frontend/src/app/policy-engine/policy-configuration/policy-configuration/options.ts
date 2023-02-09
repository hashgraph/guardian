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

        this._favorites = {};
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
            const json = localStorage.getItem('POLICY_CONFIG_FAVORITES');
            if (typeof json === 'string' && json.startsWith('{')) {
                const favorites = JSON.parse(json);
                if (typeof favorites === 'object') {
                    this._favorites = favorites;
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
            localStorage.setItem('POLICY_CONFIG_FAVORITES_GROUP', JSON.stringify(this.favoritesGroup));
            localStorage.setItem('POLICY_CONFIG_UI_GROUP', JSON.stringify(this.uiGroup));
            localStorage.setItem('POLICY_CONFIG_SERVER_GROUP', JSON.stringify(this.serverGroup));
            localStorage.setItem('POLICY_CONFIG_ADDONS_GROUP', JSON.stringify(this.addonsGroup));
            localStorage.setItem('POLICY_CONFIG_UN_GROUP', JSON.stringify(this.unGroup));
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

    public getFavorites(name: string): boolean {
        return !!this._favorites[name];
    }

    public setFavorites(name: string, value: boolean): void {
        this._favorites[name] = value;
    }

    public select(name: string) {
        if (name === 'components') {
            this.components = true;
        } else if (name === 'library') {
            this.library = true;
        } else if (name === 'description') {
            this.description = true;
        } else if (name === 'roles') {
            this.roles = true;
        } else if (name === 'groups') {
            this.groups = true;
        } else if (name === 'topics') {
            this.topics = true;
        } else if (name === 'tokens') {
            this.tokens = true;
        } else if (name === 'properties') {
            this.properties = true;
        } else if (name === 'artifacts') {
            this.artifacts = true;
        } else if (name === 'events') {
            this.events = true;
        } else if (name === 'json') {
            this.json = true;
        } else {
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
        } else {
            return;
        }
    }
}
