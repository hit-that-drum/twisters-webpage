/**
 * Auth repository facade. The implementation now lives in three focused
 * repositories under ./auth — userRepository (user-table CRUD + admin
 * lifecycle + OAuth profile linkage), passwordResetTokenRepository
 * (password_reset_tokens), and emailVerificationTokenRepository
 * (email_verification_tokens). Schema migrations are owned by
 * ./auth/authSchema. This facade preserves the flat `authRepository.X`
 * surface that controllers, services, and Passport strategies were
 * already calling into.
 */
import { ensureAuthSchema } from './auth/authSchema.js';
import { emailVerificationTokenRepository } from './auth/emailVerificationTokenRepository.js';
import { passwordResetTokenRepository } from './auth/passwordResetTokenRepository.js';
import { userRepository } from './auth/userRepository.js';

export const authRepository = {
  ensureAuthSchema: () => ensureAuthSchema(),

  // userRepository
  createUser: userRepository.createUser.bind(userRepository),
  findMeById: userRepository.findMeById.bind(userRepository),
  findPublicUserById: userRepository.findPublicUserById.bind(userRepository),
  findAllPublicUsers: userRepository.findAllPublicUsers.bind(userRepository),
  findPublicUserByEmail: userRepository.findPublicUserByEmail.bind(userRepository),
  findApprovalUserByEmail: userRepository.findApprovalUserByEmail.bind(userRepository),
  findApprovalUserByKakaoId: userRepository.findApprovalUserByKakaoId.bind(userRepository),
  createGoogleUser: userRepository.createGoogleUser.bind(userRepository),
  updateGoogleProfileByUserId: userRepository.updateGoogleProfileByUserId.bind(userRepository),
  createKakaoUser: userRepository.createKakaoUser.bind(userRepository),
  updateKakaoProfileByUserId: userRepository.updateKakaoProfileByUserId.bind(userRepository),
  updateProfileImageByUserId: userRepository.updateProfileImageByUserId.bind(userRepository),
  updateMeProfileByUserId: userRepository.updateMeProfileByUserId.bind(userRepository),
  findUserEmailByEmail: userRepository.findUserEmailByEmail.bind(userRepository),
  markEmailVerifiedByUserId: userRepository.markEmailVerifiedByUserId.bind(userRepository),
  findPendingUsers: userRepository.findPendingUsers.bind(userRepository),
  findAllAdminUsers: userRepository.findAllAdminUsers.bind(userRepository),
  findUserApprovalById: userRepository.findUserApprovalById.bind(userRepository),
  findManagedUserById: userRepository.findManagedUserById.bind(userRepository),
  approveUserById: userRepository.approveUserById.bind(userRepository),
  deletePendingUserById: userRepository.deletePendingUserById.bind(userRepository),
  deleteManagedUserById: userRepository.deleteManagedUserById.bind(userRepository),
  updateManagedUserById: userRepository.updateManagedUserById.bind(userRepository),

  // passwordResetTokenRepository
  markUnusedResetTokensAsUsed:
    passwordResetTokenRepository.markUnusedResetTokensAsUsed.bind(passwordResetTokenRepository),
  createPasswordResetToken:
    passwordResetTokenRepository.createPasswordResetToken.bind(passwordResetTokenRepository),
  findPasswordResetLookupByTokenHash:
    passwordResetTokenRepository.findPasswordResetLookupByTokenHash.bind(
      passwordResetTokenRepository,
    ),
  resetPasswordByToken:
    passwordResetTokenRepository.resetPasswordByToken.bind(passwordResetTokenRepository),

  // emailVerificationTokenRepository
  markUnusedEmailVerificationTokensAsUsed:
    emailVerificationTokenRepository.markUnusedEmailVerificationTokensAsUsed.bind(
      emailVerificationTokenRepository,
    ),
  createEmailVerificationToken:
    emailVerificationTokenRepository.createEmailVerificationToken.bind(
      emailVerificationTokenRepository,
    ),
  findEmailVerificationLookupByTokenHash:
    emailVerificationTokenRepository.findEmailVerificationLookupByTokenHash.bind(
      emailVerificationTokenRepository,
    ),
  verifyEmailByToken:
    emailVerificationTokenRepository.verifyEmailByToken.bind(emailVerificationTokenRepository),
};

export {
  emailVerificationTokenRepository,
  passwordResetTokenRepository,
  userRepository,
};
