import { Singleton } from '../decorators/singleton';
import { Logger } from './logger';
import { GenerateUUIDv4, IGetKeyResponse, WalletEvents } from '@guardian/interfaces';
import { NatsService } from '../mq';

/**
 * Application settings container
 */
@Singleton
export class SettingsContainerOLD extends NatsService {
    /**
     * Message queue name
     */
    public messageQueueName = 'settings-queue';

    /**
     * Reply subject
     * @private
     */
    public replySubject = 'settings-reply-' + GenerateUUIDv4();

    /**
     * Initialized flag
     * @private
     */
    private initialized: boolean;

    /**
     * Settings object
     * @private
     */
    private readonly _settings: {[key: string]: string};

    /**
     * Settings getter
     */
    public get settings(): {[key: string]: string} {
        if (!this.initialized) {
            throw new Error('Settings container was not initialized');
        }
        return this._settings;
    }

    constructor() {
        super();
        this.initialized = false;
        this._settings = {};
    }

    /**
     * Initialize settings
     */
    public async init(...settings: string[]): Promise<void> {
        await super.init();
        if (this.initialized) {
            throw new Error('Settings already initialized');
        }

        for (const setting of settings) {
            this._settings[setting] = await this.getGlobalApplicationKey(setting);

            if (!this._settings[setting] && process.env[setting]) {
                await this.setGlobalApplicationKey(setting,  process.env[setting]);
                await new Logger().info(`${setting} was set from environment`, ['GUARDIAN_SERVICE']);
            }
        }

        this.initialized = true;
    }

    /**
     * Request settings from valut
     */
    public async requestSettings(): Promise<void> {
        for (const setting of Object.keys(this._settings)) {
            this._settings[setting] = await this.getGlobalApplicationKey(setting);

            if (!this._settings[setting] && process.env[setting]) {
                await this.setGlobalApplicationKey(setting,  process.env[setting]);
                await new Logger().info(`${setting} was set from environment`, ['GUARDIAN_SERVICE']);
            }
        }
    }

    /**
     * Update key
     * @param name
     * @param value
     */
    public async updateSetting(name: string, value: string): Promise<void> {
        if (!Object.keys(this._settings).includes(name)) {
            throw new Error(`${name} setting was not registered`);
        }
        await this.setGlobalApplicationKey(name, value);
    }

    /**
     * Get global application key
     * @param type
     */
    private async getGlobalApplicationKey(type: string): Promise<string> {
        const item = await this.sendMessage<IGetKeyResponse>(WalletEvents.GET_GLOBAL_APPLICATION_KEY, { type });
        return item.key
    }

    /**
     * Set global application key
     * @param type
     */
    private async setGlobalApplicationKey(type: string, key: string): Promise<void> {
        await this.sendMessage<IGetKeyResponse>(WalletEvents.SET_GLOBAL_APPLICATION_KEY, { type, key });
        this._settings[type] = key;
    }
}
