// Copyright 2018-2025 the oak authors. All rights reserved. MIT license.
/**
 * Contains the {@linkcode Context} class which is the context that is provided
 * to middleware.
 *
 * Typically this is not used directly by end users except when creating
 * re-usable middleware.
 *
 * @module
 */ var _computedKey, _computedKey1;
import { createHttpError, SecureCookieMap } from "./deps.ts";
import { Request } from "./request.ts";
import { Response } from "./response.ts";
import { send } from "./send.ts";
_computedKey = Symbol.for("Deno.customInspect"), _computedKey1 = Symbol.for("nodejs.util.inspect.custom");
/** Provides context about the current request and response to middleware
 * functions, and the current instance being processed is the first argument
 * provided a {@linkcode Middleware} function.
 *
 * _Typically this is only used as a type annotation and shouldn't be
 * constructed directly._
 *
 * ### Example
 *
 * ```ts
 * import { Application, Context } from "jsr:@oak/oak/";
 *
 * const app = new Application();
 *
 * app.use((ctx) => {
 *   // information about the request is here:
 *   ctx.request;
 *   // information about the response is here:
 *   ctx.response;
 *   // the cookie store is here:
 *   ctx.cookies;
 * });
 *
 * // Needs a type annotation because it cannot be inferred.
 * function mw(ctx: Context) {
 *   // process here...
 * }
 *
 * app.use(mw);
 * ```
 *
 * @template S the state which extends the application state (`AS`)
 * @template AS the type of the state derived from the application
 */ export class Context {
  #socket;
  #sse;
  #wrapReviverReplacer(reviver) {
    return reviver ? (key, value)=>reviver(key, value, this) : undefined;
  }
  /** A reference to the current application. */ app;
  /** An object which allows access to cookies, mediating both the request and
   * response. */ cookies;
  /** Is `true` if the current connection is upgradeable to a web socket.
   * Otherwise the value is `false`.  Use `.upgrade()` to upgrade the connection
   * and return the web socket. */ get isUpgradable() {
    const upgrade = this.request.headers.get("upgrade");
    if (!upgrade || upgrade.toLowerCase() !== "websocket") {
      return false;
    }
    const secKey = this.request.headers.get("sec-websocket-key");
    return typeof secKey === "string" && secKey != "";
  }
  /** Determines if the request should be responded to.  If `false` when the
   * middleware completes processing, the response will not be sent back to the
   * requestor.  Typically this is used if the middleware will take over low
   * level processing of requests and responses, for example if using web
   * sockets.  This automatically gets set to `false` when the context is
   * upgraded to a web socket via the `.upgrade()` method.
   *
   * The default is `true`. */ respond;
  /** An object which contains information about the current request. */ request;
  /** An object which contains information about the response that will be sent
   * when the middleware finishes processing. */ response;
  /** If the the current context has been upgraded, then this will be set to
   * with the current web socket, otherwise it is `undefined`. */ get socket() {
    return this.#socket;
  }
  /** The object to pass state to front-end views.  This can be typed by
   * supplying the generic state argument when creating a new app.  For
   * example:
   *
   * ```ts
   * const app = new Application<{ foo: string }>();
   * ```
   *
   * Or can be contextually inferred based on setting an initial state object:
   *
   * ```ts
   * const app = new Application({ state: { foo: "bar" } });
   * ```
   *
   * On each request/response cycle, the context's state is cloned from the
   * application state. This means changes to the context's `.state` will be
   * dropped when the request drops, but "defaults" can be applied to the
   * application's state.  Changes to the application's state though won't be
   * reflected until the next request in the context's state.
   */ state;
  constructor(app, serverRequest, state, { secure = false, jsonBodyReplacer, jsonBodyReviver } = {}){
    this.app = app;
    this.state = state;
    const { proxy } = app;
    this.request = new Request(serverRequest, {
      proxy,
      secure,
      jsonBodyReviver: this.#wrapReviverReplacer(jsonBodyReviver)
    });
    this.respond = true;
    this.response = new Response(this.request, this.#wrapReviverReplacer(jsonBodyReplacer));
    this.cookies = new SecureCookieMap(serverRequest, {
      keys: this.app.keys,
      response: this.response,
      secure: this.request.secure
    });
  }
  /** Asserts the condition and if the condition fails, creates an HTTP error
   * with the provided status (which defaults to `500`).  The error status by
   * default will be set on the `.response.status`.
   *
   * Because of limitation of TypeScript, any assertion type function requires
   * specific type annotations, so the {@linkcode Context} type should be used
   * even if it can be inferred from the context.
   *
   * ### Example
   *
   * ```ts
   * import { Context, Status } from "jsr:@oak/oak/";
   *
   * export function mw(ctx: Context) {
   *   const body = ctx.request.body();
   *   ctx.assert(body.type === "json", Status.NotAcceptable);
   *   // process the body and send a response...
   * }
   * ```
   */ assert(condition, errorStatus = 500, message, props) {
    if (condition) {
      return;
    }
    const httpErrorOptions = {};
    if (typeof props === "object") {
      if ("expose" in props) {
        httpErrorOptions.expose = props.expose;
        delete props.expose;
      }
    }
    const err = createHttpError(errorStatus, message, httpErrorOptions);
    if (props) {
      Object.assign(err, props);
    }
    throw err;
  }
  /** Asynchronously fulfill a response with a file from the local file
   * system.
   *
   * If the `options.path` is not supplied, the file to be sent will default
   * to this `.request.url.pathname`.
   *
   * Requires Deno read permission. */ send(options) {
    const { path = this.request.url.pathname, ...sendOptions } = options;
    return send(this, path, sendOptions);
  }
  /** Convert the connection to stream events, resolving with an event target
   * for sending server sent events.  Events dispatched on the returned target
   * will be sent to the client and be available in the client's `EventSource`
   * that initiated the connection.
   *
   * Invoking this will cause the a response to be sent to the client
   * immediately to initialize the stream of events, and therefore any further
   * changes to the response, like headers will not reach the client.
   */ async sendEvents(options) {
    if (!this.#sse) {
      const sse = this.#sse = await this.request.sendEvents(options, {
        headers: this.response.headers
      });
      this.app.addEventListener("close", ()=>sse.close());
      this.respond = false;
    }
    return this.#sse;
  }
  /** Create and throw an HTTP Error, which can be used to pass status
   * information which can be caught by other middleware to send more
   * meaningful error messages back to the client.  The passed error status will
   * be set on the `.response.status` by default as well.
   */ throw(errorStatus, message, props) {
    const err = createHttpError(errorStatus, message);
    if (props) {
      Object.assign(err, props);
    }
    throw err;
  }
  /** Take the current request and upgrade it to a web socket, resolving with
   * the a web standard `WebSocket` object. This will set `.respond` to
   * `false`.  If the socket cannot be upgraded, this method will throw. */ upgrade(options) {
    if (!this.#socket) {
      const socket = this.#socket = this.request.upgrade(options);
      this.app.addEventListener("close", ()=>socket.close());
      this.respond = false;
    }
    return this.#socket;
  }
  [_computedKey](inspect) {
    const { app, cookies, isUpgradable, respond, request, response, socket, state } = this;
    return `${this.constructor.name} ${inspect({
      app,
      cookies,
      isUpgradable,
      respond,
      request,
      response,
      socket,
      state
    })}`;
  }
  [_computedKey1](depth, // deno-lint-ignore no-explicit-any
  options, inspect) {
    if (depth < 0) {
      return options.stylize(`[${this.constructor.name}]`, "special");
    }
    const newOptions = Object.assign({}, options, {
      depth: options.depth === null ? null : options.depth - 1
    });
    const { app, cookies, isUpgradable, respond, request, response, socket, state } = this;
    return `${options.stylize(this.constructor.name, "special")} ${inspect({
      app,
      cookies,
      isUpgradable,
      respond,
      request,
      response,
      socket,
      state
    }, newOptions)}`;
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvb2FrQHYxNy4xLjYvY29udGV4dC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDI1IHRoZSBvYWsgYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIGxpY2Vuc2UuXG5cbi8qKlxuICogQ29udGFpbnMgdGhlIHtAbGlua2NvZGUgQ29udGV4dH0gY2xhc3Mgd2hpY2ggaXMgdGhlIGNvbnRleHQgdGhhdCBpcyBwcm92aWRlZFxuICogdG8gbWlkZGxld2FyZS5cbiAqXG4gKiBUeXBpY2FsbHkgdGhpcyBpcyBub3QgdXNlZCBkaXJlY3RseSBieSBlbmQgdXNlcnMgZXhjZXB0IHdoZW4gY3JlYXRpbmdcbiAqIHJlLXVzYWJsZSBtaWRkbGV3YXJlLlxuICpcbiAqIEBtb2R1bGVcbiAqL1xuXG5pbXBvcnQgdHlwZSB7IEFwcGxpY2F0aW9uLCBTdGF0ZSB9IGZyb20gXCIuL2FwcGxpY2F0aW9uLnRzXCI7XG5pbXBvcnQge1xuICBjcmVhdGVIdHRwRXJyb3IsXG4gIHR5cGUgRXJyb3JTdGF0dXMsXG4gIHR5cGUgSHR0cEVycm9yT3B0aW9ucyxcbiAgdHlwZSBLZXlTdGFjayxcbiAgU2VjdXJlQ29va2llTWFwLFxuICB0eXBlIFNlcnZlclNlbnRFdmVudFRhcmdldCxcbiAgdHlwZSBTZXJ2ZXJTZW50RXZlbnRUYXJnZXRPcHRpb25zLFxufSBmcm9tIFwiLi9kZXBzLnRzXCI7XG5pbXBvcnQgeyBSZXF1ZXN0IH0gZnJvbSBcIi4vcmVxdWVzdC50c1wiO1xuaW1wb3J0IHsgUmVzcG9uc2UgfSBmcm9tIFwiLi9yZXNwb25zZS50c1wiO1xuaW1wb3J0IHsgc2VuZCwgdHlwZSBTZW5kT3B0aW9ucyB9IGZyb20gXCIuL3NlbmQudHNcIjtcbmltcG9ydCB0eXBlIHsgU2VydmVyUmVxdWVzdCwgVXBncmFkZVdlYlNvY2tldE9wdGlvbnMgfSBmcm9tIFwiLi90eXBlcy50c1wiO1xuXG4vKiogT3B0aW9ucyB0aGF0IGNhbiBiZSBzdXBwbGllZCB3aGVuIGNyZWF0aW5nIGEge0BsaW5rY29kZSBDb250ZXh0fSAqL1xuZXhwb3J0IGludGVyZmFjZSBDb250ZXh0T3B0aW9uczxcbiAgUyBleHRlbmRzIEFTID0gU3RhdGUsXG4gIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gIEFTIGV4dGVuZHMgU3RhdGUgPSBSZWNvcmQ8c3RyaW5nLCBhbnk+LFxuPiB7XG4gIGpzb25Cb2R5UmVwbGFjZXI/OiAoXG4gICAga2V5OiBzdHJpbmcsXG4gICAgdmFsdWU6IHVua25vd24sXG4gICAgY29udGV4dDogQ29udGV4dDxTPixcbiAgKSA9PiB1bmtub3duO1xuICBqc29uQm9keVJldml2ZXI/OiAoXG4gICAga2V5OiBzdHJpbmcsXG4gICAgdmFsdWU6IHVua25vd24sXG4gICAgY29udGV4dDogQ29udGV4dDxTPixcbiAgKSA9PiB1bmtub3duO1xuICBzZWN1cmU/OiBib29sZWFuO1xufVxuXG4vKiogT3B0aW9ucyB0aGF0IGNhbiBiZSBzdXBwbGllZCB3aGVuIHVzaW5nIHRoZSBgLnNlbmQoKWAgbWV0aG9kLiAqL1xuZXhwb3J0IGludGVyZmFjZSBDb250ZXh0U2VuZE9wdGlvbnMgZXh0ZW5kcyBTZW5kT3B0aW9ucyB7XG4gIC8qKiBUaGUgZmlsZW5hbWUgdG8gc2VuZCwgd2hpY2ggd2lsbCBiZSByZXNvbHZlZCBiYXNlZCBvbiB0aGUgb3RoZXIgb3B0aW9ucy5cbiAgICogSWYgdGhpcyBwcm9wZXJ0eSBpcyBvbWl0dGVkLCB0aGUgY3VycmVudCBjb250ZXh0J3MgYC5yZXF1ZXN0LnVybC5wYXRobmFtZWBcbiAgICogd2lsbCBiZSB1c2VkLiAqL1xuICBwYXRoPzogc3RyaW5nO1xufVxuXG4vKiogUHJvdmlkZXMgY29udGV4dCBhYm91dCB0aGUgY3VycmVudCByZXF1ZXN0IGFuZCByZXNwb25zZSB0byBtaWRkbGV3YXJlXG4gKiBmdW5jdGlvbnMsIGFuZCB0aGUgY3VycmVudCBpbnN0YW5jZSBiZWluZyBwcm9jZXNzZWQgaXMgdGhlIGZpcnN0IGFyZ3VtZW50XG4gKiBwcm92aWRlZCBhIHtAbGlua2NvZGUgTWlkZGxld2FyZX0gZnVuY3Rpb24uXG4gKlxuICogX1R5cGljYWxseSB0aGlzIGlzIG9ubHkgdXNlZCBhcyBhIHR5cGUgYW5ub3RhdGlvbiBhbmQgc2hvdWxkbid0IGJlXG4gKiBjb25zdHJ1Y3RlZCBkaXJlY3RseS5fXG4gKlxuICogIyMjIEV4YW1wbGVcbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgQXBwbGljYXRpb24sIENvbnRleHQgfSBmcm9tIFwianNyOkBvYWsvb2FrL1wiO1xuICpcbiAqIGNvbnN0IGFwcCA9IG5ldyBBcHBsaWNhdGlvbigpO1xuICpcbiAqIGFwcC51c2UoKGN0eCkgPT4ge1xuICogICAvLyBpbmZvcm1hdGlvbiBhYm91dCB0aGUgcmVxdWVzdCBpcyBoZXJlOlxuICogICBjdHgucmVxdWVzdDtcbiAqICAgLy8gaW5mb3JtYXRpb24gYWJvdXQgdGhlIHJlc3BvbnNlIGlzIGhlcmU6XG4gKiAgIGN0eC5yZXNwb25zZTtcbiAqICAgLy8gdGhlIGNvb2tpZSBzdG9yZSBpcyBoZXJlOlxuICogICBjdHguY29va2llcztcbiAqIH0pO1xuICpcbiAqIC8vIE5lZWRzIGEgdHlwZSBhbm5vdGF0aW9uIGJlY2F1c2UgaXQgY2Fubm90IGJlIGluZmVycmVkLlxuICogZnVuY3Rpb24gbXcoY3R4OiBDb250ZXh0KSB7XG4gKiAgIC8vIHByb2Nlc3MgaGVyZS4uLlxuICogfVxuICpcbiAqIGFwcC51c2UobXcpO1xuICogYGBgXG4gKlxuICogQHRlbXBsYXRlIFMgdGhlIHN0YXRlIHdoaWNoIGV4dGVuZHMgdGhlIGFwcGxpY2F0aW9uIHN0YXRlIChgQVNgKVxuICogQHRlbXBsYXRlIEFTIHRoZSB0eXBlIG9mIHRoZSBzdGF0ZSBkZXJpdmVkIGZyb20gdGhlIGFwcGxpY2F0aW9uXG4gKi9cbmV4cG9ydCBjbGFzcyBDb250ZXh0PFxuICBTIGV4dGVuZHMgQVMgPSBTdGF0ZSxcbiAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgQVMgZXh0ZW5kcyBTdGF0ZSA9IFJlY29yZDxzdHJpbmcsIGFueT4sXG4+IHtcbiAgI3NvY2tldD86IFdlYlNvY2tldDtcbiAgI3NzZT86IFNlcnZlclNlbnRFdmVudFRhcmdldDtcblxuICAjd3JhcFJldml2ZXJSZXBsYWNlcihcbiAgICByZXZpdmVyPzogKGtleTogc3RyaW5nLCB2YWx1ZTogdW5rbm93biwgY29udGV4dDogdGhpcykgPT4gdW5rbm93bixcbiAgKTogdW5kZWZpbmVkIHwgKChrZXk6IHN0cmluZywgdmFsdWU6IHVua25vd24pID0+IHVua25vd24pIHtcbiAgICByZXR1cm4gcmV2aXZlclxuICAgICAgPyAoa2V5OiBzdHJpbmcsIHZhbHVlOiB1bmtub3duKSA9PiByZXZpdmVyKGtleSwgdmFsdWUsIHRoaXMpXG4gICAgICA6IHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8qKiBBIHJlZmVyZW5jZSB0byB0aGUgY3VycmVudCBhcHBsaWNhdGlvbi4gKi9cbiAgYXBwOiBBcHBsaWNhdGlvbjxBUz47XG5cbiAgLyoqIEFuIG9iamVjdCB3aGljaCBhbGxvd3MgYWNjZXNzIHRvIGNvb2tpZXMsIG1lZGlhdGluZyBib3RoIHRoZSByZXF1ZXN0IGFuZFxuICAgKiByZXNwb25zZS4gKi9cbiAgY29va2llczogU2VjdXJlQ29va2llTWFwO1xuXG4gIC8qKiBJcyBgdHJ1ZWAgaWYgdGhlIGN1cnJlbnQgY29ubmVjdGlvbiBpcyB1cGdyYWRlYWJsZSB0byBhIHdlYiBzb2NrZXQuXG4gICAqIE90aGVyd2lzZSB0aGUgdmFsdWUgaXMgYGZhbHNlYC4gIFVzZSBgLnVwZ3JhZGUoKWAgdG8gdXBncmFkZSB0aGUgY29ubmVjdGlvblxuICAgKiBhbmQgcmV0dXJuIHRoZSB3ZWIgc29ja2V0LiAqL1xuICBnZXQgaXNVcGdyYWRhYmxlKCk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHVwZ3JhZGUgPSB0aGlzLnJlcXVlc3QuaGVhZGVycy5nZXQoXCJ1cGdyYWRlXCIpO1xuICAgIGlmICghdXBncmFkZSB8fCB1cGdyYWRlLnRvTG93ZXJDYXNlKCkgIT09IFwid2Vic29ja2V0XCIpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgY29uc3Qgc2VjS2V5ID0gdGhpcy5yZXF1ZXN0LmhlYWRlcnMuZ2V0KFwic2VjLXdlYnNvY2tldC1rZXlcIik7XG4gICAgcmV0dXJuIHR5cGVvZiBzZWNLZXkgPT09IFwic3RyaW5nXCIgJiYgc2VjS2V5ICE9IFwiXCI7XG4gIH1cblxuICAvKiogRGV0ZXJtaW5lcyBpZiB0aGUgcmVxdWVzdCBzaG91bGQgYmUgcmVzcG9uZGVkIHRvLiAgSWYgYGZhbHNlYCB3aGVuIHRoZVxuICAgKiBtaWRkbGV3YXJlIGNvbXBsZXRlcyBwcm9jZXNzaW5nLCB0aGUgcmVzcG9uc2Ugd2lsbCBub3QgYmUgc2VudCBiYWNrIHRvIHRoZVxuICAgKiByZXF1ZXN0b3IuICBUeXBpY2FsbHkgdGhpcyBpcyB1c2VkIGlmIHRoZSBtaWRkbGV3YXJlIHdpbGwgdGFrZSBvdmVyIGxvd1xuICAgKiBsZXZlbCBwcm9jZXNzaW5nIG9mIHJlcXVlc3RzIGFuZCByZXNwb25zZXMsIGZvciBleGFtcGxlIGlmIHVzaW5nIHdlYlxuICAgKiBzb2NrZXRzLiAgVGhpcyBhdXRvbWF0aWNhbGx5IGdldHMgc2V0IHRvIGBmYWxzZWAgd2hlbiB0aGUgY29udGV4dCBpc1xuICAgKiB1cGdyYWRlZCB0byBhIHdlYiBzb2NrZXQgdmlhIHRoZSBgLnVwZ3JhZGUoKWAgbWV0aG9kLlxuICAgKlxuICAgKiBUaGUgZGVmYXVsdCBpcyBgdHJ1ZWAuICovXG4gIHJlc3BvbmQ6IGJvb2xlYW47XG5cbiAgLyoqIEFuIG9iamVjdCB3aGljaCBjb250YWlucyBpbmZvcm1hdGlvbiBhYm91dCB0aGUgY3VycmVudCByZXF1ZXN0LiAqL1xuICByZXF1ZXN0OiBSZXF1ZXN0O1xuXG4gIC8qKiBBbiBvYmplY3Qgd2hpY2ggY29udGFpbnMgaW5mb3JtYXRpb24gYWJvdXQgdGhlIHJlc3BvbnNlIHRoYXQgd2lsbCBiZSBzZW50XG4gICAqIHdoZW4gdGhlIG1pZGRsZXdhcmUgZmluaXNoZXMgcHJvY2Vzc2luZy4gKi9cbiAgcmVzcG9uc2U6IFJlc3BvbnNlO1xuXG4gIC8qKiBJZiB0aGUgdGhlIGN1cnJlbnQgY29udGV4dCBoYXMgYmVlbiB1cGdyYWRlZCwgdGhlbiB0aGlzIHdpbGwgYmUgc2V0IHRvXG4gICAqIHdpdGggdGhlIGN1cnJlbnQgd2ViIHNvY2tldCwgb3RoZXJ3aXNlIGl0IGlzIGB1bmRlZmluZWRgLiAqL1xuICBnZXQgc29ja2V0KCk6IFdlYlNvY2tldCB8IHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMuI3NvY2tldDtcbiAgfVxuXG4gIC8qKiBUaGUgb2JqZWN0IHRvIHBhc3Mgc3RhdGUgdG8gZnJvbnQtZW5kIHZpZXdzLiAgVGhpcyBjYW4gYmUgdHlwZWQgYnlcbiAgICogc3VwcGx5aW5nIHRoZSBnZW5lcmljIHN0YXRlIGFyZ3VtZW50IHdoZW4gY3JlYXRpbmcgYSBuZXcgYXBwLiAgRm9yXG4gICAqIGV4YW1wbGU6XG4gICAqXG4gICAqIGBgYHRzXG4gICAqIGNvbnN0IGFwcCA9IG5ldyBBcHBsaWNhdGlvbjx7IGZvbzogc3RyaW5nIH0+KCk7XG4gICAqIGBgYFxuICAgKlxuICAgKiBPciBjYW4gYmUgY29udGV4dHVhbGx5IGluZmVycmVkIGJhc2VkIG9uIHNldHRpbmcgYW4gaW5pdGlhbCBzdGF0ZSBvYmplY3Q6XG4gICAqXG4gICAqIGBgYHRzXG4gICAqIGNvbnN0IGFwcCA9IG5ldyBBcHBsaWNhdGlvbih7IHN0YXRlOiB7IGZvbzogXCJiYXJcIiB9IH0pO1xuICAgKiBgYGBcbiAgICpcbiAgICogT24gZWFjaCByZXF1ZXN0L3Jlc3BvbnNlIGN5Y2xlLCB0aGUgY29udGV4dCdzIHN0YXRlIGlzIGNsb25lZCBmcm9tIHRoZVxuICAgKiBhcHBsaWNhdGlvbiBzdGF0ZS4gVGhpcyBtZWFucyBjaGFuZ2VzIHRvIHRoZSBjb250ZXh0J3MgYC5zdGF0ZWAgd2lsbCBiZVxuICAgKiBkcm9wcGVkIHdoZW4gdGhlIHJlcXVlc3QgZHJvcHMsIGJ1dCBcImRlZmF1bHRzXCIgY2FuIGJlIGFwcGxpZWQgdG8gdGhlXG4gICAqIGFwcGxpY2F0aW9uJ3Mgc3RhdGUuICBDaGFuZ2VzIHRvIHRoZSBhcHBsaWNhdGlvbidzIHN0YXRlIHRob3VnaCB3b24ndCBiZVxuICAgKiByZWZsZWN0ZWQgdW50aWwgdGhlIG5leHQgcmVxdWVzdCBpbiB0aGUgY29udGV4dCdzIHN0YXRlLlxuICAgKi9cbiAgc3RhdGU6IFM7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgYXBwOiBBcHBsaWNhdGlvbjxBUz4sXG4gICAgc2VydmVyUmVxdWVzdDogU2VydmVyUmVxdWVzdCxcbiAgICBzdGF0ZTogUyxcbiAgICB7XG4gICAgICBzZWN1cmUgPSBmYWxzZSxcbiAgICAgIGpzb25Cb2R5UmVwbGFjZXIsXG4gICAgICBqc29uQm9keVJldml2ZXIsXG4gICAgfTogQ29udGV4dE9wdGlvbnM8UywgQVM+ID0ge30sXG4gICkge1xuICAgIHRoaXMuYXBwID0gYXBwO1xuICAgIHRoaXMuc3RhdGUgPSBzdGF0ZTtcbiAgICBjb25zdCB7IHByb3h5IH0gPSBhcHA7XG4gICAgdGhpcy5yZXF1ZXN0ID0gbmV3IFJlcXVlc3QoXG4gICAgICBzZXJ2ZXJSZXF1ZXN0LFxuICAgICAge1xuICAgICAgICBwcm94eSxcbiAgICAgICAgc2VjdXJlLFxuICAgICAgICBqc29uQm9keVJldml2ZXI6IHRoaXMuI3dyYXBSZXZpdmVyUmVwbGFjZXIoanNvbkJvZHlSZXZpdmVyKSxcbiAgICAgIH0sXG4gICAgKTtcbiAgICB0aGlzLnJlc3BvbmQgPSB0cnVlO1xuICAgIHRoaXMucmVzcG9uc2UgPSBuZXcgUmVzcG9uc2UoXG4gICAgICB0aGlzLnJlcXVlc3QsXG4gICAgICB0aGlzLiN3cmFwUmV2aXZlclJlcGxhY2VyKGpzb25Cb2R5UmVwbGFjZXIpLFxuICAgICk7XG4gICAgdGhpcy5jb29raWVzID0gbmV3IFNlY3VyZUNvb2tpZU1hcChzZXJ2ZXJSZXF1ZXN0LCB7XG4gICAgICBrZXlzOiB0aGlzLmFwcC5rZXlzIGFzIEtleVN0YWNrIHwgdW5kZWZpbmVkLFxuICAgICAgcmVzcG9uc2U6IHRoaXMucmVzcG9uc2UsXG4gICAgICBzZWN1cmU6IHRoaXMucmVxdWVzdC5zZWN1cmUsXG4gICAgfSk7XG4gIH1cblxuICAvKiogQXNzZXJ0cyB0aGUgY29uZGl0aW9uIGFuZCBpZiB0aGUgY29uZGl0aW9uIGZhaWxzLCBjcmVhdGVzIGFuIEhUVFAgZXJyb3JcbiAgICogd2l0aCB0aGUgcHJvdmlkZWQgc3RhdHVzICh3aGljaCBkZWZhdWx0cyB0byBgNTAwYCkuICBUaGUgZXJyb3Igc3RhdHVzIGJ5XG4gICAqIGRlZmF1bHQgd2lsbCBiZSBzZXQgb24gdGhlIGAucmVzcG9uc2Uuc3RhdHVzYC5cbiAgICpcbiAgICogQmVjYXVzZSBvZiBsaW1pdGF0aW9uIG9mIFR5cGVTY3JpcHQsIGFueSBhc3NlcnRpb24gdHlwZSBmdW5jdGlvbiByZXF1aXJlc1xuICAgKiBzcGVjaWZpYyB0eXBlIGFubm90YXRpb25zLCBzbyB0aGUge0BsaW5rY29kZSBDb250ZXh0fSB0eXBlIHNob3VsZCBiZSB1c2VkXG4gICAqIGV2ZW4gaWYgaXQgY2FuIGJlIGluZmVycmVkIGZyb20gdGhlIGNvbnRleHQuXG4gICAqXG4gICAqICMjIyBFeGFtcGxlXG4gICAqXG4gICAqIGBgYHRzXG4gICAqIGltcG9ydCB7IENvbnRleHQsIFN0YXR1cyB9IGZyb20gXCJqc3I6QG9hay9vYWsvXCI7XG4gICAqXG4gICAqIGV4cG9ydCBmdW5jdGlvbiBtdyhjdHg6IENvbnRleHQpIHtcbiAgICogICBjb25zdCBib2R5ID0gY3R4LnJlcXVlc3QuYm9keSgpO1xuICAgKiAgIGN0eC5hc3NlcnQoYm9keS50eXBlID09PSBcImpzb25cIiwgU3RhdHVzLk5vdEFjY2VwdGFibGUpO1xuICAgKiAgIC8vIHByb2Nlc3MgdGhlIGJvZHkgYW5kIHNlbmQgYSByZXNwb25zZS4uLlxuICAgKiB9XG4gICAqIGBgYFxuICAgKi9cbiAgYXNzZXJ0KFxuICAgIGNvbmRpdGlvbjogdW5rbm93bixcbiAgICBlcnJvclN0YXR1czogRXJyb3JTdGF0dXMgPSA1MDAsXG4gICAgbWVzc2FnZT86IHN0cmluZyxcbiAgICBwcm9wcz86IFJlY29yZDxzdHJpbmcsIHVua25vd24+ICYgT21pdDxIdHRwRXJyb3JPcHRpb25zLCBcInN0YXR1c1wiPixcbiAgKTogYXNzZXJ0cyBjb25kaXRpb24ge1xuICAgIGlmIChjb25kaXRpb24pIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgaHR0cEVycm9yT3B0aW9uczogSHR0cEVycm9yT3B0aW9ucyA9IHt9O1xuICAgIGlmICh0eXBlb2YgcHJvcHMgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgIGlmIChcImV4cG9zZVwiIGluIHByb3BzKSB7XG4gICAgICAgIGh0dHBFcnJvck9wdGlvbnMuZXhwb3NlID0gcHJvcHMuZXhwb3NlO1xuICAgICAgICBkZWxldGUgcHJvcHMuZXhwb3NlO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBlcnIgPSBjcmVhdGVIdHRwRXJyb3IoZXJyb3JTdGF0dXMsIG1lc3NhZ2UsIGh0dHBFcnJvck9wdGlvbnMpO1xuICAgIGlmIChwcm9wcykge1xuICAgICAgT2JqZWN0LmFzc2lnbihlcnIsIHByb3BzKTtcbiAgICB9XG4gICAgdGhyb3cgZXJyO1xuICB9XG5cbiAgLyoqIEFzeW5jaHJvbm91c2x5IGZ1bGZpbGwgYSByZXNwb25zZSB3aXRoIGEgZmlsZSBmcm9tIHRoZSBsb2NhbCBmaWxlXG4gICAqIHN5c3RlbS5cbiAgICpcbiAgICogSWYgdGhlIGBvcHRpb25zLnBhdGhgIGlzIG5vdCBzdXBwbGllZCwgdGhlIGZpbGUgdG8gYmUgc2VudCB3aWxsIGRlZmF1bHRcbiAgICogdG8gdGhpcyBgLnJlcXVlc3QudXJsLnBhdGhuYW1lYC5cbiAgICpcbiAgICogUmVxdWlyZXMgRGVubyByZWFkIHBlcm1pc3Npb24uICovXG4gIHNlbmQob3B0aW9uczogQ29udGV4dFNlbmRPcHRpb25zKTogUHJvbWlzZTxzdHJpbmcgfCB1bmRlZmluZWQ+IHtcbiAgICBjb25zdCB7IHBhdGggPSB0aGlzLnJlcXVlc3QudXJsLnBhdGhuYW1lLCAuLi5zZW5kT3B0aW9ucyB9ID0gb3B0aW9ucztcbiAgICByZXR1cm4gc2VuZCh0aGlzLCBwYXRoLCBzZW5kT3B0aW9ucyk7XG4gIH1cblxuICAvKiogQ29udmVydCB0aGUgY29ubmVjdGlvbiB0byBzdHJlYW0gZXZlbnRzLCByZXNvbHZpbmcgd2l0aCBhbiBldmVudCB0YXJnZXRcbiAgICogZm9yIHNlbmRpbmcgc2VydmVyIHNlbnQgZXZlbnRzLiAgRXZlbnRzIGRpc3BhdGNoZWQgb24gdGhlIHJldHVybmVkIHRhcmdldFxuICAgKiB3aWxsIGJlIHNlbnQgdG8gdGhlIGNsaWVudCBhbmQgYmUgYXZhaWxhYmxlIGluIHRoZSBjbGllbnQncyBgRXZlbnRTb3VyY2VgXG4gICAqIHRoYXQgaW5pdGlhdGVkIHRoZSBjb25uZWN0aW9uLlxuICAgKlxuICAgKiBJbnZva2luZyB0aGlzIHdpbGwgY2F1c2UgdGhlIGEgcmVzcG9uc2UgdG8gYmUgc2VudCB0byB0aGUgY2xpZW50XG4gICAqIGltbWVkaWF0ZWx5IHRvIGluaXRpYWxpemUgdGhlIHN0cmVhbSBvZiBldmVudHMsIGFuZCB0aGVyZWZvcmUgYW55IGZ1cnRoZXJcbiAgICogY2hhbmdlcyB0byB0aGUgcmVzcG9uc2UsIGxpa2UgaGVhZGVycyB3aWxsIG5vdCByZWFjaCB0aGUgY2xpZW50LlxuICAgKi9cbiAgYXN5bmMgc2VuZEV2ZW50cyhcbiAgICBvcHRpb25zPzogU2VydmVyU2VudEV2ZW50VGFyZ2V0T3B0aW9ucyxcbiAgKTogUHJvbWlzZTxTZXJ2ZXJTZW50RXZlbnRUYXJnZXQ+IHtcbiAgICBpZiAoIXRoaXMuI3NzZSkge1xuICAgICAgY29uc3Qgc3NlID0gdGhpcy4jc3NlID0gYXdhaXQgdGhpcy5yZXF1ZXN0LnNlbmRFdmVudHMob3B0aW9ucywge1xuICAgICAgICBoZWFkZXJzOiB0aGlzLnJlc3BvbnNlLmhlYWRlcnMsXG4gICAgICB9KTtcbiAgICAgIHRoaXMuYXBwLmFkZEV2ZW50TGlzdGVuZXIoXCJjbG9zZVwiLCAoKSA9PiBzc2UuY2xvc2UoKSk7XG4gICAgICB0aGlzLnJlc3BvbmQgPSBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuI3NzZTtcbiAgfVxuXG4gIC8qKiBDcmVhdGUgYW5kIHRocm93IGFuIEhUVFAgRXJyb3IsIHdoaWNoIGNhbiBiZSB1c2VkIHRvIHBhc3Mgc3RhdHVzXG4gICAqIGluZm9ybWF0aW9uIHdoaWNoIGNhbiBiZSBjYXVnaHQgYnkgb3RoZXIgbWlkZGxld2FyZSB0byBzZW5kIG1vcmVcbiAgICogbWVhbmluZ2Z1bCBlcnJvciBtZXNzYWdlcyBiYWNrIHRvIHRoZSBjbGllbnQuICBUaGUgcGFzc2VkIGVycm9yIHN0YXR1cyB3aWxsXG4gICAqIGJlIHNldCBvbiB0aGUgYC5yZXNwb25zZS5zdGF0dXNgIGJ5IGRlZmF1bHQgYXMgd2VsbC5cbiAgICovXG4gIHRocm93KFxuICAgIGVycm9yU3RhdHVzOiBFcnJvclN0YXR1cyxcbiAgICBtZXNzYWdlPzogc3RyaW5nLFxuICAgIHByb3BzPzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4sXG4gICk6IG5ldmVyIHtcbiAgICBjb25zdCBlcnIgPSBjcmVhdGVIdHRwRXJyb3IoZXJyb3JTdGF0dXMsIG1lc3NhZ2UpO1xuICAgIGlmIChwcm9wcykge1xuICAgICAgT2JqZWN0LmFzc2lnbihlcnIsIHByb3BzKTtcbiAgICB9XG4gICAgdGhyb3cgZXJyO1xuICB9XG5cbiAgLyoqIFRha2UgdGhlIGN1cnJlbnQgcmVxdWVzdCBhbmQgdXBncmFkZSBpdCB0byBhIHdlYiBzb2NrZXQsIHJlc29sdmluZyB3aXRoXG4gICAqIHRoZSBhIHdlYiBzdGFuZGFyZCBgV2ViU29ja2V0YCBvYmplY3QuIFRoaXMgd2lsbCBzZXQgYC5yZXNwb25kYCB0b1xuICAgKiBgZmFsc2VgLiAgSWYgdGhlIHNvY2tldCBjYW5ub3QgYmUgdXBncmFkZWQsIHRoaXMgbWV0aG9kIHdpbGwgdGhyb3cuICovXG4gIHVwZ3JhZGUob3B0aW9ucz86IFVwZ3JhZGVXZWJTb2NrZXRPcHRpb25zKTogV2ViU29ja2V0IHtcbiAgICBpZiAoIXRoaXMuI3NvY2tldCkge1xuICAgICAgY29uc3Qgc29ja2V0ID0gdGhpcy4jc29ja2V0ID0gdGhpcy5yZXF1ZXN0LnVwZ3JhZGUob3B0aW9ucyk7XG4gICAgICB0aGlzLmFwcC5hZGRFdmVudExpc3RlbmVyKFwiY2xvc2VcIiwgKCkgPT4gc29ja2V0LmNsb3NlKCkpO1xuICAgICAgdGhpcy5yZXNwb25kID0gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLiNzb2NrZXQ7XG4gIH1cblxuICBbU3ltYm9sLmZvcihcIkRlbm8uY3VzdG9tSW5zcGVjdFwiKV0oXG4gICAgaW5zcGVjdDogKHZhbHVlOiB1bmtub3duKSA9PiBzdHJpbmcsXG4gICk6IHN0cmluZyB7XG4gICAgY29uc3Qge1xuICAgICAgYXBwLFxuICAgICAgY29va2llcyxcbiAgICAgIGlzVXBncmFkYWJsZSxcbiAgICAgIHJlc3BvbmQsXG4gICAgICByZXF1ZXN0LFxuICAgICAgcmVzcG9uc2UsXG4gICAgICBzb2NrZXQsXG4gICAgICBzdGF0ZSxcbiAgICB9ID0gdGhpcztcbiAgICByZXR1cm4gYCR7dGhpcy5jb25zdHJ1Y3Rvci5uYW1lfSAke1xuICAgICAgaW5zcGVjdCh7XG4gICAgICAgIGFwcCxcbiAgICAgICAgY29va2llcyxcbiAgICAgICAgaXNVcGdyYWRhYmxlLFxuICAgICAgICByZXNwb25kLFxuICAgICAgICByZXF1ZXN0LFxuICAgICAgICByZXNwb25zZSxcbiAgICAgICAgc29ja2V0LFxuICAgICAgICBzdGF0ZSxcbiAgICAgIH0pXG4gICAgfWA7XG4gIH1cblxuICBbU3ltYm9sLmZvcihcIm5vZGVqcy51dGlsLmluc3BlY3QuY3VzdG9tXCIpXShcbiAgICBkZXB0aDogbnVtYmVyLFxuICAgIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gICAgb3B0aW9uczogYW55LFxuICAgIGluc3BlY3Q6ICh2YWx1ZTogdW5rbm93biwgb3B0aW9ucz86IHVua25vd24pID0+IHN0cmluZyxcbiAgICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICApOiBhbnkge1xuICAgIGlmIChkZXB0aCA8IDApIHtcbiAgICAgIHJldHVybiBvcHRpb25zLnN0eWxpemUoYFske3RoaXMuY29uc3RydWN0b3IubmFtZX1dYCwgXCJzcGVjaWFsXCIpO1xuICAgIH1cblxuICAgIGNvbnN0IG5ld09wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCBvcHRpb25zLCB7XG4gICAgICBkZXB0aDogb3B0aW9ucy5kZXB0aCA9PT0gbnVsbCA/IG51bGwgOiBvcHRpb25zLmRlcHRoIC0gMSxcbiAgICB9KTtcbiAgICBjb25zdCB7XG4gICAgICBhcHAsXG4gICAgICBjb29raWVzLFxuICAgICAgaXNVcGdyYWRhYmxlLFxuICAgICAgcmVzcG9uZCxcbiAgICAgIHJlcXVlc3QsXG4gICAgICByZXNwb25zZSxcbiAgICAgIHNvY2tldCxcbiAgICAgIHN0YXRlLFxuICAgIH0gPSB0aGlzO1xuICAgIHJldHVybiBgJHtvcHRpb25zLnN0eWxpemUodGhpcy5jb25zdHJ1Y3Rvci5uYW1lLCBcInNwZWNpYWxcIil9ICR7XG4gICAgICBpbnNwZWN0KHtcbiAgICAgICAgYXBwLFxuICAgICAgICBjb29raWVzLFxuICAgICAgICBpc1VwZ3JhZGFibGUsXG4gICAgICAgIHJlc3BvbmQsXG4gICAgICAgIHJlcXVlc3QsXG4gICAgICAgIHJlc3BvbnNlLFxuICAgICAgICBzb2NrZXQsXG4gICAgICAgIHN0YXRlLFxuICAgICAgfSwgbmV3T3B0aW9ucylcbiAgICB9YDtcbiAgfVxufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLHlFQUF5RTtBQUV6RTs7Ozs7Ozs7Q0FRQztBQUdELFNBQ0UsZUFBZSxFQUlmLGVBQWUsUUFHVixZQUFZ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
// denoCacheMetadata=7313078866451300614,10121521842078799558