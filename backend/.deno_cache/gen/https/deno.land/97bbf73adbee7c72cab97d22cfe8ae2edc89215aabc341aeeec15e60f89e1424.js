// Copyright 2018-2025 the oak authors. All rights reserved. MIT license.
/**
 * Contains the core concept of oak, the middleware application. Typical usage
 * is the creation of an application instance, registration of middleware, and
 * then starting to listen for requests.
 *
 * # Example
 *
 * ```ts
 * import { Application } from "jsr:@oak/oak/application";
 *
 * const app = new Application();
 * app.use((ctx) => {
 *   ctx.response.body = "hello world!";
 * });
 *
 * app.listen({ port: 8080 });
 * ```
 *
 * @module
 */ var _computedKey, _computedKey1;
import { Context } from "./context.ts";
import { assert, KeyStack, STATUS_TEXT } from "./deps.ts";
import { compose, isMiddlewareObject } from "./middleware.ts";
import { cloneState } from "./utils/clone_state.ts";
import { createPromiseWithResolvers } from "./utils/create_promise_with_resolvers.ts";
import { isBun, isNetAddr, isNode } from "./utils/type_guards.ts";
const ADDR_REGEXP = /^\[?([^\]]*)\]?:([0-9]{1,5})$/;
let DefaultServerCtor;
let NativeRequestCtor;
/** An event that occurs when the application closes. */ export class ApplicationCloseEvent extends Event {
  constructor(eventInitDict){
    super("close", eventInitDict);
  }
}
/** An event that occurs when an application error occurs.
 *
 * When the error occurs related to the handling of a request, the `.context`
 * property will be populated.
 */ export class ApplicationErrorEvent extends ErrorEvent {
  context;
  constructor(eventInitDict){
    super("error", eventInitDict);
    this.context = eventInitDict.context;
  }
}
function logErrorListener({ error, context }) {
  if (error instanceof Error) {
    console.error(`[uncaught application error]: ${error.name} - ${error.message}`);
  } else {
    console.error(`[uncaught application error]\n`, error);
  }
  if (context) {
    let url;
    try {
      url = context.request.url.toString();
    } catch  {
      url = "[malformed url]";
    }
    console.error(`\nrequest:`, {
      url,
      method: context.request.method,
      hasBody: context.request.hasBody
    });
    console.error(`response:`, {
      status: context.response.status,
      type: context.response.type,
      hasBody: !!context.response.body,
      writable: context.response.writable
    });
  }
  if (error instanceof Error && error.stack) {
    console.error(`\n${error.stack.split("\n").slice(1).join("\n")}`);
  }
}
/**
 * An event that occurs when the application starts listening for requests.
 */ export class ApplicationListenEvent extends Event {
  hostname;
  listener;
  port;
  secure;
  serverType;
  constructor(eventInitDict){
    super("listen", eventInitDict);
    this.hostname = eventInitDict.hostname;
    this.listener = eventInitDict.listener;
    this.port = eventInitDict.port;
    this.secure = eventInitDict.secure;
    this.serverType = eventInitDict.serverType;
  }
}
_computedKey = Symbol.for("Deno.customInspect"), _computedKey1 = Symbol.for("nodejs.util.inspect.custom");
/** A class which registers middleware (via `.use()`) and then processes
 * inbound requests against that middleware (via `.listen()`).
 *
 * The `context.state` can be typed via passing a generic argument when
 * constructing an instance of `Application`. It can also be inferred by setting
 * the {@linkcode ApplicationOptions.state} option when constructing the
 * application.
 *
 * ### Basic example
 *
 * ```ts
 * import { Application } from "jsr:@oak/oak/application";
 *
 * const app = new Application();
 *
 * app.use((ctx, next) => {
 *   // called on each request with the context (`ctx`) of the request,
 *   // response, and other data.
 *   // `next()` is use to modify the flow control of the middleware stack.
 * });
 *
 * app.listen({ port: 8080 });
 * ```
 *
 * @template AS the type of the application state which extends
 *              {@linkcode State} and defaults to a simple string record.
 */ // deno-lint-ignore no-explicit-any
