import fs from 'fs';
import path from 'path';
import { assert } from 'chai';
import moduleAlias from 'module-alias';
import rewire from 'rewire';

moduleAlias.addAliases({
    '@api': process.cwd() + '/dist' + '/api',
});

// const { PolicyWizardHelper } = rewire(process.cwd() + '/dist' + '/api/helpers/policy-wizard-helper.js');

import { PolicyWizardHelper } from '../../dist/api/helpers/policy-wizard-helper.js';

function clearIds(config) {
    const props = Object.keys(config);
    for (const prop of props) {
        if (Array.isArray(config[prop])) {
            for (const key in config[prop]) {
                if (
                    Object.prototype.toString.call(config[prop][key]) ===
                    '[object Object]'
                ) {
                    config[prop][key] = clearIds(config[prop][key]);
                }

                if (
                    typeof config[prop][key] === 'string' &&
                    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                        config[prop][key]
                    )
                ) {
                    config[prop][key] = '00000000-0000-0000-0000-000000000000';
                }
            }
        } else {
            if (
                Object.prototype.toString.call(config[prop]) ===
                '[object Object]'
            ) {
                config[prop] = clearIds(config[prop]);
            }

            if (
                typeof config[prop] === 'string' &&
                /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                    config[prop]
                )
            ) {
                config[prop] = '00000000-0000-0000-0000-000000000000';
            }
        }
    }
    return config;
}

describe('Policy Wizard Tests', function () {
    let configs;

    const configsPath = path.join(
        process.cwd(),
        'tests',
        '_fixtures',
        'wizard'
    );
    configs = fs.readdirSync(configsPath);

    configs.forEach((config) => {
        it(config, async function () {
            const wizardConfigPath = path.join(configsPath, config, 'wizard.config.json');
            const policyWizardConfigPath = path.join(configsPath, config, 'policy-wizard.config.json');

            const wizardConfig = JSON.parse(await fs.promises.readFile(wizardConfigPath, 'utf-8'));
            const policyWizardConfig = JSON.parse(await fs.promises.readFile(policyWizardConfigPath, 'utf-8'));

            const wizardHelper = new PolicyWizardHelper();
            assert.equal(
                JSON.stringify(
                    clearIds(wizardHelper.createPolicyConfig(wizardConfig))
                ),
                JSON.stringify(clearIds(policyWizardConfig))
            );
        });
    });
});
