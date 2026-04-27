import { HttpError } from '../errors/httpError.js';

export const PHONE_FORMAT_ERROR_MESSAGE = '전화번호는 3자리-4자리-4자리 형식으로 입력해주세요.';
export const PHONE_NUMBER_PATTERN = /^\d{3}-\d{4}-\d{4}$/;

const PHONE_DIGITS_ONLY_PATTERN = /^\d{11}$/;

const formatPhoneDigits = (digits: string) => `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;

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

export const normalizeOptionalPhoneNumber = (rawValue: unknown) => {
  if (rawValue === null || rawValue === undefined) {
    return null;
  }

  if (typeof rawValue !== 'string') {
    throw new HttpError(400, PHONE_FORMAT_ERROR_MESSAGE);
  }

  const normalizedValue = normalizePhoneNumber(rawValue);
  if (!normalizedValue) {
    return null;
  }

  if (!PHONE_NUMBER_PATTERN.test(normalizedValue)) {
    throw new HttpError(400, PHONE_FORMAT_ERROR_MESSAGE);
  }

  return normalizedValue;
};
