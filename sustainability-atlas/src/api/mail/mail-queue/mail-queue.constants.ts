export const SEND_EMAIL_QUEUE = 'send-email';
export const SEND_EMAIL_JOB = 'transactional';

export type MailJobData =
  | { kind: 'verify';      to: string; link: string; name?: string }
  | { kind: 'reset';       to: string; link: string; name?: string; expiry?: string }
  | { kind: 'welcome';     to: string; link: string; name?: string }
  | { kind: 'deactivated'; to: string; name?: string };

export const MAIL_JOB_OPTS = {
  attempts: 5,
  backoff: { type: 'exponential' as const, delay: 5000 },
  removeOnComplete: { age: 3600, count: 1000 },
  removeOnFail: { age: 7 * 24 * 3600, count: 5000 },
};
