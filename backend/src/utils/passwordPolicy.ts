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

export const evaluatePasswordPolicy = (password: string): PasswordPolicyEvaluation => {
  const categoryFlags: PasswordPolicyCategoryFlags = {
    hasLowercase: /[a-z]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialCharacter: SPECIAL_CHARACTER_PATTERN.test(password),
  };

  const satisfiedCategoryCount = Object.values(categoryFlags).filter(Boolean).length;
  const hasMinimumLength = password.length >= 8;
  const hasNoTripleRepeat = !TRIPLE_REPEAT_PATTERN.test(password);
  const hasEnoughCharacterTypes = satisfiedCategoryCount >= 3;

  return {
    hasMinimumLength,
    hasNoTripleRepeat,
    categoryFlags,
    satisfiedCategoryCount,
    hasEnoughCharacterTypes,
    isValid: hasMinimumLength && hasEnoughCharacterTypes && hasNoTripleRepeat,
  };
};

export const PASSWORD_POLICY_ERROR_MESSAGE =
  '비밀번호는 8자 이상이어야 하며, 영문 소문자/대문자/숫자/특수문자 중 3가지 이상을 포함하고, 같은 문자를 3번 이상 연속해서 사용할 수 없습니다.';
