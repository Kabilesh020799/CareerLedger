import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import pinoHttp from "pino-http";
import { logger } from "../config/logger";

const requestIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

/** Adds a canonical request ID and one structured completion record per HTTP request. */
export const requestLogging = pinoHttp({
  logger,
  genReqId(req, res) {
    const requestId = randomUUID();
    res.setHeader("X-Request-Id", requestId);
    return requestId;
  },
  customProps(req) {
    const request = req as Request;
    const incoming = request.get("x-request-id");
    return {
      requestId: request.id,
      upstreamRequestId: incoming && requestIdPattern.test(incoming) ? incoming : undefined,
      userId: request.user?.id,
      route: request.route?.path ? `${request.baseUrl}${String(request.route.path)}` : undefined,
    };
  },
  serializers: {
    req(req) {
      return { method: req.method };
    },
    res(res) {
      return { statusCode: res.statusCode };
    },
  },
  customSuccessMessage: () => "request completed",
  customErrorMessage: () => "request failed",
});

/** Adds the authenticated user ID to request logs after Passport restores the session. */
export function bindAuthenticatedLogContext(req: Request, res: Response, next: NextFunction) {
  if (req.user) {
    const authenticatedLogger = req.log.child({ userId: req.user.id });
    req.log = authenticatedLogger;
    res.log = authenticatedLogger;
  }
  next();
}
