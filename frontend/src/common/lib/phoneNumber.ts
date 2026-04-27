export const PHONE_DIGIT_LIMIT = 11;
export const PHONE_FORMATTED_LENGTH = 13;
export const PHONE_FORMAT_ERROR_MESSAGE = '전화번호는 3자리-4자리-4자리 형식으로 입력해주세요.';
export const PHONE_NUMBER_PATTERN = /^\d{3}-\d{4}-\d{4}$/;

const PHONE_DIGITS_ONLY_PATTERN = /^\d{11}$/;

const formatPhoneDigits = (digits: string) => {
  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
};

export const formatPhoneInput = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, PHONE_DIGIT_LIMIT);
  return formatPhoneDigits(digits);
};

export const normalizePhoneNumber = (value: string) => {
  const trimmedValue = value.trim();
  if (!trimmedValue || PHONE_NUMBER_PATTERN.test(trimmedValue)) {
    return trimmedValue;
  }

  if (PHONE_DIGITS_ONLY_PATTERN.test(trimmedValue)) {
    return formatPhoneDigits(trimmedValue);
  }

  return trimmedValue;
};

export const isValidOptionalPhoneNumber = (value: string) => {
  const normalizedValue = normalizePhoneNumber(value);
  return !normalizedValue || PHONE_NUMBER_PATTERN.test(normalizedValue);
};
