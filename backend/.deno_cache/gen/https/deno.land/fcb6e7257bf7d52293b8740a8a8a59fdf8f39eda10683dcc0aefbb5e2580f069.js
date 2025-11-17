// Copyright 2018-2025 the oak authors. All rights reserved. MIT license.
/** Middleware that converts the oak specific context to a Fetch API standard
 * {@linkcode Request} and {@linkcode Response} along with a modified context
 * providing some of the oak functionality. This is intended to make it easier
 * to adapt code to work with oak.
 *
 * There are two functions which will "wrap" a handler that operates off a
 * Fetch API request and response and return an oak middleware. The
 * {@linkcode serve} is designed for using with the {@linkcode Application}
 * `.use()` method, while {@linkcode route} is designed for using with the
 * {@linkcode Router}.
 *
 * > [!IMPORTANT]
 * > This is not intended for advanced use cases that are supported by oak,
 * > like integrated cookie management, web sockets and server sent events.
 * >
 * > Also, these are designed to be very deterministic request/response handlers
 * > versus a more nuanced middleware stack which allows advanced control.
 * > Therefore there is no `next()`.
 * >
 * > For these advanced use cases, create middleware without the wrapper.
 *
 * @module
 */ var _computedKey, _computedKey1, _computedKey2, _computedKey3;
