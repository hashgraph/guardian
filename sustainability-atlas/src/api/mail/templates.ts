/**
 * Inline branded email templates for the Sustainability Atlas.
 *
 * Pure functions — no template engine dependency. Each returns { subject, html, text }.
 *
 * HTML uses inline CSS only: email clients (Gmail, Outlook) ignore <style> blocks
 * and strip external CSS. Responsive layout via max-width + auto margins.
 * A raw URL fallback line is included below every CTA button so plain-text email
 * clients and click-disabled environments still work.
 *
 * Templates receive an already-built absolute URL (built by EmailTokenService)
 * so they stay decoupled from URL construction.
 */

export interface EmailTemplate {
    subject: string;
    html: string;
    text: string;
}

// ── Shared style constants ────────────────────────────────────────────────────

const BRAND_COLOR = '#1a6e3e';        // Sustainability Atlas green
const BUTTON_TEXT_COLOR = '#ffffff';
const BG_COLOR = '#f4f6f8';
const CARD_BG = '#ffffff';
const BODY_FONT = 'Arial, Helvetica, sans-serif';
const MUTED_COLOR = '#6b7280';

function emailWrapper(title: string, bodyContent: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:${BG_COLOR};font-family:${BODY_FONT};">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0"
         width="100%" style="background-color:${BG_COLOR};padding:40px 16px;">
    <tr>
      <td align="center">
        <!-- Card -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0"
               width="600" style="max-width:600px;background-color:${CARD_BG};
               border-radius:8px;overflow:hidden;
               box-shadow:0 1px 4px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:${BRAND_COLOR};padding:28px 40px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;
                         letter-spacing:-0.3px;">
                Sustainability Atlas
              </p>
              <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.75);">
                Guardian Environmental Assets Explorer
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              ${bodyContent}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:${BG_COLOR};padding:20px 40px;
                        border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:${MUTED_COLOR};text-align:center;">
                You received this email because an action was taken on your
                Sustainability Atlas account. If you did not request this,
                you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(link: string, label: string): string {
    return `<table role="presentation" cellspacing="0" cellpadding="0" border="0"
              style="margin:28px 0 8px;">
  <tr>
    <td style="border-radius:6px;background-color:${BRAND_COLOR};">
      <a href="${link}"
         style="display:inline-block;padding:14px 28px;font-size:15px;
                font-weight:600;color:${BUTTON_TEXT_COLOR};text-decoration:none;
                border-radius:6px;font-family:${BODY_FONT};">
        ${label}
      </a>
    </td>
  </tr>
</table>`;
}

function linkFallback(link: string): string {
    return `<p style="margin:12px 0 0;font-size:13px;color:${MUTED_COLOR};
                word-break:break-all;">
  If the button above does not work, copy and paste this URL into your browser:
  <br>
  <a href="${link}"
     style="color:${BRAND_COLOR};word-break:break-all;">${link}</a>
</p>`;
}

// ── greetingName helper ───────────────────────────────────────────────────────

/**
 * Returns the user's name for a greeting line, or 'there' when no name is set.
 * e.g. "Dear John," vs "Dear there," — callers should provide a trimmed display name.
 */
export function greetingName(name?: string | null): string {
    const n = (name ?? '').trim();
    return n.length ? n : 'there';
}

// ── verificationEmailTemplate ─────────────────────────────────────────────────

/**
 * Email verification — sent on self-signup and resend-verification.
 * The link already contains the raw single-use token as a query parameter.
 * Link expires in 24 hours.
 *
 * @param userName  Display name for the greeting (greetingName() applied internally).
 * @param link      Absolute verification URL including the raw token (not logged).
 */
export function verificationEmailTemplate(userName: string, link: string): EmailTemplate {
    const subject = 'Verify your Sustainability Atlas email address';

    const bodyHtml = `
      <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#111827;">
        Verify your email address
      </h1>
      <p style="margin:0 0 8px;font-size:15px;color:#374151;line-height:1.6;">
        Dear ${greetingName(userName)},
      </p>
      <p style="margin:0 0 8px;font-size:15px;color:#374151;line-height:1.6;">
        Thanks for signing up for Sustainability Atlas. Please verify your email
        address by clicking the button below. Once verified, you will be able to
        sign in to your account.
      </p>
      <p style="margin:0 0 0;font-size:14px;color:${MUTED_COLOR};">
        This link will expire in <strong>24 hours</strong>.
      </p>
      ${ctaButton(link, 'Verify Email Address')}
      ${linkFallback(link)}
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0 20px;">
      <p style="margin:0;font-size:13px;color:${MUTED_COLOR};line-height:1.5;">
        Best regards,<br>
        Sustainability Atlas Team
      </p>
    `;

    const html = emailWrapper('Verify your email address', bodyHtml);

    const text = [
        'SUSTAINABILITY ATLAS — Verify your email address',
        '',
        `Dear ${greetingName(userName)},`,
        '',
        'Thanks for signing up. Please verify your email address by visiting the link below.',
        '',
        'This link will expire in 24 hours.',
        '',
        link,
        '',
        'Best regards,',
        'Sustainability Atlas Team',
    ].join('\n');

    return { subject, html, text };
}

