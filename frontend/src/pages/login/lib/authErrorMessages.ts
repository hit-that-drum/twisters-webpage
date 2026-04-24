export const VERIFICATION_REQUIRED_MESSAGE =
  '이메일 인증이 필요합니다. 가입 후 받은 메일의 인증 링크를 확인해주세요.';

export const getAuthErrorMessage = (error: unknown, code: unknown) => {
  if (code === 'ACCOUNT_PENDING_APPROVAL') {
    return '관리자 승인 대기 중입니다. 승인 후 로그인해주세요.';
  }

  if (code === 'EMAIL_VERIFICATION_REQUIRED') {
    return VERIFICATION_REQUIRED_MESSAGE;
  }

  if (code === 'EMAIL_VERIFICATION_EXPIRED') {
    return '이메일 인증 링크가 만료되었습니다. 인증 메일을 다시 보내주세요.';
  }

  if (code === 'INVALID_EMAIL_VERIFICATION_TOKEN') {
    return '유효하지 않은 이메일 인증 링크입니다. 인증 메일을 다시 보내주세요.';
  }

  if (code === 'EMAIL_VERIFICATION_EMAIL_MISMATCH') {
    return '인증 링크 정보가 일치하지 않습니다. 최신 인증 메일을 다시 열어주세요.';
  }

  if (code === 'EMAIL_ALREADY_VERIFIED') {
    return '이미 이메일 인증이 완료되었습니다. 관리자 승인 후 로그인해주세요.';
  }

  if (code === 'EMAIL_VERIFICATION_ALREADY_USED') {
    return '이미 사용된 이메일 인증 링크입니다. 필요하면 인증 메일을 다시 보내주세요.';
  }

  if (code === 'EMAIL_DELIVERY_FAILED') {
    return '인증 메일 전송에 실패했습니다. 잠시 후 다시 보내기를 시도해주세요.';
  }

  return typeof error === 'string' ? error : '알 수 없는 에러';
};