_computedKey = Symbol.for("Deno.customInspect"), _computedKey1 = Symbol.for("nodejs.util.inspect.custom");
/** The context associated when dealing with serve middleware requests on an
 * application. */ export class ServeContext {
  #context;
  /** A reference to the current application. */ get app() {
    return this.#context.app;
  }
  /** Request remote address. When the application's `.proxy` is true, the
   * `X-Forwarded-For` will be used to determine the requesting remote address.
   */ get ip() {
    return this.#context.request.ip;
  }
  /** When the application's `.proxy` is `true`, this will be set to an array of
   * IPs, ordered from upstream to downstream, based on the value of the header
   * `X-Forwarded-For`.  When `false` an empty array is returned. */ get ips() {
    return this.#context.request.ips;
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
   */ get state() {
    return this.#context.state;
  }
  constructor(context){
    this.#context = context;
  }
  /** Asserts the condition and if the condition fails, creates an HTTP error
   * with the provided status (which defaults to `500`).  The error status by
   * default will be set on the `.response.status`.
   *
   * Because of limitation of TypeScript, any assertion type function requires
   * specific type annotations, so the {@linkcode ServeContext} type should be
   * used even if it can be inferred from the context.
   */ assert(condition, status, message, props) {
    this.#context.assert(condition, status, message, props);
  }
  /** Create and throw an HTTP Error, which can be used to pass status
   * information which can be caught by other middleware to send more
   * meaningful error messages back to the client.  The passed error status will
   * be set on the `.response.status` by default as well.
   */ throw(errorStatus, message, props) {
    this.#context.throw(errorStatus, message, props);
  }
  [_computedKey](inspect) {
    const { app, ip, ips, state } = this;
    return `${this.constructor.name} ${inspect({
      app,
      ip,
      ips,
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
    const { app, ip, ips, state } = this;
    return `${options.stylize(this.constructor.name, "special")} ${inspect({
      app,
      ip,
      ips,
      state
    }, newOptions)}`;
  }
}
_computedKey2 = Symbol.for("Deno.customInspect"), _computedKey3 = Symbol.for("nodejs.util.inspect.custom");
/** The context associated with serve middleware requests on a router. */ export class RouteContext extends ServeContext {
  #captures;
  #matched;
  #params;
  #router;
  #routeName;
  #routerPath;
  /** When matching the route, an array of the capturing groups from the regular
   * expression. */ get captures() {
    return this.#captures;
  }
  /** The routes that were matched for this request. */ get matched() {
    return this.#matched;
  }
  /** Any parameters parsed from the route when matched. */ get params() {
    return this.#params;
  }
  /** A reference to the router instance. */ get router() {
    return this.#router;
  }
  /** If the matched route has a `name`, the matched route name is provided
   * here. */ get routeName() {
    return this.#routeName;
  }
  /** Overrides the matched path for future route middleware, when a
   * `routerPath` option is not defined on the `Router` options. */ get routerPath() {
    return this.#routerPath;
  }
  constructor(context){
    super(context);
    const { captures, matched, params, router, routeName, routerPath } = context;
    this.#captures = captures;
    this.#matched = matched;
    this.#params = params;
    this.#router = router;
    this.#routeName = routeName;
    this.#routerPath = routerPath;
  }
  [_computedKey2](inspect) {
    const { app, captures, matched, ip, ips, params, router, routeName, routerPath, state } = this;
    return `${this.constructor.name} ${inspect({
      app,
      captures,
      matched,
      ip,
      ips,
      params,
      router,
      routeName,
      routerPath,
      state
    })}`;
  }
  [_computedKey3](depth, // deno-lint-ignore no-explicit-any
  options, inspect) {
    if (depth < 0) {
      return options.stylize(`[${this.constructor.name}]`, "special");
    }
    const newOptions = Object.assign({}, options, {
      depth: options.depth === null ? null : options.depth - 1
    });
    const { app, captures, matched, ip, ips, params, router, routeName, routerPath, state } = this;
    return `${options.stylize(this.constructor.name, "special")} ${inspect({
      app,
      captures,
      matched,
      ip,
      ips,
      params,
      router,
      routeName,
      routerPath,
      state
    }, newOptions)}`;
  }
}
/** Wrap a handler function to generate middleware that can be used with an oak
 * {@linkcode Application}. This allows the handler to deal with a Fetch API
 * standard {@linkcode Request} and return a standard {@linkcode Response}.
 */ export function serve(middleware) {
  return async (ctx, next)=>{
    const request = ctx.request.source ?? new Request(ctx.request.url, {
      ...ctx.request,
      body: ctx.request.body.stream
    });
    const context = new ServeContext(ctx);
    const response = await middleware(request, context);
    ctx.response.with(response);
    return next();
  };
}
/** Wrap a handler function to generate middleware that can be used with an oak
 * {@linkcode Router}. This allows the handler to deal with a Fetch API standard
 * {@linkcode Request} and return a standard {@linkcode Response}.
 */ export function route(middleware) {
  return async (ctx, next)=>{
    const request = ctx.request.source ?? new Request(ctx.request.url, {
      ...ctx.request,
      body: ctx.request.body.stream
    });
    const context = new RouteContext(ctx);
    const response = await middleware(request, context);
    ctx.response.with(response);
    return next();
  };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvb2FrQHYxNy4xLjYvbWlkZGxld2FyZS9zZXJ2ZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDI1IHRoZSBvYWsgYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIGxpY2Vuc2UuXG5cbi8qKiBNaWRkbGV3YXJlIHRoYXQgY29udmVydHMgdGhlIG9hayBzcGVjaWZpYyBjb250ZXh0IHRvIGEgRmV0Y2ggQVBJIHN0YW5kYXJkXG4gKiB7QGxpbmtjb2RlIFJlcXVlc3R9IGFuZCB7QGxpbmtjb2RlIFJlc3BvbnNlfSBhbG9uZyB3aXRoIGEgbW9kaWZpZWQgY29udGV4dFxuICogcHJvdmlkaW5nIHNvbWUgb2YgdGhlIG9hayBmdW5jdGlvbmFsaXR5LiBUaGlzIGlzIGludGVuZGVkIHRvIG1ha2UgaXQgZWFzaWVyXG4gKiB0byBhZGFwdCBjb2RlIHRvIHdvcmsgd2l0aCBvYWsuXG4gKlxuICogVGhlcmUgYXJlIHR3byBmdW5jdGlvbnMgd2hpY2ggd2lsbCBcIndyYXBcIiBhIGhhbmRsZXIgdGhhdCBvcGVyYXRlcyBvZmYgYVxuICogRmV0Y2ggQVBJIHJlcXVlc3QgYW5kIHJlc3BvbnNlIGFuZCByZXR1cm4gYW4gb2FrIG1pZGRsZXdhcmUuIFRoZVxuICoge0BsaW5rY29kZSBzZXJ2ZX0gaXMgZGVzaWduZWQgZm9yIHVzaW5nIHdpdGggdGhlIHtAbGlua2NvZGUgQXBwbGljYXRpb259XG4gKiBgLnVzZSgpYCBtZXRob2QsIHdoaWxlIHtAbGlua2NvZGUgcm91dGV9IGlzIGRlc2lnbmVkIGZvciB1c2luZyB3aXRoIHRoZVxuICoge0BsaW5rY29kZSBSb3V0ZXJ9LlxuICpcbiAqID4gWyFJTVBPUlRBTlRdXG4gKiA+IFRoaXMgaXMgbm90IGludGVuZGVkIGZvciBhZHZhbmNlZCB1c2UgY2FzZXMgdGhhdCBhcmUgc3VwcG9ydGVkIGJ5IG9hayxcbiAqID4gbGlrZSBpbnRlZ3JhdGVkIGNvb2tpZSBtYW5hZ2VtZW50LCB3ZWIgc29ja2V0cyBhbmQgc2VydmVyIHNlbnQgZXZlbnRzLlxuICogPlxuICogPiBBbHNvLCB0aGVzZSBhcmUgZGVzaWduZWQgdG8gYmUgdmVyeSBkZXRlcm1pbmlzdGljIHJlcXVlc3QvcmVzcG9uc2UgaGFuZGxlcnNcbiAqID4gdmVyc3VzIGEgbW9yZSBudWFuY2VkIG1pZGRsZXdhcmUgc3RhY2sgd2hpY2ggYWxsb3dzIGFkdmFuY2VkIGNvbnRyb2wuXG4gKiA+IFRoZXJlZm9yZSB0aGVyZSBpcyBubyBgbmV4dCgpYC5cbiAqID5cbiAqID4gRm9yIHRoZXNlIGFkdmFuY2VkIHVzZSBjYXNlcywgY3JlYXRlIG1pZGRsZXdhcmUgd2l0aG91dCB0aGUgd3JhcHBlci5cbiAqXG4gKiBAbW9kdWxlXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBBcHBsaWNhdGlvbiwgU3RhdGUgfSBmcm9tIFwiLi4vYXBwbGljYXRpb24udHNcIjtcbmltcG9ydCB0eXBlIHsgQ29udGV4dCB9IGZyb20gXCIuLi9jb250ZXh0LnRzXCI7XG5pbXBvcnQgdHlwZSB7IEVycm9yU3RhdHVzLCBIdHRwRXJyb3JPcHRpb25zIH0gZnJvbSBcIi4uL2RlcHMudHNcIjtcbmltcG9ydCB0eXBlIHsgTWlkZGxld2FyZSB9IGZyb20gXCIuLi9taWRkbGV3YXJlLnRzXCI7XG5pbXBvcnQgdHlwZSB7XG4gIExheWVyLFxuICBSb3V0ZVBhcmFtcyxcbiAgUm91dGVyLFxuICBSb3V0ZXJDb250ZXh0LFxuICBSb3V0ZXJNaWRkbGV3YXJlLFxufSBmcm9tIFwiLi4vcm91dGVyLnRzXCI7XG5cbi8qKiBUaGUgY29udGV4dCBhc3NvY2lhdGVkIHdoZW4gZGVhbGluZyB3aXRoIHNlcnZlIG1pZGRsZXdhcmUgcmVxdWVzdHMgb24gYW5cbiAqIGFwcGxpY2F0aW9uLiAqL1xuZXhwb3J0IGNsYXNzIFNlcnZlQ29udGV4dDxTIGV4dGVuZHMgU3RhdGUgPSBTdGF0ZT4ge1xuICAjY29udGV4dDogQ29udGV4dDxTPjtcblxuICAvKiogQSByZWZlcmVuY2UgdG8gdGhlIGN1cnJlbnQgYXBwbGljYXRpb24uICovXG4gIGdldCBhcHAoKTogQXBwbGljYXRpb248Uz4ge1xuICAgIHJldHVybiB0aGlzLiNjb250ZXh0LmFwcCBhcyBBcHBsaWNhdGlvbjxTPjtcbiAgfVxuXG4gIC8qKiBSZXF1ZXN0IHJlbW90ZSBhZGRyZXNzLiBXaGVuIHRoZSBhcHBsaWNhdGlvbidzIGAucHJveHlgIGlzIHRydWUsIHRoZVxuICAgKiBgWC1Gb3J3YXJkZWQtRm9yYCB3aWxsIGJlIHVzZWQgdG8gZGV0ZXJtaW5lIHRoZSByZXF1ZXN0aW5nIHJlbW90ZSBhZGRyZXNzLlxuICAgKi9cbiAgZ2V0IGlwKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuI2NvbnRleHQucmVxdWVzdC5pcDtcbiAgfVxuXG4gIC8qKiBXaGVuIHRoZSBhcHBsaWNhdGlvbidzIGAucHJveHlgIGlzIGB0cnVlYCwgdGhpcyB3aWxsIGJlIHNldCB0byBhbiBhcnJheSBvZlxuICAgKiBJUHMsIG9yZGVyZWQgZnJvbSB1cHN0cmVhbSB0byBkb3duc3RyZWFtLCBiYXNlZCBvbiB0aGUgdmFsdWUgb2YgdGhlIGhlYWRlclxuICAgKiBgWC1Gb3J3YXJkZWQtRm9yYC4gIFdoZW4gYGZhbHNlYCBhbiBlbXB0eSBhcnJheSBpcyByZXR1cm5lZC4gKi9cbiAgZ2V0IGlwcygpOiBzdHJpbmdbXSB7XG4gICAgcmV0dXJuIHRoaXMuI2NvbnRleHQucmVxdWVzdC5pcHM7XG4gIH1cblxuICAvKiogVGhlIG9iamVjdCB0byBwYXNzIHN0YXRlIHRvIGZyb250LWVuZCB2aWV3cy4gIFRoaXMgY2FuIGJlIHR5cGVkIGJ5XG4gICAqIHN1cHBseWluZyB0aGUgZ2VuZXJpYyBzdGF0ZSBhcmd1bWVudCB3aGVuIGNyZWF0aW5nIGEgbmV3IGFwcC4gIEZvclxuICAgKiBleGFtcGxlOlxuICAgKlxuICAgKiBgYGB0c1xuICAgKiBjb25zdCBhcHAgPSBuZXcgQXBwbGljYXRpb248eyBmb286IHN0cmluZyB9PigpO1xuICAgKiBgYGBcbiAgICpcbiAgICogT3IgY2FuIGJlIGNvbnRleHR1YWxseSBpbmZlcnJlZCBiYXNlZCBvbiBzZXR0aW5nIGFuIGluaXRpYWwgc3RhdGUgb2JqZWN0OlxuICAgKlxuICAgKiBgYGB0c1xuICAgKiBjb25zdCBhcHAgPSBuZXcgQXBwbGljYXRpb24oeyBzdGF0ZTogeyBmb286IFwiYmFyXCIgfSB9KTtcbiAgICogYGBgXG4gICAqXG4gICAqIE9uIGVhY2ggcmVxdWVzdC9yZXNwb25zZSBjeWNsZSwgdGhlIGNvbnRleHQncyBzdGF0ZSBpcyBjbG9uZWQgZnJvbSB0aGVcbiAgICogYXBwbGljYXRpb24gc3RhdGUuIFRoaXMgbWVhbnMgY2hhbmdlcyB0byB0aGUgY29udGV4dCdzIGAuc3RhdGVgIHdpbGwgYmVcbiAgICogZHJvcHBlZCB3aGVuIHRoZSByZXF1ZXN0IGRyb3BzLCBidXQgXCJkZWZhdWx0c1wiIGNhbiBiZSBhcHBsaWVkIHRvIHRoZVxuICAgKiBhcHBsaWNhdGlvbidzIHN0YXRlLiAgQ2hhbmdlcyB0byB0aGUgYXBwbGljYXRpb24ncyBzdGF0ZSB0aG91Z2ggd29uJ3QgYmVcbiAgICogcmVmbGVjdGVkIHVudGlsIHRoZSBuZXh0IHJlcXVlc3QgaW4gdGhlIGNvbnRleHQncyBzdGF0ZS5cbiAgICovXG4gIGdldCBzdGF0ZSgpOiBTIHtcbiAgICByZXR1cm4gdGhpcy4jY29udGV4dC5zdGF0ZTtcbiAgfVxuXG4gIGNvbnN0cnVjdG9yKGNvbnRleHQ6IENvbnRleHQ8Uz4pIHtcbiAgICB0aGlzLiNjb250ZXh0ID0gY29udGV4dDtcbiAgfVxuXG4gIC8qKiBBc3NlcnRzIHRoZSBjb25kaXRpb24gYW5kIGlmIHRoZSBjb25kaXRpb24gZmFpbHMsIGNyZWF0ZXMgYW4gSFRUUCBlcnJvclxuICAgKiB3aXRoIHRoZSBwcm92aWRlZCBzdGF0dXMgKHdoaWNoIGRlZmF1bHRzIHRvIGA1MDBgKS4gIFRoZSBlcnJvciBzdGF0dXMgYnlcbiAgICogZGVmYXVsdCB3aWxsIGJlIHNldCBvbiB0aGUgYC5yZXNwb25zZS5zdGF0dXNgLlxuICAgKlxuICAgKiBCZWNhdXNlIG9mIGxpbWl0YXRpb24gb2YgVHlwZVNjcmlwdCwgYW55IGFzc2VydGlvbiB0eXBlIGZ1bmN0aW9uIHJlcXVpcmVzXG4gICAqIHNwZWNpZmljIHR5cGUgYW5ub3RhdGlvbnMsIHNvIHRoZSB7QGxpbmtjb2RlIFNlcnZlQ29udGV4dH0gdHlwZSBzaG91bGQgYmVcbiAgICogdXNlZCBldmVuIGlmIGl0IGNhbiBiZSBpbmZlcnJlZCBmcm9tIHRoZSBjb250ZXh0LlxuICAgKi9cbiAgYXNzZXJ0KFxuICAgIGNvbmRpdGlvbjogdW5rbm93bixcbiAgICBzdGF0dXM/OiBFcnJvclN0YXR1cyxcbiAgICBtZXNzYWdlPzogc3RyaW5nLFxuICAgIHByb3BzPzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gJiBPbWl0PEh0dHBFcnJvck9wdGlvbnMsIFwic3RhdHVzXCI+LFxuICApOiBhc3NlcnRzIGNvbmRpdGlvbiB7XG4gICAgdGhpcy4jY29udGV4dC5hc3NlcnQoY29uZGl0aW9uLCBzdGF0dXMsIG1lc3NhZ2UsIHByb3BzKTtcbiAgfVxuXG4gIC8qKiBDcmVhdGUgYW5kIHRocm93IGFuIEhUVFAgRXJyb3IsIHdoaWNoIGNhbiBiZSB1c2VkIHRvIHBhc3Mgc3RhdHVzXG4gICAqIGluZm9ybWF0aW9uIHdoaWNoIGNhbiBiZSBjYXVnaHQgYnkgb3RoZXIgbWlkZGxld2FyZSB0byBzZW5kIG1vcmVcbiAgICogbWVhbmluZ2Z1bCBlcnJvciBtZXNzYWdlcyBiYWNrIHRvIHRoZSBjbGllbnQuICBUaGUgcGFzc2VkIGVycm9yIHN0YXR1cyB3aWxsXG4gICAqIGJlIHNldCBvbiB0aGUgYC5yZXNwb25zZS5zdGF0dXNgIGJ5IGRlZmF1bHQgYXMgd2VsbC5cbiAgICovXG4gIHRocm93KFxuICAgIGVycm9yU3RhdHVzOiBFcnJvclN0YXR1cyxcbiAgICBtZXNzYWdlPzogc3RyaW5nLFxuICAgIHByb3BzPzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4sXG4gICk6IG5ldmVyIHtcbiAgICB0aGlzLiNjb250ZXh0LnRocm93KGVycm9yU3RhdHVzLCBtZXNzYWdlLCBwcm9wcyk7XG4gIH1cblxuICBbU3ltYm9sLmZvcihcIkRlbm8uY3VzdG9tSW5zcGVjdFwiKV0oXG4gICAgaW5zcGVjdDogKHZhbHVlOiB1bmtub3duKSA9PiBzdHJpbmcsXG4gICk6IHN0cmluZyB7XG4gICAgY29uc3QgeyBhcHAsIGlwLCBpcHMsIHN0YXRlIH0gPSB0aGlzO1xuICAgIHJldHVybiBgJHt0aGlzLmNvbnN0cnVjdG9yLm5hbWV9ICR7aW5zcGVjdCh7IGFwcCwgaXAsIGlwcywgc3RhdGUgfSl9YDtcbiAgfVxuXG4gIFtTeW1ib2wuZm9yKFwibm9kZWpzLnV0aWwuaW5zcGVjdC5jdXN0b21cIildKFxuICAgIGRlcHRoOiBudW1iZXIsXG4gICAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgICBvcHRpb25zOiBhbnksXG4gICAgaW5zcGVjdDogKHZhbHVlOiB1bmtub3duLCBvcHRpb25zPzogdW5rbm93bikgPT4gc3RyaW5nLFxuICAgIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gICk6IGFueSB7XG4gICAgaWYgKGRlcHRoIDwgMCkge1xuICAgICAgcmV0dXJuIG9wdGlvbnMuc3R5bGl6ZShgWyR7dGhpcy5jb25zdHJ1Y3Rvci5uYW1lfV1gLCBcInNwZWNpYWxcIik7XG4gICAgfVxuXG4gICAgY29uc3QgbmV3T3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMsIHtcbiAgICAgIGRlcHRoOiBvcHRpb25zLmRlcHRoID09PSBudWxsID8gbnVsbCA6IG9wdGlvbnMuZGVwdGggLSAxLFxuICAgIH0pO1xuICAgIGNvbnN0IHsgYXBwLCBpcCwgaXBzLCBzdGF0ZSB9ID0gdGhpcztcbiAgICByZXR1cm4gYCR7b3B0aW9ucy5zdHlsaXplKHRoaXMuY29uc3RydWN0b3IubmFtZSwgXCJzcGVjaWFsXCIpfSAke1xuICAgICAgaW5zcGVjdCh7IGFwcCwgaXAsIGlwcywgc3RhdGUgfSwgbmV3T3B0aW9ucylcbiAgICB9YDtcbiAgfVxufVxuXG4vKiogVGhlIGNvbnRleHQgYXNzb2NpYXRlZCB3aXRoIHNlcnZlIG1pZGRsZXdhcmUgcmVxdWVzdHMgb24gYSByb3V0ZXIuICovXG5leHBvcnQgY2xhc3MgUm91dGVDb250ZXh0PFxuICBSIGV4dGVuZHMgc3RyaW5nLFxuICBQIGV4dGVuZHMgUm91dGVQYXJhbXM8Uj4gPSBSb3V0ZVBhcmFtczxSPixcbiAgUyBleHRlbmRzIFN0YXRlID0gU3RhdGUsXG4+IGV4dGVuZHMgU2VydmVDb250ZXh0PFM+IHtcbiAgI2NhcHR1cmVzOiBzdHJpbmdbXTtcbiAgI21hdGNoZWQ/OiBMYXllcjxSLCBQLCBTPltdO1xuICAjcGFyYW1zOiBQO1xuICAjcm91dGVyOiBSb3V0ZXI8Uz47XG4gICNyb3V0ZU5hbWU/OiBzdHJpbmc7XG4gICNyb3V0ZXJQYXRoPzogc3RyaW5nO1xuXG4gIC8qKiBXaGVuIG1hdGNoaW5nIHRoZSByb3V0ZSwgYW4gYXJyYXkgb2YgdGhlIGNhcHR1cmluZyBncm91cHMgZnJvbSB0aGUgcmVndWxhclxuICAgKiBleHByZXNzaW9uLiAqL1xuICBnZXQgY2FwdHVyZXMoKTogc3RyaW5nW10ge1xuICAgIHJldHVybiB0aGlzLiNjYXB0dXJlcztcbiAgfVxuXG4gIC8qKiBUaGUgcm91dGVzIHRoYXQgd2VyZSBtYXRjaGVkIGZvciB0aGlzIHJlcXVlc3QuICovXG4gIGdldCBtYXRjaGVkKCk6IExheWVyPFIsIFAsIFM+W10gfCB1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLiNtYXRjaGVkO1xuICB9XG5cbiAgLyoqIEFueSBwYXJhbWV0ZXJzIHBhcnNlZCBmcm9tIHRoZSByb3V0ZSB3aGVuIG1hdGNoZWQuICovXG4gIGdldCBwYXJhbXMoKTogUCB7XG4gICAgcmV0dXJuIHRoaXMuI3BhcmFtcztcbiAgfVxuXG4gIC8qKiBBIHJlZmVyZW5jZSB0byB0aGUgcm91dGVyIGluc3RhbmNlLiAqL1xuICBnZXQgcm91dGVyKCk6IFJvdXRlcjxTPiB7XG4gICAgcmV0dXJuIHRoaXMuI3JvdXRlcjtcbiAgfVxuXG4gIC8qKiBJZiB0aGUgbWF0Y2hlZCByb3V0ZSBoYXMgYSBgbmFtZWAsIHRoZSBtYXRjaGVkIHJvdXRlIG5hbWUgaXMgcHJvdmlkZWRcbiAgICogaGVyZS4gKi9cbiAgZ2V0IHJvdXRlTmFtZSgpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLiNyb3V0ZU5hbWU7XG4gIH1cblxuICAvKiogT3ZlcnJpZGVzIHRoZSBtYXRjaGVkIHBhdGggZm9yIGZ1dHVyZSByb3V0ZSBtaWRkbGV3YXJlLCB3aGVuIGFcbiAgICogYHJvdXRlclBhdGhgIG9wdGlvbiBpcyBub3QgZGVmaW5lZCBvbiB0aGUgYFJvdXRlcmAgb3B0aW9ucy4gKi9cbiAgZ2V0IHJvdXRlclBhdGgoKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy4jcm91dGVyUGF0aDtcbiAgfVxuXG4gIGNvbnN0cnVjdG9yKGNvbnRleHQ6IFJvdXRlckNvbnRleHQ8UiwgUCwgUz4pIHtcbiAgICBzdXBlcihjb250ZXh0KTtcbiAgICBjb25zdCB7IGNhcHR1cmVzLCBtYXRjaGVkLCBwYXJhbXMsIHJvdXRlciwgcm91dGVOYW1lLCByb3V0ZXJQYXRoIH0gPVxuICAgICAgY29udGV4dDtcbiAgICB0aGlzLiNjYXB0dXJlcyA9IGNhcHR1cmVzO1xuICAgIHRoaXMuI21hdGNoZWQgPSBtYXRjaGVkO1xuICAgIHRoaXMuI3BhcmFtcyA9IHBhcmFtcztcbiAgICB0aGlzLiNyb3V0ZXIgPSByb3V0ZXI7XG4gICAgdGhpcy4jcm91dGVOYW1lID0gcm91dGVOYW1lO1xuICAgIHRoaXMuI3JvdXRlclBhdGggPSByb3V0ZXJQYXRoO1xuICB9XG5cbiAgW1N5bWJvbC5mb3IoXCJEZW5vLmN1c3RvbUluc3BlY3RcIildKFxuICAgIGluc3BlY3Q6ICh2YWx1ZTogdW5rbm93bikgPT4gc3RyaW5nLFxuICApOiBzdHJpbmcge1xuICAgIGNvbnN0IHtcbiAgICAgIGFwcCxcbiAgICAgIGNhcHR1cmVzLFxuICAgICAgbWF0Y2hlZCxcbiAgICAgIGlwLFxuICAgICAgaXBzLFxuICAgICAgcGFyYW1zLFxuICAgICAgcm91dGVyLFxuICAgICAgcm91dGVOYW1lLFxuICAgICAgcm91dGVyUGF0aCxcbiAgICAgIHN0YXRlLFxuICAgIH0gPSB0aGlzO1xuICAgIHJldHVybiBgJHt0aGlzLmNvbnN0cnVjdG9yLm5hbWV9ICR7XG4gICAgICBpbnNwZWN0KHtcbiAgICAgICAgYXBwLFxuICAgICAgICBjYXB0dXJlcyxcbiAgICAgICAgbWF0Y2hlZCxcbiAgICAgICAgaXAsXG4gICAgICAgIGlwcyxcbiAgICAgICAgcGFyYW1zLFxuICAgICAgICByb3V0ZXIsXG4gICAgICAgIHJvdXRlTmFtZSxcbiAgICAgICAgcm91dGVyUGF0aCxcbiAgICAgICAgc3RhdGUsXG4gICAgICB9KVxuICAgIH1gO1xuICB9XG5cbiAgW1N5bWJvbC5mb3IoXCJub2RlanMudXRpbC5pbnNwZWN0LmN1c3RvbVwiKV0oXG4gICAgZGVwdGg6IG51bWJlcixcbiAgICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICAgIG9wdGlvbnM6IGFueSxcbiAgICBpbnNwZWN0OiAodmFsdWU6IHVua25vd24sIG9wdGlvbnM/OiB1bmtub3duKSA9PiBzdHJpbmcsXG4gICAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgKTogYW55IHtcbiAgICBpZiAoZGVwdGggPCAwKSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy5zdHlsaXplKGBbJHt0aGlzLmNvbnN0cnVjdG9yLm5hbWV9XWAsIFwic3BlY2lhbFwiKTtcbiAgICB9XG5cbiAgICBjb25zdCBuZXdPcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucywge1xuICAgICAgZGVwdGg6IG9wdGlvbnMuZGVwdGggPT09IG51bGwgPyBudWxsIDogb3B0aW9ucy5kZXB0aCAtIDEsXG4gICAgfSk7XG4gICAgY29uc3Qge1xuICAgICAgYXBwLFxuICAgICAgY2FwdHVyZXMsXG4gICAgICBtYXRjaGVkLFxuICAgICAgaXAsXG4gICAgICBpcHMsXG4gICAgICBwYXJhbXMsXG4gICAgICByb3V0ZXIsXG4gICAgICByb3V0ZU5hbWUsXG4gICAgICByb3V0ZXJQYXRoLFxuICAgICAgc3RhdGUsXG4gICAgfSA9IHRoaXM7XG4gICAgcmV0dXJuIGAke29wdGlvbnMuc3R5bGl6ZSh0aGlzLmNvbnN0cnVjdG9yLm5hbWUsIFwic3BlY2lhbFwiKX0gJHtcbiAgICAgIGluc3BlY3Qoe1xuICAgICAgICBhcHAsXG4gICAgICAgIGNhcHR1cmVzLFxuICAgICAgICBtYXRjaGVkLFxuICAgICAgICBpcCxcbiAgICAgICAgaXBzLFxuICAgICAgICBwYXJhbXMsXG4gICAgICAgIHJvdXRlcixcbiAgICAgICAgcm91dGVOYW1lLFxuICAgICAgICByb3V0ZXJQYXRoLFxuICAgICAgICBzdGF0ZSxcbiAgICAgIH0sIG5ld09wdGlvbnMpXG4gICAgfWA7XG4gIH1cbn1cblxudHlwZSBTZXJ2ZU1pZGRsZXdhcmU8UyBleHRlbmRzIFN0YXRlPiA9IChcbiAgcmVxdWVzdDogUmVxdWVzdCxcbiAgY29udGV4dDogU2VydmVDb250ZXh0PFM+LFxuKSA9PiBSZXNwb25zZSB8IFByb21pc2U8UmVzcG9uc2U+O1xuXG50eXBlIFNlcnZlUm91dGVyTWlkZGxld2FyZTxcbiAgUiBleHRlbmRzIHN0cmluZyxcbiAgUCBleHRlbmRzIFJvdXRlUGFyYW1zPFI+LFxuICBTIGV4dGVuZHMgU3RhdGUsXG4+ID0gKFxuICByZXF1ZXN0OiBSZXF1ZXN0LFxuICBjb250ZXh0OiBSb3V0ZUNvbnRleHQ8UiwgUCwgUz4sXG4pID0+IFJlc3BvbnNlIHwgUHJvbWlzZTxSZXNwb25zZT47XG5cbi8qKiBXcmFwIGEgaGFuZGxlciBmdW5jdGlvbiB0byBnZW5lcmF0ZSBtaWRkbGV3YXJlIHRoYXQgY2FuIGJlIHVzZWQgd2l0aCBhbiBvYWtcbiAqIHtAbGlua2NvZGUgQXBwbGljYXRpb259LiBUaGlzIGFsbG93cyB0aGUgaGFuZGxlciB0byBkZWFsIHdpdGggYSBGZXRjaCBBUElcbiAqIHN0YW5kYXJkIHtAbGlua2NvZGUgUmVxdWVzdH0gYW5kIHJldHVybiBhIHN0YW5kYXJkIHtAbGlua2NvZGUgUmVzcG9uc2V9LlxuICovXG5leHBvcnQgZnVuY3Rpb24gc2VydmU8UyBleHRlbmRzIFN0YXRlPihcbiAgbWlkZGxld2FyZTogU2VydmVNaWRkbGV3YXJlPFM+LFxuKTogTWlkZGxld2FyZTxTPiB7XG4gIHJldHVybiBhc3luYyAoY3R4LCBuZXh0KSA9PiB7XG4gICAgY29uc3QgcmVxdWVzdCA9IGN0eC5yZXF1ZXN0LnNvdXJjZSA/PyBuZXcgUmVxdWVzdChjdHgucmVxdWVzdC51cmwsIHtcbiAgICAgIC4uLmN0eC5yZXF1ZXN0LFxuICAgICAgYm9keTogY3R4LnJlcXVlc3QuYm9keS5zdHJlYW0sXG4gICAgfSk7XG4gICAgY29uc3QgY29udGV4dCA9IG5ldyBTZXJ2ZUNvbnRleHQoY3R4KTtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IG1pZGRsZXdhcmUocmVxdWVzdCwgY29udGV4dCk7XG4gICAgY3R4LnJlc3BvbnNlLndpdGgocmVzcG9uc2UpO1xuICAgIHJldHVybiBuZXh0KCk7XG4gIH07XG59XG5cbi8qKiBXcmFwIGEgaGFuZGxlciBmdW5jdGlvbiB0byBnZW5lcmF0ZSBtaWRkbGV3YXJlIHRoYXQgY2FuIGJlIHVzZWQgd2l0aCBhbiBvYWtcbiAqIHtAbGlua2NvZGUgUm91dGVyfS4gVGhpcyBhbGxvd3MgdGhlIGhhbmRsZXIgdG8gZGVhbCB3aXRoIGEgRmV0Y2ggQVBJIHN0YW5kYXJkXG4gKiB7QGxpbmtjb2RlIFJlcXVlc3R9IGFuZCByZXR1cm4gYSBzdGFuZGFyZCB7QGxpbmtjb2RlIFJlc3BvbnNlfS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJvdXRlPFxuICBSIGV4dGVuZHMgc3RyaW5nLFxuICBQIGV4dGVuZHMgUm91dGVQYXJhbXM8Uj4sXG4gIFMgZXh0ZW5kcyBTdGF0ZSxcbj4obWlkZGxld2FyZTogU2VydmVSb3V0ZXJNaWRkbGV3YXJlPFIsIFAsIFM+KTogUm91dGVyTWlkZGxld2FyZTxSLCBQLCBTPiB7XG4gIHJldHVybiBhc3luYyAoY3R4LCBuZXh0KSA9PiB7XG4gICAgY29uc3QgcmVxdWVzdCA9IGN0eC5yZXF1ZXN0LnNvdXJjZSA/PyBuZXcgUmVxdWVzdChjdHgucmVxdWVzdC51cmwsIHtcbiAgICAgIC4uLmN0eC5yZXF1ZXN0LFxuICAgICAgYm9keTogY3R4LnJlcXVlc3QuYm9keS5zdHJlYW0sXG4gICAgfSk7XG4gICAgY29uc3QgY29udGV4dCA9IG5ldyBSb3V0ZUNvbnRleHQoY3R4KTtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IG1pZGRsZXdhcmUocmVxdWVzdCwgY29udGV4dCk7XG4gICAgY3R4LnJlc3BvbnNlLndpdGgocmVzcG9uc2UpO1xuICAgIHJldHVybiBuZXh0KCk7XG4gIH07XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEseUVBQXlFO0FBRXpFOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0NBc0JDO2VBZ0dFLE9BQU8sR0FBRyxDQUFDLHVDQU9YLE9BQU8sR0FBRyxDQUFDO0FBekZkO2dCQUNnQixHQUNoQixPQUFPLE1BQU07RUFDWCxDQUFBLE9BQVEsQ0FBYTtFQUVyQiw0Q0FBNEMsR0FDNUMsSUFBSSxNQUFzQjtJQUN4QixPQUFPLElBQUksQ0FBQyxDQUFBLE9BQVEsQ0FBQyxHQUFHO0VBQzFCO0VBRUE7O0dBRUMsR0FDRCxJQUFJLEtBQWE7SUFDZixPQUFPLElBQUksQ0FBQyxDQUFBLE9BQVEsQ0FBQyxPQUFPLENBQUMsRUFBRTtFQUNqQztFQUVBOztrRUFFZ0UsR0FDaEUsSUFBSSxNQUFnQjtJQUNsQixPQUFPLElBQUksQ0FBQyxDQUFBLE9BQVEsQ0FBQyxPQUFPLENBQUMsR0FBRztFQUNsQztFQUVBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBbUJDLEdBQ0QsSUFBSSxRQUFXO0lBQ2Is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
// denoCacheMetadata=18157833653509105072,11554594679113746072