// ── passwordResetEmailTemplate ────────────────────────────────────────────────

/**
 * Password reset — sent via the forgot-password flow.
 * The link already contains the raw single-use token as a query parameter.
 *
 * @param userName   Display name for the greeting (greetingName() applied internally).
 * @param link       Absolute reset URL (not logged — it IS the credential).
 * @param expiryText Human-readable expiry string, e.g. '1 hour'.
 */
export function passwordResetEmailTemplate(
    userName: string,
    link: string,
    expiryText: string,
): EmailTemplate {
    const subject = 'Reset Your Sustainability Atlas Password';

    const bodyHtml = `
      <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#111827;">
        Reset Your Password
      </h1>
      <p style="margin:0 0 8px;font-size:15px;color:#374151;line-height:1.6;">
        Dear ${greetingName(userName)},
      </p>
      <p style="margin:0 0 8px;font-size:15px;color:#374151;line-height:1.6;">
        We received a request to reset the password associated with your Sustainability Atlas account.
      </p>
      <p style="margin:0 0 8px;font-size:15px;color:#374151;line-height:1.6;">
        To create a new password, please click the link below:
      </p>
      ${ctaButton(link, 'Reset Password')}
      ${linkFallback(link)}
      <p style="margin:20px 0 8px;font-size:14px;color:${MUTED_COLOR};">
        For security reasons this link will expire in ${expiryText}.
      </p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0 20px;">
      <p style="margin:0;font-size:13px;color:${MUTED_COLOR};line-height:1.5;">
        Best regards,<br>
        Sustainability Atlas Team
      </p>
    `;

    const html = emailWrapper('Reset Your Password', bodyHtml);

    const text = [
        'SUSTAINABILITY ATLAS — Reset Your Sustainability Atlas Password',
        '',
        `Dear ${greetingName(userName)},`,
        '',
        'We received a request to reset the password associated with your Sustainability Atlas account.',
        '',
        'To create a new password, please visit the link below:',
        '',
        link,
        '',
        `For security reasons this link will expire in ${expiryText}.`,
        '',
        'Best regards,',
        'Sustainability Atlas Team',
    ].join('\n');

    return { subject, html, text };
}

// ── welcomeEmailTemplate ──────────────────────────────────────────────────────

/**
 * Welcome email — sent when a new account is created (self-signup or admin-created).
 *
 * @param userName   Display name for the greeting (greetingName() applied internally).
 * @param loginLink  App root URL — login is a modal, there is no /login route.
 */
export function welcomeEmailTemplate(userName: string, loginLink: string): EmailTemplate {
    const subject = 'Welcome to Sustainability Atlas – Your Account Has Been Created';

    const bodyHtml = `
      <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#111827;">
        Welcome to Sustainability Atlas
      </h1>
      <p style="margin:0 0 8px;font-size:15px;color:#374151;line-height:1.6;">
        Dear ${greetingName(userName)},
      </p>
      <p style="margin:0 0 8px;font-size:15px;color:#374151;line-height:1.6;">
        Welcome to Sustainability Atlas.
      </p>
      <p style="margin:0 0 8px;font-size:15px;color:#374151;line-height:1.6;">
        Your account has been successfully created and is now ready to use.
      </p>
      <p style="margin:0 0 8px;font-size:15px;color:#374151;line-height:1.6;">
        You can sign in to the platform using the email address you registered with and begin exploring advanced features.
      </p>
      ${ctaButton(loginLink, 'Sign In')}
      ${linkFallback(loginLink)}
      <p style="margin:20px 0 8px;font-size:15px;color:#374151;line-height:1.6;">
        Thank you for joining Sustainability Atlas.
      </p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0 20px;">
      <p style="margin:0;font-size:13px;color:${MUTED_COLOR};line-height:1.5;">
        Best Regards,<br>
        Sustainability Atlas Team
      </p>
    `;

    const html = emailWrapper('Welcome to Sustainability Atlas', bodyHtml);

    const text = [
        'SUSTAINABILITY ATLAS — Welcome to Sustainability Atlas',
        '',
        `Dear ${greetingName(userName)},`,
        '',
        'Welcome to Sustainability Atlas.',
        '',
        'Your account has been successfully created and is now ready to use.',
        '',
        'You can sign in to the platform using the email address you registered with and begin exploring advanced features.',
        '',
        loginLink,
        '',
        'Thank you for joining Sustainability Atlas.',
        '',
        'Best Regards,',
        'Sustainability Atlas Team',
    ].join('\n');

    return { subject, html, text };
}

