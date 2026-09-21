import { IntegrationServiceFactory } from '../integrations/index.js';

export const generateConfigForIntegrationBlock = (
    propertyType?: any,
    childrenType?: any,
    controlType?: any,
    policyInputEventType?: any,
    PolicyOutputEventType?: any,
) => ({
  'label': 'Integration button',
  'title': 'Add \'Integration button\' Block',
  'post': true,
  'get': true,
  'children': childrenType?.Special || 'Special',
  'control': controlType?.UI || 'UI',
  'input': [],
  'output': [
      PolicyOutputEventType?.RunEvent || 'RunEvent',
      PolicyOutputEventType?.ReleaseEvent || 'ReleaseEvent',
      PolicyOutputEventType?.RefreshEvent || 'RefreshEvent',
  ],
  'defaultEvent': false,
  'properties': [
    {
        'name': 'buttonName',
        'label': 'Button name',
        'title': 'Button name',
        'type': propertyType?.Input || 'Input',
        'default': ''
    },
    {
        'name': 'hideWhenDiscontinued',
        'label': 'Hide when discontinued',
        'title': 'Hide when discontinued',
        'type': propertyType?.Checkbox || 'Checkbox',
        'default': false
    },
    {
        'name': 'getFromCache',
        'label': 'Enable caching',
        'title': 'Enable caching',
        'type': propertyType?.Checkbox || 'Checkbox'
    },
    {
        'name': 'integrationType',
        'label': 'Integration',
        'title': 'Integration',
        'type': propertyType?.Select || 'Select',
        'items': IntegrationServiceFactory.getIntegrationTypes(),
        'default': '',
        'required': true,
    },
    ...IntegrationServiceFactory.getIntegrationTypes().map(({ value }) => ({
        'name': 'requestName',
        'label': 'Request type',
        'title': 'Request type',
        'type': propertyType?.Select || 'Select',
        'items': Object.entries(IntegrationServiceFactory.getAvailableMethods(value)).map(([requestName, { description }]) => ({
            label: description,
            value: `${value}_${requestName}`,
        })),
        'default': '',
        'visible': `integrationType === "${value}"`,
        'required': true,
    })),
    ...IntegrationServiceFactory.getIntegrationTypes().flatMap(({ value }) => Object.entries(IntegrationServiceFactory.getAvailableMethods(value)).reduce((res, [requestName, { parameters }]) => {
        if (parameters) {
            const parentParams = Object.values(parameters);

            if (parentParams.length) {
            const childParams = parentParams.flatMap(param => Object.values(param));

            if (childParams.length) {
                res.push({
                'name': 'requestParams',
                'label': 'Request params',
                'title': 'Request params',
                'type': propertyType?.Group || 'Group',
                'properties': childParams.flatMap(({ name, value: propValue, required }) => ([
                    {
                        label: `Path field for ${name}`,
                        title: `Path field for ${name}`,
                        name: `path_${propValue}`,
                        required: !!required,
                        type: 'Path'
                    },
                    {
                        label: `Value for ${name}`,
                        title: `Value for ${name}`,
                        name: propValue,
                        required: !!required,
                        type: 'Input'
                    }
                ])),
                'visible': `requestName === "${value}_${requestName}"`
                })
            }
            }
        }

        return res;
    }, [])),
  ],
})