import { Singleton } from '../decorators/singleton';

/**
 * Validate configuration
 */
@Singleton
export class ValidateConfiguration {
    /**
     * On configuration valid action
     * @private
     */
    private validAction: () => Promise<void>;

    /**
     * On configuration invalid action
     * @private
     */
    private invalidAction: () => Promise<void>;

    /**
     * Validator function
     * @private
     */
    private validator: () => Promise<boolean>;

    /**
     * Set configuration valid action
     * @param action
     */
    public setValidAction(action: () => Promise<void>) {
        if (this.validAction) {
            throw new Error('OnValid action was set before');
        }
        this.validAction = action;
    }

    /**
     * Set configuration invalid action
     * @param action
     */
    public setInvalidAction(action: () => Promise<void>) {
        if (this.invalidAction) {
            throw new Error('OnInvalid action was set before');
        }
        this.invalidAction = action;
    }

    /**
     * Set validator
     * @param validator
     */
    public setValidator(validator: () => Promise<boolean>) {
        if (this.validator) {
            throw new Error('Validator was set before');
        }
        this.validator = validator
    }

    /**
     * Validate and call callbacks
     */
    public async validate(): Promise<void> {
        if (
            !this.validAction ||
            !this.invalidAction ||
            !this.validator
        ) {
            throw new Error('Callbacks was not set')
        }
        if (await this.validator()) {
            await this.validAction()
        } else {
            await this.invalidAction()
        }
    }
}
