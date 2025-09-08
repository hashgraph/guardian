export enum PasswordComplexityEnum {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
};

export const minPasswordLength = Math.max(Number(process.env.MIN_PASSWORD_LENGTH) || 8, 1);

export const passwordComplexity = process.env.PASSWORD_COMPLEXITY || PasswordComplexityEnum.MEDIUM;

export const PasswordError = {
  [PasswordComplexityEnum.EASY]: `Password must be at least ${minPasswordLength} characters long.`,
  [PasswordComplexityEnum.MEDIUM]: `Password must be at least ${minPasswordLength} characters long and include at least one uppercase letter, one lowercase letter, and one number.`,
  [PasswordComplexityEnum.HARD]: `Password must be at least ${minPasswordLength} characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.`,
};
