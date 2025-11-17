// Copyright 2018-2025 the oak authors. All rights reserved. MIT license.
/**
 * Contains the {@linkcode Request} abstraction used by oak.
 *
 * Most end users would not need to directly access this module.
 *
 * @module
 */ var _computedKey, _computedKey1;
import { Body } from "./body.ts";
import { ServerSentEventStreamTarget } from "./deps.ts";
import { accepts, acceptsEncodings, acceptsLanguages, UserAgent } from "./deps.ts";
_computedKey = Symbol.for("Deno.customInspect"), _computedKey1 = Symbol.for("nodejs.util.inspect.custom");
/** An interface which provides information about the current request. The
 * instance related to the current request is available on the
 * {@linkcode Context}'s `.request` property.
 *
 * The interface contains several properties to get information about the
 * request as well as several methods, which include content negotiation and
 * the ability to decode a request body.
 */ export class Request {
  #body;
  #proxy;
  #secure;
  #serverRequest;
  #url;
  #userAgent;
  #getRemoteAddr() {
    return this.#serverRequest.remoteAddr ?? "";
  }
  /** An interface to access the body of the request. This provides an API that
   * aligned to the **Fetch Request** API, but in a dedicated API.
   */ get body() {
    return this.#body;
  }
  /** Is `true` if the request might have a body, otherwise `false`.
   *
   * **WARNING** this is an unreliable API. In HTTP/2 in many situations you
   * cannot determine if a request has a body or not unless you attempt to read
   * the body, due to the streaming nature of HTTP/2. As of Deno 1.16.1, for
   * HTTP/1.1, Deno also reflects that behaviour.  The only reliable way to
   * determine if a request has a body or not is to attempt to read the body.
   */ get hasBody() {
    return this.#body.has;
  }
  /** The `Headers` supplied in the request. */ get headers() {
    return this.#serverRequest.headers;
  }
  /** Request remote address. When the application's `.proxy` is true, the
   * `X-Forwarded-For` will be used to determine the requesting remote address.
   */ get ip() {
    return (this.#proxy ? this.ips[0] : this.#getRemoteAddr()) ?? "";
  }
  /** When the application's `.proxy` is `true`, this will be set to an array of
   * IPs, ordered from upstream to downstream, based on the value of the header
   * `X-Forwarded-For`.  When `false` an empty array is returned. */ get ips() {
    return this.#proxy ? (()=>{
      const raw = this.#serverRequest.headers.get("x-forwarded-for") ?? this.#getRemoteAddr();
      const bounded = raw.length > 4096 ? raw.slice(0, 4096) : raw;
      return bounded.split(",", 100).map((part)=>part.trim()).filter((part)=>part.length > 0);
    })() : [];
  }
  /** The HTTP Method used by the request. */ get method() {
    return this.#serverRequest.method;
  }
  /** Shortcut to `request.url.protocol === "https:"`. */ get secure() {
    return this.#secure;
  }
  /** Set to the value of the low level oak server request abstraction.
   *
   * @deprecated this will be removed in future versions of oak. Accessing this
   * abstraction is not useful to end users and is now a bit of a misnomer.
   */ get originalRequest() {
    return this.#serverRequest;
  }
  /** Returns the original Fetch API `Request` if available.
   *
   * This should be set with requests on Deno, but will not be set when running
   * on Node.js.
   */ get source() {
    return this.#serverRequest.request;
  }
  /** A parsed URL for the request which complies with the browser standards.
   * When the application's `.proxy` is `true`, this value will be based off of
   * the `X-Forwarded-Proto` and `X-Forwarded-Host` header values if present in
   * the request. */ get url() {
    if (!this.#url) {
      const serverRequest = this.#serverRequest;
      // between Deno 1.9.0 and 1.9.1 the request.url of the native HTTP started
      // returning the full URL, where previously it only returned the path
      // so we will try to use that URL here, but default back to old logic
      // if the URL isn't valid.
      try {
        if (serverRequest.rawUrl) {
          this.#url = new URL(serverRequest.rawUrl);
        }
      } catch  {
      // we don't care about errors here
      }
      if (this.#proxy || !this.#url) {
        let proto;
        let host;
        if (this.#proxy) {
          const xForwardedProto = serverRequest.headers.get("x-forwarded-proto");
          let maybeProto = xForwardedProto ? xForwardedProto.split(",", 1)[0].trim().toLowerCase() : undefined;
          if (maybeProto !== "http" && maybeProto !== "https") {
            maybeProto = undefined;
          }
          proto = maybeProto ?? "http";
          host = serverRequest.headers.get("x-forwarded-host") ?? this.#url?.hostname ?? serverRequest.headers.get("host") ?? serverRequest.headers.get(":authority") ?? "";
        } else {
          proto = this.#secure ? "https" : "http";
          host = serverRequest.headers.get("host") ?? serverRequest.headers.get(":authority") ?? "";
        }
        try {
          this.#url = new URL(`${proto}://${host}${serverRequest.url}`);
        } catch  {
          throw new TypeError(`The server request URL of "${proto}://${host}${serverRequest.url}" is invalid.`);
        }
      }
    }
    return this.#url;
  }
  /** An object representing the requesting user agent. If the `User-Agent`
   * header isn't defined in the request, all the properties will be undefined.
   *
   * See [std/http/user_agent#UserAgent](https://deno.land/std@0.223/http/user_agent.ts?s=UserAgent)
   * for more information.
   */ get userAgent() {
    return this.#userAgent;
  }
  constructor(serverRequest, { proxy = false, secure = false, jsonBodyReviver } = {}){
    this.#proxy = proxy;
    this.#secure = secure;
    this.#serverRequest = serverRequest;
    this.#body = new Body(serverRequest, jsonBodyReviver);
    this.#userAgent = new UserAgent(serverRequest.headers.get("user-agent"));
  }
  accepts(...types) {
    if (!this.#serverRequest.headers.has("Accept")) {
      return types.length ? types[0] : [
        "*/*"
      ];
    }
    if (types.length) {
      return accepts(this.#serverRequest, ...types);
    }
    return accepts(this.#serverRequest);
  }
  acceptsEncodings(...encodings) {
    if (!this.#serverRequest.headers.has("Accept-Encoding")) {
      return encodings.length ? encodings[0] : [
        "*"
      ];
    }
    if (encodings.length) {
      return acceptsEncodings(this.#serverRequest, ...encodings);
    }
    return acceptsEncodings(this.#serverRequest);
  }
  acceptsLanguages(...langs) {
    if (!this.#serverRequest.headers.get("Accept-Language")) {
      return langs.length ? langs[0] : [
        "*"
      ];
    }
    if (langs.length) {
      return acceptsLanguages(this.#serverRequest, ...langs);
    }
    return acceptsLanguages(this.#serverRequest);
  }
  /** Take the current request and initiate server sent event connection.
   *
   * > ![WARNING]
   * > This is not intended for direct use, as it will not manage the target in
   * > the overall context or ensure that additional middleware does not attempt
   * > to respond to the request.
   */ async sendEvents(options, init) {
    const sse = new ServerSentEventStreamTarget(options);
    await this.#serverRequest.respond(sse.asResponse(init));
    return sse;
  }
  /** Take the current request and upgrade it to a web socket, returning a web
   * standard `WebSocket` object.
   *
   * If the underlying server abstraction does not support upgrades, this will
   * throw.
   *
   * > ![WARNING]
   * > This is not intended for direct use, as it will not manage the websocket
   * > in the overall context or ensure that additional middleware does not
   * > attempt to respond to the request.
   */ upgrade(options) {
    if (!this.#serverRequest.upgrade) {
      throw new TypeError("Web sockets upgrade not supported in this runtime.");
    }
    return this.#serverRequest.upgrade(options);
  }
  [_computedKey](inspect) {
    const { body, hasBody, headers, ip, ips, method, secure, url, userAgent } = this;
    return `${this.constructor.name} ${inspect({
      body,
      hasBody,
      headers,
      ip,
      ips,
      method,
      secure,
      url: url.toString(),
      userAgent
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
    const { body, hasBody, headers, ip, ips, method, secure, url, userAgent } = this;
    return `${options.stylize(this.constructor.name, "special")} ${inspect({
      body,
      hasBody,
      headers,
      ip,
      ips,
      method,
      secure,
      url,
      userAgent
    }, newOptions)}`;
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvb2FrQHYxNy4xLjYvcmVxdWVzdC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDI1IHRoZSBvYWsgYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIGxpY2Vuc2UuXG5cbi8qKlxuICogQ29udGFpbnMgdGhlIHtAbGlua2NvZGUgUmVxdWVzdH0gYWJzdHJhY3Rpb24gdXNlZCBieSBvYWsuXG4gKlxuICogTW9zdCBlbmQgdXNlcnMgd291bGQgbm90IG5lZWQgdG8gZGlyZWN0bHkgYWNjZXNzIHRoaXMgbW9kdWxlLlxuICpcbiAqIEBtb2R1bGVcbiAqL1xuXG5pbXBvcnQgeyBCb2R5IH0gZnJvbSBcIi4vYm9keS50c1wiO1xuaW1wb3J0IHsgU2VydmVyU2VudEV2ZW50U3RyZWFtVGFyZ2V0IH0gZnJvbSBcIi4vZGVwcy50c1wiO1xuaW1wb3J0IHtcbiAgYWNjZXB0cyxcbiAgYWNjZXB0c0VuY29kaW5ncyxcbiAgYWNjZXB0c0xhbmd1YWdlcyxcbiAgdHlwZSBIVFRQTWV0aG9kcyxcbiAgdHlwZSBTZXJ2ZXJTZW50RXZlbnRUYXJnZXQsXG4gIHR5cGUgU2VydmVyU2VudEV2ZW50VGFyZ2V0T3B0aW9ucyxcbiAgVXNlckFnZW50LFxufSBmcm9tIFwiLi9kZXBzLnRzXCI7XG5pbXBvcnQgdHlwZSB7IFNlcnZlclJlcXVlc3QsIFVwZ3JhZGVXZWJTb2NrZXRPcHRpb25zIH0gZnJvbSBcIi4vdHlwZXMudHNcIjtcblxuaW50ZXJmYWNlIE9ha1JlcXVlc3RPcHRpb25zIHtcbiAganNvbkJvZHlSZXZpdmVyPzogKGtleTogc3RyaW5nLCB2YWx1ZTogdW5rbm93bikgPT4gdW5rbm93bjtcbiAgcHJveHk/OiBib29sZWFuO1xuICBzZWN1cmU/OiBib29sZWFuO1xufVxuXG4vKiogQW4gaW50ZXJmYWNlIHdoaWNoIHByb3ZpZGVzIGluZm9ybWF0aW9uIGFib3V0IHRoZSBjdXJyZW50IHJlcXVlc3QuIFRoZVxuICogaW5zdGFuY2UgcmVsYXRlZCB0byB0aGUgY3VycmVudCByZXF1ZXN0IGlzIGF2YWlsYWJsZSBvbiB0aGVcbiAqIHtAbGlua2NvZGUgQ29udGV4dH0ncyBgLnJlcXVlc3RgIHByb3BlcnR5LlxuICpcbiAqIFRoZSBpbnRlcmZhY2UgY29udGFpbnMgc2V2ZXJhbCBwcm9wZXJ0aWVzIHRvIGdldCBpbmZvcm1hdGlvbiBhYm91dCB0aGVcbiAqIHJlcXVlc3QgYXMgd2VsbCBhcyBzZXZlcmFsIG1ldGhvZHMsIHdoaWNoIGluY2x1ZGUgY29udGVudCBuZWdvdGlhdGlvbiBhbmRcbiAqIHRoZSBhYmlsaXR5IHRvIGRlY29kZSBhIHJlcXVlc3QgYm9keS5cbiAqL1xuZXhwb3J0IGNsYXNzIFJlcXVlc3Qge1xuICAjYm9keTogQm9keTtcbiAgI3Byb3h5OiBib29sZWFuO1xuICAjc2VjdXJlOiBib29sZWFuO1xuICAjc2VydmVyUmVxdWVzdDogU2VydmVyUmVxdWVzdDtcbiAgI3VybD86IFVSTDtcbiAgI3VzZXJBZ2VudDogVXNlckFnZW50O1xuXG4gICNnZXRSZW1vdGVBZGRyKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuI3NlcnZlclJlcXVlc3QucmVtb3RlQWRkciA/PyBcIlwiO1xuICB9XG5cbiAgLyoqIEFuIGludGVyZmFjZSB0byBhY2Nlc3MgdGhlIGJvZHkgb2YgdGhlIHJlcXVlc3QuIFRoaXMgcHJvdmlkZXMgYW4gQVBJIHRoYXRcbiAgICogYWxpZ25lZCB0byB0aGUgKipGZXRjaCBSZXF1ZXN0KiogQVBJLCBidXQgaW4gYSBkZWRpY2F0ZWQgQVBJLlxuICAgKi9cbiAgZ2V0IGJvZHkoKTogQm9keSB7XG4gICAgcmV0dXJuIHRoaXMuI2JvZHk7XG4gIH1cblxuICAvKiogSXMgYHRydWVgIGlmIHRoZSByZXF1ZXN0IG1pZ2h0IGhhdmUgYSBib2R5LCBvdGhlcndpc2UgYGZhbHNlYC5cbiAgICpcbiAgICogKipXQVJOSU5HKiogdGhpcyBpcyBhbiB1bnJlbGlhYmxlIEFQSS4gSW4gSFRUUC8yIGluIG1hbnkgc2l0dWF0aW9ucyB5b3VcbiAgICogY2Fubm90IGRldGVybWluZSBpZiBhIHJlcXVlc3QgaGFzIGEgYm9keSBvciBub3QgdW5sZXNzIHlvdSBhdHRlbXB0IHRvIHJlYWRcbiAgICogdGhlIGJvZHksIGR1ZSB0byB0aGUgc3RyZWFtaW5nIG5hdHVyZSBvZiBIVFRQLzIuIEFzIG9mIERlbm8gMS4xNi4xLCBmb3JcbiAgICogSFRUUC8xLjEsIERlbm8gYWxzbyByZWZsZWN0cyB0aGF0IGJlaGF2aW91ci4gIFRoZSBvbmx5IHJlbGlhYmxlIHdheSB0b1xuICAgKiBkZXRlcm1pbmUgaWYgYSByZXF1ZXN0IGhhcyBhIGJvZHkgb3Igbm90IGlzIHRvIGF0dGVtcHQgdG8gcmVhZCB0aGUgYm9keS5cbiAgICovXG4gIGdldCBoYXNCb2R5KCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLiNib2R5LmhhcztcbiAgfVxuXG4gIC8qKiBUaGUgYEhlYWRlcnNgIHN1cHBsaWVkIGluIHRoZSByZXF1ZXN0LiAqL1xuICBnZXQgaGVhZGVycygpOiBIZWFkZXJzIHtcbiAgICByZXR1cm4gdGhpcy4jc2VydmVyUmVxdWVzdC5oZWFkZXJzO1xuICB9XG5cbiAgLyoqIFJlcXVlc3QgcmVtb3RlIGFkZHJlc3MuIFdoZW4gdGhlIGFwcGxpY2F0aW9uJ3MgYC5wcm94eWAgaXMgdHJ1ZSwgdGhlXG4gICAqIGBYLUZvcndhcmRlZC1Gb3JgIHdpbGwgYmUgdXNlZCB0byBkZXRlcm1pbmUgdGhlIHJlcXVlc3RpbmcgcmVtb3RlIGFkZHJlc3MuXG4gICAqL1xuICBnZXQgaXAoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gKHRoaXMuI3Byb3h5ID8gdGhpcy5pcHNbMF0gOiB0aGlzLiNnZXRSZW1vdGVBZGRyKCkpID8/IFwiXCI7XG4gIH1cblxuICAvKiogV2hlbiB0aGUgYXBwbGljYXRpb24ncyBgLnByb3h5YCBpcyBgdHJ1ZWAsIHRoaXMgd2lsbCBiZSBzZXQgdG8gYW4gYXJyYXkgb2ZcbiAgICogSVBzLCBvcmRlcmVkIGZyb20gdXBzdHJlYW0gdG8gZG93bnN0cmVhbSwgYmFzZWQgb24gdGhlIHZhbHVlIG9mIHRoZSBoZWFkZXJcbiAgICogYFgtRm9yd2FyZGVkLUZvcmAuICBXaGVuIGBmYWxzZWAgYW4gZW1wdHkgYXJyYXkgaXMgcmV0dXJuZWQuICovXG4gIGdldCBpcHMoKTogc3RyaW5nW10ge1xuICAgIHJldHVybiB0aGlzLiNwcm94eVxuICAgICAgPyAoKCkgPT4ge1xuICAgICAgICBjb25zdCByYXcgPSB0aGlzLiNzZXJ2ZXJSZXF1ZXN0LmhlYWRlcnMuZ2V0KFwieC1mb3J3YXJkZWQtZm9yXCIpID8/XG4gICAgICAgICAgdGhpcy4jZ2V0UmVtb3RlQWRkcigpO1xuICAgICAgICBjb25zdCBib3VuZGVkID0gcmF3Lmxlbmd0aCA+IDQwOTYgPyByYXcuc2xpY2UoMCwgNDA5NikgOiByYXc7XG4gICAgICAgIHJldHVybiBib3VuZGVkXG4gICAgICAgICAgLnNwbGl0KFwiLFwiLCAxMDApXG4gICAgICAgICAgLm1hcCgocGFydCkgPT4gcGFydC50cmltKCkpXG4gICAgICAgICAgLmZpbHRlcigocGFydCkgPT4gcGFydC5sZW5ndGggPiAwKTtcbiAgICAgIH0pKClcbiAgICAgIDogW107XG4gIH1cblxuICAvKiogVGhlIEhUVFAgTWV0aG9kIHVzZWQgYnkgdGhlIHJlcXVlc3QuICovXG4gIGdldCBtZXRob2QoKTogSFRUUE1ldGhvZHMge1xuICAgIHJldHVybiB0aGlzLiNzZXJ2ZXJSZXF1ZXN0Lm1ldGhvZCBhcyBIVFRQTWV0aG9kcztcbiAgfVxuXG4gIC8qKiBTaG9ydGN1dCB0byBgcmVxdWVzdC51cmwucHJvdG9jb2wgPT09IFwiaHR0cHM6XCJgLiAqL1xuICBnZXQgc2VjdXJlKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLiNzZWN1cmU7XG4gIH1cblxuICAvKiogU2V0IHRvIHRoZSB2YWx1ZSBvZiB0aGUgbG93IGxldmVsIG9hayBzZXJ2ZXIgcmVxdWVzdCBhYnN0cmFjdGlvbi5cbiAgICpcbiAgICogQGRlcHJlY2F0ZWQgdGhpcyB3aWxsIGJlIHJlbW92ZWQgaW4gZnV0dXJlIHZlcnNpb25zIG9mIG9hay4gQWNjZXNzaW5nIHRoaXNcbiAgICogYWJzdHJhY3Rpb24gaXMgbm90IHVzZWZ1bCB0byBlbmQgdXNlcnMgYW5kIGlzIG5vdyBhIGJpdCBvZiBhIG1pc25vbWVyLlxuICAgKi9cbiAgZ2V0IG9yaWdpbmFsUmVxdWVzdCgpOiBTZXJ2ZXJSZXF1ZXN0IHtcbiAgICByZXR1cm4gdGhpcy4jc2VydmVyUmVxdWVzdDtcbiAgfVxuXG4gIC8qKiBSZXR1cm5zIHRoZSBvcmlnaW5hbCBGZXRjaCBBUEkgYFJlcXVlc3RgIGlmIGF2YWlsYWJsZS5cbiAgICpcbiAgICogVGhpcyBzaG91bGQgYmUgc2V0IHdpdGggcmVxdWVzdHMgb24gRGVubywgYnV0IHdpbGwgbm90IGJlIHNldCB3aGVuIHJ1bm5pbmdcbiAgICogb24gTm9kZS5qcy5cbiAgICovXG4gIGdldCBzb3VyY2UoKTogZ2xvYmFsVGhpcy5SZXF1ZXN0IHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy4jc2VydmVyUmVxdWVzdC5yZXF1ZXN0O1xuICB9XG5cbiAgLyoqIEEgcGFyc2VkIFVSTCBmb3IgdGhlIHJlcXVlc3Qgd2hpY2ggY29tcGxpZXMgd2l0aCB0aGUgYnJvd3NlciBzdGFuZGFyZHMuXG4gICAqIFdoZW4gdGhlIGFwcGxpY2F0aW9uJ3MgYC5wcm94eWAgaXMgYHRydWVgLCB0aGlzIHZhbHVlIHdpbGwgYmUgYmFzZWQgb2ZmIG9mXG4gICAqIHRoZSBgWC1Gb3J3YXJkZWQtUHJvdG9gIGFuZCBgWC1Gb3J3YXJkZWQtSG9zdGAgaGVhZGVyIHZhbHVlcyBpZiBwcmVzZW50IGluXG4gICAqIHRoZSByZXF1ZXN0LiAqL1xuICBnZXQgdXJsKCk6IFVSTCB7XG4gICAgaWYgKCF0aGlzLiN1cmwpIHtcbiAgICAgIGNvbnN0IHNlcnZlclJlcXVlc3QgPSB0aGlzLiNzZXJ2ZXJSZXF1ZXN0O1xuICAgICAgLy8gYmV0d2VlbiBEZW5vIDEuOS4wIGFuZCAxLjkuMSB0aGUgcmVxdWVzdC51cmwgb2YgdGhlIG5hdGl2ZSBIVFRQIHN0YXJ0ZWRcbiAgICAgIC8vIHJldHVybmluZyB0aGUgZnVsbCBVUkwsIHdoZXJlIHByZXZpb3VzbHkgaXQgb25seSByZXR1cm5lZCB0aGUgcGF0aFxuICAgICAgLy8gc28gd2Ugd2lsbCB0cnkgdG8gdXNlIHRoYXQgVVJMIGhlcmUsIGJ1dCBkZWZhdWx0IGJhY2sgdG8gb2xkIGxvZ2ljXG4gICAgICAvLyBpZiB0aGUgVVJMIGlzbid0IHZhbGlkLlxuICAgICAgdHJ5IHtcbiAgICAgICAgaWYgKHNlcnZlclJlcXVlc3QucmF3VXJsKSB7XG4gICAgICAgICAgdGhpcy4jdXJsID0gbmV3IFVSTChzZXJ2ZXJSZXF1ZXN0LnJhd1VybCk7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICAvLyB3ZSBkb24ndCBjYXJlIGFib3V0IGVycm9ycyBoZXJlXG4gICAgICB9XG4gICAgICBpZiAodGhpcy4jcHJveHkgfHwgIXRoaXMuI3VybCkge1xuICAgICAgICBsZXQgcHJvdG86IHN0cmluZztcbiAgICAgICAgbGV0IGhvc3Q6IHN0cmluZztcbiAgICAgICAgaWYgKHRoaXMuI3Byb3h5KSB7XG4gICAgICAgICAgY29uc3QgeEZvcndhcmRlZFByb3RvID0gc2VydmVyUmVxdWVzdC5oZWFkZXJzLmdldChcbiAgICAgICAgICAgIFwieC1mb3J3YXJkZWQtcHJvdG9cIixcbiAgICAgICAgICApO1xuICAgICAgICAgIGxldCBtYXliZVByb3RvID0geEZvcndhcmRlZFByb3RvXG4gICAgICAgICAgICA/IHhGb3J3YXJkZWRQcm90by5zcGxpdChcIixcIiwgMSlbMF0udHJpbSgpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgICAgIDogdW5kZWZpbmVkO1xuICAgICAgICAgIGlmIChtYXliZVByb3RvICE9PSBcImh0dHBcIiAmJiBtYXliZVByb3RvICE9PSBcImh0dHBzXCIpIHtcbiAgICAgICAgICAgIG1heWJlUHJvdG8gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIHByb3RvID0gbWF5YmVQcm90byA/PyBcImh0dHBcIjtcbiAgICAgICAgICBob3N0ID0gc2VydmVyUmVxdWVzdC5oZWFkZXJzLmdldChcIngtZm9yd2FyZGVkLWhvc3RcIikgPz9cbiAgICAgICAgICAgIHRoaXMuI3VybD8uaG9zdG5hbWUgPz9cbiAgICAgICAgICAgIHNlcnZlclJlcXVlc3QuaGVhZGVycy5nZXQoXCJob3N0XCIpID8/XG4gICAgICAgICAgICBzZXJ2ZXJSZXF1ZXN0LmhlYWRlcnMuZ2V0KFwiOmF1dGhvcml0eVwiKSA/PyBcIlwiO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHByb3RvID0gdGhpcy4jc2VjdXJlID8gXCJodHRwc1wiIDogXCJodHRwXCI7XG4gICAgICAgICAgaG9zdCA9IHNlcnZlclJlcXVlc3QuaGVhZGVycy5nZXQoXCJob3N0XCIpID8/XG4gICAgICAgICAgICBzZXJ2ZXJSZXF1ZXN0LmhlYWRlcnMuZ2V0KFwiOmF1dGhvcml0eVwiKSA/PyBcIlwiO1xuICAgICAgICB9XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgdGhpcy4jdXJsID0gbmV3IFVSTChgJHtwcm90b306Ly8ke2hvc3R9JHtzZXJ2ZXJSZXF1ZXN0LnVybH1gKTtcbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgICAgIGBUaGUgc2VydmVyIHJlcXVlc3QgVVJMIG9mIFwiJHtwcm90b306Ly8ke2hvc3R9JHtzZXJ2ZXJSZXF1ZXN0LnVybH1cIiBpcyBpbnZhbGlkLmAsXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy4jdXJsO1xuICB9XG5cbiAgLyoqIEFuIG9iamVjdCByZXByZXNlbnRpbmcgdGhlIHJlcXVlc3RpbmcgdXNlciBhZ2VudC4gSWYgdGhlIGBVc2VyLUFnZW50YFxuICAgKiBoZWFkZXIgaXNuJ3QgZGVmaW5lZCBpbiB0aGUgcmVxdWVzdCwgYWxsIHRoZSBwcm9wZXJ0aWVzIHdpbGwgYmUgdW5kZWZpbmVkLlxuICAgKlxuICAgKiBTZWUgW3N0ZC9odHRwL3VzZXJfYWdlbnQjVXNlckFnZW50XShodHRwczovL2Rlbm8ubGFuZC9zdGRAMC4yMjMvaHR0cC91c2VyX2FnZW50LnRzP3M9VXNlckFnZW50KVxuICAgKiBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cbiAgICovXG4gIGdldCB1c2VyQWdlbnQoKTogVXNlckFnZW50IHtcbiAgICByZXR1cm4gdGhpcy4jdXNlckFnZW50O1xuICB9XG5cbiAgY29uc3RydWN0b3IoXG4gICAgc2VydmVyUmVxdWVzdDogU2VydmVyUmVxdWVzdCxcbiAgICB7IHByb3h5ID0gZmFsc2UsIHNlY3VyZSA9IGZhbHNlLCBqc29uQm9keVJldml2ZXIgfTogT2FrUmVxdWVzdE9wdGlvbnMgPSB7fSxcbiAgKSB7XG4gICAgdGhpcy4jcHJveHkgPSBwcm94eTtcbiAgICB0aGlzLiNzZWN1cmUgPSBzZWN1cmU7XG4gICAgdGhpcy4jc2VydmVyUmVxdWVzdCA9IHNlcnZlclJlcXVlc3Q7XG4gICAgdGhpcy4jYm9keSA9IG5ldyBCb2R5KHNlcnZlclJlcXVlc3QsIGpzb25Cb2R5UmV2aXZlcik7XG4gICAgdGhpcy4jdXNlckFnZW50ID0gbmV3IFVzZXJBZ2VudChzZXJ2ZXJSZXF1ZXN0LmhlYWRlcnMuZ2V0KFwidXNlci1hZ2VudFwiKSk7XG4gIH1cblxuICAvKiogUmV0dXJucyBhbiBhcnJheSBvZiBtZWRpYSB0eXBlcywgYWNjZXB0ZWQgYnkgdGhlIHJlcXVlc3RvciwgaW4gb3JkZXIgb2ZcbiAgICogcHJlZmVyZW5jZS4gIElmIHRoZXJlIGFyZSBubyBlbmNvZGluZ3Mgc3VwcGxpZWQgYnkgdGhlIHJlcXVlc3RvcixcbiAgICogdGhlbiBhY2NlcHRpbmcgYW55IGlzIGltcGxpZWQgaXMgcmV0dXJuZWQuXG4gICAqL1xuICBhY2NlcHRzKCk6IHN0cmluZ1tdIHwgdW5kZWZpbmVkO1xuICAvKiogRm9yIGEgZ2l2ZW4gc2V0IG9mIG1lZGlhIHR5cGVzLCByZXR1cm4gdGhlIGJlc3QgbWF0Y2ggYWNjZXB0ZWQgYnkgdGhlXG4gICAqIHJlcXVlc3Rvci4gIElmIHRoZXJlIGFyZSBubyBlbmNvZGluZyB0aGF0IG1hdGNoLCB0aGVuIHRoZSBtZXRob2QgcmV0dXJuc1xuICAgKiBgdW5kZWZpbmVkYC5cbiAgICovXG4gIGFjY2VwdHMoLi4udHlwZXM6IHN0cmluZ1tdKTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBhY2NlcHRzKC4uLnR5cGVzOiBzdHJpbmdbXSk6IHN0cmluZyB8IHN0cmluZ1tdIHwgdW5kZWZpbmVkIHtcbiAgICBpZiAoIXRoaXMuI3NlcnZlclJlcXVlc3QuaGVhZGVycy5oYXMoXCJBY2NlcHRcIikpIHtcbiAgICAgIHJldHVybiB0eXBlcy5sZW5ndGggPyB0eXBlc1swXSA6IFtcIiovKlwiXTtcbiAgICB9XG4gICAgaWYgKHR5cGVzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIGFjY2VwdHModGhpcy4jc2VydmVyUmVxdWVzdCwgLi4udHlwZXMpO1xuICAgIH1cbiAgICByZXR1cm4gYWNjZXB0cyh0aGlzLiNzZXJ2ZXJSZXF1ZXN0KTtcbiAgfVxuXG4gIC8qKiBSZXR1cm5zIGFuIGFycmF5IG9mIGVuY29kaW5ncywgYWNjZXB0ZWQgYnkgdGhlIHJlcXVlc3RvciwgaW4gb3JkZXIgb2ZcbiAgICogcHJlZmVyZW5jZS4gIElmIHRoZXJlIGFyZSBubyBlbmNvZGluZ3Mgc3VwcGxpZWQgYnkgdGhlIHJlcXVlc3RvcixcbiAgICogdGhlbiBgW1wiKlwiXWAgaXMgcmV0dXJuZWQsIG1hdGNoaW5nIGFueS5cbiAgICovXG4gIGFjY2VwdHNFbmNvZGluZ3MoKTogc3RyaW5nW10gfCB1bmRlZmluZWQ7XG4gIC8qKiBGb3IgYSBnaXZlbiBzZXQgb2YgZW5jb2RpbmdzLCByZXR1cm4gdGhlIGJlc3QgbWF0Y2ggYWNjZXB0ZWQgYnkgdGhlXG4gICAqIHJlcXVlc3Rvci4gIElmIHRoZXJlIGFyZSBubyBlbmNvZGluZ3MgdGhhdCBtYXRjaCwgdGhlbiB0aGUgbWV0aG9kIHJldHVybnNcbiAgICogYHVuZGVmaW5lZGAuXG4gICAqXG4gICAqICoqTk9URToqKiBZb3Ugc2hvdWxkIGFsd2F5cyBzdXBwbHkgYGlkZW50aXR5YCBhcyBvbmUgb2YgdGhlIGVuY29kaW5nc1xuICAgKiB0byBlbnN1cmUgdGhhdCB0aGVyZSBpcyBhIG1hdGNoIHdoZW4gdGhlIGBBY2NlcHQtRW5jb2RpbmdgIGhlYWRlciBpcyBwYXJ0XG4gICAqIG9mIHRoZSByZXF1ZXN0LlxuICAgKi9cbiAgYWNjZXB0c0VuY29kaW5ncyguLi5lbmNvZGluZ3M6IHN0cmluZ1tdKTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBhY2NlcHRzRW5jb2RpbmdzKC4uLmVuY29kaW5nczogc3RyaW5nW10pOiBzdHJpbmdbXSB8IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgaWYgKCF0aGlzLiNzZXJ2ZXJSZXF1ZXN0LmhlYWRlcnMuaGFzKFwiQWNjZXB0LUVuY29kaW5nXCIpKSB7XG4gICAgICByZXR1cm4gZW5jb2RpbmdzLmxlbmd0aCA/IGVuY29kaW5nc1swXSA6IFtcIipcIl07XG4gICAgfVxuICAgIGlmIChlbmNvZGluZ3MubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gYWNjZXB0c0VuY29kaW5ncyh0aGlzLiNzZXJ2ZXJSZXF1ZXN0LCAuLi5lbmNvZGluZ3MpO1xuICAgIH1cbiAgICByZXR1cm4gYWNjZXB0c0VuY29kaW5ncyh0aGlzLiNzZXJ2ZXJSZXF1ZXN0KTtcbiAgfVxuXG4gIC8qKiBSZXR1cm5zIGFuIGFycmF5IG9mIGxhbmd1YWdlcywgYWNjZXB0ZWQgYnkgdGhlIHJlcXVlc3RvciwgaW4gb3JkZXIgb2ZcbiAgICogcHJlZmVyZW5jZS4gIElmIHRoZXJlIGFyZSBubyBsYW5ndWFnZXMgc3VwcGxpZWQgYnkgdGhlIHJlcXVlc3RvcixcbiAgICogYFtcIipcIl1gIGlzIHJldHVybmVkLCBpbmRpY2F0aW5nIGFueSBsYW5ndWFnZSBpcyBhY2NlcHRlZC5cbiAgICovXG4gIGFjY2VwdHNMYW5ndWFnZXMoKTogc3RyaW5nW10gfCB1bmRlZmluZWQ7XG4gIC8qKiBGb3IgYSBnaXZlbiBzZXQgb2YgbGFuZ3VhZ2VzLCByZXR1cm4gdGhlIGJlc3QgbWF0Y2ggYWNjZXB0ZWQgYnkgdGhlXG4gICAqIHJlcXVlc3Rvci4gIElmIHRoZXJlIGFyZSBubyBsYW5ndWFnZXMgdGhhdCBtYXRjaCwgdGhlbiB0aGUgbWV0aG9kIHJldHVybnNcbiAgICogYHVuZGVmaW5lZGAuICovXG4gIGFjY2VwdHNMYW5ndWFnZXMoLi4ubGFuZ3M6IHN0cmluZ1tdKTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBhY2NlcHRzTGFuZ3VhZ2VzKC4uLmxhbmdzOiBzdHJpbmdbXSk6IHN0cmluZ1tdIHwgc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgICBpZiAoIXRoaXMuI3NlcnZlclJlcXVlc3QuaGVhZGVycy5nZXQoXCJBY2NlcHQtTGFuZ3VhZ2VcIikpIHtcbiAgICAgIHJldHVybiBsYW5ncy5sZW5ndGggPyBsYW5nc1swXSA6IFtcIipcIl07XG4gICAgfVxuICAgIGlmIChsYW5ncy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBhY2NlcHRzTGFuZ3VhZ2VzKHRoaXMuI3NlcnZlclJlcXVlc3QsIC4uLmxhbmdzKTtcbiAgICB9XG4gICAgcmV0dXJuIGFjY2VwdHNMYW5ndWFnZXModGhpcy4jc2VydmVyUmVxdWVzdCk7XG4gIH1cblxuICAvKiogVGFrZSB0aGUgY3VycmVudCByZXF1ZXN0IGFuZCBpbml0aWF0ZSBzZXJ2ZXIgc2VudCBldmVudCBjb25uZWN0aW9uLlxuICAgKlxuICAgKiA+ICFbV0FSTklOR11cbiAgICogPiBUaGlzIGlzIG5vdCBpbnRlbmRlZCBmb3IgZGlyZWN0IHVzZSwgYXMgaXQgd2lsbCBub3QgbWFuYWdlIHRoZSB0YXJnZXQgaW5cbiAgICogPiB0aGUgb3ZlcmFsbCBjb250ZXh0IG9yIGVuc3VyZSB0aGF0IGFkZGl0aW9uYWwgbWlkZGxld2FyZSBkb2VzIG5vdCBhdHRlbXB0XG4gICAqID4gdG8gcmVzcG9uZCB0byB0aGUgcmVxdWVzdC5cbiAgICovXG4gIGFzeW5jIHNlbmRFdmVudHMoXG4gICAgb3B0aW9ucz86IFNlcnZlclNlbnRFdmVudFRhcmdldE9wdGlvbnMsXG4gICAgaW5pdD86IFJlcXVlc3RJbml0LFxuICApOiBQcm9taXNlPFNlcnZlclNlbnRFdmVudFRhcmdldD4ge1xuICAgIGNvbnN0IHNzZSA9IG5ldyBTZXJ2ZXJTZW50RXZlbnRTdHJlYW1UYXJnZXQob3B0aW9ucyk7XG4gICAgYXdhaXQgdGhpcy4jc2VydmVyUmVxdWVzdC5yZXNwb25kKHNzZS5hc1Jlc3BvbnNlKGluaXQpKTtcbiAgICByZXR1cm4gc3NlO1xuICB9XG5cbiAgLyoqIFRha2UgdGhlIGN1cnJlbnQgcmVxdWVzdCBhbmQgdXBncmFkZSBpdCB0byBhIHdlYiBzb2NrZXQsIHJldHVybmluZyBhIHdlYlxuICAgKiBzdGFuZGFyZCBgV2ViU29ja2V0YCBvYmplY3QuXG4gICAqXG4gICAqIElmIHRoZSB1bmRlcmx5aW5nIHNlcnZlciBhYnN0cmFjdGlvbiBkb2VzIG5vdCBzdXBwb3J0IHVwZ3JhZGVzLCB0aGlzIHdpbGxcbiAgICogdGhyb3cuXG4gICAqXG4gICAqID4gIVtXQVJOSU5HXVxuICAgKiA+IFRoaXMgaXMgbm90IGludGVuZGVkIGZvciBkaXJlY3QgdXNlLCBhcyBpdCB3aWxsIG5vdCBtYW5hZ2UgdGhlIHdlYnNvY2tldFxuICAgKiA+IGluIHRoZSBvdmVyYWxsIGNvbnRleHQgb3IgZW5zdXJlIHRoYXQgYWRkaXRpb25hbCBtaWRkbGV3YXJlIGRvZXMgbm90XG4gICAqID4gYXR0ZW1wdCB0byByZXNwb25kIHRvIHRoZSByZXF1ZXN0LlxuICAgKi9cbiAgdXBncmFkZShvcHRpb25zPzogVXBncmFkZVdlYlNvY2tldE9wdGlvbnMpOiBXZWJTb2NrZXQge1xuICAgIGlmICghdGhpcy4jc2VydmVyUmVxdWVzdC51cGdyYWRlKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiV2ViIHNvY2tldHMgdXBncmFkZSBub3Qgc3VwcG9ydGVkIGluIHRoaXMgcnVudGltZS5cIik7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLiNzZXJ2ZXJSZXF1ZXN0LnVwZ3JhZGUob3B0aW9ucyk7XG4gIH1cblxuICBbU3ltYm9sLmZvcihcIkRlbm8uY3VzdG9tSW5zcGVjdFwiKV0oXG4gICAgaW5zcGVjdDogKHZhbHVlOiB1bmtub3duKSA9PiBzdHJpbmcsXG4gICk6IHN0cmluZyB7XG4gICAgY29uc3QgeyBib2R5LCBoYXNCb2R5LCBoZWFkZXJzLCBpcCwgaXBzLCBtZXRob2QsIHNlY3VyZSwgdXJsLCB1c2VyQWdlbnQgfSA9XG4gICAgICB0aGlzO1xuICAgIHJldHVybiBgJHt0aGlzLmNvbnN0cnVjdG9yLm5hbWV9ICR7XG4gICAgICBpbnNwZWN0KHtcbiAgICAgICAgYm9keSxcbiAgICAgICAgaGFzQm9keSxcbiAgICAgICAgaGVhZGVycyxcbiAgICAgICAgaXAsXG4gICAgICAgIGlwcyxcbiAgICAgICAgbWV0aG9kLFxuICAgICAgICBzZWN1cmUsXG4gICAgICAgIHVybDogdXJsLnRvU3RyaW5nKCksXG4gICAgICAgIHVzZXJBZ2VudCxcbiAgICAgIH0pXG4gICAgfWA7XG4gIH1cblxuICBbU3ltYm9sLmZvcihcIm5vZGVqcy51dGlsLmluc3BlY3QuY3VzdG9tXCIpXShcbiAgICBkZXB0aDogbnVtYmVyLFxuICAgIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gICAgb3B0aW9uczogYW55LFxuICAgIGluc3BlY3Q6ICh2YWx1ZTogdW5rbm93biwgb3B0aW9ucz86IHVua25vd24pID0+IHN0cmluZyxcbiAgICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICApOiBhbnkge1xuICAgIGlmIChkZXB0aCA8IDApIHtcbiAgICAgIHJldHVybiBvcHRpb25zLnN0eWxpemUoYFske3RoaXMuY29uc3RydWN0b3IubmFtZX1dYCwgXCJzcGVjaWFsXCIpO1xuICAgIH1cblxuICAgIGNvbnN0IG5ld09wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCBvcHRpb25zLCB7XG4gICAgICBkZXB0aDogb3B0aW9ucy5kZXB0aCA9PT0gbnVsbCA/IG51bGwgOiBvcHRpb25zLmRlcHRoIC0gMSxcbiAgICB9KTtcbiAgICBjb25zdCB7IGJvZHksIGhhc0JvZHksIGhlYWRlcnMsIGlwLCBpcHMsIG1ldGhvZCwgc2VjdXJlLCB1cmwsIHVzZXJBZ2VudCB9ID1cbiAgICAgIHRoaXM7XG4gICAgcmV0dXJuIGAke29wdGlvbnMuc3R5bGl6ZSh0aGlzLmNvbnN0cnVjdG9yLm5hbWUsIFwic3BlY2lhbFwiKX0gJHtcbiAgICAgIGluc3BlY3QoXG4gICAgICAgIHsgYm9keSwgaGFzQm9keSwgaGVhZGVycywgaXAsIGlwcywgbWV0aG9kLCBzZWN1cmUsIHVybCwgdXNlckFnZW50IH0sXG4gICAgICAgIG5ld09wdGlvbnMsXG4gICAgICApXG4gICAgfWA7XG4gIH1cbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSx5RUFBeUU7QUFFekU7Ozs7OztDQU1DO0FBRUQsU0FBUyxJQUFJLFFBQVEsWUFBWTtBQUNqQyxTQUFTLDJCQUEyQixRQUFRLFlBQVk7QUFDeEQsU0FDRSxPQUFPLEVBQ1AsZ0JBQWdCLEVBQ2hCLGdCQUFnQixFQUloQixTQUFTLFFBQ0osWUFBWTtlQW9SaEIsT0FBTyxHQUFHLENBQUMsdUNBb0JYLE9BQU8sR0FBRyxDQUFDO0FBL1JkOzs7Ozs7O0NBT0MsR0FDRCxPQUFPLE1BQU07RUFDWCxDQUFBLElBQUssQ0FBTztFQUNaLENBQUEsS0FBTSxDQUFVO0VBQ2hCLENBQUEsTUFBTyxDQUFVO0VBQ2pCLENBQUEsYUFBYyxDQUFnQjtFQUM5QixDQUFBLEdBQUksQ0FBTztFQUNYLENBQUEsU0FBVSxDQUFZO0VBRXRCLENBQUEsYUFBYztJQUNaLE9BQU8sSUFBSSxDQUFDLENBQUEsYUFBYyxDQUFDLFVBQVUsSUFBSTtFQUMzQztFQUVBOztHQUVDLEdBQ0QsSUFB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
// denoCacheMetadata=11627976025312950123,7896891008459678701