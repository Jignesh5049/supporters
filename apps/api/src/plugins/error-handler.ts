import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
} from 'fastify-type-provider-zod';
import { AppError, ErrorCode, type FieldError } from '../lib/errors';

interface Problem {
  type: string;
  title: string;
  status: number;
  detail?: string;
  code: ErrorCode;
  errors?: FieldError[];
  requestId: string;
}

const STATUS_CODES: Record<number, [ErrorCode, string]> = {
  400: [ErrorCode.MalformedRequest, 'Malformed request'],
  401: [ErrorCode.Unauthenticated, 'Sign in to continue'],
  403: [ErrorCode.Forbidden, 'Not allowed'],
  404: [ErrorCode.NotFound, 'Not found'],
  413: [ErrorCode.PayloadTooLarge, 'Request body too large'],
  415: [ErrorCode.UnsupportedMediaType, 'Unsupported content type'],
  429: [ErrorCode.RateLimited, 'Too many requests'],
  503: [ErrorCode.ServiceUnavailable, 'Service busy, try again shortly'],
};

function toAppError(error: FastifyError | AppError): AppError {
  if (error instanceof AppError) return error;

  if (hasZodFastifySchemaValidationErrors(error)) {
    const context = error.validationContext ?? 'request';
    const errors = error.validation.map((issue) => ({
      path: [context, ...issue.instancePath.split('/').filter(Boolean)].join('.'),
      message: issue.message ?? 'Invalid value',
    }));
    return new AppError(400, ErrorCode.ValidationFailed, 'Validation failed', { errors });
  }

  if (isResponseSerializationError(error)) {
    return new AppError(500, ErrorCode.InternalError, 'Something went wrong', { cause: error });
  }

  // Fastify's own 4xx and 503 errors (bad JSON, body too large, under-pressure) keep their
  // status but get a stable code and a generic title.
  const status = error.statusCode ?? 500;
  if (status >= 400 && status < 600) {
    const [code, title] = STATUS_CODES[status] ?? [ErrorCode.MalformedRequest, 'Bad request'];
    if (status < 500 || status === 503) return new AppError(status, code, title, { cause: error });
  }

  return new AppError(500, ErrorCode.InternalError, 'Something went wrong', { cause: error });
}

function sendProblem(
  app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
  error: AppError,
) {
  const problem: Problem = {
    type: `${app.env.APP_ORIGIN}/errors/${error.code.toLowerCase().replaceAll('_', '-')}`,
    title: error.title,
    status: error.statusCode,
    code: error.code,
    requestId: request.id,
  };
  if (error.detail) problem.detail = error.detail;
  if (error.errors) problem.errors = error.errors;
  if (error.retryAfter !== undefined)
    reply.header('retry-after', Math.max(1, Math.ceil(error.retryAfter)));

  return reply.status(error.statusCode).type('application/problem+json').send(problem);
}

/** RFC 9457 problem details for every error (backend spec, request pipeline step 10). */
export const errorHandlerPlugin = fp(
  async (app) => {
    app.setErrorHandler((rawError: FastifyError | AppError, request, reply) => {
      const error = toAppError(rawError);
      if (error.statusCode >= 500) {
        request.log.error({ err: rawError }, 'request failed');
      } else {
        request.log.info({ errorCode: error.code, status: error.statusCode }, 'request rejected');
      }
      return sendProblem(app, request, reply, error);
    });

    app.setNotFoundHandler((request, reply) =>
      sendProblem(app, request, reply, new AppError(404, ErrorCode.NotFound, 'Not found')),
    );
  },
  { name: 'error-handler', dependencies: ['env'] },
);
