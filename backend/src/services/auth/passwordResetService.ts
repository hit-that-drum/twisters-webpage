import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { HttpError } from '../../errors/httpError.js';
import { authRepository } from '../../repositories/authRepository.js';
import {
  canSendPasswordResetEmails,
  sendPasswordResetEmail,
} from '../emailService.js';
import {
  type PasswordResetLookupRow,
  type RequestResetDTO,
  type ResetPasswordDTO,
  type VerifyResetTokenDTO,
} from '../../types/auth.types.js';
import { evaluatePasswordPolicy, PASSWORD_POLICY_ERROR_MESSAGE } from '../../utils/passwordPolicy.js';

const SALT_ROUNDS = 10;
const RESET_TOKEN_TTL_MINUTES = 30;
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
const isProduction = process.env.NODE_ENV === 'production';

const requirePasswordResetLookup = (
  lookup: PasswordResetLookupRow | null,
  normalizedEmail: string,
) => {
  if (!lookup) {
    throw new HttpError(400, '유효하지 않은 비밀번호 재설정 토큰입니다.');
  }

  if (lookup.used_at) {
    throw new HttpError(400, '이미 사용된 비밀번호 재설정 토큰입니다.');
  }

  if (new Date(lookup.expires_at).getTime() < Date.now()) {
    throw new HttpError(400, '만료된 비밀번호 재설정 토큰입니다.');
  }

  if (lookup.email.toLowerCase() !== normalizedEmail) {
    throw new HttpError(400, '토큰과 이메일이 일치하지 않습니다.');
  }

  return lookup;
};

class PasswordResetService {
  async requestReset(payload: RequestResetDTO) {
    const { email } = payload;

    if (!email) {
      throw new HttpError(400, '이메일을 입력해주세요.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const genericMessage = '입력한 이메일로 비밀번호 재설정 링크를 전송했습니다.';
    const isEmailDeliveryConfigured = canSendPasswordResetEmails();

    if (isProduction && !isEmailDeliveryConfigured) {
      throw new HttpError(500, '비밀번호 재설정 이메일 설정이 누락되었습니다.');
    }

    const user = await authRepository.findUserEmailByEmail(normalizedEmail);

    if (!user) {
      return { message: genericMessage };
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    await authRepository.markUnusedResetTokensAsUsed(user.id);
    await authRepository.createPasswordResetToken(user.id, tokenHash, RESET_TOKEN_TTL_MINUTES);

    const resetLink = `${FRONTEND_BASE_URL.replace(
      /\/+$/,
      '',
    )}/signin?resetToken=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(
      normalizedEmail,
    )}`;

    if (isEmailDeliveryConfigured) {
      try {
        await sendPasswordResetEmail(normalizedEmail, resetLink);
      } catch (error) {
        console.error('Password reset email send error:', error);
      }
    }

    if (isProduction) {
      return { message: genericMessage };
    }

    return { message: genericMessage, devResetLink: resetLink };
  }

  async verifyResetToken(payload: VerifyResetTokenDTO) {
    const { email, token } = payload;

    if (!email || !token) {
      throw new HttpError(400, '이메일과 토큰을 입력해주세요.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const lookup = await authRepository.findPasswordResetLookupByTokenHash(tokenHash);

    requirePasswordResetLookup(lookup, normalizedEmail);
    return { message: '유효한 비밀번호 재설정 토큰입니다.' };
  }

  async resetPassword(payload: ResetPasswordDTO) {
    const { email, newPassword, token } = payload;

    if (!email || !newPassword || !token) {
      throw new HttpError(400, '이메일, 새 비밀번호, 토큰을 모두 입력해주세요.');
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!evaluatePasswordPolicy(newPassword).isValid) {
      throw new HttpError(400, PASSWORD_POLICY_ERROR_MESSAGE);
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const lookup = await authRepository.findPasswordResetLookupByTokenHash(tokenHash);
    const resetLookup = requirePasswordResetLookup(lookup, normalizedEmail);

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const resetResult = await authRepository.resetPasswordByToken(
      resetLookup.id,
      resetLookup.user_id,
      hashedPassword,
    );

    if (resetResult === 'already_used') {
      throw new HttpError(400, '이미 사용된 비밀번호 재설정 토큰입니다.');
    }

    if (resetResult === 'user_not_found') {
      throw new HttpError(404, '해당 사용자를 찾을 수 없습니다.');
    }

    return { message: '비밀번호가 성공적으로 변경되었습니다.' };
  }
}

export const passwordResetService = new PasswordResetService();
