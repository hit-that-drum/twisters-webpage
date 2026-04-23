/**
 * Email verification lifecycle: token generation + delivery (used at signup
 * and by the resend endpoint), and the verify/resend entry points exposed
 * through the auth controller.
 */
import crypto from 'crypto';
import { HttpError } from '../errors/httpError.js';
import { authRepository } from '../repositories/authRepository.js';
import {
  canSendEmails,
  sendSignupVerificationEmail,
} from './emailService.js';
import {
  type EmailVerificationLookupRow,
  type ResendVerificationEmailDTO,
  type VerifyEmailDTO,
} from '../types/auth.types.js';
import { isValidEmail } from '../utils/authScope.js';

const EMAIL_VERIFICATION_TOKEN_TTL_MINUTES = 60 * 24 * 3;
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
const isProduction = process.env.NODE_ENV === 'production';

const buildEmailVerificationLink = (rawToken: string, normalizedEmail: string) => {
  return `${FRONTEND_BASE_URL.replace(
    /\/+$/,
    '',
  )}/signin?verificationToken=${encodeURIComponent(rawToken)}&verificationEmail=${encodeURIComponent(
    normalizedEmail,
  )}`;
};

const formatEmailDeliveryErrorMessage = (fallbackMessage: string, error: unknown) => {
  if (isProduction) {
    return fallbackMessage;
  }

  if (!(error instanceof Error)) {
    return fallbackMessage;
  }

  const errorWithDetails = error as Error & {
    code?: string;
    responseCode?: number;
    command?: string;
    response?: {
      statusCode?: number;
      body?: {
        errors?: Array<{
          message?: string;
          field?: string;
          help?: string;
        }>;
      };
    } | string;
  };

  const responseDetails =
    typeof errorWithDetails.response === 'object' && errorWithDetails.response !== null
      ? [
          typeof errorWithDetails.response.statusCode === 'number'
            ? `HTTP ${errorWithDetails.response.statusCode}`
            : undefined,
          ...(errorWithDetails.response.body?.errors ?? []).flatMap((responseError) =>
            [responseError.message, responseError.field, responseError.help].filter(
              (value): value is string => typeof value === 'string' && value.trim().length > 0,
            ),
          ),
        ]
      : [];

  const details = [
    errorWithDetails.code,
    typeof errorWithDetails.responseCode === 'number'
      ? `SMTP ${errorWithDetails.responseCode}`
      : undefined,
    errorWithDetails.command,
    error.message,
    ...(typeof errorWithDetails.response === 'string' ? [errorWithDetails.response] : []),
    ...responseDetails,
  ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

  if (details.length === 0) {
    return fallbackMessage;
  }

  return `${fallbackMessage} (${details.join(' | ')})`;
};

const requireEmailVerificationLookup = (
  lookup: EmailVerificationLookupRow | null,
  normalizedEmail: string,
) => {
  if (!lookup) {
    throw new HttpError(400, '유효하지 않은 이메일 인증 링크입니다.', 'INVALID_EMAIL_VERIFICATION_TOKEN');
  }

  if (lookup.email.toLowerCase() !== normalizedEmail) {
    throw new HttpError(
      400,
      '인증 링크와 이메일이 일치하지 않습니다.',
      'EMAIL_VERIFICATION_EMAIL_MISMATCH',
    );
  }

  if (lookup.email_verified_at) {
    throw new HttpError(409, '이미 이메일 인증이 완료되었습니다.', 'EMAIL_ALREADY_VERIFIED');
  }

  if (lookup.used_at) {
    throw new HttpError(400, '이미 사용된 이메일 인증 링크입니다.', 'EMAIL_VERIFICATION_ALREADY_USED');
  }

  if (new Date(lookup.expires_at).getTime() < Date.now()) {
    throw new HttpError(
      400,
      '만료된 이메일 인증 링크입니다. 새 인증 메일을 요청해주세요.',
      'EMAIL_VERIFICATION_EXPIRED',
    );
  }

  return lookup;
};

const createEmailVerificationPayload = async (userId: number, normalizedEmail: string) => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  await authRepository.markUnusedEmailVerificationTokensAsUsed(userId);
  await authRepository.createEmailVerificationToken(
    userId,
    tokenHash,
    EMAIL_VERIFICATION_TOKEN_TTL_MINUTES,
  );

  return {
    verificationLink: buildEmailVerificationLink(rawToken, normalizedEmail),
  };
};

