// Copyright 2018-2025 the oak authors. All rights reserved. MIT license.
// deno-lint-ignore-file no-explicit-any
/**
 * A collection of utility APIs which can make testing of an oak application
 * easier.
 *
 * @module
 */ import { accepts, createHttpError, SecureCookieMap } from "./deps.ts";
import { Body } from "./body.ts";
import { Response } from "./response.ts";
/** Creates a mock of `Application`. */ export function createMockApp(state = {}) {
  const app = {
    state,
    use () {
      return app;
    },
    [Symbol.for("Deno.customInspect")] () {
      return "MockApplication {}";
    },
    [Symbol.for("nodejs.util.inspect.custom")] (depth, options, inspect) {
      if (depth < 0) {
        return options.stylize(`[MockApplication]`, "special");
      }
      const newOptions = Object.assign({}, options, {
        depth: options.depth === null ? null : options.depth - 1
      });
      return `${options.stylize("MockApplication", "special")} ${inspect({}, newOptions)}`;
    }
  };
  return app;
}
/** Allows external parties to modify the context state. */ export const mockContextState = {
  /** Adjusts the return value of the `acceptedEncodings` in the context's
   * `request` object. */ encodingsAccepted: "identity"
};
/** Create a mock of `Context` or `RouterContext`. */ export function createMockContext({ ip = "127.0.0.1", method = "GET", params, path = "/", state, app = createMockApp(state), headers: requestHeaders, body = undefined } = {}) {
  function createMockRequest() {
    const headers = new Headers(requestHeaders);
    return {
      get source () {
        return new globalThis.Request(new URL(path, "http://localhost/"), {
          method,
          headers
        });
      },
      accepts (...types) {
        if (!headers.has("Accept")) {
          return;
        }
        if (types.length) {
          return accepts({
            headers
          }, ...types);
        }
        return accepts({
          headers
        });
      },
      acceptsEncodings () {
        return mockContextState.encodingsAccepted;
      },
      headers,
      ip,
      method,
      path,
      search: undefined,
      searchParams: new URLSearchParams(),
      url: new URL(path, "http://localhost/"),
      hasBody: !!body,
      body: body ? new Body({
        headers,
        getBody: ()=>body
      }) : undefined
    };
  }
  const request = createMockRequest();
  const response = new Response(request);
  const cookies = new SecureCookieMap(request, {
    response
  });
  return {
    app,
    params,
    request,
    cookies,
    response,
    state: Object.assign({}, app.state),
    assert (condition, errorStatus = 500, message, props) {
      if (condition) {
        return;
      }
      const err = createHttpError(errorStatus, message);
      if (props) {
        Object.assign(err, props);
      }
      throw err;
    },
    throw (errorStatus, message, props) {
      const err = createHttpError(errorStatus, message);
      if (props) {
        Object.assign(err, props);
      }
      throw err;
    },
    [Symbol.for("Deno.customInspect")] () {
      return `MockContext {}`;
    },
    [Symbol.for("nodejs.util.inspect.custom")] (depth, options, inspect) {
      if (depth < 0) {
        return options.stylize(`[MockContext]`, "special");
      }
      const newOptions = Object.assign({}, options, {
        depth: options.depth === null ? null : options.depth - 1
      });
      return `${options.stylize("MockContext", "special")} ${inspect({}, newOptions)}`;
    }
  };
}
/** Creates a mock `next()` function which can be used when calling
 * middleware. */ export function createMockNext() {
  return async function next() {};
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvb2FrQHYxNy4xLjYvdGVzdGluZy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDI1IHRoZSBvYWsgYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIGxpY2Vuc2UuXG5cbi8vIGRlbm8tbGludC1pZ25vcmUtZmlsZSBuby1leHBsaWNpdC1hbnlcblxuLyoqXG4gKiBBIGNvbGxlY3Rpb24gb2YgdXRpbGl0eSBBUElzIHdoaWNoIGNhbiBtYWtlIHRlc3Rpbmcgb2YgYW4gb2FrIGFwcGxpY2F0aW9uXG4gKiBlYXNpZXIuXG4gKlxuICogQG1vZHVsZVxuICovXG5cbmltcG9ydCB0eXBlIHsgQXBwbGljYXRpb24sIFN0YXRlIH0gZnJvbSBcIi4vYXBwbGljYXRpb24udHNcIjtcbmltcG9ydCB7XG4gIGFjY2VwdHMsXG4gIGNyZWF0ZUh0dHBFcnJvcixcbiAgdHlwZSBFcnJvclN0YXR1cyxcbiAgU2VjdXJlQ29va2llTWFwLFxufSBmcm9tIFwiLi9kZXBzLnRzXCI7XG5pbXBvcnQgeyBCb2R5IH0gZnJvbSBcIi4vYm9keS50c1wiO1xuaW1wb3J0IHR5cGUgeyBSb3V0ZVBhcmFtcywgUm91dGVyQ29udGV4dCB9IGZyb20gXCIuL3JvdXRlci50c1wiO1xuaW1wb3J0IHR5cGUgeyBSZXF1ZXN0IH0gZnJvbSBcIi4vcmVxdWVzdC50c1wiO1xuaW1wb3J0IHsgUmVzcG9uc2UgfSBmcm9tIFwiLi9yZXNwb25zZS50c1wiO1xuXG4vKiogQ3JlYXRlcyBhIG1vY2sgb2YgYEFwcGxpY2F0aW9uYC4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVNb2NrQXBwPFxuICBTIGV4dGVuZHMgUmVjb3JkPFByb3BlcnR5S2V5LCBhbnk+ID0gUmVjb3JkPHN0cmluZywgYW55Pixcbj4oXG4gIHN0YXRlOiBTID0ge30gYXMgUyxcbik6IEFwcGxpY2F0aW9uPFM+IHtcbiAgY29uc3QgYXBwID0ge1xuICAgIHN0YXRlLFxuICAgIHVzZSgpIHtcbiAgICAgIHJldHVybiBhcHA7XG4gICAgfSxcbiAgICBbU3ltYm9sLmZvcihcIkRlbm8uY3VzdG9tSW5zcGVjdFwiKV0oKSB7XG4gICAgICByZXR1cm4gXCJNb2NrQXBwbGljYXRpb24ge31cIjtcbiAgICB9LFxuICAgIFtTeW1ib2wuZm9yKFwibm9kZWpzLnV0aWwuaW5zcGVjdC5jdXN0b21cIildKFxuICAgICAgZGVwdGg6IG51bWJlcixcbiAgICAgIG9wdGlvbnM6IGFueSxcbiAgICAgIGluc3BlY3Q6ICh2YWx1ZTogdW5rbm93biwgb3B0aW9ucz86IHVua25vd24pID0+IHN0cmluZyxcbiAgICApIHtcbiAgICAgIGlmIChkZXB0aCA8IDApIHtcbiAgICAgICAgcmV0dXJuIG9wdGlvbnMuc3R5bGl6ZShgW01vY2tBcHBsaWNhdGlvbl1gLCBcInNwZWNpYWxcIik7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IG5ld09wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCBvcHRpb25zLCB7XG4gICAgICAgIGRlcHRoOiBvcHRpb25zLmRlcHRoID09PSBudWxsID8gbnVsbCA6IG9wdGlvbnMuZGVwdGggLSAxLFxuICAgICAgfSk7XG4gICAgICByZXR1cm4gYCR7b3B0aW9ucy5zdHlsaXplKFwiTW9ja0FwcGxpY2F0aW9uXCIsIFwic3BlY2lhbFwiKX0gJHtcbiAgICAgICAgaW5zcGVjdCh7fSwgbmV3T3B0aW9ucylcbiAgICAgIH1gO1xuICAgIH0sXG4gIH0gYXMgYW55O1xuICByZXR1cm4gYXBwO1xufVxuXG4vKiogT3B0aW9ucyB0aGF0IGNhbiBiZSBzZXQgaW4gYSBtb2NrIGNvbnRleHQuICovXG5leHBvcnQgaW50ZXJmYWNlIE1vY2tDb250ZXh0T3B0aW9uczxcbiAgUiBleHRlbmRzIHN0cmluZyxcbiAgUCBleHRlbmRzIFJvdXRlUGFyYW1zPFI+ID0gUm91dGVQYXJhbXM8Uj4sXG4gIFMgZXh0ZW5kcyBTdGF0ZSA9IFJlY29yZDxzdHJpbmcsIGFueT4sXG4+IHtcbiAgYXBwPzogQXBwbGljYXRpb248Uz47XG4gIGlwPzogc3RyaW5nO1xuICBtZXRob2Q/OiBzdHJpbmc7XG4gIHBhcmFtcz86IFA7XG4gIHBhdGg/OiBzdHJpbmc7XG4gIHN0YXRlPzogUztcbiAgaGVhZGVycz86IFtzdHJpbmcsIHN0cmluZ11bXTtcbiAgYm9keT86IFJlYWRhYmxlU3RyZWFtO1xufVxuXG4vKiogQWxsb3dzIGV4dGVybmFsIHBhcnRpZXMgdG8gbW9kaWZ5IHRoZSBjb250ZXh0IHN0YXRlLiAqL1xuZXhwb3J0IGNvbnN0IG1vY2tDb250ZXh0U3RhdGUgPSB7XG4gIC8qKiBBZGp1c3RzIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhlIGBhY2NlcHRlZEVuY29kaW5nc2AgaW4gdGhlIGNvbnRleHQnc1xuICAgKiBgcmVxdWVzdGAgb2JqZWN0LiAqL1xuICBlbmNvZGluZ3NBY2NlcHRlZDogXCJpZGVudGl0eVwiLFxufTtcblxuLyoqIENyZWF0ZSBhIG1vY2sgb2YgYENvbnRleHRgIG9yIGBSb3V0ZXJDb250ZXh0YC4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVNb2NrQ29udGV4dDxcbiAgUiBleHRlbmRzIHN0cmluZyxcbiAgUCBleHRlbmRzIFJvdXRlUGFyYW1zPFI+ID0gUm91dGVQYXJhbXM8Uj4sXG4gIFMgZXh0ZW5kcyBTdGF0ZSA9IFJlY29yZDxzdHJpbmcsIGFueT4sXG4+KFxuICB7XG4gICAgaXAgPSBcIjEyNy4wLjAuMVwiLFxuICAgIG1ldGhvZCA9IFwiR0VUXCIsXG4gICAgcGFyYW1zLFxuICAgIHBhdGggPSBcIi9cIixcbiAgICBzdGF0ZSxcbiAgICBhcHAgPSBjcmVhdGVNb2NrQXBwKHN0YXRlKSxcbiAgICBoZWFkZXJzOiByZXF1ZXN0SGVhZGVycyxcbiAgICBib2R5ID0gdW5kZWZpbmVkLFxuICB9OiBNb2NrQ29udGV4dE9wdGlvbnM8Uj4gPSB7fSxcbik6IFJvdXRlckNvbnRleHQ8UiwgUCwgUz4ge1xuICBmdW5jdGlvbiBjcmVhdGVNb2NrUmVxdWVzdCgpOiBSZXF1ZXN0IHtcbiAgICBjb25zdCBoZWFkZXJzID0gbmV3IEhlYWRlcnMocmVxdWVzdEhlYWRlcnMpO1xuICAgIHJldHVybiB7XG4gICAgICBnZXQgc291cmNlKCk6IGdsb2JhbFRoaXMuUmVxdWVzdCB8IHVuZGVmaW5lZCB7XG4gICAgICAgIHJldHVybiBuZXcgZ2xvYmFsVGhpcy5SZXF1ZXN0KG5ldyBVUkwocGF0aCwgXCJodHRwOi8vbG9jYWxob3N0L1wiKSwge1xuICAgICAgICAgIG1ldGhvZCxcbiAgICAgICAgICBoZWFkZXJzLFxuICAgICAgICB9KTtcbiAgICAgIH0sXG4gICAgICBhY2NlcHRzKC4uLnR5cGVzOiBzdHJpbmdbXSkge1xuICAgICAgICBpZiAoIWhlYWRlcnMuaGFzKFwiQWNjZXB0XCIpKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlcy5sZW5ndGgpIHtcbiAgICAgICAgICByZXR1cm4gYWNjZXB0cyh7IGhlYWRlcnMgfSwgLi4udHlwZXMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhY2NlcHRzKHsgaGVhZGVycyB9KTtcbiAgICAgIH0sXG4gICAgICBhY2NlcHRzRW5jb2RpbmdzKCkge1xuICAgICAgICByZXR1cm4gbW9ja0NvbnRleHRTdGF0ZS5lbmNvZGluZ3NBY2NlcHRlZDtcbiAgICAgIH0sXG4gICAgICBoZWFkZXJzLFxuICAgICAgaXAsXG4gICAgICBtZXRob2QsXG4gICAgICBwYXRoLFxuICAgICAgc2VhcmNoOiB1bmRlZmluZWQsXG4gICAgICBzZWFyY2hQYXJhbXM6IG5ldyBVUkxTZWFyY2hQYXJhbXMoKSxcbiAgICAgIHVybDogbmV3IFVSTChwYXRoLCBcImh0dHA6Ly9sb2NhbGhvc3QvXCIpLFxuICAgICAgaGFzQm9keTogISFib2R5LFxuICAgICAgYm9keTogYm9keSA/IG5ldyBCb2R5KHsgaGVhZGVycywgZ2V0Qm9keTogKCkgPT4gYm9keSB9KSA6IHVuZGVmaW5lZCxcbiAgICB9IGFzIGFueTtcbiAgfVxuXG4gIGNvbnN0IHJlcXVlc3QgPSBjcmVhdGVNb2NrUmVxdWVzdCgpO1xuICBjb25zdCByZXNwb25zZSA9IG5ldyBSZXNwb25zZShyZXF1ZXN0KTtcbiAgY29uc3QgY29va2llcyA9IG5ldyBTZWN1cmVDb29raWVNYXAocmVxdWVzdCwgeyByZXNwb25zZSB9KTtcblxuICByZXR1cm4gKHtcbiAgICBhcHAsXG4gICAgcGFyYW1zLFxuICAgIHJlcXVlc3QsXG4gICAgY29va2llcyxcbiAgICByZXNwb25zZSxcbiAgICBzdGF0ZTogT2JqZWN0LmFzc2lnbih7fSwgYXBwLnN0YXRlKSxcbiAgICBhc3NlcnQoXG4gICAgICBjb25kaXRpb246IGFueSxcbiAgICAgIGVycm9yU3RhdHVzOiBFcnJvclN0YXR1cyA9IDUwMCxcbiAgICAgIG1lc3NhZ2U/OiBzdHJpbmcsXG4gICAgICBwcm9wcz86IFJlY29yZDxzdHJpbmcsIHVua25vd24+LFxuICAgICk6IGFzc2VydHMgY29uZGl0aW9uIHtcbiAgICAgIGlmIChjb25kaXRpb24pIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgZXJyID0gY3JlYXRlSHR0cEVycm9yKGVycm9yU3RhdHVzLCBtZXNzYWdlKTtcbiAgICAgIGlmIChwcm9wcykge1xuICAgICAgICBPYmplY3QuYXNzaWduKGVyciwgcHJvcHMpO1xuICAgICAgfVxuICAgICAgdGhyb3cgZXJyO1xuICAgIH0sXG4gICAgdGhyb3coXG4gICAgICBlcnJvclN0YXR1czogRXJyb3JTdGF0dXMsXG4gICAgICBtZXNzYWdlPzogc3RyaW5nLFxuICAgICAgcHJvcHM/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPixcbiAgICApOiBuZXZlciB7XG4gICAgICBjb25zdCBlcnIgPSBjcmVhdGVIdHRwRXJyb3IoZXJyb3JTdGF0dXMsIG1lc3NhZ2UpO1xuICAgICAgaWYgKHByb3BzKSB7XG4gICAgICAgIE9iamVjdC5hc3NpZ24oZXJyLCBwcm9wcyk7XG4gICAgICB9XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfSxcbiAgICBbU3ltYm9sLmZvcihcIkRlbm8uY3VzdG9tSW5zcGVjdFwiKV0oKSB7XG4gICAgICByZXR1cm4gYE1vY2tDb250ZXh0IHt9YDtcbiAgICB9LFxuICAgIFtTeW1ib2wuZm9yKFwibm9kZWpzLnV0aWwuaW5zcGVjdC5jdXN0b21cIildKFxuICAgICAgZGVwdGg6IG51bWJlcixcbiAgICAgIG9wdGlvbnM6IGFueSxcbiAgICAgIGluc3BlY3Q6ICh2YWx1ZTogdW5rbm93biwgb3B0aW9ucz86IHVua25vd24pID0+IHN0cmluZyxcbiAgICApIHtcbiAgICAgIGlmIChkZXB0aCA8IDApIHtcbiAgICAgICAgcmV0dXJuIG9wdGlvbnMuc3R5bGl6ZShgW01vY2tDb250ZXh0XWAsIFwic3BlY2lhbFwiKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgbmV3T3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMsIHtcbiAgICAgICAgZGVwdGg6IG9wdGlvbnMuZGVwdGggPT09IG51bGwgPyBudWxsIDogb3B0aW9ucy5kZXB0aCAtIDEsXG4gICAgICB9KTtcbiAgICAgIHJldHVybiBgJHtvcHRpb25zLnN0eWxpemUoXCJNb2NrQ29udGV4dFwiLCBcInNwZWNpYWxcIil9ICR7XG4gICAgICAgIGluc3BlY3Qoe30sIG5ld09wdGlvbnMpXG4gICAgICB9YDtcbiAgICB9LFxuICB9IGFzIHVua25vd24pIGFzIFJvdXRlckNvbnRleHQ8UiwgUCwgUz47XG59XG5cbi8qKiBDcmVhdGVzIGEgbW9jayBgbmV4dCgpYCBmdW5jdGlvbiB3aGljaCBjYW4gYmUgdXNlZCB3aGVuIGNhbGxpbmdcbiAqIG1pZGRsZXdhcmUuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTW9ja05leHQoKTogKCkgPT4gUHJvbWlzZTx2b2lkPiB7XG4gIHJldHVybiBhc3luYyBmdW5jdGlvbiBuZXh0KCkge307XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEseUVBQXlFO0FBRXpFLHdDQUF3QztBQUV4Qzs7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
// denoCacheMetadata=10815478212657802633,16772317908398117532