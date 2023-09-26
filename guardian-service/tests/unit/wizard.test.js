const fs = require('fs');
const path = require('path');
const { assert } = require('chai');
const moduleAlias = require('module-alias');

moduleAlias.addAliases({
    '@api': process.cwd() + '/dist' + '/api',
});

const { PolicyWizardHelper } = require('@api/helpers/policy-wizard-helper');

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
            const wizardConfig = require(path.join(
                configsPath,
                config,
                'wizard.config.json'
            ));
            const policyWizardConfig = require(path.join(
                configsPath,
                config,
                'policy-wizard.config.json'
            ));
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