export const sendEmailVerification = async (
  userId: number,
  normalizedEmail: string,
  deliveryFailureMessage =
    '이메일 인증 메일 전송에 실패했습니다. 잠시 후 다시 시도해주세요.',
) => {
  const { verificationLink } = await createEmailVerificationPayload(userId, normalizedEmail);
  const isEmailDeliveryConfigured = canSendEmails();

  if (isEmailDeliveryConfigured) {
    try {
      await sendSignupVerificationEmail(normalizedEmail, verificationLink);
    } catch (error) {
      console.error('Signup verification email send error:', error);
      throw new HttpError(
        502,
        formatEmailDeliveryErrorMessage(deliveryFailureMessage, error),
        'EMAIL_DELIVERY_FAILED',
      );
    }
  }

  return {
    verificationLink,
    isEmailDeliveryConfigured,
  };
};

export const verifyEmail = async (payload: VerifyEmailDTO) => {
  const { email, token } = payload;

  if (!email || !token) {
    throw new HttpError(400, '이메일과 인증 토큰을 모두 입력해주세요.');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const lookup = await authRepository.findEmailVerificationLookupByTokenHash(tokenHash);
  const verificationLookup = requireEmailVerificationLookup(lookup, normalizedEmail);

  const verifyResult = await authRepository.verifyEmailByToken(
    verificationLookup.id,
    verificationLookup.user_id,
  );

  if (verifyResult === 'already_used') {
    throw new HttpError(400, '이미 사용된 이메일 인증 링크입니다.', 'EMAIL_VERIFICATION_ALREADY_USED');
  }

  if (verifyResult === 'user_not_found') {
    throw new HttpError(404, '해당 사용자를 찾을 수 없습니다.');
  }

  return {
    message: '이메일 인증이 완료되었습니다. 관리자 승인 후 로그인해주세요.',
  };
};

export const resendVerificationEmail = async (payload: ResendVerificationEmailDTO) => {
  const { email } = payload;

  if (!email) {
    throw new HttpError(400, '이메일을 입력해주세요.');
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!isValidEmail(normalizedEmail)) {
    throw new HttpError(400, '이메일 형식이 올바르지 않습니다.');
  }

  if (isProduction && !canSendEmails()) {
    throw new HttpError(500, '회원가입 이메일 인증 설정이 누락되었습니다.');
  }

  const genericMessage =
    '입력한 이메일이 가입 대기 중이면 인증 링크를 다시 전송했습니다. 이메일 인증과 관리자 승인 후 로그인하실 수 있습니다.';

  const user = await authRepository.findUserEmailByEmail(normalizedEmail);

  if (!user) {
    return { message: genericMessage };
  }

  if (user.emailVerifiedAt) {
    return {
      message: '이미 이메일 인증이 완료되었습니다. 관리자 승인 후 로그인해주세요.',
    };
  }

  const { verificationLink, isEmailDeliveryConfigured } = await sendEmailVerification(
    user.id,
    normalizedEmail,
    '인증 메일 재전송에 실패했습니다. 잠시 후 다시 시도해주세요.',
  );

  if (!isProduction && !isEmailDeliveryConfigured) {
    return {
      message: `${genericMessage} 개발 환경 인증 링크를 함께 반환했습니다.`,
      devVerificationLink: verificationLink,
    };
  }

  return { message: genericMessage };
};
