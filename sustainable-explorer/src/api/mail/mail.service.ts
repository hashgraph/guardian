import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import {
    verificationEmailTemplate,
    passwordResetEmailTemplate,
    welcomeEmailTemplate,
    accountDeactivatedEmailTemplate,
} from './templates';

/**
 * SMTP mail service for transactional auth emails.
 *
 * Security / enumeration hardening:
 *  - send() swallows all SMTP errors — callers return the same neutral 200
 *    regardless of whether the email address exists or SMTP succeeds.
 *  - Logs only the sender + recipient addresses (and, on failure, the reason).
 *    The link URL and raw token are NEVER logged — those ARE the credential.
 *  - Empty SMTP_HOST: warn once and return without throwing, so the server
 *    starts fine without SMTP configured.
 *
 * The transport is built lazily on first send (no socket opened at import time).
 * SMTP_SECURE=true → port 465 (implicit TLS); false → 587 (STARTTLS). All SMTP
 * settings are read from process.env directly (repo convention).
 */
@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);

    /** Memoised transport; null until getTransport() is called once. */
    private transport: Transporter | null = null;

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * Returns a memoised nodemailer Transporter, constructing it on first call.
     * Returns null when SMTP_HOST is empty (warn-and-skip mode).
     */
    private getTransport(): Transporter | null {
        if (this.transport) {
            return this.transport;
        }

        const host = process.env.SMTP_HOST?.trim() ?? '';
        if (!host) {
            this.logger.warn(
                'SMTP_HOST is not configured — outbound email is disabled. ' +
                'Set SMTP_HOST to enable email verification and password-reset emails.',
            );
            return null;
        }

        const port = parseInt(process.env.SMTP_PORT ?? '587', 10);
        const secure = (process.env.SMTP_SECURE ?? 'false') === 'true';
        const user = process.env.SMTP_USER ?? '';
        const pass = process.env.SMTP_PASSWORD ?? '';

        this.transport = nodemailer.createTransport({
            host,
            port,
            // secure=true → implicit TLS (port 465);
            // secure=false → STARTTLS upgrade (port 587, nodemailer default).
            secure,
            auth: user ? { user, pass } : undefined,
            // Fail fast instead of hanging the request if SMTP is unreachable.
            connectionTimeout: 10_000,
            greetingTimeout: 10_000,
            socketTimeout: 15_000,
        });

        return this.transport;
    }

    /**
     * Internal send helper. Catches all SMTP errors and swallows them — never
     * throws, so callers always return the same neutral response regardless of
     * SMTP outcome (prevents account enumeration by observing email-send errors).
     *
     * Logs only the sender + recipient addresses (plus the reason on failure).
     * Never logs the link or token — those are credentials.
     */
    private async send(
        to: string,
        subject: string,
        html: string,
        text: string,
    ): Promise<void> {
        const transport = this.getTransport();
        if (!transport) {
            // SMTP not configured — already warned in getTransport(); no-op here.
            return;
        }

        const from = process.env.SMTP_FROM ?? '';

        try {
            await transport.sendMail({ from, to, subject, html, text });
            // Per request: log only the sender + recipient addresses — nothing else
            // (never the subject, link, or token; the link IS the credential).
            this.logger.log(`Email sent [from="${from}" to="${to}"]`);
        } catch (err: unknown) {
            // Swallow — log sender + recipient + the failure reason only (no link/token/body).
            const reason = err instanceof Error ? err.message : String(err);
            this.logger.error(`Email send failed [from="${from}" to="${to}"] — ${reason}`);
            // No re-throw: caller returns the same response regardless.
        }
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Sends a branded email-verification email.
     *
     * @param to       Recipient address (logged).
     * @param link     Absolute verification URL including the raw token (not logged).
     * @param userName Display name for the greeting line (optional).
     */
    async sendVerificationEmail(to: string, link: string, userName = ''): Promise<void> {
        const { subject, html, text } = verificationEmailTemplate(userName, link);
        await this.send(to, subject, html, text);
    }

    /**
     * Sends a branded password-reset email.
     *
     * @param to         Recipient address (logged).
     * @param link       Absolute reset URL including the raw token (not logged).
     * @param userName   Display name for the greeting line (optional).
     * @param expiryText Human-readable expiry string (default '1 hour').
     */
    async sendPasswordResetEmail(
        to: string,
        link: string,
        userName = '',
        expiryText = '1 hour',
    ): Promise<void> {
        const { subject, html, text } = passwordResetEmailTemplate(userName, link, expiryText);
        await this.send(to, subject, html, text);
    }

    /**
     * Sends a branded welcome email to a newly-created account.
     *
     * @param to        Recipient address (logged).
     * @param loginLink App root URL (login is a modal — no /login route).
     * @param userName  Display name for the greeting line (optional).
     */
    async sendWelcomeEmail(to: string, loginLink: string, userName = ''): Promise<void> {
        const { subject, html, text } = welcomeEmailTemplate(userName, loginLink);
        await this.send(to, subject, html, text);
    }

    /**
     * Sends an account-deactivation notice.
     *
     * @param to       Recipient address (logged).
     * @param userName Display name for the greeting line (optional).
     */
    async sendDeactivationEmail(to: string, userName = ''): Promise<void> {
        const { subject, html, text } = accountDeactivatedEmailTemplate(userName);
        await this.send(to, subject, html, text);
    }
}
