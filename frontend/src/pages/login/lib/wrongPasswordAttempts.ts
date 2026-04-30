const WRONG_PASSWORD_ATTEMPTS_KEY = 'wrongPasswordAttemptsByEmail';

export const MAX_WRONG_PASSWORD_ATTEMPTS = 5;

type WrongPasswordAttemptsByEmail = Record<string, number>;

const readWrongPasswordAttempts = (): WrongPasswordAttemptsByEmail => {
  try {
    const storedValue = localStorage.getItem(WRONG_PASSWORD_ATTEMPTS_KEY);
    if (!storedValue) {
      return {};
    }

    const parsedValue = JSON.parse(storedValue);
    if (!parsedValue || typeof parsedValue !== 'object') {
      return {};
    }

    return parsedValue as WrongPasswordAttemptsByEmail;
  } catch {
    return {};
  }
};

const writeWrongPasswordAttempts = (attempts: WrongPasswordAttemptsByEmail) => {
  localStorage.setItem(WRONG_PASSWORD_ATTEMPTS_KEY, JSON.stringify(attempts));
};

export const increaseWrongPasswordAttempt = (email: string) => {
  const attempts = readWrongPasswordAttempts();
  const nextAttempts = (attempts[email] || 0) + 1;
  attempts[email] = nextAttempts;
  writeWrongPasswordAttempts(attempts);
  return nextAttempts;
};

export const clearWrongPasswordAttempt = (email: string) => {
  if (!email) {
    return;
  }

  const attempts = readWrongPasswordAttempts();
  if (!(email in attempts)) {
    return;
  }

  delete attempts[email];
  writeWrongPasswordAttempts(attempts);
};

export const getWrongPasswordAttempt = (email: string) => {
  if (!email) {
    return 0;
  }

  const attempts = readWrongPasswordAttempts();
  return attempts[email] || 0;
};
