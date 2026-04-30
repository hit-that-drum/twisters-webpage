/**
 * CANONICAL source for the password policy. The frontend mirror lives at
 * `frontend/src/common/lib/passwordPolicy.ts` and must stay byte-identical
 * below the `// @keep-in-sync:end` marker — only the per-side
 * `PASSWORD_POLICY_ERROR_MESSAGE` is allowed to diverge (Korean on the
 * backend for API error responses, English on the frontend for UI copy).
 *
 * Run `node scripts/syncPasswordPolicy.mjs` from the repo root to
 * propagate changes from this file to the frontend mirror, and
 * `node scripts/syncPasswordPolicy.mjs --check` in CI/pre-commit to
 * detect drift.
 */
// @keep-in-sync:start
export interface PasswordPolicyCategoryFlags {
  hasLowercase: boolean;
  hasUppercase: boolean;
  hasNumber: boolean;
  hasSpecialCharacter: boolean;
}

export interface PasswordPolicyEvaluation {
  hasMinimumLength: boolean;
  hasNoTripleRepeat: boolean;
  categoryFlags: PasswordPolicyCategoryFlags;
  satisfiedCategoryCount: number;
  hasEnoughCharacterTypes: boolean;
  isValid: boolean;
}

const SPECIAL_CHARACTER_PATTERN = /[^A-Za-z0-9]/;
const TRIPLE_REPEAT_PATTERN = /(.)\1\1/;
const MINIMUM_PASSWORD_LENGTH = 8;
const REQUIRED_CATEGORY_COUNT = 3;

export const evaluatePasswordPolicy = (password: string): PasswordPolicyEvaluation => {
  const categoryFlags: PasswordPolicyCategoryFlags = {
    hasLowercase: /[a-z]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialCharacter: SPECIAL_CHARACTER_PATTERN.test(password),
  };

  const satisfiedCategoryCount = Object.values(categoryFlags).filter(Boolean).length;
  const hasMinimumLength = password.length >= MINIMUM_PASSWORD_LENGTH;
  const hasNoTripleRepeat = !TRIPLE_REPEAT_PATTERN.test(password);
  const hasEnoughCharacterTypes = satisfiedCategoryCount >= REQUIRED_CATEGORY_COUNT;

  return {
    hasMinimumLength,
    hasNoTripleRepeat,
    categoryFlags,
    satisfiedCategoryCount,
    hasEnoughCharacterTypes,
    isValid: hasMinimumLength && hasEnoughCharacterTypes && hasNoTripleRepeat,
  };
};
// @keep-in-sync:end

export const PASSWORD_POLICY_ERROR_MESSAGE =
  '비밀번호는 8자 이상이어야 하며, 영문 소문자/대문자/숫자/특수문자 중 3가지 이상을 포함하고, 같은 문자를 3번 이상 연속해서 사용할 수 없습니다.';
