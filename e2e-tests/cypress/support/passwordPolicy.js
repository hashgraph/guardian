export const minPasswordLength = Math.max(Number(Cypress.env('minPasswordLength')) || 8, 1);
export const passwordComplexity = Cypress.env('passwordComplexity') || 'medium';

// Mirrors auth-service/src/constants/password.ts — keep in sync with PasswordError.
export const expectedPasswordError = () => {
    switch (passwordComplexity) {
        case 'medium':
            return `Password must be at least ${minPasswordLength} characters long and include at least one uppercase letter, one lowercase letter, and one number.`;
        case 'hard':
            return `Password must be at least ${minPasswordLength} characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.`;
        default:
            return `Password must be at least ${minPasswordLength} characters long.`;
    }
};
