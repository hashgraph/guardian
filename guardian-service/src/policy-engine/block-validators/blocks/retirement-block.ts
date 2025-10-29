import { BlockValidator, IBlockProp } from '../index.js';
import { CommonBlock } from './common.js';

/**
 * Retirement block
 */
export class RetirementBlock {
    /**
     * Block type
     */
    public static readonly blockType: string = 'retirementDocumentBlock';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        try {
            await CommonBlock.validate(validator, ref);
            if (ref.options.useTemplate) {
                if (!ref.options.template) {
                    validator.addError('Option "template" is not set');
                }
                if (validator.tokenTemplateNotExist(ref.options.template)) {
                    validator.addError(`Token "${ref.options.template}" does not exist`);
                }
            } else {
                if (!ref.options.tokenId) {
                    validator.addError('Option "tokenId" is not set');
                } else if (typeof ref.options.tokenId !== 'string') {
                    validator.addError('Option "tokenId" must be a string');
                } else if (await validator.tokenNotExist(ref.options.tokenId)) {
                    validator.addError(`Token with id ${ref.options.tokenId} does not exist`);
                }
            }

            if (ref.options.rule && typeof ref.options.rule !== 'string') {
                validator.addError('Option "rule" must be a string');
            }

            if (
                ref.options.serialNumbersExpression &&
                typeof ref.options.serialNumbersExpression !== 'string'
            ) {
                validator.addError('Option "serial numbers" must be a string');
            } else if (
                ref.options.serialNumbersExpression &&
                typeof ref.options.serialNumbersExpression === 'string'
            ) {
                const wipeTokens = ref.options.serialNumbersExpression
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean);
                const numRe = /^\d+$/;

                for (const tok of wipeTokens) {
                    const firstDash = tok.indexOf('-');
                    const lastDash = tok.lastIndexOf('-');

                    if (/[^A-Za-z0-9-]/.test(tok)) {
                        const bad = tok.match(/[^A-Za-z0-9-]/)![0];
                        validator.addError(
                            `Invalid serial number "${tok}": character "${bad}" is not allowed.  Use single input (e.g., "1" or "field0"), or range (e.g., "1-3 or field0-field1").`
                        );
                        continue;
                    }

                    if (numRe.test(tok)) {
                        const v = parseInt(tok, 10);
                        if (v < 1) {
                            validator.addError(
                                `Invalid serial number "${tok}": must be greater than or equal to 1.`
                            );
                            continue;
                        }
                    }

                    if (firstDash === 0 || firstDash === tok.length - 1) {
                        validator.addError(
                            `Invalid serial number range "${tok}": both start and end are required (e.g., "1-3" or "field1-field5").`
                        );
                        continue;
                    }

                    if (firstDash > 0) {
                        if (firstDash !== lastDash) {
                            validator.addError(
                                `Invalid serial number range "${tok}": only one '-' is allowed in a range.`
                            );
                            continue;
                        }

                        const left = tok.slice(0, firstDash).trim();
                        const right = tok.slice(firstDash + 1).trim();

                        const leftIsNum = numRe.test(left);
                        const rightIsNum = numRe.test(right);

                        if (leftIsNum && rightIsNum) {
                            const l = parseInt(left, 10);
                            const r = parseInt(right, 10);
                            if (l < 1 || r < 1) {
                                validator.addError(
                                    `Invalid serial number range "${tok}": Serial numbers must be greater than or equal to 1`
                                );
                            }
                            if (!(l < r)) {
                                validator.addError(
                                    `Invalid serial number range "${tok}": End serial number must be greater than start serial number.`
                                );
                            }
                        }
                        continue;
                    }
                }
            }

            const accountType = ['default', 'custom'];
            if (accountType.indexOf(ref.options.accountType) === -1) {
                validator.addError('Option "accountType" must be one of ' + accountType.join(','));
            }
            if (ref.options.accountType === 'custom' && !ref.options.accountId) {
                validator.addError('Option "accountId" is not set');
            }
        } catch (error) {
            validator.addError(`Unhandled exception ${validator.getErrorMessage(error)}`);
        }
    }
}
