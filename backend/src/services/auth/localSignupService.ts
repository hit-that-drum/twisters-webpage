/**
 * Owns the local-credentials sign-up flow: validates the payload against
 * the shared password policy, hashes the password, creates the pending
 * user row, and dispatches the email verification message. Runs in
 * coordination with `emailVerificationService` so the verification link
 * is created atomically with the new account.
 */
import bcrypt from 'bcrypt';
import { HttpError } from '../../errors/httpError.js';
import { authRepository } from '../../repositories/authRepository.js';
import { canSendEmails } from '../emailService.js';
import { sendEmailVerification } from '../emailVerificationService.js';
import {
  type PendingSignUpResponse,
  type SignUpDTO,
} from '../../types/auth.types.js';
import { isTestUserName, isValidEmail } from '../../utils/authScope.js';
import { evaluatePasswordPolicy, PASSWORD_POLICY_ERROR_MESSAGE } from '../../utils/passwordPolicy.js';

const SALT_ROUNDS = 10;
const isProduction = process.env.NODE_ENV === 'production';

class LocalSignupService {
  async signUp(payload: SignUpDTO): Promise<PendingSignUpResponse> {
    const name = payload.name?.trim();
    const email = payload.email?.trim().toLowerCase();
    const password = payload.password;

    if (!name || !email || !password) {
      throw new HttpError(400, '모든 필드를 입력해주세요.');
    }

    if (!isValidEmail(email)) {
      throw new HttpError(400, '이메일 형식이 올바르지 않습니다.');
    }

    if (!evaluatePasswordPolicy(password).isValid) {
      throw new HttpError(400, PASSWORD_POLICY_ERROR_MESSAGE);
    }

    if (isProduction && !canSendEmails()) {
      throw new HttpError(500, '회원가입 이메일 인증 설정이 누락되었습니다.');
    }

    try {
      const isTest = isTestUserName(name);
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      const userId = await authRepository.createUser(name, email, hashedPassword, isTest);

      if (!userId) {
        throw new HttpError(500, '회원가입 처리 중 사용자 ID를 확인하지 못했습니다.');
      }

      const { verificationLink, isEmailDeliveryConfigured } = await sendEmailVerification(
        userId,
        email,
        '회원가입은 완료되었지만 인증 메일 전송에 실패했습니다. 로그인 화면에서 인증 메일을 다시 보내주세요.',
      );

      return {
        message:
          '회원가입이 완료되었습니다. 이메일 인증과 관리자 승인 후 로그인하실 수 있습니다.',
        status: 'pending',
        userId,
        ...(isProduction || isEmailDeliveryConfigured
          ? {}
          : { devVerificationLink: verificationLink }),
      };
    } catch (error: unknown) {
      const pgError = error as { code?: string };
      if (pgError.code === '23505') {
        throw new HttpError(400, '이미 사용 중인 이메일입니다.');
      }

      throw error;
    }
  }
}

export const localSignupService = new LocalSignupService();
