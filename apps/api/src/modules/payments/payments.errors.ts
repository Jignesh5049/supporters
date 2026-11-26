import { AppError, ErrorCode } from '../../lib/errors';

export const paymentsNotConfigured = () =>
  new AppError(503, ErrorCode.PaymentsNotConfigured, 'Payments are not configured', {
    detail: 'Premium cannot be bought or changed right now.',
  });

export const providerDown = () =>
  new AppError(503, ErrorCode.ServiceUnavailable, 'Payments are unavailable', {
    detail: 'The payment provider did not answer. Try again in a moment.',
    retryAfter: 30,
  });
