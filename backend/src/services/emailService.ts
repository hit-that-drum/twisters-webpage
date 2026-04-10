import nodemailer from 'nodemailer';
import { loadEnvironment } from '../config/env.js';

loadEnvironment();

const DEFAULT_CONNECTION_TIMEOUT_MS = 10_000;
const DEFAULT_GREETING_TIMEOUT_MS = 10_000;
const DEFAULT_SOCKET_TIMEOUT_MS = 15_000;

const normalizeEnv = (value: string | undefined) => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const parsePort = (value: string | undefined) => {
  const normalized = normalizeEnv(value);
  if (!normalized) {
    return 587;
  }

  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return 587;
  }

  return parsed;
};

const parseBoolean = (value: string | undefined, fallbackValue: boolean) => {
  const normalized = normalizeEnv(value)?.toLowerCase();
  if (!normalized) {
    return fallbackValue;
  }

  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return fallbackValue;
};

const escapeHtml = (value: string) => {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
};

const SMTP_HOST = normalizeEnv(process.env.SMTP_HOST);
const SMTP_PORT = parsePort(process.env.SMTP_PORT);
const SMTP_USER = normalizeEnv(process.env.SMTP_USER);
const SMTP_PASS = normalizeEnv(process.env.SMTP_PASS);
const EMAIL_FROM = normalizeEnv(process.env.EMAIL_FROM);
const EMAIL_APP_NAME = normalizeEnv(process.env.EMAIL_APP_NAME) || 'Twisters';
const SMTP_SECURE = parseBoolean(process.env.SMTP_SECURE, SMTP_PORT === 465);

let transporter: nodemailer.Transporter | null = null;

const getMissingEmailConfigKeys = () => {
  const missingKeys: string[] = [];

  if (!SMTP_HOST) {
    missingKeys.push('SMTP_HOST');
  }

  if (!SMTP_USER) {
    missingKeys.push('SMTP_USER');
  }

  if (!SMTP_PASS) {
    missingKeys.push('SMTP_PASS');
  }

  if (!EMAIL_FROM) {
    missingKeys.push('EMAIL_FROM');
  }

  return missingKeys;
};

const resolveFromAddress = () => {
  if (!EMAIL_FROM) {
    throw new Error('EMAIL_FROM must be configured before sending email.');
  }

  return EMAIL_APP_NAME ? `"${EMAIL_APP_NAME}" <${EMAIL_FROM}>` : EMAIL_FROM;
};

const getTransporter = () => {
  if (transporter) {
    return transporter;
  }

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !EMAIL_FROM) {
    throw new Error(`Missing email configuration: ${getMissingEmailConfigKeys().join(', ')}`);
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    connectionTimeout: DEFAULT_CONNECTION_TIMEOUT_MS,
    greetingTimeout: DEFAULT_GREETING_TIMEOUT_MS,
    socketTimeout: DEFAULT_SOCKET_TIMEOUT_MS,
  });

  return transporter;
};

export const canSendEmails = () => {
  return getMissingEmailConfigKeys().length === 0;
};

export const canSendPasswordResetEmails = canSendEmails;

export const sendPasswordResetEmail = async (recipientEmail: string, resetLink: string) => {
  const emailTransporter = getTransporter();
  const escapedResetLink = escapeHtml(resetLink);
  const escapedRecipientEmail = escapeHtml(recipientEmail);

  await emailTransporter.sendMail({
    from: resolveFromAddress(),
    to: recipientEmail,
    subject: `[${EMAIL_APP_NAME}] Password reset instructions`,
    text: [
      `${EMAIL_APP_NAME} password reset request`,
      '',
      `We received a request to reset the password for ${recipientEmail}.`,
      'Use the link below within 30 minutes to set a new password:',
      resetLink,
      '',
      'If you did not request this, you can safely ignore this email.',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
        <h2 style="margin-bottom: 16px;">${escapeHtml(EMAIL_APP_NAME)} password reset</h2>
        <p style="margin: 0 0 12px;">We received a request to reset the password for <strong>${escapedRecipientEmail}</strong>.</p>
        <p style="margin: 0 0 16px;">Use the button below within 30 minutes to set a new password.</p>
        <p style="margin: 0 0 20px;">
          <a
            href="${escapedResetLink}"
            style="display: inline-block; padding: 12px 18px; border-radius: 8px; background: #111827; color: #ffffff; text-decoration: none; font-weight: 600;"
          >
            Reset password
          </a>
        </p>
        <p style="margin: 0 0 8px;">If the button does not work, copy and paste this URL into your browser:</p>
        <p style="margin: 0 0 16px; word-break: break-all;">${escapedResetLink}</p>
        <p style="margin: 0; color: #6b7280;">If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
  });
};

export const sendSignupVerificationEmail = async (
  recipientEmail: string,
  verificationLink: string,
) => {
  const emailTransporter = getTransporter();
  const escapedVerificationLink = escapeHtml(verificationLink);
  const escapedRecipientEmail = escapeHtml(recipientEmail);

  await emailTransporter.sendMail({
    from: resolveFromAddress(),
    to: recipientEmail,
    subject: `[${EMAIL_APP_NAME}] Verify your email address`,
    text: [
      `${EMAIL_APP_NAME} email verification`,
      '',
      `Thanks for signing up with ${EMAIL_APP_NAME}.`,
      `Please verify the email address for ${recipientEmail} using the link below:`,
      verificationLink,
      '',
      'After email verification, your account still requires administrator approval before sign-in.',
      'If you did not create this account, you can safely ignore this email.',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
        <h2 style="margin-bottom: 16px;">${escapeHtml(EMAIL_APP_NAME)} email verification</h2>
        <p style="margin: 0 0 12px;">Thanks for signing up with <strong>${escapeHtml(EMAIL_APP_NAME)}</strong>.</p>
        <p style="margin: 0 0 12px;">Please verify the email address for <strong>${escapedRecipientEmail}</strong>.</p>
        <p style="margin: 0 0 16px;">After email verification, your account still requires administrator approval before sign-in.</p>
        <p style="margin: 0 0 20px;">
          <a
            href="${escapedVerificationLink}"
            style="display: inline-block; padding: 12px 18px; border-radius: 8px; background: #166534; color: #ffffff; text-decoration: none; font-weight: 600;"
          >
            Verify email
          </a>
        </p>
        <p style="margin: 0 0 8px;">If the button does not work, copy and paste this URL into your browser:</p>
        <p style="margin: 0 0 16px; word-break: break-all;">${escapedVerificationLink}</p>
        <p style="margin: 0; color: #6b7280;">If you did not create this account, you can safely ignore this email.</p>
      </div>
    `,
  });
};
