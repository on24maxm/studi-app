// Copyright 2018-2025 the oak authors. All rights reserved. MIT license.
/**
 * A collection of HTTP errors and utilities.
 *
 * The export {@linkcode errors} contains an individual class that extends
 * {@linkcode HttpError} which makes handling HTTP errors in a structured way.
 *
 * The function {@linkcode createHttpError} provides a way to create instances
 * of errors in a factory pattern.
 *
 * The function {@linkcode isHttpError} is a type guard that will narrow a value
 * to an `HttpError` instance.
 *
 * @example
 * ```ts
 * import { errors, isHttpError } from "jsr:@oak/commons/http_errors";
 *
 * try {
 *   throw new errors.NotFound();
 * } catch (e) {
 *   if (isHttpError(e)) {
 *     const response = new Response(e.message, { status: e.status });
 *   } else {
 *     throw e;
 *   }
 * }
 * ```
 *
 * @example
 * ```ts
 * import { createHttpError } from "jsr:@oak/commons/http_errors";
 * import { Status } from "jsr:@oak/commons/status";
 *
 * try {
 *   throw createHttpError(
 *     Status.BadRequest,
 *     "The request was bad.",
 *     { expose: false }
 *   );
 * } catch (e) {
 *   // handle errors
 * }
 * ```
 *
 * @module
 */ import { accepts } from "jsr:@std/http@^1.0/negotiation";
import { contentType } from "jsr:@std/media-types@^1.0/content-type";
import { isClientErrorStatus, Status, STATUS_TEXT } from "./status.ts";
const ERROR_STATUS_MAP = {
  "BadRequest": 400,
  "Unauthorized": 401,
  "PaymentRequired": 402,
  "Forbidden": 403,
  "NotFound": 404,
  "MethodNotAllowed": 405,
  "NotAcceptable": 406,
  "ProxyAuthRequired": 407,
  "RequestTimeout": 408,
  "Conflict": 409,
  "Gone": 410,
  "LengthRequired": 411,
  "PreconditionFailed": 412,
  "RequestEntityTooLarge": 413,
  "RequestURITooLong": 414,
  "UnsupportedMediaType": 415,
  "RequestedRangeNotSatisfiable": 416,
  "ExpectationFailed": 417,
  "Teapot": 418,
  "MisdirectedRequest": 421,
  "UnprocessableEntity": 422,
  "Locked": 423,
  "FailedDependency": 424,
  "UpgradeRequired": 426,
  "PreconditionRequired": 428,
  "TooManyRequests": 429,
  "RequestHeaderFieldsTooLarge": 431,
  "UnavailableForLegalReasons": 451,
  "InternalServerError": 500,
  "NotImplemented": 501,
  "BadGateway": 502,
  "ServiceUnavailable": 503,
  "GatewayTimeout": 504,
  "HTTPVersionNotSupported": 505,
  "VariantAlsoNegotiates": 506,
  "InsufficientStorage": 507,
  "LoopDetected": 508,
  "NotExtended": 510,
  "NetworkAuthenticationRequired": 511
};
/**
 * The base class that all derivative HTTP extend, providing a `status` and an
 * `expose` property.
 */ export class HttpError extends Error {
  #expose;
  constructor(message = "Http Error", options){
    super(message, options);
    this.#expose = options?.expose === undefined ? isClientErrorStatus(this.status) : options.expose;
  }
  /** A flag to indicate if the internals of the error, like the stack, should
   * be exposed to a client, or if they are "private" and should not be leaked.
   * By default, all client errors are `true` and all server errors are
   * `false`. */ get expose() {
    return this.#expose;
  }
  /** The error status that is set on the error. */ get status() {
    return Status.InternalServerError;
  }
  /**
   * Format the error as a {@linkcode Response} which can be sent to a client.
   */ asResponse(options = {}) {
    const { prefer = "json", request, headers } = options;
    const acceptsContent = request ? prefer === "json" ? accepts(request, "application/json", "text/html") : accepts(request, "text/html", "application/json") : prefer === "json" ? "application/json" : "text/html";
    switch(acceptsContent){
      case "application/json":
        return Response.json({
          status: this.status,
          statusText: STATUS_TEXT[this.status],
          message: this.message,
          stack: this.#expose ? this.stack : undefined
        }, {
          status: this.status,
          statusText: STATUS_TEXT[this.status],
          headers
        });
      case "text/html":
        {
          const res = new Response(`<!DOCTYPE html><html>
        <head>
          <title>${STATUS_TEXT[this.status]} - ${this.status}</title>
        </head>
        <body>
          <h1>${STATUS_TEXT[this.status]} - ${this.status}</h1>
          <h2>${this.message}</h2>
          ${this.#expose && this.stack ? `<h3>Stack trace:</h3><pre>${this.stack}</pre>` : ""}
        </body>
      </html>`, {
            status: this.status,
            statusText: STATUS_TEXT[this.status],
            headers
          });
          res.headers.set("content-type", contentType("html"));
          return res;
        }
    }
    const res = new Response(`${STATUS_TEXT[this.status]} - ${this.status}\n${this.message}\n\n${this.#expose ? this.stack : ""}`, {
      status: this.status,
      statusText: STATUS_TEXT[this.status],
      headers
    });
    res.headers.set("content-type", contentType("txt"));
    return res;
  }
}
function createHttpErrorConstructor(status) {
  const name = `${Status[status]}Error`;
  const ErrorCtor = class extends HttpError {
    constructor(message = STATUS_TEXT[status], options){
      super(message, options);
      Object.defineProperty(this, "name", {
        configurable: true,
        enumerable: false,
        value: name,
        writable: true
      });
    }
    get status() {
      return status;
    }
  };
  return ErrorCtor;
}
/**
 * A namespace that contains each error constructor. Each error extends
 * `HTTPError` and provides `.status` and `.expose` properties, where the
 * `.status` will be an error `Status` value and `.expose` indicates if
 * information, like a stack trace, should be shared in the response.
 *
 * By default, `.expose` is set to false in server errors, and true for client
 * errors.
 *
 * @example
 * ```ts
 * import { errors } from "jsr:@oak/commons/http_errors";
 *
 * throw new errors.InternalServerError("Ooops!");
 * ```
 */ export const errors = {};