// ── accountDeactivatedEmailTemplate ──────────────────────────────────────────

/**
 * Account deactivation notice — sent when an admin deactivates a user.
 * No CTA link (account is deactivated — signing in would fail anyway).
 *
 * @param userName  Display name for the greeting (greetingName() applied internally).
 */
export function accountDeactivatedEmailTemplate(userName: string): EmailTemplate {
    const subject = 'Your Sustainability Atlas Account Has Been Deactivated';

    const bodyHtml = `
      <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#111827;">
        Account Deactivated
      </h1>
      <p style="margin:0 0 8px;font-size:15px;color:#374151;line-height:1.6;">
        Dear ${greetingName(userName)},
      </p>
      <p style="margin:0 0 8px;font-size:15px;color:#374151;line-height:1.6;">
        This email is to inform you that your access to Sustainability Atlas has been deactivated by a system administrator.
      </p>
      <p style="margin:0 0 8px;font-size:15px;color:#374151;line-height:1.6;">
        As a result, you will no longer be able to sign in or access platform features using your account.
      </p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0 20px;">
      <p style="margin:0;font-size:13px;color:${MUTED_COLOR};line-height:1.5;">
        Best regards,<br>
        Sustainability Atlas Team
      </p>
    `;

    const html = emailWrapper('Account Deactivated', bodyHtml);

    const text = [
        'SUSTAINABILITY ATLAS — Your Sustainability Atlas Account Has Been Deactivated',
        '',
        `Dear ${greetingName(userName)},`,
        '',
        'This email is to inform you that your access to Sustainability Atlas has been deactivated by a system administrator.',
        '',
        'As a result, you will no longer be able to sign in or access platform features using your account.',
        '',
        'Best regards,',
        'Sustainability Atlas Team',
    ].join('\n');

    return { subject, html, text };
}

// ── accountReactivatedEmailTemplate ──────────────────────────────────────────

/**
 * Account reactivation notice — sent when an admin re-activates a user.
 * Includes a Sign In CTA since the account can be used again immediately.
 *
 * @param userName   Display name for the greeting (greetingName() applied internally).
 * @param loginLink  App root URL — login is a modal, there is no /login route.
 */
export function accountReactivatedEmailTemplate(userName: string, loginLink: string): EmailTemplate {
    const subject = 'Your Sustainability Atlas Account Has Been Reactivated';

    const bodyHtml = `
      <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#111827;">
        Account Reactivated
      </h1>
      <p style="margin:0 0 8px;font-size:15px;color:#374151;line-height:1.6;">
        Dear ${greetingName(userName)},
      </p>
      <p style="margin:0 0 8px;font-size:15px;color:#374151;line-height:1.6;">
        This email is to inform you that your access to Sustainability Atlas has been reactivated by a system administrator.
      </p>
      <p style="margin:0 0 8px;font-size:15px;color:#374151;line-height:1.6;">
        You can now sign in again using your existing email address and password, and continue using the platform.
      </p>
      ${ctaButton(loginLink, 'Sign In')}
      ${linkFallback(loginLink)}
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0 20px;">
      <p style="margin:0;font-size:13px;color:${MUTED_COLOR};line-height:1.5;">
        Best regards,<br>
        Sustainability Atlas Team
      </p>
    `;

    const html = emailWrapper('Account Reactivated', bodyHtml);

    const text = [
        'SUSTAINABILITY ATLAS — Your Sustainability Atlas Account Has Been Reactivated',
        '',
        `Dear ${greetingName(userName)},`,
        '',
        'This email is to inform you that your access to Sustainability Atlas has been reactivated by a system administrator.',
        '',
        'You can now sign in again using your existing email address and password, and continue using the platform.',
        '',
        loginLink,
        '',
        'Best regards,',
        'Sustainability Atlas Team',
    ].join('\n');

    return { subject, html, text };
}