export class Application extends EventTarget {
  #composedMiddleware;
  #contextOptions;
  #contextState;
  #keys;
  #middleware = [];
  #serverConstructor;
  /** A set of keys, or an instance of `KeyStack` which will be used to sign
   * cookies read and set by the application to avoid tampering with the
   * cookies. */ get keys() {
    return this.#keys;
  }
  set keys(keys) {
    if (!keys) {
      this.#keys = undefined;
      return;
    } else if (Array.isArray(keys)) {
      this.#keys = new KeyStack(keys);
    } else {
      this.#keys = keys;
    }
  }
  /** If `true`, proxy headers will be trusted when processing requests.  This
   * defaults to `false`. */ proxy;
  /** Generic state of the application, which can be specified by passing the
   * generic argument when constructing:
   *
   *       const app = new Application<{ foo: string }>();
   *
   * Or can be contextually inferred based on setting an initial state object:
   *
   *       const app = new Application({ state: { foo: "bar" } });
   *
   * When a new context is created, the application's state is cloned and the
   * state is unique to that request/response.  Changes can be made to the
   * application state that will be shared with all contexts.
   */ state;
  constructor(options = {}){
    super();
    const { state, keys, proxy, serverConstructor, contextState = "clone", logErrors = true, ...contextOptions } = options;
    this.proxy = proxy ?? false;
    this.keys = keys;
    this.state = state ?? {};
    this.#serverConstructor = serverConstructor;
    this.#contextOptions = contextOptions;
    this.#contextState = contextState;
    if (logErrors) {
      this.addEventListener("error", logErrorListener);
    }
  }
  #getComposed() {
    if (!this.#composedMiddleware) {
      this.#composedMiddleware = compose(this.#middleware);
    }
    return this.#composedMiddleware;
  }
  #getContextState() {
    switch(this.#contextState){
      case "alias":
        return this.state;
      case "clone":
        return cloneState(this.state);
      case "empty":
        return {};
      case "prototype":
        return Object.create(this.state);
    }
  }
  /** Deal with uncaught errors in either the middleware or sending the
   * response. */ // deno-lint-ignore no-explicit-any
  #handleError(context, error) {
    if (!(error instanceof Error)) {
      error = new Error(`non-error thrown: ${JSON.stringify(error)}`);
    }
    const { message } = error;
    if (!context.response.writable) {
      this.dispatchEvent(new ApplicationErrorEvent({
        context,
        message,
        error
      }));
      return;
    }
    for (const key of [
      ...context.response.headers.keys()
    ]){
      context.response.headers.delete(key);
    }
    if (error.headers && error.headers instanceof Headers) {
      for (const [key, value] of error.headers){
        context.response.headers.set(key, value);
      }
    }
    context.response.type = "text";
    const status = context.response.status = globalThis.Deno && Deno.errors && error instanceof Deno.errors.NotFound ? 404 : error.status && typeof error.status === "number" ? error.status : 500;
    context.response.body = error.expose ? error.message : STATUS_TEXT[status];
    this.dispatchEvent(new ApplicationErrorEvent({
      context,
      message,
      error
    }));
  }
  /** Processing registered middleware on each request. */ async #handleRequest(request, secure, state) {
    let context;
    try {
      context = new Context(this, request, this.#getContextState(), {
        secure,
        ...this.#contextOptions
      });
    } catch (e) {
      const error = e instanceof Error ? e : new Error(`non-error thrown: ${JSON.stringify(e)}`);
      const { message } = error;
      this.dispatchEvent(new ApplicationErrorEvent({
        message,
        error
      }));
      return;
    }
    assert(context, "Context was not created.");
    const { promise, resolve } = createPromiseWithResolvers();
    state.handling.add(promise);
    if (!state.closing && !state.closed) {
      try {
        await this.#getComposed()(context);
      } catch (err) {
        this.#handleError(context, err);
      }
    }
    if (context.respond === false) {
      context.response.destroy();
      resolve();
      state.handling.delete(promise);
      return;
    }
    let closeResources = true;
    let response;
    try {
      closeResources = false;
      response = await context.response.toDomResponse();
    } catch (err) {
      this.#handleError(context, err);
      response = await context.response.toDomResponse();
    }
    assert(response);
    try {
      await request.respond(response);
    } catch (err) {
      this.#handleError(context, err);
    } finally{
      context.response.destroy(closeResources);
      resolve();
      state.handling.delete(promise);
      if (state.closing) {
        await state.server.close();
        if (!state.closed) {
          this.dispatchEvent(new ApplicationCloseEvent({}));
        }
        state.closed = true;
      }
    }
  }
  /** Add an event listener for an event.  Currently valid event types are
   * `"error"` and `"listen"`. */ addEventListener(type, listener, options) {
    super.addEventListener(type, listener, options);
  }
  /** A method that is compatible with the Cloudflare Worker
   * [Fetch Handler](https://developers.cloudflare.com/workers/runtime-apis/handlers/fetch/)
   * and can be exported to handle Cloudflare Worker fetch requests.
   *
   * # Example
   *
   * ```ts
   * import { Application } from "@oak/oak";
   *
   * const app = new Application();
   * app.use((ctx) => {
   *   ctx.response.body = "hello world!";
   * });
   *
   * export default { fetch: app.fetch };
   * ```
   */ fetch = async (request, _env, _ctx)=>{
    if (!this.#middleware.length) {
      throw new TypeError("There is no middleware to process requests.");
    }
    if (!NativeRequestCtor) {
      const { NativeRequest } = await import("./http_server_native_request.ts");
      NativeRequestCtor = NativeRequest;
    }
    let remoteAddr;
    const hostname = request.headers.get("CF-Connecting-IP") ?? undefined;
    if (hostname) {
      remoteAddr = {
        hostname,
        port: 0,
        transport: "tcp"
      };
    }
    const contextRequest = new NativeRequestCtor(request, {
      remoteAddr
    });
    const context = new Context(this, contextRequest, this.#getContextState(), this.#contextOptions);
    try {
      await this.#getComposed()(context);
      const response = await context.response.toDomResponse();
      context.response.destroy(false);
      return response;
    } catch (err) {
      this.#handleError(context, err);
      throw err;
    }
  };
  /** Handle an individual server request, returning the server response.  This
   * is similar to `.listen()`, but opening the connection and retrieving
   * requests are not the responsibility of the application.  If the generated
   * context gets set to not to respond, then the method resolves with
   * `undefined`, otherwise it resolves with a standard {@linkcode Response}. */ handle = async (request, secureOrAddr, secure = false)=>{
    if (!this.#middleware.length) {
      throw new TypeError("There is no middleware to process requests.");
    }
    assert(isNetAddr(secureOrAddr) || typeof secureOrAddr === "undefined");
    if (!NativeRequestCtor) {
      const { NativeRequest } = await import("./http_server_native_request.ts");
      NativeRequestCtor = NativeRequest;
    }
    const contextRequest = new NativeRequestCtor(request, {
      remoteAddr: secureOrAddr
    });
    const context = new Context(this, contextRequest, this.#getContextState(), {
      secure,
      ...this.#contextOptions
    });
    try {
      await this.#getComposed()(context);
    } catch (err) {
      this.#handleError(context, err);
    }
    if (context.respond === false) {
      context.response.destroy();
      return;
    }
    try {
      const response = await context.response.toDomResponse();
      context.response.destroy(false);
      return response;
    } catch (err) {
      this.#handleError(context, err);
      throw err;
    }
  };
  async listen(options = {
    port: 0
  }) {
    if (!this.#middleware.length) {
      throw new TypeError("There is no middleware to process requests.");
    }
    for (const middleware of this.#middleware){
      if (isMiddlewareObject(middleware) && middleware.init) {
        await middleware.init();
      }
    }
    if (typeof options === "string") {
      const match = ADDR_REGEXP.exec(options);
      if (!match) {
        throw TypeError(`Invalid address passed: "${options}"`);
      }
      const [, hostname, portStr] = match;
      options = {
        hostname,
        port: parseInt(portStr, 10)
      };
    }
    options = Object.assign({
      port: 0
    }, options);
    if (!this.#serverConstructor) {
      if (!DefaultServerCtor) {
        const { Server } = await (isBun() ? import("./http_server_bun.ts") : isNode() ? import("./http_server_node.ts") : import("./http_server_native.ts"));
        DefaultServerCtor = Server;
      }
      this.#serverConstructor = DefaultServerCtor;
    }
    const server = new this.#serverConstructor(this, options);
    const state = {
      closed: false,
      closing: false,
      handling: new Set(),
      server
    };
    const { signal } = options;
    if (signal) {
      signal.addEventListener("abort", ()=>{
        if (!state.handling.size) {
          state.closed = true;
          this.dispatchEvent(new ApplicationCloseEvent({}));
        }
        state.closing = true;
      }, {
        once: true
      });
    }
    const { secure = false } = options;
    const serverType = this.#serverConstructor.type ?? "custom";
    const listener = await server.listen();
    const { hostname, port } = listener.addr;
    this.dispatchEvent(new ApplicationListenEvent({
      hostname,
      listener,
      port,
      secure,
      serverType
    }));
    try {
      for await (const request of server){
        this.#handleRequest(request, secure, state);
      }
      await Promise.all(state.handling);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Application Error";
      this.dispatchEvent(new ApplicationErrorEvent({
        message,
        error
      }));
    }
  }
  use(...middleware) {
    this.#middleware.push(...middleware);
    this.#composedMiddleware = undefined;
    // deno-lint-ignore no-explicit-any
    return this;
  }
  [_computedKey](inspect) {
    const { keys, proxy, state } = this;
    return `${this.constructor.name} ${inspect({
      "#middleware": this.#middleware,
      keys,
      proxy,
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
    const { keys, proxy, state } = this;
    return `${options.stylize(this.constructor.name, "special")} ${inspect({
      "#middleware": this.#middleware,
      keys,
      proxy,
      state
    }, newOptions)}`;
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvb2FrQHYxNy4xLjYvYXBwbGljYXRpb24udHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IDIwMTgtMjAyNSB0aGUgb2FrIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuXG4vKipcbiAqIENvbnRhaW5zIHRoZSBjb3JlIGNvbmNlcHQgb2Ygb2FrLCB0aGUgbWlkZGxld2FyZSBhcHBsaWNhdGlvbi4gVHlwaWNhbCB1c2FnZVxuICogaXMgdGhlIGNyZWF0aW9uIG9mIGFuIGFwcGxpY2F0aW9uIGluc3RhbmNlLCByZWdpc3RyYXRpb24gb2YgbWlkZGxld2FyZSwgYW5kXG4gKiB0aGVuIHN0YXJ0aW5nIHRvIGxpc3RlbiBmb3IgcmVxdWVzdHMuXG4gKlxuICogIyBFeGFtcGxlXG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IEFwcGxpY2F0aW9uIH0gZnJvbSBcImpzcjpAb2FrL29hay9hcHBsaWNhdGlvblwiO1xuICpcbiAqIGNvbnN0IGFwcCA9IG5ldyBBcHBsaWNhdGlvbigpO1xuICogYXBwLnVzZSgoY3R4KSA9PiB7XG4gKiAgIGN0eC5yZXNwb25zZS5ib2R5ID0gXCJoZWxsbyB3b3JsZCFcIjtcbiAqIH0pO1xuICpcbiAqIGFwcC5saXN0ZW4oeyBwb3J0OiA4MDgwIH0pO1xuICogYGBgXG4gKlxuICogQG1vZHVsZVxuICovXG5cbmltcG9ydCB7IENvbnRleHQgfSBmcm9tIFwiLi9jb250ZXh0LnRzXCI7XG5pbXBvcnQgeyBhc3NlcnQsIEtleVN0YWNrLCB0eXBlIFN0YXR1cywgU1RBVFVTX1RFWFQgfSBmcm9tIFwiLi9kZXBzLnRzXCI7XG5pbXBvcnQgdHlwZSB7IE5hdGl2ZVJlcXVlc3QgfSBmcm9tIFwiLi9odHRwX3NlcnZlcl9uYXRpdmVfcmVxdWVzdC50c1wiO1xuaW1wb3J0IHtcbiAgY29tcG9zZSxcbiAgaXNNaWRkbGV3YXJlT2JqZWN0LFxuICB0eXBlIE1pZGRsZXdhcmVPck1pZGRsZXdhcmVPYmplY3QsXG59IGZyb20gXCIuL21pZGRsZXdhcmUudHNcIjtcbmltcG9ydCB7IGNsb25lU3RhdGUgfSBmcm9tIFwiLi91dGlscy9jbG9uZV9zdGF0ZS50c1wiO1xuaW1wb3J0IHsgY3JlYXRlUHJvbWlzZVdpdGhSZXNvbHZlcnMgfSBmcm9tIFwiLi91dGlscy9jcmVhdGVfcHJvbWlzZV93aXRoX3Jlc29sdmVycy50c1wiO1xuaW1wb3J0IHR5cGUge1xuICBLZXksXG4gIExpc3RlbmVyLFxuICBOZXRBZGRyLFxuICBPYWtTZXJ2ZXIsXG4gIFNlcnZlckNvbnN0cnVjdG9yLFxuICBTZXJ2ZXJSZXF1ZXN0LFxufSBmcm9tIFwiLi90eXBlcy50c1wiO1xuaW1wb3J0IHsgaXNCdW4sIGlzTmV0QWRkciwgaXNOb2RlIH0gZnJvbSBcIi4vdXRpbHMvdHlwZV9ndWFyZHMudHNcIjtcblxuLyoqIEJhc2UgaW50ZXJmYWNlIGZvciBhcHBsaWNhdGlvbiBsaXN0ZW5pbmcgb3B0aW9ucy4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTGlzdGVuT3B0aW9uc0Jhc2Uge1xuICAvKiogVGhlIHBvcnQgdG8gbGlzdGVuIG9uLiBJZiBub3Qgc3BlY2lmaWVkLCBkZWZhdWx0cyB0byBgMGAsIHdoaWNoIGFsbG93cyB0aGVcbiAgICogb3BlcmF0aW5nIHN5c3RlbSB0byBkZXRlcm1pbmUgdGhlIHZhbHVlLiAqL1xuICBwb3J0PzogbnVtYmVyO1xuICAvKiogQSBsaXRlcmFsIElQIGFkZHJlc3Mgb3IgaG9zdCBuYW1lIHRoYXQgY2FuIGJlIHJlc29sdmVkIHRvIGFuIElQIGFkZHJlc3MuXG4gICAqIElmIG5vdCBzcGVjaWZpZWQsIGRlZmF1bHRzIHRvIGAwLjAuMC4wYC5cbiAgICpcbiAgICogX19Ob3RlIGFib3V0IGAwLjAuMC4wYF9fIFdoaWxlIGxpc3RlbmluZyBgMC4wLjAuMGAgd29ya3Mgb24gYWxsIHBsYXRmb3JtcyxcbiAgICogdGhlIGJyb3dzZXJzIG9uIFdpbmRvd3MgZG9uJ3Qgd29yayB3aXRoIHRoZSBhZGRyZXNzIGAwLjAuMC4wYC5cbiAgICogWW91IHNob3VsZCBzaG93IHRoZSBtZXNzYWdlIGxpa2UgYHNlcnZlciBydW5uaW5nIG9uIGxvY2FsaG9zdDo4MDgwYCBpbnN0ZWFkIG9mXG4gICAqIGBzZXJ2ZXIgcnVubmluZyBvbiAwLjAuMC4wOjgwODBgIGlmIHlvdXIgcHJvZ3JhbSBzdXBwb3J0cyBXaW5kb3dzLiAqL1xuICBob3N0bmFtZT86IHN0cmluZztcbiAgc2VjdXJlPzogZmFsc2U7XG4gIC8qKiBBbiBvcHRpb25hbCBhYm9ydCBzaWduYWwgd2hpY2ggY2FuIGJlIHVzZWQgdG8gY2xvc2UgdGhlIGxpc3RlbmVyLiAqL1xuICBzaWduYWw/OiBBYm9ydFNpZ25hbDtcbn1cblxuaW50ZXJmYWNlIFRsc0NlcnRpZmllZEtleVBlbSB7XG4gIC8qKiBUaGUgZm9ybWF0IG9mIHRoaXMga2V5IG1hdGVyaWFsLCB3aGljaCBtdXN0IGJlIFBFTS4gKi9cbiAga2V5Rm9ybWF0PzogXCJwZW1cIjtcbiAgLyoqIFByaXZhdGUga2V5IGluIGBQRU1gIGZvcm1hdC4gUlNBLCBFQywgYW5kIFBLQ1M4LWZvcm1hdCBrZXlzIGFyZSBzdXBwb3J0ZWQuICovXG4gIGtleTogc3RyaW5nO1xuICAvKiogQ2VydGlmaWNhdGUgY2hhaW4gaW4gYFBFTWAgZm9ybWF0LiAqL1xuICBjZXJ0OiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBUbHNDZXJ0aWZpZWRLZXlGcm9tRmlsZSB7XG4gIC8qKiBQYXRoIHRvIGEgZmlsZSBjb250YWluaW5nIGEgUEVNIGZvcm1hdHRlZCBDQSBjZXJ0aWZpY2F0ZS4gUmVxdWlyZXNcbiAgICogYC0tYWxsb3ctcmVhZGAuXG4gICAqXG4gICAqIEB0YWdzIGFsbG93LXJlYWRcbiAgICogQGRlcHJlY2F0ZWQgVGhpcyB3aWxsIGJlIHJlbW92ZWQgaW4gRGVubyAyLjAuIFNlZSB0aGVcbiAgICoge0BsaW5rIGh0dHBzOi8vZG9jcy5kZW5vLmNvbS9ydW50aW1lL21hbnVhbC9hZHZhbmNlZC9taWdyYXRlX2RlcHJlY2F0aW9ucyB8IERlbm8gMS54IHRvIDIueCBNaWdyYXRpb24gR3VpZGV9XG4gICAqIGZvciBtaWdyYXRpb24gaW5zdHJ1Y3Rpb25zLlxuICAgKi9cbiAgY2VydEZpbGU6IHN0cmluZztcbiAgLyoqIFBhdGggdG8gYSBmaWxlIGNvbnRhaW5pbmcgYSBwcml2YXRlIGtleSBmaWxlLiBSZXF1aXJlcyBgLS1hbGxvdy1yZWFkYC5cbiAgICpcbiAgICogQHRhZ3MgYWxsb3ctcmVhZFxuICAgKiBAZGVwcmVjYXRlZCBUaGlzIHdpbGwgYmUgcmVtb3ZlZCBpbiBEZW5vIDIuMC4gU2VlIHRoZVxuICAgKiB7QGxpbmsgaHR0cHM6Ly9kb2NzLmRlbm8uY29tL3J1bnRpbWUvbWFudWFsL2FkdmFuY2VkL21pZ3JhdGVfZGVwcmVjYXRpb25zIHwgRGVubyAxLnggdG8gMi54IE1pZ3JhdGlvbiBHdWlkZX1cbiAgICogZm9yIG1pZ3JhdGlvbiBpbnN0cnVjdGlvbnMuXG4gICAqL1xuICBrZXlGaWxlOiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBUbHNDZXJ0aWZpZWRLZXlDb25uZWN0VGxzIHtcbiAgLyoqXG4gICAqIENlcnRpZmljYXRlIGNoYWluIGluIGBQRU1gIGZvcm1hdC5cbiAgICpcbiAgICogQGRlcHJlY2F0ZWQgVGhpcyB3aWxsIGJlIHJlbW92ZWQgaW4gRGVubyAyLjAuIFNlZSB0aGVcbiAgICoge0BsaW5rIGh0dHBzOi8vZG9jcy5kZW5vLmNvbS9ydW50aW1lL21hbnVhbC9hZHZhbmNlZC9taWdyYXRlX2RlcHJlY2F0aW9ucyB8IERlbm8gMS54IHRvIDIueCBNaWdyYXRpb24gR3VpZGV9XG4gICAqIGZvciBtaWdyYXRpb24gaW5zdHJ1Y3Rpb25zLlxuICAgKi9cbiAgY2VydENoYWluOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBQcml2YXRlIGtleSBpbiBgUEVNYCBmb3JtYXQuIFJTQSwgRUMsIGFuZCBQS0NTOC1mb3JtYXQga2V5cyBhcmUgc3VwcG9ydGVkLlxuICAgKlxuICAgKiBAZGVwcmVjYXRlZCBUaGlzIHdpbGwgYmUgcmVtb3ZlZCBpbiBEZW5vIDIuMC4gU2VlIHRoZVxuICAgKiB7QGxpbmsgaHR0cHM6Ly9kb2NzLmRlbm8uY29tL3J1bnRpbWUvbWFudWFsL2FkdmFuY2VkL21pZ3JhdGVfZGVwcmVjYXRpb25zIHwgRGVubyAxLnggdG8gMi54IE1pZ3JhdGlvbiBHdWlkZX1cbiAgICogZm9yIG1pZ3JhdGlvbiBpbnN0cnVjdGlvbnMuXG4gICAqL1xuICBwcml2YXRlS2V5OiBzdHJpbmc7XG59XG5cbnR5cGUgVGxzQ2VydGlmaWVkS2V5T3B0aW9ucyA9XG4gIHwgVGxzQ2VydGlmaWVkS2V5UGVtXG4gIHwgVGxzQ2VydGlmaWVkS2V5RnJvbUZpbGVcbiAgfCBUbHNDZXJ0aWZpZWRLZXlDb25uZWN0VGxzO1xuXG4vKiogSW50ZXJmYWNlIG9wdGlvbnMgd2hlbiBsaXN0ZW5pbmcgb24gVExTLiAqL1xuZXhwb3J0IHR5cGUgTGlzdGVuT3B0aW9uc1RscyA9IHtcbiAgLyoqIFRoZSBwb3J0IHRvIGxpc3RlbiBvbi4gKi9cbiAgcG9ydDogbnVtYmVyO1xuICAvKiogQSBsaXRlcmFsIElQIGFkZHJlc3Mgb3IgaG9zdCBuYW1lIHRoYXQgY2FuIGJlIHJlc29sdmVkIHRvIGFuIElQIGFkZHJlc3MuXG4gICAqXG4gICAqIF9fTm90ZSBhYm91dCBgMC4wLjAuMGBfXyBXaGlsZSBsaXN0ZW5pbmcgYDAuMC4wLjBgIHdvcmtzIG9uIGFsbCBwbGF0Zm9ybXMsXG4gICAqIHRoZSBicm93c2VycyBvbiBXaW5kb3dzIGRvbid0IHdvcmsgd2l0aCB0aGUgYWRkcmVzcyBgMC4wLjAuMGAuXG4gICAqIFlvdSBzaG91bGQgc2hvdyB0aGUgbWVzc2FnZSBsaWtlIGBzZXJ2ZXIgcnVubmluZyBvbiBsb2NhbGhvc3Q6ODA4MGAgaW5zdGVhZCBvZlxuICAgKiBgc2VydmVyIHJ1bm5pbmcgb24gMC4wLjAuMDo4MDgwYCBpZiB5b3VyIHByb2dyYW0gc3VwcG9ydHMgV2luZG93cy5cbiAgICpcbiAgICogQGRlZmF1bHQge1wiMC4wLjAuMFwifSAqL1xuICBob3N0bmFtZT86IHN0cmluZztcblxuICB0cmFuc3BvcnQ/OiBcInRjcFwiO1xuXG4gIC8qKiBBcHBsaWNhdGlvbi1MYXllciBQcm90b2NvbCBOZWdvdGlhdGlvbiAoQUxQTikgcHJvdG9jb2xzIHRvIGFubm91bmNlIHRvXG4gICAqIHRoZSBjbGllbnQuIElmIG5vdCBzcGVjaWZpZWQsIG5vIEFMUE4gZXh0ZW5zaW9uIHdpbGwgYmUgaW5jbHVkZWQgaW4gdGhlXG4gICAqIFRMUyBoYW5kc2hha2UuXG4gICAqL1xuICBhbHBuUHJvdG9jb2xzPzogc3RyaW5nW107XG4gIHNlY3VyZTogdHJ1ZTtcbiAgLyoqIEFuIG9wdGlvbmFsIGFib3J0IHNpZ25hbCB3aGljaCBjYW4gYmUgdXNlZCB0byBjbG9zZSB0aGUgbGlzdGVuZXIuICovXG4gIHNpZ25hbD86IEFib3J0U2lnbmFsO1xufSAmIFRsc0NlcnRpZmllZEtleU9wdGlvbnM7XG5cbmludGVyZmFjZSBIYW5kbGVNZXRob2Qge1xuICAvKiogSGFuZGxlIGFuIGluZGl2aWR1YWwgc2VydmVyIHJlcXVlc3QsIHJldHVybmluZyB0aGUgc2VydmVyIHJlc3BvbnNlLiAgVGhpc1xuICAgKiBpcyBzaW1pbGFyIHRvIGAubGlzdGVuKClgLCBidXQgb3BlbmluZyB0aGUgY29ubmVjdGlvbiBhbmQgcmV0cmlldmluZ1xuICAgKiByZXF1ZXN0cyBhcmUgbm90IHRoZSByZXNwb25zaWJpbGl0eSBvZiB0aGUgYXBwbGljYXRpb24uICBJZiB0aGUgZ2VuZXJhdGVkXG4gICAqIGNvbnRleHQgZ2V0cyBzZXQgdG8gbm90IHRvIHJlc3BvbmQsIHRoZW4gdGhlIG1ldGhvZCByZXNvbHZlcyB3aXRoXG4gICAqIGB1bmRlZmluZWRgLCBvdGhlcndpc2UgaXQgcmVzb2x2ZXMgd2l0aCBhIERPTSBgUmVzcG9uc2VgIG9iamVjdC4gKi9cbiAgKFxuICAgIHJlcXVlc3Q6IFJlcXVlc3QsXG4gICAgcmVtb3RlQWRkcj86IE5ldEFkZHIsXG4gICAgc2VjdXJlPzogYm9vbGVhbixcbiAgKTogUHJvbWlzZTxSZXNwb25zZSB8IHVuZGVmaW5lZD47XG59XG5cbmludGVyZmFjZSBDbG91ZGZsYXJlRXhlY3V0aW9uQ29udGV4dCB7XG4gIHdhaXRVbnRpbChwcm9taXNlOiBQcm9taXNlPHVua25vd24+KTogdm9pZDtcbiAgcGFzc1Rocm91Z2hPbkV4Y2VwdGlvbigpOiB2b2lkO1xufVxuXG5pbnRlcmZhY2UgQ2xvdWRmbGFyZUZldGNoSGFuZGxlcjxcbiAgRW52IGV4dGVuZHMgUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IFJlY29yZDxzdHJpbmcsIHN0cmluZz4sXG4+IHtcbiAgLyoqIEEgbWV0aG9kIHRoYXQgaXMgY29tcGF0aWJsZSB3aXRoIHRoZSBDbG91ZGZsYXJlIFdvcmtlclxuICAgKiBbRmV0Y2ggSGFuZGxlcl0oaHR0cHM6Ly9kZXZlbG9wZXJzLmNsb3VkZmxhcmUuY29tL3dvcmtlcnMvcnVudGltZS1hcGlzL2hhbmRsZXJzL2ZldGNoLylcbiAgICogYW5kIGNhbiBiZSBleHBvcnRlZCB0byBoYW5kbGUgQ2xvdWRmbGFyZSBXb3JrZXIgZmV0Y2ggcmVxdWVzdHMuXG4gICAqXG4gICAqICMgRXhhbXBsZVxuICAgKlxuICAgKiBgYGB0c1xuICAgKiBpbXBvcnQgeyBBcHBsaWNhdGlvbiB9IGZyb20gXCJAb2FrL29ha1wiO1xuICAgKlxuICAgKiBjb25zdCBhcHAgPSBuZXcgQXBwbGljYXRpb24oKTtcbiAgICogYXBwLnVzZSgoY3R4KSA9PiB7XG4gICAqICAgY3R4LnJlc3BvbnNlLmJvZHkgPSBcImhlbGxvIHdvcmxkIVwiO1xuICAgKiB9KTtcbiAgICpcbiAgICogZXhwb3J0IGRlZmF1bHQgeyBmZXRjaDogYXBwLmZldGNoIH07XG4gICAqIGBgYFxuICAgKi9cbiAgKFxuICAgIHJlcXVlc3Q6IFJlcXVlc3QsXG4gICAgZW52OiBFbnYsXG4gICAgY3R4OiBDbG91ZGZsYXJlRXhlY3V0aW9uQ29udGV4dCxcbiAgKTogUHJvbWlzZTxSZXNwb25zZT47XG59XG5cbi8qKiBPcHRpb25zIHdoaWNoIGNhbiBiZSBzcGVjaWZpZWQgd2hlbiBsaXN0ZW5pbmcuICovXG5leHBvcnQgdHlwZSBMaXN0ZW5PcHRpb25zID0gTGlzdGVuT3B0aW9uc1RscyB8IExpc3Rlbk9wdGlvbnNCYXNlO1xuXG5pbnRlcmZhY2UgQXBwbGljYXRpb25DbG9zZUV2ZW50TGlzdGVuZXIge1xuICAoZXZ0OiBBcHBsaWNhdGlvbkNsb3NlRXZlbnQpOiB2b2lkIHwgUHJvbWlzZTx2b2lkPjtcbn1cblxuaW50ZXJmYWNlIEFwcGxpY2F0aW9uQ2xvc2VFdmVudExpc3RlbmVyT2JqZWN0IHtcbiAgaGFuZGxlRXZlbnQoZXZ0OiBBcHBsaWNhdGlvbkNsb3NlRXZlbnQpOiB2b2lkIHwgUHJvbWlzZTx2b2lkPjtcbn1cblxudHlwZSBBcHBsaWNhdGlvbkNsb3NlRXZlbnRMaXN0ZW5lck9yRXZlbnRMaXN0ZW5lck9iamVjdCA9XG4gIHwgQXBwbGljYXRpb25DbG9zZUV2ZW50TGlzdGVuZXJcbiAgfCBBcHBsaWNhdGlvbkNsb3NlRXZlbnRMaXN0ZW5lck9iamVjdDtcblxuaW50ZXJmYWNlIEFwcGxpY2F0aW9uRXJyb3JFdmVudExpc3RlbmVyPFMgZXh0ZW5kcyBBUywgQVMgZXh0ZW5kcyBTdGF0ZT4ge1xuICAoZXZ0OiBBcHBsaWNhdGlvbkVycm9yRXZlbnQ8UywgQVM+KTogdm9pZCB8IFByb21pc2U8dm9pZD47XG59XG5cbmludGVyZmFjZSBBcHBsaWNhdGlvbkVycm9yRXZlbnRMaXN0ZW5lck9iamVjdDxTIGV4dGVuZHMgQVMsIEFTIGV4dGVuZHMgU3RhdGU+IHtcbiAgaGFuZGxlRXZlbnQoZXZ0OiBBcHBsaWNhdGlvbkVycm9yRXZlbnQ8UywgQVM+KTogdm9pZCB8IFByb21pc2U8dm9pZD47XG59XG5cbmludGVyZmFjZSBBcHBsaWNhdGlvbkVycm9yRXZlbnRJbml0PFMgZXh0ZW5kcyBBUywgQVMgZXh0ZW5kcyBTdGF0ZT5cbiAgZXh0ZW5kcyBFcnJvckV2ZW50SW5pdCB7XG4gIGNvbnRleHQ/OiBDb250ZXh0PFMsIEFTPjtcbn1cblxudHlwZSBBcHBsaWNhdGlvbkVycm9yRXZlbnRMaXN0ZW5lck9yRXZlbnRMaXN0ZW5lck9iamVjdDxcbiAgUyBleHRlbmRzIEFTLFxuICBBUyBleHRlbmRzIFN0YXRlLFxuPiA9XG4gIHwgQXBwbGljYXRpb25FcnJvckV2ZW50TGlzdGVuZXI8UywgQVM+XG4gIHwgQXBwbGljYXRpb25FcnJvckV2ZW50TGlzdGVuZXJPYmplY3Q8UywgQVM+O1xuXG5pbnRlcmZhY2UgQXBwbGljYXRpb25MaXN0ZW5FdmVudExpc3RlbmVyIHtcbiAgKGV2dDogQXBwbGljYXRpb25MaXN0ZW5FdmVudCk6IHZvaWQgfCBQcm9taXNlPHZvaWQ+O1xufVxuXG5pbnRlcmZhY2UgQXBwbGljYXRpb25MaXN0ZW5FdmVudExpc3RlbmVyT2JqZWN0IHtcbiAgaGFuZGxlRXZlbnQoZXZ0OiBBcHBsaWNhdGlvbkxpc3RlbkV2ZW50KTogdm9pZCB8IFByb21pc2U8dm9pZD47XG59XG5cbmludGVyZmFjZSBBcHBsaWNhdGlvbkxpc3RlbkV2ZW50SW5pdCBleHRlbmRzIEV2ZW50SW5pdCB7XG4gIGhvc3RuYW1lOiBzdHJpbmc7XG4gIGxpc3RlbmVyOiBMaXN0ZW5lcjtcbiAgcG9ydDogbnVtYmVyO1xuICBzZWN1cmU6IGJvb2xlYW47XG4gIHNlcnZlclR5cGU6IFwibmF0aXZlXCIgfCBcIm5vZGVcIiB8IFwiYnVuXCIgfCBcImN1c3RvbVwiO1xufVxuXG50eXBlIEFwcGxpY2F0aW9uTGlzdGVuRXZlbnRMaXN0ZW5lck9yRXZlbnRMaXN0ZW5lck9iamVjdCA9XG4gIHwgQXBwbGljYXRpb25MaXN0ZW5FdmVudExpc3RlbmVyXG4gIHwgQXBwbGljYXRpb25MaXN0ZW5FdmVudExpc3RlbmVyT2JqZWN0O1xuXG4vKiogQXZhaWxhYmxlIG9wdGlvbnMgdGhhdCBhcmUgdXNlZCB3aGVuIGNyZWF0aW5nIGEgbmV3IGluc3RhbmNlIG9mXG4gKiB7QGxpbmtjb2RlIEFwcGxpY2F0aW9ufS4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQXBwbGljYXRpb25PcHRpb25zPFMgZXh0ZW5kcyBTdGF0ZSwgUiBleHRlbmRzIFNlcnZlclJlcXVlc3Q+IHtcbiAgLyoqIERldGVybWluZSBob3cgd2hlbiBjcmVhdGluZyBhIG5ldyBjb250ZXh0LCB0aGUgc3RhdGUgZnJvbSB0aGUgYXBwbGljYXRpb25cbiAgICogc2hvdWxkIGJlIGFwcGxpZWQuIEEgdmFsdWUgb2YgYFwiY2xvbmVcImAgd2lsbCBzZXQgdGhlIHN0YXRlIGFzIGEgY2xvbmUgb2ZcbiAgICogdGhlIGFwcCBzdGF0ZS4gQW55IG5vbi1jbG9uZWFibGUgb3Igbm9uLWVudW1lcmFibGUgcHJvcGVydGllcyB3aWxsIG5vdCBiZVxuICAgKiBjb3BpZWQuIEEgdmFsdWUgb2YgYFwicHJvdG90eXBlXCJgIG1lYW5zIHRoYXQgdGhlIGFwcGxpY2F0aW9uJ3Mgc3RhdGUgd2lsbCBiZVxuICAgKiB1c2VkIGFzIHRoZSBwcm90b3R5cGUgb2YgdGhlIHRoZSBjb250ZXh0J3Mgc3RhdGUsIG1lYW5pbmcgc2hhbGxvd1xuICAgKiBwcm9wZXJ0aWVzIG9uIHRoZSBjb250ZXh0J3Mgc3RhdGUgd2lsbCBub3QgYmUgcmVmbGVjdGVkIGluIHRoZVxuICAgKiBhcHBsaWNhdGlvbidzIHN0YXRlLiBBIHZhbHVlIG9mIGBcImFsaWFzXCJgIG1lYW5zIHRoYXQgYXBwbGljYXRpb24ncyBgLnN0YXRlYFxuICAgKiBhbmQgdGhlIGNvbnRleHQncyBgLnN0YXRlYCB3aWxsIGJlIGEgcmVmZXJlbmNlIHRvIHRoZSBzYW1lIG9iamVjdC4gQSB2YWx1ZVxuICAgKiBvZiBgXCJlbXB0eVwiYCB3aWxsIGluaXRpYWxpemUgdGhlIGNvbnRleHQncyBgLnN0YXRlYCB3aXRoIGFuIGVtcHR5IG9iamVjdC5cbiAgICpcbiAgICogVGhlIGRlZmF1bHQgdmFsdWUgaXMgYFwiY2xvbmVcImAuXG4gICAqL1xuICBjb250ZXh0U3RhdGU/OiBcImNsb25lXCIgfCBcInByb3RvdHlwZVwiIHwgXCJhbGlhc1wiIHwgXCJlbXB0eVwiO1xuXG4gIC8qKiBBbiBvcHRpb25hbCByZXBsYWNlciBmdW5jdGlvbiB0byBiZSB1c2VkIHdoZW4gc2VyaWFsaXppbmcgYSBKU09OXG4gICAqIHJlc3BvbnNlLiBUaGUgcmVwbGFjZXIgd2lsbCBiZSB1c2VkIHdpdGggYEpTT04uc3RyaW5naWZ5KClgIHRvIGVuY29kZSBhbnlcbiAgICogcmVzcG9uc2UgYm9kaWVzIHRoYXQgbmVlZCB0byBiZSBjb252ZXJ0ZWQgYmVmb3JlIHNlbmRpbmcgdGhlIHJlc3BvbnNlLlxuICAgKlxuICAgKiBUaGlzIGlzIGludGVuZGVkIHRvIGFsbG93IHJlc3BvbnNlcyB0byBjb250YWluIGJpZ2ludHMgYW5kIGNpcmN1bGFyXG4gICAqIHJlZmVyZW5jZXMgYW5kIGVuY29kaW5nIG90aGVyIHZhbHVlcyB3aGljaCBKU09OIGRvZXMgbm90IHN1cHBvcnQgZGlyZWN0bHkuXG4gICAqXG4gICAqIFRoaXMgY2FuIGJlIHVzZWQgaW4gY29uanVuY3Rpb24gd2l0aCBganNvbkJvZHlSZXZpdmVyYCB0byBoYW5kbGUgZGVjb2RpbmdcbiAgICogb2YgcmVxdWVzdCBib2RpZXMgaWYgdGhlIHNhbWUgc2VtYW50aWNzIGFyZSB1c2VkIGZvciBjbGllbnQgcmVxdWVzdHMuXG4gICAqXG4gICAqIElmIG1vcmUgZGV0YWlsZWQgb3IgY29uZGl0aW9uYWwgdXNhZ2UgaXMgcmVxdWlyZWQsIHRoZW4gc2VyaWFsaXphdGlvblxuICAgKiBzaG91bGQgYmUgaW1wbGVtZW50ZWQgZGlyZWN0bHkgaW4gbWlkZGxld2FyZS4gKi9cbiAganNvbkJvZHlSZXBsYWNlcj86IChcbiAgICBrZXk6IHN0cmluZyxcbiAgICB2YWx1ZTogdW5rbm93bixcbiAgICBjb250ZXh0OiBDb250ZXh0PFM+LFxuICApID0+IHVua25vd247XG5cbiAgLyoqIEFuIG9wdGlvbmFsIHJldml2ZXIgZnVuY3Rpb24gdG8gYmUgdXNlZCB3aGVuIHBhcnNpbmcgYSBKU09OIHJlcXVlc3QuIFRoZVxuICAgKiByZXZpdmVyIHdpbGwgYmUgdXNlZCB3aXRoIGBKU09OLnBhcnNlKClgIHRvIGRlY29kZSBhbnkgcmVzcG9uc2UgYm9kaWVzIHRoYXRcbiAgICogYXJlIGJlaW5nIGNvbnZlcnRlZCBhcyBKU09OLlxuICAgKlxuICAgKiBUaGlzIGlzIGludGVuZGVkIHRvIGFsbG93IHJlcXVlc3RzIHRvIGRlc2VyaWFsaXplIHRvIGJpZ2ludHMsIGNpcmN1bGFyXG4gICAqIHJlZmVyZW5jZXMsIG9yIG90aGVyIHZhbHVlcyB3aGljaCBKU09OIGRvZXMgbm90IHN1cHBvcnQgZGlyZWN0bHkuXG4gICAqXG4gICAqIFRoaXMgY2FuIGJlIHVzZWQgaW4gY29uanVuY3Rpb24gd2l0aCBganNvbkJvZHlSZXBsYWNlcmAgdG8gaGFuZGxlIGRlY29kaW5nXG4gICAqIG9mIHJlc3BvbnNlIGJvZGllcyBpZiB0aGUgc2FtZSBzZW1hbnRpY3MgYXJlIHVzZWQgZm9yIHJlc3BvbnNlcy5cbiAgICpcbiAgICogSWYgbW9yZSBkZXRhaWxlZCBvciBjb25kaXRpb25hbCB1c2FnZSBpcyByZXF1aXJlZCwgdGhlbiBkZXNlcmlhbGl6YXRpb25cbiAgICogc2hvdWxkIGJlIGltcGxlbWVudGVkIGRpcmVjdGx5IGluIHRoZSBtaWRkbGV3YXJlLlxuICAgKi9cbiAganNvbkJvZHlSZXZpdmVyPzogKFxuICAgIGtleTogc3RyaW5nLFxuICAgIHZhbHVlOiB1bmtub3duLFxuICAgIGNvbnRleHQ6IENvbnRleHQ8Uz4sXG4gICkgPT4gdW5rbm93bjtcblxuICAvKiogQW4gaW5pdGlhbCBzZXQgb2Yga2V5cyAob3IgaW5zdGFuY2Ugb2Yge0BsaW5rY29kZSBLZXlTdGFja30pIHRvIGJlIHVzZWQgZm9yIHNpZ25pbmdcbiAgICogY29va2llcyBwcm9kdWNlZCBieSB0aGUgYXBwbGljYXRpb24uICovXG4gIGtleXM/OiBLZXlTdGFjayB8IEtleVtdO1xuXG4gIC8qKiBJZiBgdHJ1ZWAsIGFueSBlcnJvcnMgaGFuZGxlZCBieSB0aGUgYXBwbGljYXRpb24gd2lsbCBiZSBsb2dnZWQgdG8gdGhlXG4gICAqIHN0ZGVyci4gSWYgYGZhbHNlYCBub3RoaW5nIHdpbGwgYmUgbG9nZ2VkLiBUaGUgZGVmYXVsdCBpcyBgdHJ1ZWAuXG4gICAqXG4gICAqIEFsbCBlcnJvcnMgYXJlIGF2YWlsYWJsZSBhcyBldmVudHMgb24gdGhlIGFwcGxpY2F0aW9uIG9mIHR5cGUgYFwiZXJyb3JcImAgYW5kXG4gICAqIGNhbiBiZSBhY2Nlc3NlZCBmb3IgY3VzdG9tIGxvZ2dpbmcvYXBwbGljYXRpb24gbWFuYWdlbWVudCB2aWEgYWRkaW5nIGFuXG4gICAqIGV2ZW50IGxpc3RlbmVyIHRvIHRoZSBhcHBsaWNhdGlvbjpcbiAgICpcbiAgICogYGBgdHNcbiAgICogY29uc3QgYXBwID0gbmV3IEFwcGxpY2F0aW9uKHsgbG9nRXJyb3JzOiBmYWxzZSB9KTtcbiAgICogYXBwLmFkZEV2ZW50TGlzdGVuZXIoXCJlcnJvclwiLCAoZXZ0KSA9PiB7XG4gICAqICAgLy8gZXZ0LmVycm9yIHdpbGwgY29udGFpbiB3aGF0IGVycm9yIHdhcyB0aHJvd25cbiAgICogfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgbG9nRXJyb3JzPzogYm9vbGVhbjtcblxuICAvKiogSWYgc2V0IHRvIGB0cnVlYCwgcHJveHkgaGVhZGVycyB3aWxsIGJlIHRydXN0ZWQgd2hlbiBwcm9jZXNzaW5nIHJlcXVlc3RzLlxuICAgKiBUaGlzIGRlZmF1bHRzIHRvIGBmYWxzZWAuICovXG4gIHByb3h5PzogYm9vbGVhbjtcblxuICAvKiogQSBzZXJ2ZXIgY29uc3RydWN0b3IgdG8gdXNlIGluc3RlYWQgb2YgdGhlIGRlZmF1bHQgc2VydmVyIGZvciByZWNlaXZpbmdcbiAgICogcmVxdWVzdHMuXG4gICAqXG4gICAqIEdlbmVyYWxseSB0aGlzIGlzIG9ubHkgdXNlZCBmb3IgdGVzdGluZy4gKi9cbiAgc2VydmVyQ29uc3RydWN0b3I/OiBTZXJ2ZXJDb25zdHJ1Y3RvcjxSPjtcblxuICAvKiogVGhlIGluaXRpYWwgc3RhdGUgb2JqZWN0IGZvciB0aGUgYXBwbGljYXRpb24sIG9mIHdoaWNoIHRoZSB0eXBlIGNhbiBiZVxuICAgKiB1c2VkIHRvIGluZmVyIHRoZSB0eXBlIG9mIHRoZSBzdGF0ZSBmb3IgYm90aCB0aGUgYXBwbGljYXRpb24gYW5kIGFueSBvZiB0aGVcbiAgICogYXBwbGljYXRpb24ncyBjb250ZXh0LiAqL1xuICBzdGF0ZT86IFM7XG59XG5cbmludGVyZmFjZSBSZXF1ZXN0U3RhdGUge1xuICBoYW5kbGluZzogU2V0PFByb21pc2U8dm9pZD4+O1xuICBjbG9zaW5nOiBib29sZWFuO1xuICBjbG9zZWQ6IGJvb2xlYW47XG4gIHNlcnZlcjogT2FrU2VydmVyPFNlcnZlclJlcXVlc3Q+O1xufVxuXG4vKiogVGhlIGJhc2UgdHlwZSBvZiBzdGF0ZSB3aGljaCBpcyBhc3NvY2lhdGVkIHdpdGggYW4gYXBwbGljYXRpb24gb3JcbiAqIGNvbnRleHQuICovXG4vLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuZXhwb3J0IHR5cGUgU3RhdGUgPSBSZWNvcmQ8UHJvcGVydHlLZXksIGFueT47XG5cbmNvbnN0IEFERFJfUkVHRVhQID0gL15cXFs/KFteXFxdXSopXFxdPzooWzAtOV17MSw1fSkkLztcblxubGV0IERlZmF1bHRTZXJ2ZXJDdG9yOiBTZXJ2ZXJDb25zdHJ1Y3RvcjxTZXJ2ZXJSZXF1ZXN0PiB8IHVuZGVmaW5lZDtcbmxldCBOYXRpdmVSZXF1ZXN0Q3RvcjogdHlwZW9mIE5hdGl2ZVJlcXVlc3QgfCB1bmRlZmluZWQ7XG5cbi8qKiBBbiBldmVudCB0aGF0IG9jY3VycyB3aGVuIHRoZSBhcHBsaWNhdGlvbiBjbG9zZXMuICovXG5leHBvcnQgY2xhc3MgQXBwbGljYXRpb25DbG9zZUV2ZW50IGV4dGVuZHMgRXZlbnQge1xuICBjb25zdHJ1Y3RvcihldmVudEluaXREaWN0OiBFdmVudEluaXQpIHtcbiAgICBzdXBlcihcImNsb3NlXCIsIGV2ZW50SW5pdERpY3QpO1xuICB9XG59XG5cbi8qKiBBbiBldmVudCB0aGF0IG9jY3VycyB3aGVuIGFuIGFwcGxpY2F0aW9uIGVycm9yIG9jY3Vycy5cbiAqXG4gKiBXaGVuIHRoZSBlcnJvciBvY2N1cnMgcmVsYXRlZCB0byB0aGUgaGFuZGxpbmcgb2YgYSByZXF1ZXN0LCB0aGUgYC5jb250ZXh0YFxuICogcHJvcGVydHkgd2lsbCBiZSBwb3B1bGF0ZWQuXG4gKi9cbmV4cG9ydCBjbGFzcyBBcHBsaWNhdGlvbkVycm9yRXZlbnQ8UyBleHRlbmRzIEFTLCBBUyBleHRlbmRzIFN0YXRlPlxuICBleHRlbmRzIEVycm9yRXZlbnQge1xuICBjb250ZXh0PzogQ29udGV4dDxTLCBBUz47XG5cbiAgY29uc3RydWN0b3IoZXZlbnRJbml0RGljdDogQXBwbGljYXRpb25FcnJvckV2ZW50SW5pdDxTLCBBUz4pIHtcbiAgICBzdXBlcihcImVycm9yXCIsIGV2ZW50SW5pdERpY3QpO1xuICAgIHRoaXMuY29udGV4dCA9IGV2ZW50SW5pdERpY3QuY29udGV4dDtcbiAgfVxufVxuXG5mdW5jdGlvbiBsb2dFcnJvckxpc3RlbmVyPFMgZXh0ZW5kcyBBUywgQVMgZXh0ZW5kcyBTdGF0ZT4oXG4gIHsgZXJyb3IsIGNvbnRleHQgfTogQXBwbGljYXRpb25FcnJvckV2ZW50PFMsIEFTPixcbikge1xuICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICBgW3VuY2F1Z2h0IGFwcGxpY2F0aW9uIGVycm9yXTogJHtlcnJvci5uYW1lfSAtICR7ZXJyb3IubWVzc2FnZX1gLFxuICAgICk7XG4gIH0gZWxzZSB7XG4gICAgY29uc29sZS5lcnJvcihgW3VuY2F1Z2h0IGFwcGxpY2F0aW9uIGVycm9yXVxcbmAsIGVycm9yKTtcbiAgfVxuICBpZiAoY29udGV4dCkge1xuICAgIGxldCB1cmw6IHN0cmluZztcbiAgICB0cnkge1xuICAgICAgdXJsID0gY29udGV4dC5yZXF1ZXN0LnVybC50b1N0cmluZygpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgdXJsID0gXCJbbWFsZm9ybWVkIHVybF1cIjtcbiAgICB9XG4gICAgY29uc29sZS5lcnJvcihgXFxucmVxdWVzdDpgLCB7XG4gICAgICB1cmwsXG4gICAgICBtZXRob2Q6IGNvbnRleHQucmVxdWVzdC5tZXRob2QsXG4gICAgICBoYXNCb2R5OiBjb250ZXh0LnJlcXVlc3QuaGFzQm9keSxcbiAgICB9KTtcbiAgICBjb25zb2xlLmVycm9yKGByZXNwb25zZTpgLCB7XG4gICAgICBzdGF0dXM6IGNvbnRleHQucmVzcG9uc2Uuc3RhdHVzLFxuICAgICAgdHlwZTogY29udGV4dC5yZXNwb25zZS50eXBlLFxuICAgICAgaGFzQm9keTogISFjb250ZXh0LnJlc3BvbnNlLmJvZHksXG4gICAgICB3cml0YWJsZTogY29udGV4dC5yZXNwb25zZS53cml0YWJsZSxcbiAgICB9KTtcbiAgfVxuICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvciAmJiBlcnJvci5zdGFjaykge1xuICAgIGNvbnNvbGUuZXJyb3IoYFxcbiR7ZXJyb3Iuc3RhY2suc3BsaXQoXCJcXG5cIikuc2xpY2UoMSkuam9pbihcIlxcblwiKX1gKTtcbiAgfVxufVxuXG4vKipcbiAqIEFuIGV2ZW50IHRoYXQgb2NjdXJzIHdoZW4gdGhlIGFwcGxpY2F0aW9uIHN0YXJ0cyBsaXN0ZW5pbmcgZm9yIHJlcXVlc3RzLlxuICovXG5leHBvcnQgY2xhc3MgQXBwbGljYXRpb25MaXN0ZW5FdmVudCBleHRlbmRzIEV2ZW50IHtcbiAgaG9zdG5hbWU6IHN0cmluZztcbiAgbGlzdGVuZXI6IExpc3RlbmVyO1xuICBwb3J0OiBudW1iZXI7XG4gIHNlY3VyZTogYm9vbGVhbjtcbiAgc2VydmVyVHlwZTogXCJuYXRpdmVcIiB8IFwibm9kZVwiIHwgXCJidW5cIiB8IFwiY3VzdG9tXCI7XG5cbiAgY29uc3RydWN0b3IoZXZlbnRJbml0RGljdDogQXBwbGljYXRpb25MaXN0ZW5FdmVudEluaXQpIHtcbiAgICBzdXBlcihcImxpc3RlblwiLCBldmVudEluaXREaWN0KTtcbiAgICB0aGlzLmhvc3RuYW1lID0gZXZlbnRJbml0RGljdC5ob3N0bmFtZTtcbiAgICB0aGlzLmxpc3RlbmVyID0gZXZlbnRJbml0RGljdC5saXN0ZW5lcjtcbiAgICB0aGlzLnBvcnQgPSBldmVudEluaXREaWN0LnBvcnQ7XG4gICAgdGhpcy5zZWN1cmUgPSBldmVudEluaXREaWN0LnNlY3VyZTtcbiAgICB0aGlzLnNlcnZlclR5cGUgPSBldmVudEluaXREaWN0LnNlcnZlclR5cGU7XG4gIH1cbn1cblxuLyoqIEEgY2xhc3Mgd2hpY2ggcmVnaXN0ZXJzIG1pZGRsZXdhcmUgKHZpYSBgLnVzZSgpYCkgYW5kIHRoZW4gcHJvY2Vzc2VzXG4gKiBpbmJvdW5kIHJlcXVlc3RzIGFnYWluc3QgdGhhdCBtaWRkbGV3YXJlICh2aWEgYC5saXN0ZW4oKWApLlxuICpcbiAqIFRoZSBgY29udGV4dC5zdGF0ZWAgY2FuIGJlIHR5cGVkIHZpYSBwYXNzaW5nIGEgZ2VuZXJpYyBhcmd1bWVudCB3aGVuXG4gKiBjb25zdHJ1Y3RpbmcgYW4gaW5zdGFuY2Ugb2YgYEFwcGxpY2F0aW9uYC4gSXQgY2FuIGFsc28gYmUgaW5mZXJyZWQgYnkgc2V0dGluZ1xuICogdGhlIHtAbGlua2NvZGUgQXBwbGljYXRpb25PcHRpb25zLnN0YXRlfSBvcHRpb24gd2hlbiBjb25zdHJ1Y3RpbmcgdGhlXG4gKiBhcHBsaWNhdGlvbi5cbiAqXG4gKiAjIyMgQmFzaWMgZXhhbXBsZVxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBBcHBsaWNhdGlvbiB9IGZyb20gXCJqc3I6QG9hay9vYWsvYXBwbGljYXRpb25cIjtcbiAqXG4gKiBjb25zdCBhcHAgPSBuZXcgQXBwbGljYXRpb24oKTtcbiAqXG4gKiBhcHAudXNlKChjdHgsIG5leHQpID0+IHtcbiAqICAgLy8gY2FsbGVkIG9uIGVhY2ggcmVxdWVzdCB3aXRoIHRoZSBjb250ZXh0IChgY3R4YCkgb2YgdGhlIHJlcXVlc3QsXG4gKiAgIC8vIHJlc3BvbnNlLCBhbmQgb3RoZXIgZGF0YS5cbiAqICAgLy8gYG5leHQoKWAgaXMgdXNlIHRvIG1vZGlmeSB0aGUgZmxvdyBjb250cm9sIG9mIHRoZSBtaWRkbGV3YXJlIHN0YWNrLlxuICogfSk7XG4gKlxuICogYXBwLmxpc3Rlbih7IHBvcnQ6IDgwODAgfSk7XG4gKiBgYGBcbiAqXG4gKiBAdGVtcGxhdGUgQVMgdGhlIHR5cGUgb2YgdGhlIGFwcGxpY2F0aW9uIHN0YXRlIHdoaWNoIGV4dGVuZHNcbiAqICAgICAgICAgICAgICB7QGxpbmtjb2RlIFN0YXRlfSBhbmQgZGVmYXVsdHMgdG8gYSBzaW1wbGUgc3RyaW5nIHJlY29yZC5cbiAqL1xuLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbmV4cG9ydCBjbGFzcyBBcHBsaWNhdGlvbjxBUyBleHRlbmRzIFN0YXRlID0gUmVjb3JkPHN0cmluZywgYW55Pj5cbiAgZXh0ZW5kcyBFdmVudFRhcmdldCB7XG4gICNjb21wb3NlZE1pZGRsZXdhcmU/OiAoY29udGV4dDogQ29udGV4dDxBUywgQVM+KSA9PiBQcm9taXNlPHVua25vd24+O1xuICAjY29udGV4dE9wdGlvbnM6IFBpY2s8XG4gICAgQXBwbGljYXRpb25PcHRpb25zPEFTLCBTZXJ2ZXJSZXF1ZXN0PixcbiAgICBcImpzb25Cb2R5UmVwbGFjZXJcIiB8IFwianNvbkJvZHlSZXZpdmVyXCJcbiAgPjtcbiAgI2NvbnRleHRTdGF0ZTogXCJjbG9uZVwiIHwgXCJwcm90b3R5cGVcIiB8IFwiYWxpYXNcIiB8IFwiZW1wdHlcIjtcbiAgI2tleXM/OiBLZXlTdGFjaztcbiAgI21pZGRsZXdhcmU6IE1pZGRsZXdhcmVPck1pZGRsZXdhcmVPYmplY3Q8U3RhdGUsIENvbnRleHQ8U3RhdGUsIEFTPj5bXSA9IFtdO1xuICAjc2VydmVyQ29uc3RydWN0b3I6IFNlcnZlckNvbnN0cnVjdG9yPFNlcnZlclJlcXVlc3Q+IHwgdW5kZWZpbmVkO1xuXG4gIC8qKiBBIHNldCBvZiBrZXlzLCBvciBhbiBpbnN0YW5jZSBvZiBgS2V5U3RhY2tgIHdoaWNoIHdpbGwgYmUgdXNlZCB0byBzaWduXG4gICAqIGNvb2tpZXMgcmVhZCBhbmQgc2V0IGJ5IHRoZSBhcHBsaWNhdGlvbiB0byBhdm9pZCB0YW1wZXJpbmcgd2l0aCB0aGVcbiAgICogY29va2llcy4gKi9cbiAgZ2V0IGtleXMoKTogS2V5U3RhY2sgfCBLZXlbXSB8IHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMuI2tleXM7XG4gIH1cblxuICBzZXQga2V5cyhrZXlzOiBLZXlTdGFjayB8IEtleVtdIHwgdW5kZWZpbmVkKSB7XG4gICAgaWYgKCFrZXlzKSB7XG4gICAgICB0aGlzLiNrZXlzID0gdW5kZWZpbmVkO1xuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShrZXlzKSkge1xuICAgICAgdGhpcy4ja2V5cyA9IG5ldyBLZXlTdGFjayhrZXlzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy4ja2V5cyA9IGtleXM7XG4gICAgfVxuICB9XG5cbiAgLyoqIElmIGB0cnVlYCwgcHJveHkgaGVhZGVycyB3aWxsIGJlIHRydXN0ZWQgd2hlbiBwcm9jZXNzaW5nIHJlcXVlc3RzLiAgVGhpc1xuICAgKiBkZWZhdWx0cyB0byBgZmFsc2VgLiAqL1xuICBwcm94eTogYm9vbGVhbjtcblxuICAvKiogR2VuZXJpYyBzdGF0ZSBvZiB0aGUgYXBwbGljYXRpb24sIHdoaWNoIGNhbiBiZSBzcGVjaWZpZWQgYnkgcGFzc2luZyB0aGVcbiAgICogZ2VuZXJpYyBhcmd1bWVudCB3aGVuIGNvbnN0cnVjdGluZzpcbiAgICpcbiAgICogICAgICAgY29uc3QgYXBwID0gbmV3IEFwcGxpY2F0aW9uPHsgZm9vOiBzdHJpbmcgfT4oKTtcbiAgICpcbiAgICogT3IgY2FuIGJlIGNvbnRleHR1YWxseSBpbmZlcnJlZCBiYXNlZCBvbiBzZXR0aW5nIGFuIGluaXRpYWwgc3RhdGUgb2JqZWN0OlxuICAgKlxuICAgKiAgICAgICBjb25zdCBhcHAgPSBuZXcgQXBwbGljYXRpb24oeyBzdGF0ZTogeyBmb286IFwiYmFyXCIgfSB9KTtcbiAgICpcbiAgICogV2hlbiBhIG5ldyBjb250ZXh0IGlzIGNyZWF0ZWQsIHRoZSBhcHBsaWNhdGlvbidzIHN0YXRlIGlzIGNsb25lZCBhbmQgdGhlXG4gICAqIHN0YXRlIGlzIHVuaXF1ZSB0byB0aGF0IHJlcXVlc3QvcmVzcG9uc2UuICBDaGFuZ2VzIGNhbiBiZSBtYWRlIHRvIHRoZVxuICAgKiBhcHBsaWNhdGlvbiBzdGF0ZSB0aGF0IHdpbGwgYmUgc2hhcmVkIHdpdGggYWxsIGNvbnRleHRzLlxuICAgKi9cbiAgc3RhdGU6IEFTO1xuXG4gIGNvbnN0cnVjdG9yKG9wdGlvbnM6IEFwcGxpY2F0aW9uT3B0aW9uczxBUywgU2VydmVyUmVxdWVzdD4gPSB7fSkge1xuICAgIHN1cGVyKCk7XG4gICAgY29uc3Qge1xuICAgICAgc3RhdGUsXG4gICAgICBrZXlzLFxuICAgICAgcHJveHksXG4gICAgICBzZXJ2ZXJDb25zdHJ1Y3RvcixcbiAgICAgIGNvbnRleHRTdGF0ZSA9IFwiY2xvbmVcIixcbiAgICAgIGxvZ0Vycm9ycyA9IHRydWUsXG4gICAgICAuLi5jb250ZXh0T3B0aW9uc1xuICAgIH0gPSBvcHRpb25zO1xuXG4gICAgdGhpcy5wcm94eSA9IHByb3h5ID8/IGZhbHNlO1xuICAgIHRoaXMua2V5cyA9IGtleXM7XG4gICAgdGhpcy5zdGF0ZSA9IHN0YXRlID8/IHt9IGFzIEFTO1xuICAgIHRoaXMuI3NlcnZlckNvbnN0cnVjdG9yID0gc2VydmVyQ29uc3RydWN0b3I7XG4gICAgdGhpcy4jY29udGV4dE9wdGlvbnMgPSBjb250ZXh0T3B0aW9ucztcbiAgICB0aGlzLiNjb250ZXh0U3RhdGUgPSBjb250ZXh0U3RhdGU7XG5cbiAgICBpZiAobG9nRXJyb3JzKSB7XG4gICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoXCJlcnJvclwiLCBsb2dFcnJvckxpc3RlbmVyKTtcbiAgICB9XG4gIH1cblxuICAjZ2V0Q29tcG9zZWQoKTogKGNvbnRleHQ6IENvbnRleHQ8QVMsIEFTPikgPT4gUHJvbWlzZTx1bmtub3duPiB7XG4gICAgaWYgKCF0aGlzLiNjb21wb3NlZE1pZGRsZXdhcmUpIHtcbiAgICAgIHRoaXMuI2NvbXBvc2VkTWlkZGxld2FyZSA9IGNvbXBvc2UodGhpcy4jbWlkZGxld2FyZSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLiNjb21wb3NlZE1pZGRsZXdhcmU7XG4gIH1cblxuICAjZ2V0Q29udGV4dFN0YXRlKCk6IEFTIHtcbiAgICBzd2l0Y2ggKHRoaXMuI2NvbnRleHRTdGF0ZSkge1xuICAgICAgY2FzZSBcImFsaWFzXCI6XG4gICAgICAgIHJldHVybiB0aGlzLnN0YXRlO1xuICAgICAgY2FzZSBcImNsb25lXCI6XG4gICAgICAgIHJldHVybiBjbG9uZVN0YXRlKHRoaXMuc3RhdGUpO1xuICAgICAgY2FzZSBcImVtcHR5XCI6XG4gICAgICAgIHJldHVybiB7fSBhcyBBUztcbiAgICAgIGNhc2UgXCJwcm90b3R5cGVcIjpcbiAgICAgICAgcmV0dXJuIE9iamVjdC5jcmVhdGUodGhpcy5zdGF0ZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqIERlYWwgd2l0aCB1bmNhdWdodCBlcnJvcnMgaW4gZWl0aGVyIHRoZSBtaWRkbGV3YXJlIG9yIHNlbmRpbmcgdGhlXG4gICAqIHJlc3BvbnNlLiAqL1xuICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICAjaGFuZGxlRXJyb3IoY29udGV4dDogQ29udGV4dDxBUz4sIGVycm9yOiBhbnkpOiB2b2lkIHtcbiAgICBpZiAoIShlcnJvciBpbnN0YW5jZW9mIEVycm9yKSkge1xuICAgICAgZXJyb3IgPSBuZXcgRXJyb3IoYG5vbi1lcnJvciB0aHJvd246ICR7SlNPTi5zdHJpbmdpZnkoZXJyb3IpfWApO1xuICAgIH1cbiAgICBjb25zdCB7IG1lc3NhZ2UgfSA9IGVycm9yO1xuICAgIGlmICghY29udGV4dC5yZXNwb25zZS53cml0YWJsZSkge1xuICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KFxuICAgICAgICBuZXcgQXBwbGljYXRpb25FcnJvckV2ZW50KHsgY29udGV4dCwgbWVzc2FnZSwgZXJyb3IgfSksXG4gICAgICApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGtleSBvZiBbLi4uY29udGV4dC5yZXNwb25zZS5oZWFkZXJzLmtleXMoKV0pIHtcbiAgICAgIGNvbnRleHQucmVzcG9uc2UuaGVhZGVycy5kZWxldGUoa2V5KTtcbiAgICB9XG4gICAgaWYgKGVycm9yLmhlYWRlcnMgJiYgZXJyb3IuaGVhZGVycyBpbnN0YW5jZW9mIEhlYWRlcnMpIHtcbiAgICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIGVycm9yLmhlYWRlcnMpIHtcbiAgICAgICAgY29udGV4dC5yZXNwb25zZS5oZWFkZXJzLnNldChrZXksIHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgY29udGV4dC5yZXNwb25zZS50eXBlID0gXCJ0ZXh0XCI7XG4gICAgY29uc3Qgc3RhdHVzOiBTdGF0dXMgPSBjb250ZXh0LnJlc3BvbnNlLnN0YXR1cyA9XG4gICAgICBnbG9iYWxUaGlzLkRlbm8gJiYgRGVuby5lcnJvcnMgJiYgZXJyb3IgaW5zdGFuY2VvZiBEZW5vLmVycm9ycy5Ob3RGb3VuZFxuICAgICAgICA/IDQwNFxuICAgICAgICA6IGVycm9yLnN0YXR1cyAmJiB0eXBlb2YgZXJyb3Iuc3RhdHVzID09PSBcIm51bWJlclwiXG4gICAgICAgID8gZXJyb3Iuc3RhdHVzXG4gICAgICAgIDogNTAwO1xuICAgIGNvbnRleHQucmVzcG9uc2UuYm9keSA9IGVycm9yLmV4cG9zZSA/IGVycm9yLm1lc3NhZ2UgOiBTVEFUVVNfVEVYVFtzdGF0dXNdO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQXBwbGljYXRpb25FcnJvckV2ZW50KHsgY29udGV4dCwgbWVzc2FnZSwgZXJyb3IgfSkpO1xuICB9XG5cbiAgLyoqIFByb2Nlc3NpbmcgcmVnaXN0ZXJlZCBtaWRkbGV3YXJlIG9uIGVhY2ggcmVxdWVzdC4gKi9cbiAgYXN5bmMgI2hhbmRsZVJlcXVlc3QoXG4gICAgcmVxdWVzdDogU2VydmVyUmVxdWVzdCxcbiAgICBzZWN1cmU6IGJvb2xlYW4sXG4gICAgc3RhdGU6IFJlcXVlc3RTdGF0ZSxcbiAgKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgbGV0IGNvbnRleHQ6IENvbnRleHQ8QVMsIEFTPiB8IHVuZGVmaW5lZDtcbiAgICB0cnkge1xuICAgICAgY29udGV4dCA9IG5ldyBDb250ZXh0KFxuICAgICAgICB0aGlzLFxuICAgICAgICByZXF1ZXN0LFxuICAgICAgICB0aGlzLiNnZXRDb250ZXh0U3RhdGUoKSxcbiAgICAgICAgeyBzZWN1cmUsIC4uLnRoaXMuI2NvbnRleHRPcHRpb25zIH0sXG4gICAgICApO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGNvbnN0IGVycm9yID0gZSBpbnN0YW5jZW9mIEVycm9yXG4gICAgICAgID8gZVxuICAgICAgICA6IG5ldyBFcnJvcihgbm9uLWVycm9yIHRocm93bjogJHtKU09OLnN0cmluZ2lmeShlKX1gKTtcbiAgICAgIGNvbnN0IHsgbWVzc2FnZSB9ID0gZXJyb3I7XG4gICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEFwcGxpY2F0aW9uRXJyb3JFdmVudCh7IG1lc3NhZ2UsIGVycm9yIH0pKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgYXNzZXJ0KGNvbnRleHQsIFwiQ29udGV4dCB3YXMgbm90IGNyZWF0ZWQuXCIpO1xuICAgIGNvbnN0IHsgcHJvbWlzZSwgcmVzb2x2ZSB9ID0gY3JlYXRlUHJvbWlzZVdpdGhSZXNvbHZlcnM8dm9pZD4oKTtcbiAgICBzdGF0ZS5oYW5kbGluZy5hZGQocHJvbWlzZSk7XG4gICAgaWYgKCFzdGF0ZS5jbG9zaW5nICYmICFzdGF0ZS5jbG9zZWQpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IHRoaXMuI2dldENvbXBvc2VkKCkoY29udGV4dCk7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgdGhpcy4jaGFuZGxlRXJyb3IoY29udGV4dCwgZXJyKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGNvbnRleHQucmVzcG9uZCA9PT0gZmFsc2UpIHtcbiAgICAgIGNvbnRleHQucmVzcG9uc2UuZGVzdHJveSgpO1xuICAgICAgcmVzb2x2ZSEoKTtcbiAgICAgIHN0YXRlLmhhbmRsaW5nLmRlbGV0ZShwcm9taXNlKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbGV0IGNsb3NlUmVzb3VyY2VzID0gdHJ1ZTtcbiAgICBsZXQgcmVzcG9uc2U6IFJlc3BvbnNlO1xuICAgIHRyeSB7XG4gICAgICBjbG9zZVJlc291cmNlcyA9IGZhbHNlO1xuICAgICAgcmVzcG9uc2UgPSBhd2FpdCBjb250ZXh0LnJlc3BvbnNlLnRvRG9tUmVzcG9uc2UoKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHRoaXMuI2hhbmRsZUVycm9yKGNvbnRleHQsIGVycik7XG4gICAgICByZXNwb25zZSA9IGF3YWl0IGNvbnRleHQucmVzcG9uc2UudG9Eb21SZXNwb25zZSgpO1xuICAgIH1cbiAgICBhc3NlcnQocmVzcG9uc2UpO1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCByZXF1ZXN0LnJlc3BvbmQocmVzcG9uc2UpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgdGhpcy4jaGFuZGxlRXJyb3IoY29udGV4dCwgZXJyKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgY29udGV4dC5yZXNwb25zZS5kZXN0cm95KGNsb3NlUmVzb3VyY2VzKTtcbiAgICAgIHJlc29sdmUhKCk7XG4gICAgICBzdGF0ZS5oYW5kbGluZy5kZWxldGUocHJvbWlzZSk7XG4gICAgICBpZiAoc3RhdGUuY2xvc2luZykge1xuICAgICAgICBhd2FpdCBzdGF0ZS5zZXJ2ZXIuY2xvc2UoKTtcbiAgICAgICAgaWYgKCFzdGF0ZS5jbG9zZWQpIHtcbiAgICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEFwcGxpY2F0aW9uQ2xvc2VFdmVudCh7fSkpO1xuICAgICAgICB9XG4gICAgICAgIHN0YXRlLmNsb3NlZCA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqIEFkZCBhbiBldmVudCBsaXN0ZW5lciBmb3IgYSBgXCJjbG9zZVwiYCBldmVudCB3aGljaCBvY2N1cnMgd2hlbiB0aGVcbiAgICogYXBwbGljYXRpb24gaXMgY2xvc2VkIGFuZCBubyBsb25nZXIgbGlzdGVuaW5nIG9yIGhhbmRsaW5nIHJlcXVlc3RzLiAqL1xuICBvdmVycmlkZSBhZGRFdmVudExpc3RlbmVyPFMgZXh0ZW5kcyBBUz4oXG4gICAgdHlwZTogXCJjbG9zZVwiLFxuICAgIGxpc3RlbmVyOiBBcHBsaWNhdGlvbkNsb3NlRXZlbnRMaXN0ZW5lck9yRXZlbnRMaXN0ZW5lck9iamVjdCB8IG51bGwsXG4gICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyxcbiAgKTogdm9pZDtcbiAgLyoqIEFkZCBhbiBldmVudCBsaXN0ZW5lciBmb3IgYW4gYFwiZXJyb3JcImAgZXZlbnQgd2hpY2ggb2NjdXJzIHdoZW4gYW5cbiAgICogdW4tY2F1Z2h0IGVycm9yIG9jY3VycyB3aGVuIHByb2Nlc3NpbmcgdGhlIG1pZGRsZXdhcmUgb3IgZHVyaW5nIHByb2Nlc3NpbmdcbiAgICogb2YgdGhlIHJlc3BvbnNlLiAqL1xuICBvdmVycmlkZSBhZGRFdmVudExpc3RlbmVyPFMgZXh0ZW5kcyBBUz4oXG4gICAgdHlwZTogXCJlcnJvclwiLFxuICAgIGxpc3RlbmVyOiBBcHBsaWNhdGlvbkVycm9yRXZlbnRMaXN0ZW5lck9yRXZlbnRMaXN0ZW5lck9iamVjdDxTLCBBUz4gfCBudWxsLFxuICAgIG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnMsXG4gICk6IHZvaWQ7XG4gIC8qKiBBZGQgYW4gZXZlbnQgbGlzdGVuZXIgZm9yIGEgYFwibGlzdGVuXCJgIGV2ZW50IHdoaWNoIG9jY3VycyB3aGVuIHRoZSBzZXJ2ZXJcbiAgICogaGFzIHN1Y2Nlc3NmdWxseSBvcGVuZWQgYnV0IGJlZm9yZSBhbnkgcmVxdWVzdHMgc3RhcnQgYmVpbmcgcHJvY2Vzc2VkLiAqL1xuICBvdmVycmlkZSBhZGRFdmVudExpc3RlbmVyKFxuICAgIHR5cGU6IFwibGlzdGVuXCIsXG4gICAgbGlzdGVuZXI6IEFwcGxpY2F0aW9uTGlzdGVuRXZlbnRMaXN0ZW5lck9yRXZlbnRMaXN0ZW5lck9iamVjdCB8IG51bGwsXG4gICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyxcbiAgKTogdm9pZDtcbiAgLyoqIEFkZCBhbiBldmVudCBsaXN0ZW5lciBmb3IgYW4gZXZlbnQuICBDdXJyZW50bHkgdmFsaWQgZXZlbnQgdHlwZXMgYXJlXG4gICAqIGBcImVycm9yXCJgIGFuZCBgXCJsaXN0ZW5cImAuICovXG4gIG92ZXJyaWRlIGFkZEV2ZW50TGlzdGVuZXIoXG4gICAgdHlwZTogXCJjbG9zZVwiIHwgXCJlcnJvclwiIHwgXCJsaXN0ZW5cIixcbiAgICBsaXN0ZW5lcjogRXZlbnRMaXN0ZW5lck9yRXZlbnRMaXN0ZW5lck9iamVjdCB8IG51bGwsXG4gICAgb3B0aW9ucz86IGJvb2xlYW4gfCBBZGRFdmVudExpc3RlbmVyT3B0aW9ucyxcbiAgKTogdm9pZCB7XG4gICAgc3VwZXIuYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lciwgb3B0aW9ucyk7XG4gIH1cblxuICAvKiogQSBtZXRob2QgdGhhdCBpcyBjb21wYXRpYmxlIHdpdGggdGhlIENsb3VkZmxhcmUgV29ya2VyXG4gICAqIFtGZXRjaCBIYW5kbGVyXShodHRwczovL2RldmVsb3BlcnMuY2xvdWRmbGFyZS5jb20vd29ya2Vycy9ydW50aW1lLWFwaXMvaGFuZGxlcnMvZmV0Y2gvKVxuICAgKiBhbmQgY2FuIGJlIGV4cG9ydGVkIHRvIGhhbmRsZSBDbG91ZGZsYXJlIFdvcmtlciBmZXRjaCByZXF1ZXN0cy5cbiAgICpcbiAgICogIyBFeGFtcGxlXG4gICAqXG4gICAqIGBgYHRzXG4gICAqIGltcG9ydCB7IEFwcGxpY2F0aW9uIH0gZnJvbSBcIkBvYWsvb2FrXCI7XG4gICAqXG4gICAqIGNvbnN0IGFwcCA9IG5ldyBBcHBsaWNhdGlvbigpO1xuICAgKiBhcHAudXNlKChjdHgpID0+IHtcbiAgICogICBjdHgucmVzcG9uc2UuYm9keSA9IFwiaGVsbG8gd29ybGQhXCI7XG4gICAqIH0pO1xuICAgKlxuICAgKiBleHBvcnQgZGVmYXVsdCB7IGZldGNoOiBhcHAuZmV0Y2ggfTtcbiAgICogYGBgXG4gICAqL1xuICBmZXRjaDogQ2xvdWRmbGFyZUZldGNoSGFuZGxlciA9IGFzeW5jIDxcbiAgICBFbnYgZXh0ZW5kcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0gUmVjb3JkPHN0cmluZywgc3RyaW5nPixcbiAgPihcbiAgICByZXF1ZXN0OiBSZXF1ZXN0LFxuICAgIF9lbnY6IEVudixcbiAgICBfY3R4OiBDbG91ZGZsYXJlRXhlY3V0aW9uQ29udGV4dCxcbiAgKTogUHJvbWlzZTxSZXNwb25zZT4gPT4ge1xuICAgIGlmICghdGhpcy4jbWlkZGxld2FyZS5sZW5ndGgpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJUaGVyZSBpcyBubyBtaWRkbGV3YXJlIHRvIHByb2Nlc3MgcmVxdWVzdHMuXCIpO1xuICAgIH1cbiAgICBpZiAoIU5hdGl2ZVJlcXVlc3RDdG9yKSB7XG4gICAgICBjb25zdCB7IE5hdGl2ZVJlcXVlc3QgfSA9IGF3YWl0IGltcG9ydChcIi4vaHR0cF9zZXJ2ZXJfbmF0aXZlX3JlcXVlc3QudHNcIik7XG4gICAgICBOYXRpdmVSZXF1ZXN0Q3RvciA9IE5hdGl2ZVJlcXVlc3Q7XG4gICAgfVxuICAgIGxldCByZW1vdGVBZGRyOiBOZXRBZGRyIHwgdW5kZWZpbmVkO1xuICAgIGNvbnN0IGhvc3RuYW1lID0gcmVxdWVzdC5oZWFkZXJzLmdldChcIkNGLUNvbm5lY3RpbmctSVBcIikgPz8gdW5kZWZpbmVkO1xuICAgIGlmIChob3N0bmFtZSkge1xuICAgICAgcmVtb3RlQWRkciA9IHsgaG9zdG5hbWUsIHBvcnQ6IDAsIHRyYW5zcG9ydDogXCJ0Y3BcIiB9O1xuICAgIH1cbiAgICBjb25zdCBjb250ZXh0UmVxdWVzdCA9IG5ldyBOYXRpdmVSZXF1ZXN0Q3RvcihyZXF1ZXN0LCB7IHJlbW90ZUFkZHIgfSk7XG4gICAgY29uc3QgY29udGV4dCA9IG5ldyBDb250ZXh0KFxuICAgICAgdGhpcyxcbiAgICAgIGNvbnRleHRSZXF1ZXN0LFxuICAgICAgdGhpcy4jZ2V0Q29udGV4dFN0YXRlKCksXG4gICAgICB0aGlzLiNjb250ZXh0T3B0aW9ucyxcbiAgICApO1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLiNnZXRDb21wb3NlZCgpKGNvbnRleHQpO1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBjb250ZXh0LnJlc3BvbnNlLnRvRG9tUmVzcG9uc2UoKTtcbiAgICAgIGNvbnRleHQucmVzcG9uc2UuZGVzdHJveShmYWxzZSk7XG4gICAgICByZXR1cm4gcmVzcG9uc2U7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICB0aGlzLiNoYW5kbGVFcnJvcihjb250ZXh0LCBlcnIpO1xuICAgICAgdGhyb3cgZXJyO1xuICAgIH1cbiAgfTtcblxuICAvKiogSGFuZGxlIGFuIGluZGl2aWR1YWwgc2VydmVyIHJlcXVlc3QsIHJldHVybmluZyB0aGUgc2VydmVyIHJlc3BvbnNlLiAgVGhpc1xuICAgKiBpcyBzaW1pbGFyIHRvIGAubGlzdGVuKClgLCBidXQgb3BlbmluZyB0aGUgY29ubmVjdGlvbiBhbmQgcmV0cmlldmluZ1xuICAgKiByZXF1ZXN0cyBhcmUgbm90IHRoZSByZXNwb25zaWJpbGl0eSBvZiB0aGUgYXBwbGljYXRpb24uICBJZiB0aGUgZ2VuZXJhdGVkXG4gICAqIGNvbnRleHQgZ2V0cyBzZXQgdG8gbm90IHRvIHJlc3BvbmQsIHRoZW4gdGhlIG1ldGhvZCByZXNvbHZlcyB3aXRoXG4gICAqIGB1bmRlZmluZWRgLCBvdGhlcndpc2UgaXQgcmVzb2x2ZXMgd2l0aCBhIHN0YW5kYXJkIHtAbGlua2NvZGUgUmVzcG9uc2V9LiAqL1xuICBoYW5kbGU6IEhhbmRsZU1ldGhvZCA9IChhc3luYyAoXG4gICAgcmVxdWVzdDogUmVxdWVzdCxcbiAgICBzZWN1cmVPckFkZHI6IE5ldEFkZHIgfCBib29sZWFuIHwgdW5kZWZpbmVkLFxuICAgIHNlY3VyZTogYm9vbGVhbiB8IHVuZGVmaW5lZCA9IGZhbHNlLFxuICApOiBQcm9taXNlPFJlc3BvbnNlIHwgdW5kZWZpbmVkPiA9PiB7XG4gICAgaWYgKCF0aGlzLiNtaWRkbGV3YXJlLmxlbmd0aCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlRoZXJlIGlzIG5vIG1pZGRsZXdhcmUgdG8gcHJvY2VzcyByZXF1ZXN0cy5cIik7XG4gICAgfVxuICAgIGFzc2VydChpc05ldEFkZHIoc2VjdXJlT3JBZGRyKSB8fCB0eXBlb2Ygc2VjdXJlT3JBZGRyID09PSBcInVuZGVmaW5lZFwiKTtcbiAgICBpZiAoIU5hdGl2ZVJlcXVlc3RDdG9yKSB7XG4gICAgICBjb25zdCB7IE5hdGl2ZVJlcXVlc3QgfSA9IGF3YWl0IGltcG9ydChcIi4vaHR0cF9zZXJ2ZXJfbmF0aXZlX3JlcXVlc3QudHNcIik7XG4gICAgICBOYXRpdmVSZXF1ZXN0Q3RvciA9IE5hdGl2ZVJlcXVlc3Q7XG4gICAgfVxuICAgIGNvbnN0IGNvbnRleHRSZXF1ZXN0ID0gbmV3IE5hdGl2ZVJlcXVlc3RDdG9yKHJlcXVlc3QsIHtcbiAgICAgIHJlbW90ZUFkZHI6IHNlY3VyZU9yQWRkcixcbiAgICB9KTtcbiAgICBjb25zdCBjb250ZXh0ID0gbmV3IENvbnRleHQoXG4gICAgICB0aGlzLFxuICAgICAgY29udGV4dFJlcXVlc3QsXG4gICAgICB0aGlzLiNnZXRDb250ZXh0U3RhdGUoKSxcbiAgICAgIHsgc2VjdXJlLCAuLi50aGlzLiNjb250ZXh0T3B0aW9ucyB9LFxuICAgICk7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMuI2dldENvbXBvc2VkKCkoY29udGV4dCk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICB0aGlzLiNoYW5kbGVFcnJvcihjb250ZXh0LCBlcnIpO1xuICAgIH1cbiAgICBpZiAoY29udGV4dC5yZXNwb25kID09PSBmYWxzZSkge1xuICAgICAgY29udGV4dC5yZXNwb25zZS5kZXN0cm95KCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGNvbnRleHQucmVzcG9uc2UudG9Eb21SZXNwb25zZSgpO1xuICAgICAgY29udGV4dC5yZXNwb25zZS5kZXN0cm95KGZhbHNlKTtcbiAgICAgIHJldHVybiByZXNwb25zZTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHRoaXMuI2hhbmRsZUVycm9yKGNvbnRleHQsIGVycik7XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfVxuICB9KTtcblxuICAvKiogU3RhcnQgbGlzdGVuaW5nIGZvciByZXF1ZXN0cywgcHJvY2Vzc2luZyByZWdpc3RlcmVkIG1pZGRsZXdhcmUgb24gZWFjaFxuICAgKiByZXF1ZXN0LiAgSWYgdGhlIG9wdGlvbnMgYC5zZWN1cmVgIGlzIHVuZGVmaW5lZCBvciBgZmFsc2VgLCB0aGUgbGlzdGVuaW5nXG4gICAqIHdpbGwgYmUgb3ZlciBIVFRQLiAgSWYgdGhlIG9wdGlvbnMgYC5zZWN1cmVgIHByb3BlcnR5IGlzIGB0cnVlYCwgYVxuICAgKiBgLmNlcnRGaWxlYCBhbmQgYSBgLmtleUZpbGVgIHByb3BlcnR5IG5lZWQgdG8gYmUgc3VwcGxpZWQgYW5kIHJlcXVlc3RzXG4gICAqIHdpbGwgYmUgcHJvY2Vzc2VkIG92ZXIgSFRUUFMuICovXG4gIGFzeW5jIGxpc3RlbihhZGRyOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+O1xuICAvKiogU3RhcnQgbGlzdGVuaW5nIGZvciByZXF1ZXN0cywgcHJvY2Vzc2luZyByZWdpc3RlcmVkIG1pZGRsZXdhcmUgb24gZWFjaFxuICAgKiByZXF1ZXN0LiAgSWYgdGhlIG9wdGlvbnMgYC5zZWN1cmVgIGlzIHVuZGVmaW5lZCBvciBgZmFsc2VgLCB0aGUgbGlzdGVuaW5nXG4gICAqIHdpbGwgYmUgb3ZlciBIVFRQLiAgSWYgdGhlIG9wdGlvbnMgYC5zZWN1cmVgIHByb3BlcnR5IGlzIGB0cnVlYCwgYVxuICAgKiBgLmNlcnRGaWxlYCBhbmQgYSBgLmtleUZpbGVgIHByb3BlcnR5IG5lZWQgdG8gYmUgc3VwcGxpZWQgYW5kIHJlcXVlc3RzXG4gICAqIHdpbGwgYmUgcHJvY2Vzc2VkIG92ZXIgSFRUUFMuXG4gICAqXG4gICAqIE9taXR0aW5nIG9wdGlvbnMgd2lsbCBkZWZhdWx0IHRvIGB7IHBvcnQ6IDAgfWAgd2hpY2ggYWxsb3dzIHRoZSBvcGVyYXRpbmdcbiAgICogc3lzdGVtIHRvIHNlbGVjdCB0aGUgcG9ydC4gKi9cbiAgYXN5bmMgbGlzdGVuKG9wdGlvbnM/OiBMaXN0ZW5PcHRpb25zKTogUHJvbWlzZTx2b2lkPjtcbiAgYXN5bmMgbGlzdGVuKG9wdGlvbnM6IHN0cmluZyB8IExpc3Rlbk9wdGlvbnMgPSB7IHBvcnQ6IDAgfSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICghdGhpcy4jbWlkZGxld2FyZS5sZW5ndGgpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJUaGVyZSBpcyBubyBtaWRkbGV3YXJlIHRvIHByb2Nlc3MgcmVxdWVzdHMuXCIpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IG1pZGRsZXdhcmUgb2YgdGhpcy4jbWlkZGxld2FyZSkge1xuICAgICAgaWYgKGlzTWlkZGxld2FyZU9iamVjdChtaWRkbGV3YXJlKSAmJiBtaWRkbGV3YXJlLmluaXQpIHtcbiAgICAgICAgYXdhaXQgbWlkZGxld2FyZS5pbml0KCk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgY29uc3QgbWF0Y2ggPSBBRERSX1JFR0VYUC5leGVjKG9wdGlvbnMpO1xuICAgICAgaWYgKCFtYXRjaCkge1xuICAgICAgICB0aHJvdyBUeXBlRXJyb3IoYEludmFsaWQgYWRkcmVzcyBwYXNzZWQ6IFwiJHtvcHRpb25zfVwiYCk7XG4gICAgICB9XG4gICAgICBjb25zdCBbLCBob3N0bmFtZSwgcG9ydFN0cl0gPSBtYXRjaDtcbiAgICAgIG9wdGlvbnMgPSB7IGhvc3RuYW1lLCBwb3J0OiBwYXJzZUludChwb3J0U3RyLCAxMCkgfTtcbiAgICB9XG4gICAgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oeyBwb3J0OiAwIH0sIG9wdGlvbnMpO1xuICAgIGlmICghdGhpcy4jc2VydmVyQ29uc3RydWN0b3IpIHtcbiAgICAgIGlmICghRGVmYXVsdFNlcnZlckN0b3IpIHtcbiAgICAgICAgY29uc3QgeyBTZXJ2ZXIgfSA9IGF3YWl0IChpc0J1bigpXG4gICAgICAgICAgPyBpbXBvcnQoXCIuL2h0dHBfc2VydmVyX2J1bi50c1wiKVxuICAgICAgICAgIDogaXNOb2RlKClcbiAgICAgICAgICA/IGltcG9ydChcIi4vaHR0cF9zZXJ2ZXJfbm9kZS50c1wiKVxuICAgICAgICAgIDogaW1wb3J0KFwiLi9odHRwX3NlcnZlcl9uYXRpdmUudHNcIikpO1xuICAgICAgICBEZWZhdWx0U2VydmVyQ3RvciA9IFNlcnZlciBhcyBTZXJ2ZXJDb25zdHJ1Y3RvcjxTZXJ2ZXJSZXF1ZXN0PjtcbiAgICAgIH1cbiAgICAgIHRoaXMuI3NlcnZlckNvbnN0cnVjdG9yID0gRGVmYXVsdFNlcnZlckN0b3I7XG4gICAgfVxuICAgIGNvbnN0IHNlcnZlciA9IG5ldyB0aGlzLiNzZXJ2ZXJDb25zdHJ1Y3Rvcih0aGlzLCBvcHRpb25zKTtcbiAgICBjb25zdCBzdGF0ZSA9IHtcbiAgICAgIGNsb3NlZDogZmFsc2UsXG4gICAgICBjbG9zaW5nOiBmYWxzZSxcbiAgICAgIGhhbmRsaW5nOiBuZXcgU2V0PFByb21pc2U8dm9pZD4+KCksXG4gICAgICBzZXJ2ZXIsXG4gICAgfTtcbiAgICBjb25zdCB7IHNpZ25hbCB9ID0gb3B0aW9ucztcbiAgICBpZiAoc2lnbmFsKSB7XG4gICAgICBzaWduYWwuYWRkRXZlbnRMaXN0ZW5lcihcImFib3J0XCIsICgpID0+IHtcbiAgICAgICAgaWYgKCFzdGF0ZS5oYW5kbGluZy5zaXplKSB7XG4gICAgICAgICAgc3RhdGUuY2xvc2VkID0gdHJ1ZTtcbiAgICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEFwcGxpY2F0aW9uQ2xvc2VFdmVudCh7fSkpO1xuICAgICAgICB9XG4gICAgICAgIHN0YXRlLmNsb3NpbmcgPSB0cnVlO1xuICAgICAgfSwgeyBvbmNlOiB0cnVlIH0pO1xuICAgIH1cbiAgICBjb25zdCB7IHNlY3VyZSA9IGZhbHNlIH0gPSBvcHRpb25zO1xuICAgIGNvbnN0IHNlcnZlclR5cGUgPSB0aGlzLiNzZXJ2ZXJDb25zdHJ1Y3Rvci50eXBlID8/IFwiY3VzdG9tXCI7XG4gICAgY29uc3QgbGlzdGVuZXIgPSBhd2FpdCBzZXJ2ZXIubGlzdGVuKCk7XG4gICAgY29uc3QgeyBob3N0bmFtZSwgcG9ydCB9ID0gbGlzdGVuZXIuYWRkcjtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQoXG4gICAgICBuZXcgQXBwbGljYXRpb25MaXN0ZW5FdmVudCh7XG4gICAgICAgIGhvc3RuYW1lLFxuICAgICAgICBsaXN0ZW5lcixcbiAgICAgICAgcG9ydCxcbiAgICAgICAgc2VjdXJlLFxuICAgICAgICBzZXJ2ZXJUeXBlLFxuICAgICAgfSksXG4gICAgKTtcbiAgICB0cnkge1xuICAgICAgZm9yIGF3YWl0IChjb25zdCByZXF1ZXN0IG9mIHNlcnZlcikge1xuICAgICAgICB0aGlzLiNoYW5kbGVSZXF1ZXN0KHJlcXVlc3QsIHNlY3VyZSwgc3RhdGUpO1xuICAgICAgfVxuICAgICAgYXdhaXQgUHJvbWlzZS5hbGwoc3RhdGUuaGFuZGxpbmcpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zdCBtZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvclxuICAgICAgICA/IGVycm9yLm1lc3NhZ2VcbiAgICAgICAgOiBcIkFwcGxpY2F0aW9uIEVycm9yXCI7XG4gICAgICB0aGlzLmRpc3BhdGNoRXZlbnQoXG4gICAgICAgIG5ldyBBcHBsaWNhdGlvbkVycm9yRXZlbnQoeyBtZXNzYWdlLCBlcnJvciB9KSxcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgLyoqIFJlZ2lzdGVyIG1pZGRsZXdhcmUgdG8gYmUgdXNlZCB3aXRoIHRoZSBhcHBsaWNhdGlvbi4gIE1pZGRsZXdhcmUgd2lsbFxuICAgKiBiZSBwcm9jZXNzZWQgaW4gdGhlIG9yZGVyIGl0IGlzIGFkZGVkLCBidXQgbWlkZGxld2FyZSBjYW4gY29udHJvbCB0aGUgZmxvd1xuICAgKiBvZiBleGVjdXRpb24gdmlhIHRoZSB1c2Ugb2YgdGhlIGBuZXh0KClgIGZ1bmN0aW9uIHRoYXQgdGhlIG1pZGRsZXdhcmVcbiAgICogZnVuY3Rpb24gd2lsbCBiZSBjYWxsZWQgd2l0aC4gIFRoZSBgY29udGV4dGAgb2JqZWN0IHByb3ZpZGVzIGluZm9ybWF0aW9uXG4gICAqIGFib3V0IHRoZSBjdXJyZW50IHN0YXRlIG9mIHRoZSBhcHBsaWNhdGlvbi5cbiAgICpcbiAgICogQmFzaWMgdXNhZ2U6XG4gICAqXG4gICAqIGBgYHRzXG4gICAqIGNvbnN0IGltcG9ydCB7IEFwcGxpY2F0aW9uIH0gZnJvbSBcImpzcjpAb2FrL29hay9hcHBsaWNhdGlvblwiO1xuICAgKlxuICAgKiBjb25zdCBhcHAgPSBuZXcgQXBwbGljYXRpb24oKTtcbiAgICpcbiAgICogYXBwLnVzZSgoY3R4LCBuZXh0KSA9PiB7XG4gICAqICAgY3R4LnJlcXVlc3Q7IC8vIGNvbnRhaW5zIHJlcXVlc3QgaW5mb3JtYXRpb25cbiAgICogICBjdHgucmVzcG9uc2U7IC8vIHNldHVwcyB1cCBpbmZvcm1hdGlvbiB0byB1c2UgaW4gdGhlIHJlc3BvbnNlO1xuICAgKiAgIGF3YWl0IG5leHQoKTsgLy8gbWFuYWdlcyB0aGUgZmxvdyBjb250cm9sIG9mIHRoZSBtaWRkbGV3YXJlIGV4ZWN1dGlvblxuICAgKiB9KTtcbiAgICpcbiAgICogYXdhaXQgYXBwLmxpc3Rlbih7IHBvcnQ6IDgwIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIHVzZTxTIGV4dGVuZHMgU3RhdGUgPSBBUz4oXG4gICAgbWlkZGxld2FyZTogTWlkZGxld2FyZU9yTWlkZGxld2FyZU9iamVjdDxTLCBDb250ZXh0PFMsIEFTPj4sXG4gICAgLi4ubWlkZGxld2FyZXM6IE1pZGRsZXdhcmVPck1pZGRsZXdhcmVPYmplY3Q8UywgQ29udGV4dDxTLCBBUz4+W11cbiAgKTogQXBwbGljYXRpb248UyBleHRlbmRzIEFTID8gUyA6IChTICYgQVMpPjtcbiAgdXNlPFMgZXh0ZW5kcyBTdGF0ZSA9IEFTPihcbiAgICAuLi5taWRkbGV3YXJlOiBNaWRkbGV3YXJlT3JNaWRkbGV3YXJlT2JqZWN0PFMsIENvbnRleHQ8UywgQVM+PltdXG4gICk6IEFwcGxpY2F0aW9uPFMgZXh0ZW5kcyBBUyA/IFMgOiAoUyAmIEFTKT4ge1xuICAgIHRoaXMuI21pZGRsZXdhcmUucHVzaCguLi5taWRkbGV3YXJlKTtcbiAgICB0aGlzLiNjb21wb3NlZE1pZGRsZXdhcmUgPSB1bmRlZmluZWQ7XG4gICAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgICByZXR1cm4gdGhpcyBhcyBBcHBsaWNhdGlvbjxhbnk+O1xuICB9XG5cbiAgW1N5bWJvbC5mb3IoXCJEZW5vLmN1c3RvbUluc3BlY3RcIildKFxuICAgIGluc3BlY3Q6ICh2YWx1ZTogdW5rbm93bikgPT4gc3RyaW5nLFxuICApOiBzdHJpbmcge1xuICAgIGNvbnN0IHsga2V5cywgcHJveHksIHN0YXRlIH0gPSB0aGlzO1xuICAgIHJldHVybiBgJHt0aGlzLmNvbnN0cnVjdG9yLm5hbWV9ICR7XG4gICAgICBpbnNwZWN0KHsgXCIjbWlkZGxld2FyZVwiOiB0aGlzLiNtaWRkbGV3YXJlLCBrZXlzLCBwcm94eSwgc3RhdGUgfSlcbiAgICB9YDtcbiAgfVxuXG4gIFtTeW1ib2wuZm9yKFwibm9kZWpzLnV0aWwuaW5zcGVjdC5jdXN0b21cIildKFxuICAgIGRlcHRoOiBudW1iZXIsXG4gICAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgICBvcHRpb25zOiBhbnksXG4gICAgaW5zcGVjdDogKHZhbHVlOiB1bmtub3duLCBvcHRpb25zPzogdW5rbm93bikgPT4gc3RyaW5nLFxuICAgIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gICk6IGFueSB7XG4gICAgaWYgKGRlcHRoIDwgMCkge1xuICAgICAgcmV0dXJuIG9wdGlvbnMuc3R5bGl6ZShgWyR7dGhpcy5jb25zdHJ1Y3Rvci5uYW1lfV1gLCBcInNwZWNpYWxcIik7XG4gICAgfVxuXG4gICAgY29uc3QgbmV3T3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMsIHtcbiAgICAgIGRlcHRoOiBvcHRpb25zLmRlcHRoID09PSBudWxsID8gbnVsbCA6IG9wdGlvbnMuZGVwdGggLSAxLFxuICAgIH0pO1xuICAgIGNvbnN0IHsga2V5cywgcHJveHksIHN0YXRlIH0gPSB0aGlzO1xuICAgIHJldHVybiBgJHtvcHRpb25zLnN0eWxpemUodGhpcy5jb25zdHJ1Y3Rvci5uYW1lLCBcInNwZWNpYWxcIil9ICR7XG4gICAgICBpbnNwZWN0KFxuICAgICAgICB7IFwiI21pZGRsZXdhcmVcIjogdGhpcy4jbWlkZGxld2FyZSwga2V5cywgcHJveHksIHN0YXRlIH0sXG4gICAgICAgIG5ld09wdGlvbnMsXG4gICAgICApXG4gICAgfWA7XG4gIH1cbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSx5RUFBeUU7QUFFekU7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0FtQkM7QUFFRCxTQUFTLE9BQU8sUUFBUSxlQUFlO0FBQ3ZDLFNBQVMsTUFBTSxFQUFFLFFBQVEsRUFBZSxXQUFXLFFBQVEsWUFBWTtBQUV2RSxTQUNFLE9BQU8sRUFDUCxrQkFBa0IsUUFFYixrQkFBa0I7QUFDekIsU0FBUyxVQUFVLFFBQVEseUJBQXlCO0FBQ3BELFNBQVMsMEJBQTBCLFFBQVEsMkNB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
// denoCacheMetadata=14371058739476636139,9608059439655656011