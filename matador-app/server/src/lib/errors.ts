/** An error whose message is safe to show to the user. */
export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const badRequest = (message = 'Invalid request.', code = 'bad_request') => new HttpError(400, code, message);
export const unauthorized = (message = 'Please sign in again.') => new HttpError(401, 'unauthorized', message);
export const notFound = (message = 'Not found.') => new HttpError(404, 'not_found', message);
export const tooMany = (message: string, code = 'rate_limited') => new HttpError(429, code, message);
