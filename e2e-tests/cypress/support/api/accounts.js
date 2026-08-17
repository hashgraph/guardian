import { METHOD } from './api-const';
import API from '../ApiUrls';

export const registerUser = (username, role = 'USER') => {
    return cy.fixture('credentials').then(({ goodPassword }) => {
        return cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.AccountRegister,
            body: {
                username,
                password: goodPassword,
                password_confirmation: goodPassword,
                role,
            },
        });
    });
};
