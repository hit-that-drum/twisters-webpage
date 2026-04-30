/**
 * MIRROR of `backend/src/utils/passwordPolicy.ts`. Everything between the
 * `// @keep-in-sync:start` and `// @keep-in-sync:end` markers must stay
 * byte-identical to the backend copy; only the per-side
 * `PASSWORD_POLICY_ERROR_MESSAGE` below is allowed to diverge.
 *
 * Do NOT edit the synced block by hand. Edit the backend file, then run
 * `node scripts/syncPasswordPolicy.mjs` from the repo root.
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
  'Password must be at least 8 characters, include at least 3 of lowercase, uppercase, number, special character, and must not contain more than 2 identical characters in a row.';
