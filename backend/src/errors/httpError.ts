export class HttpError extends Error {
  statusCode: number;
  code?: string;

  constructor(statusCode: number, message: string, code?: string) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    if (code !== undefined) {
      this.code = code;
    }
  }
}

export const isHttpError = (error: unknown): error is HttpError => {
  return error instanceof HttpError;
};