for (const [key, value] of Object.entries(ERROR_STATUS_MAP)){
  errors[key] = createHttpErrorConstructor(value);
}
/**
 * A factory function which provides a way to create errors. It takes up to 3
 * arguments, the error `Status`, an message, which defaults to the status text
 * and error options, which includes the `expose` property to set the `.expose`
 * value on the error.
 */ export function createHttpError(status = Status.InternalServerError, message, options) {
  return new errors[Status[status]](message, options);
}
/**
 * A type guard that determines if the value is an HttpError or not.
 */ export function isHttpError(value) {
  return value instanceof HttpError;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BvYWsvY29tbW9ucy8xLjAuMS9odHRwX2Vycm9ycy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDI1IHRoZSBvYWsgYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIGxpY2Vuc2UuXG5cbi8qKlxuICogQSBjb2xsZWN0aW9uIG9mIEhUVFAgZXJyb3JzIGFuZCB1dGlsaXRpZXMuXG4gKlxuICogVGhlIGV4cG9ydCB7QGxpbmtjb2RlIGVycm9yc30gY29udGFpbnMgYW4gaW5kaXZpZHVhbCBjbGFzcyB0aGF0IGV4dGVuZHNcbiAqIHtAbGlua2NvZGUgSHR0cEVycm9yfSB3aGljaCBtYWtlcyBoYW5kbGluZyBIVFRQIGVycm9ycyBpbiBhIHN0cnVjdHVyZWQgd2F5LlxuICpcbiAqIFRoZSBmdW5jdGlvbiB7QGxpbmtjb2RlIGNyZWF0ZUh0dHBFcnJvcn0gcHJvdmlkZXMgYSB3YXkgdG8gY3JlYXRlIGluc3RhbmNlc1xuICogb2YgZXJyb3JzIGluIGEgZmFjdG9yeSBwYXR0ZXJuLlxuICpcbiAqIFRoZSBmdW5jdGlvbiB7QGxpbmtjb2RlIGlzSHR0cEVycm9yfSBpcyBhIHR5cGUgZ3VhcmQgdGhhdCB3aWxsIG5hcnJvdyBhIHZhbHVlXG4gKiB0byBhbiBgSHR0cEVycm9yYCBpbnN0YW5jZS5cbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHNcbiAqIGltcG9ydCB7IGVycm9ycywgaXNIdHRwRXJyb3IgfSBmcm9tIFwianNyOkBvYWsvY29tbW9ucy9odHRwX2Vycm9yc1wiO1xuICpcbiAqIHRyeSB7XG4gKiAgIHRocm93IG5ldyBlcnJvcnMuTm90Rm91bmQoKTtcbiAqIH0gY2F0Y2ggKGUpIHtcbiAqICAgaWYgKGlzSHR0cEVycm9yKGUpKSB7XG4gKiAgICAgY29uc3QgcmVzcG9uc2UgPSBuZXcgUmVzcG9uc2UoZS5tZXNzYWdlLCB7IHN0YXR1czogZS5zdGF0dXMgfSk7XG4gKiAgIH0gZWxzZSB7XG4gKiAgICAgdGhyb3cgZTtcbiAqICAgfVxuICogfVxuICogYGBgXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBjcmVhdGVIdHRwRXJyb3IgfSBmcm9tIFwianNyOkBvYWsvY29tbW9ucy9odHRwX2Vycm9yc1wiO1xuICogaW1wb3J0IHsgU3RhdHVzIH0gZnJvbSBcImpzcjpAb2FrL2NvbW1vbnMvc3RhdHVzXCI7XG4gKlxuICogdHJ5IHtcbiAqICAgdGhyb3cgY3JlYXRlSHR0cEVycm9yKFxuICogICAgIFN0YXR1cy5CYWRSZXF1ZXN0LFxuICogICAgIFwiVGhlIHJlcXVlc3Qgd2FzIGJhZC5cIixcbiAqICAgICB7IGV4cG9zZTogZmFsc2UgfVxuICogICApO1xuICogfSBjYXRjaCAoZSkge1xuICogICAvLyBoYW5kbGUgZXJyb3JzXG4gKiB9XG4gKiBgYGBcbiAqXG4gKiBAbW9kdWxlXG4gKi9cblxuaW1wb3J0IHsgYWNjZXB0cyB9IGZyb20gXCJqc3I6QHN0ZC9odHRwQF4xLjAvbmVnb3RpYXRpb25cIjtcbmltcG9ydCB7IGNvbnRlbnRUeXBlIH0gZnJvbSBcImpzcjpAc3RkL21lZGlhLXR5cGVzQF4xLjAvY29udGVudC10eXBlXCI7XG5cbmltcG9ydCB7XG4gIHR5cGUgRXJyb3JTdGF0dXMsXG4gIGlzQ2xpZW50RXJyb3JTdGF0dXMsXG4gIFN0YXR1cyxcbiAgU1RBVFVTX1RFWFQsXG59IGZyb20gXCIuL3N0YXR1cy50c1wiO1xuXG5jb25zdCBFUlJPUl9TVEFUVVNfTUFQID0ge1xuICBcIkJhZFJlcXVlc3RcIjogNDAwLFxuICBcIlVuYXV0aG9yaXplZFwiOiA0MDEsXG4gIFwiUGF5bWVudFJlcXVpcmVkXCI6IDQwMixcbiAgXCJGb3JiaWRkZW5cIjogNDAzLFxuICBcIk5vdEZvdW5kXCI6IDQwNCxcbiAgXCJNZXRob2ROb3RBbGxvd2VkXCI6IDQwNSxcbiAgXCJOb3RBY2NlcHRhYmxlXCI6IDQwNixcbiAgXCJQcm94eUF1dGhSZXF1aXJlZFwiOiA0MDcsXG4gIFwiUmVxdWVzdFRpbWVvdXRcIjogNDA4LFxuICBcIkNvbmZsaWN0XCI6IDQwOSxcbiAgXCJHb25lXCI6IDQxMCxcbiAgXCJMZW5ndGhSZXF1aXJlZFwiOiA0MTEsXG4gIFwiUHJlY29uZGl0aW9uRmFpbGVkXCI6IDQxMixcbiAgXCJSZXF1ZXN0RW50aXR5VG9vTGFyZ2VcIjogNDEzLFxuICBcIlJlcXVlc3RVUklUb29Mb25nXCI6IDQxNCxcbiAgXCJVbnN1cHBvcnRlZE1lZGlhVHlwZVwiOiA0MTUsXG4gIFwiUmVxdWVzdGVkUmFuZ2VOb3RTYXRpc2ZpYWJsZVwiOiA0MTYsXG4gIFwiRXhwZWN0YXRpb25GYWlsZWRcIjogNDE3LFxuICBcIlRlYXBvdFwiOiA0MTgsXG4gIFwiTWlzZGlyZWN0ZWRSZXF1ZXN0XCI6IDQyMSxcbiAgXCJVbnByb2Nlc3NhYmxlRW50aXR5XCI6IDQyMixcbiAgXCJMb2NrZWRcIjogNDIzLFxuICBcIkZhaWxlZERlcGVuZGVuY3lcIjogNDI0LFxuICBcIlVwZ3JhZGVSZXF1aXJlZFwiOiA0MjYsXG4gIFwiUHJlY29uZGl0aW9uUmVxdWlyZWRcIjogNDI4LFxuICBcIlRvb01hbnlSZXF1ZXN0c1wiOiA0MjksXG4gIFwiUmVxdWVzdEhlYWRlckZpZWxkc1Rvb0xhcmdlXCI6IDQzMSxcbiAgXCJVbmF2YWlsYWJsZUZvckxlZ2FsUmVhc29uc1wiOiA0NTEsXG4gIFwiSW50ZXJuYWxTZXJ2ZXJFcnJvclwiOiA1MDAsXG4gIFwiTm90SW1wbGVtZW50ZWRcIjogNTAxLFxuICBcIkJhZEdhdGV3YXlcIjogNTAyLFxuICBcIlNlcnZpY2VVbmF2YWlsYWJsZVwiOiA1MDMsXG4gIFwiR2F0ZXdheVRpbWVvdXRcIjogNTA0LFxuICBcIkhUVFBWZXJzaW9uTm90U3VwcG9ydGVkXCI6IDUwNSxcbiAgXCJWYXJpYW50QWxzb05lZ290aWF0ZXNcIjogNTA2LFxuICBcIkluc3VmZmljaWVudFN0b3JhZ2VcIjogNTA3LFxuICBcIkxvb3BEZXRlY3RlZFwiOiA1MDgsXG4gIFwiTm90RXh0ZW5kZWRcIjogNTEwLFxuICBcIk5ldHdvcmtBdXRoZW50aWNhdGlvblJlcXVpcmVkXCI6IDUxMSxcbn0gYXMgY29uc3Q7XG5cbi8qKlxuICogQSB0eXBlIGFsaWFzIHdoaWNoIGlzIGEgc2V0IG9mIGFsbCB0aGUgc3RyaW5nIGxpdGVyYWwgbmFtZXMgb2YgdGhlIGVycm9yXG4gKiBzdGF0dXMgY29kZXMuXG4gKi9cbmV4cG9ydCB0eXBlIEVycm9yU3RhdHVzS2V5cyA9IGtleW9mIHR5cGVvZiBFUlJPUl9TVEFUVVNfTUFQO1xuXG4vKipcbiAqIE9wdGlvbnMgd2hpY2ggY2FuIGJlIHNldCB3aGVuIGluaXRpYWxpemluZyBhbiB7QGxpbmtjb2RlIEh0dHBFcnJvcn1cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBIdHRwRXJyb3JPcHRpb25zIGV4dGVuZHMgRXJyb3JPcHRpb25zIHtcbiAgLyoqIERldGVybWluZSBpZiB0aGUgdW5kZXJseWluZyBlcnJvciBzdGFjayBzaG91bGQgYmUgZXhwb3NlZCB0byBhIGNsaWVudC4gKi9cbiAgZXhwb3NlPzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBBc1Jlc3BvbnNlT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBBbnkgYWRkaXRpb25hbCBoZWFkZXJzIHRoYXQgc2hvdWxkIGJlIGluY2x1ZGVkIHdoZW4gY3JlYXRpbmcgdGhlXG4gICAqIHJlc3BvbnNlLlxuICAgKi9cbiAgaGVhZGVycz86IEhlYWRlcnNJbml0O1xuICAvKipcbiAgICogV2hlbiBkZXRlcm1pbmluZyB3aGF0IGZvcm1hdCB0byByZXNwb25kIGluLCBwcmVmZXIgZWl0aGVyIGEgSlNPTiBvciBIVE1MXG4gICAqIHJlc3BvbnNlLiBJZiBhIHJlcXVlc3QgaXMgcHJvdmlkZWQsIHRoZSBhY2NlcHQgaGVhZGVyIHdpbGwgYmUgdXNlZCB0b1xuICAgKiBkZXRlcm1pbmUgdGhlIGZpbmFsIHJlc3BvbnNlIGNvbnRlbnQgdHlwZS5cbiAgICpcbiAgICogRGVmYXVsdHMgdG8gYFwianNvblwiYC5cbiAgICovXG4gIHByZWZlcj86IFwianNvblwiIHwgXCJodG1sXCI7XG4gIC8qKlxuICAgKiBBbiBvcHRpb25hbCB7QGxpbmtjb2RlIFJlcXVlc3R9LCB3aGljaCB3aWxsIGJlIHVzZWQgdG8gZGV0ZXJtaW5lIHdoYXRcbiAgICogdHlwZSBvZiByZXNwb25zZSB0aGUgcmVxdWVzdCBjYW4gYWNjZXB0LlxuICAgKi9cbiAgcmVxdWVzdD86IFJlcXVlc3Q7XG59XG5cbi8qKlxuICogVGhlIGJhc2UgY2xhc3MgdGhhdCBhbGwgZGVyaXZhdGl2ZSBIVFRQIGV4dGVuZCwgcHJvdmlkaW5nIGEgYHN0YXR1c2AgYW5kIGFuXG4gKiBgZXhwb3NlYCBwcm9wZXJ0eS5cbiAqL1xuZXhwb3J0IGNsYXNzIEh0dHBFcnJvcjxTIGV4dGVuZHMgRXJyb3JTdGF0dXMgPSBTdGF0dXMuSW50ZXJuYWxTZXJ2ZXJFcnJvcj5cbiAgZXh0ZW5kcyBFcnJvciB7XG4gICNleHBvc2U6IGJvb2xlYW47XG4gIGNvbnN0cnVjdG9yKFxuICAgIG1lc3NhZ2UgPSBcIkh0dHAgRXJyb3JcIixcbiAgICBvcHRpb25zPzogSHR0cEVycm9yT3B0aW9ucyxcbiAgKSB7XG4gICAgc3VwZXIobWVzc2FnZSwgb3B0aW9ucyk7XG4gICAgdGhpcy4jZXhwb3NlID0gb3B0aW9ucz8uZXhwb3NlID09PSB1bmRlZmluZWRcbiAgICAgID8gaXNDbGllbnRFcnJvclN0YXR1cyh0aGlzLnN0YXR1cylcbiAgICAgIDogb3B0aW9ucy5leHBvc2U7XG4gIH1cblxuICAvKiogQSBmbGFnIHRvIGluZGljYXRlIGlmIHRoZSBpbnRlcm5hbHMgb2YgdGhlIGVycm9yLCBsaWtlIHRoZSBzdGFjaywgc2hvdWxkXG4gICAqIGJlIGV4cG9zZWQgdG8gYSBjbGllbnQsIG9yIGlmIHRoZXkgYXJlIFwicHJpdmF0ZVwiIGFuZCBzaG91bGQgbm90IGJlIGxlYWtlZC5cbiAgICogQnkgZGVmYXVsdCwgYWxsIGNsaWVudCBlcnJvcnMgYXJlIGB0cnVlYCBhbmQgYWxsIHNlcnZlciBlcnJvcnMgYXJlXG4gICAqIGBmYWxzZWAuICovXG4gIGdldCBleHBvc2UoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuI2V4cG9zZTtcbiAgfVxuXG4gIC8qKiBUaGUgZXJyb3Igc3RhdHVzIHRoYXQgaXMgc2V0IG9uIHRoZSBlcnJvci4gKi9cbiAgZ2V0IHN0YXR1cygpOiBTIHtcbiAgICByZXR1cm4gU3RhdHVzLkludGVybmFsU2VydmVyRXJyb3IgYXMgUztcbiAgfVxuXG4gIC8qKlxuICAgKiBGb3JtYXQgdGhlIGVycm9yIGFzIGEge0BsaW5rY29kZSBSZXNwb25zZX0gd2hpY2ggY2FuIGJlIHNlbnQgdG8gYSBjbGllbnQuXG4gICAqL1xuICBhc1Jlc3BvbnNlKG9wdGlvbnM6IEFzUmVzcG9uc2VPcHRpb25zID0ge30pOiBSZXNwb25zZSB7XG4gICAgY29uc3QgeyBwcmVmZXIgPSBcImpzb25cIiwgcmVxdWVzdCwgaGVhZGVycyB9ID0gb3B0aW9ucztcbiAgICBjb25zdCBhY2NlcHRzQ29udGVudCA9IHJlcXVlc3RcbiAgICAgID8gcHJlZmVyID09PSBcImpzb25cIlxuICAgICAgICA/IGFjY2VwdHMocmVxdWVzdCwgXCJhcHBsaWNhdGlvbi9qc29uXCIsIFwidGV4dC9odG1sXCIpXG4gICAgICAgIDogYWNjZXB0cyhyZXF1ZXN0LCBcInRleHQvaHRtbFwiLCBcImFwcGxpY2F0aW9uL2pzb25cIilcbiAgICAgIDogcHJlZmVyID09PSBcImpzb25cIlxuICAgICAgPyBcImFwcGxpY2F0aW9uL2pzb25cIlxuICAgICAgOiBcInRleHQvaHRtbFwiO1xuICAgIHN3aXRjaCAoYWNjZXB0c0NvbnRlbnQpIHtcbiAgICAgIGNhc2UgXCJhcHBsaWNhdGlvbi9qc29uXCI6XG4gICAgICAgIHJldHVybiBSZXNwb25zZS5qc29uKHtcbiAgICAgICAgICBzdGF0dXM6IHRoaXMuc3RhdHVzLFxuICAgICAgICAgIHN0YXR1c1RleHQ6IFNUQVRVU19URVhUW3RoaXMuc3RhdHVzXSxcbiAgICAgICAgICBtZXNzYWdlOiB0aGlzLm1lc3NhZ2UsXG4gICAgICAgICAgc3RhY2s6IHRoaXMuI2V4cG9zZSA/IHRoaXMuc3RhY2sgOiB1bmRlZmluZWQsXG4gICAgICAgIH0sIHtcbiAgICAgICAgICBzdGF0dXM6IHRoaXMuc3RhdHVzLFxuICAgICAgICAgIHN0YXR1c1RleHQ6IFNUQVRVU19URVhUW3RoaXMuc3RhdHVzXSxcbiAgICAgICAgICBoZWFkZXJzLFxuICAgICAgICB9KTtcbiAgICAgIGNhc2UgXCJ0ZXh0L2h0bWxcIjoge1xuICAgICAgICBjb25zdCByZXMgPSBuZXcgUmVzcG9uc2UoXG4gICAgICAgICAgYDwhRE9DVFlQRSBodG1sPjxodG1sPlxuICAgICAgICA8aGVhZD5cbiAgICAgICAgICA8dGl0bGU+JHtTVEFUVVNfVEVYVFt0aGlzLnN0YXR1c119IC0gJHt0aGlzLnN0YXR1c308L3RpdGxlPlxuICAgICAgICA8L2hlYWQ+XG4gICAgICAgIDxib2R5PlxuICAgICAgICAgIDxoMT4ke1NUQVRVU19URVhUW3RoaXMuc3RhdHVzXX0gLSAke3RoaXMuc3RhdHVzfTwvaDE+XG4gICAgICAgICAgPGgyPiR7dGhpcy5tZXNzYWdlfTwvaDI+XG4gICAgICAgICAgJHtcbiAgICAgICAgICAgIHRoaXMuI2V4cG9zZSAmJiB0aGlzLnN0YWNrXG4gICAgICAgICAgICAgID8gYDxoMz5TdGFjayB0cmFjZTo8L2gzPjxwcmU+JHt0aGlzLnN0YWNrfTwvcHJlPmBcbiAgICAgICAgICAgICAgOiBcIlwiXG4gICAgICAgICAgfVxuICAgICAgICA8L2JvZHk+XG4gICAgICA8L2h0bWw+YCxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBzdGF0dXM6IHRoaXMuc3RhdHVzLFxuICAgICAgICAgICAgc3RhdHVzVGV4dDogU1RBVFVTX1RFWFRbdGhpcy5zdGF0dXNdLFxuICAgICAgICAgICAgaGVhZGVycyxcbiAgICAgICAgICB9LFxuICAgICAgICApO1xuICAgICAgICByZXMuaGVhZGVycy5zZXQoXCJjb250ZW50LXR5cGVcIiwgY29udGVudFR5cGUoXCJodG1sXCIpKTtcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgcmVzID0gbmV3IFJlc3BvbnNlKFxuICAgICAgYCR7U1RBVFVTX1RFWFRbdGhpcy5zdGF0dXNdfSAtICR7dGhpcy5zdGF0dXN9XFxuJHt0aGlzLm1lc3NhZ2V9XFxuXFxuJHtcbiAgICAgICAgdGhpcy4jZXhwb3NlID8gdGhpcy5zdGFjayA6IFwiXCJcbiAgICAgIH1gLFxuICAgICAge1xuICAgICAgICBzdGF0dXM6IHRoaXMuc3RhdHVzLFxuICAgICAgICBzdGF0dXNUZXh0OiBTVEFUVVNfVEVYVFt0aGlzLnN0YXR1c10sXG4gICAgICAgIGhlYWRlcnMsXG4gICAgICB9LFxuICAgICk7XG4gICAgcmVzLmhlYWRlcnMuc2V0KFwiY29udGVudC10eXBlXCIsIGNvbnRlbnRUeXBlKFwidHh0XCIpKTtcbiAgICByZXR1cm4gcmVzO1xuICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUh0dHBFcnJvckNvbnN0cnVjdG9yPFMgZXh0ZW5kcyBFcnJvclN0YXR1cz4oXG4gIHN0YXR1czogUyxcbik6IHR5cGVvZiBIdHRwRXJyb3I8Uz4ge1xuICBjb25zdCBuYW1lID0gYCR7U3RhdHVzW3N0YXR1c119RXJyb3JgO1xuICBjb25zdCBFcnJvckN0b3IgPSBjbGFzcyBleHRlbmRzIEh0dHBFcnJvcjxTPiB7XG4gICAgY29uc3RydWN0b3IoXG4gICAgICBtZXNzYWdlID0gU1RBVFVTX1RFWFRbc3RhdHVzXSxcbiAgICAgIG9wdGlvbnM/OiBIdHRwRXJyb3JPcHRpb25zLFxuICAgICkge1xuICAgICAgc3VwZXIobWVzc2FnZSwgb3B0aW9ucyk7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgXCJuYW1lXCIsIHtcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgdmFsdWU6IG5hbWUsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgb3ZlcnJpZGUgZ2V0IHN0YXR1cygpOiBTIHtcbiAgICAgIHJldHVybiBzdGF0dXM7XG4gICAgfVxuICB9O1xuICByZXR1cm4gRXJyb3JDdG9yO1xufVxuXG4vKipcbiAqIEEgbmFtZXNwYWNlIHRoYXQgY29udGFpbnMgZWFjaCBlcnJvciBjb25zdHJ1Y3Rvci4gRWFjaCBlcnJvciBleHRlbmRzXG4gKiBgSFRUUEVycm9yYCBhbmQgcHJvdmlkZXMgYC5zdGF0dXNgIGFuZCBgLmV4cG9zZWAgcHJvcGVydGllcywgd2hlcmUgdGhlXG4gKiBgLnN0YXR1c2Agd2lsbCBiZSBhbiBlcnJvciBgU3RhdHVzYCB2YWx1ZSBhbmQgYC5leHBvc2VgIGluZGljYXRlcyBpZlxuICogaW5mb3JtYXRpb24sIGxpa2UgYSBzdGFjayB0cmFjZSwgc2hvdWxkIGJlIHNoYXJlZCBpbiB0aGUgcmVzcG9uc2UuXG4gKlxuICogQnkgZGVmYXVsdCwgYC5leHBvc2VgIGlzIHNldCB0byBmYWxzZSBpbiBzZXJ2ZXIgZXJyb3JzLCBhbmQgdHJ1ZSBmb3IgY2xpZW50XG4gKiBlcnJvcnMuXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBlcnJvcnMgfSBmcm9tIFwianNyOkBvYWsvY29tbW9ucy9odHRwX2Vycm9yc1wiO1xuICpcbiAqIHRocm93IG5ldyBlcnJvcnMuSW50ZXJuYWxTZXJ2ZXJFcnJvcihcIk9vb3BzIVwiKTtcbiAqIGBgYFxuICovXG5leHBvcnQgY29uc3QgZXJyb3JzOiBSZWNvcmQ8RXJyb3JTdGF0dXNLZXlzLCB0eXBlb2YgSHR0cEVycm9yPEVycm9yU3RhdHVzPj4gPVxuICB7fSBhcyBSZWNvcmQ8XG4gICAgRXJyb3JTdGF0dXNLZXlzLFxuICAgIHR5cGVvZiBIdHRwRXJyb3I8RXJyb3JTdGF0dXM+XG4gID47XG5cbmZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKEVSUk9SX1NUQVRVU19NQVApKSB7XG4gIGVycm9yc1trZXkgYXMgRXJyb3JTdGF0dXNLZXlzXSA9IGNyZWF0ZUh0dHBFcnJvckNvbnN0cnVjdG9yKHZhbHVlKTtcbn1cblxuLyoqXG4gKiBBIGZhY3RvcnkgZnVuY3Rpb24gd2hpY2ggcHJvdmlkZXMgYSB3YXkgdG8gY3JlYXRlIGVycm9ycy4gSXQgdGFrZXMgdXAgdG8gM1xuICogYXJndW1lbnRzLCB0aGUgZXJyb3IgYFN0YXR1c2AsIGFuIG1lc3NhZ2UsIHdoaWNoIGRlZmF1bHRzIHRvIHRoZSBzdGF0dXMgdGV4dFxuICogYW5kIGVycm9yIG9wdGlvbnMsIHdoaWNoIGluY2x1ZGVzIHRoZSBgZXhwb3NlYCBwcm9wZXJ0eSB0byBzZXQgdGhlIGAuZXhwb3NlYFxuICogdmFsdWUgb24gdGhlIGVycm9yLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlSHR0cEVycm9yPFxuICBTIGV4dGVuZHMgRXJyb3JTdGF0dXMgPSBTdGF0dXMuSW50ZXJuYWxTZXJ2ZXJFcnJvcixcbj4oXG4gIHN0YXR1czogUyA9IFN0YXR1cy5JbnRlcm5hbFNlcnZlckVycm9yIGFzIFMsXG4gIG1lc3NhZ2U/OiBzdHJpbmcsXG4gIG9wdGlvbnM/OiBIdHRwRXJyb3JPcHRpb25zLFxuKTogSHR0cEVycm9yPFM+IHtcbiAgcmV0dXJuIG5ldyBlcnJvcnNbU3RhdHVzW3N0YXR1c10gYXMgRXJyb3JTdGF0dXNLZXlzXShcbiAgICBtZXNzYWdlLFxuICAgIG9wdGlvbnMsXG4gICkgYXMgSHR0cEVycm9yPFM+O1xufVxuXG4vKipcbiAqIEEgdHlwZSBndWFyZCB0aGF0IGRldGVybWluZXMgaWYgdGhlIHZhbHVlIGlzIGFuIEh0dHBFcnJvciBvciBub3QuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0h0dHBFcnJvcih2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIEh0dHBFcnJvcjxFcnJvclN0YXR1cz4ge1xuICByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBIdHRwRXJyb3I7XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFB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
// denoCacheMetadata=7559332651774851604,10448408374223139384