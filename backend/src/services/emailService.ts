import sendgridMail from '@sendgrid/mail';
import { loadEnvironment } from '../config/env.js';

loadEnvironment();

const normalizeEnv = (value: string | undefined) => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const escapeHtml = (value: string) => {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
};

const SENDGRID_API_KEY = normalizeEnv(process.env.SENDGRID_API_KEY);
const EMAIL_FROM = normalizeEnv(process.env.EMAIL_FROM);
const EMAIL_APP_NAME = normalizeEnv(process.env.EMAIL_APP_NAME) || 'Twisters';

let isApiKeyConfigured = false;

const getMissingEmailConfigKeys = () => {
  const missingKeys: string[] = [];

  if (!SENDGRID_API_KEY) {
    missingKeys.push('SENDGRID_API_KEY');
  }

  if (!EMAIL_FROM) {
    missingKeys.push('EMAIL_FROM');
  }

  return missingKeys;
};

const ensureSendGridConfigured = () => {
  const missingKeys = getMissingEmailConfigKeys();
  if (missingKeys.length > 0) {
    throw new Error(`Missing email configuration: ${missingKeys.join(', ')}`);
  }

  if (!isApiKeyConfigured) {
    sendgridMail.setApiKey(SENDGRID_API_KEY as string);
    isApiKeyConfigured = true;
  }
};

const resolveFromAddress = () => {
  if (!EMAIL_FROM) {
    throw new Error('EMAIL_FROM must be configured before sending email.');
  }

  return EMAIL_APP_NAME ? `${EMAIL_APP_NAME} <${EMAIL_FROM}>` : EMAIL_FROM;
};

const sendEmail = async (payload: {
  recipientEmail: string;
  subject: string;
  text: string;
  html: string;
}) => {
  ensureSendGridConfigured();

  await sendgridMail.send({
    to: payload.recipientEmail,
    from: resolveFromAddress(),
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });
};

export const canSendEmails = () => {
  return getMissingEmailConfigKeys().length === 0;
};

export const canSendPasswordResetEmails = canSendEmails;

export const sendPasswordResetEmail = async (recipientEmail: string, resetLink: string) => {
  const escapedResetLink = escapeHtml(resetLink);
  const escapedRecipientEmail = escapeHtml(recipientEmail);

  await sendEmail({
    recipientEmail,
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
  const escapedVerificationLink = escapeHtml(verificationLink);
  const escapedRecipientEmail = escapeHtml(recipientEmail);

  await sendEmail({
    recipientEmail,
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
