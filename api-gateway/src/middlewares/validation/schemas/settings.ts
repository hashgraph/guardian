import fieldsValidation from '@middlewares/validation/fields-validation';
import * as yup from 'yup';

export const updateSettings = () => {
    const { ipfsStorageApiKey, operatorId, operatorKey} = fieldsValidation;
    return yup.object({
        body: yup.object({
            ipfsStorageApiKey,
            operatorId,
            operatorKey
        }),
    });
}
