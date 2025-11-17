// Copyright 2018-2025 the oak authors. All rights reserved. MIT license.
/**
 * A middleware framework for handling HTTP with [Deno CLI](https://deno.land),
 * [Deno Deploy](https://deno.com/deploy),
 * [Cloudflare Workers](https://workers.cloudflare.com/),
 * [Node.js](https://nodejs.org/), and [Bun](https://bun.sh/).
 *
 * oak is inspired by [koa](https://koajs.com/).
 *
 * ## Example server
 *
 * A minimal router server which responds with content on `/`.
 *
 * ### Deno CLI and Deno Deploy
 *
 * ```ts
 * import { Application } from "jsr:@oak/oak/application";
 * import { Router } from "jsr:@oak/oak/router";
 *
 * const router = new Router();
 * router.get("/", (ctx) => {
 *   ctx.response.body = `<!DOCTYPE html>
 *     <html>
 *       <head><title>Hello oak!</title><head>
 *       <body>
 *         <h1>Hello oak!</h1>
 *       </body>
 *     </html>
 *   `;
 * });
 *
 * const app = new Application();
 * app.use(router.routes());
 * app.use(router.allowedMethods());
 *
 * app.listen({ port: 8080 });
 * ```
 *
 * ### Node.js and Bun
 *
 * You will have to install the package and then:
 *
 * ```ts
 * import { Application } from "@oak/oak/application";
 * import { Router } from "@oak/oak/router";
 *
 * const router = new Router();
 * router.get("/", (ctx) => {
 *   ctx.response.body = `<!DOCTYPE html>
 *     <html>
 *       <head><title>Hello oak!</title><head>
 *       <body>
 *         <h1>Hello oak!</h1>
 *       </body>
 *     </html>
 *   `;
 * });
 *
 * const app = new Application();
 * app.use(router.routes());
 * app.use(router.allowedMethods());
 *
 * app.listen({ port: 8080 });
 * ```
 *
 * ### Cloudflare Workers
 *
 * You will have to install the package and then:
 *
 * ```ts
 * import { Application } from "@oak/oak/application";
 * import { Router } from "@oak/oak/router";
 *
 * const router = new Router();
 * router.get("/", (ctx) => {
 *   ctx.response.body = `<!DOCTYPE html>
 *     <html>
 *       <head><title>Hello oak!</title><head>
 *       <body>
 *         <h1>Hello oak!</h1>
 *       </body>
 *     </html>
 *   `;
 * });
 *
 * const app = new Application();
 * app.use(router.routes());
 * app.use(router.allowedMethods());
 *
 * export default { fetch: app.fetch };
 * ```
 *
 * @module
 */ export { Application } from "./application.ts";
export { Context } from "./context.ts";
export { Server as HttpServerNative } from "./http_server_native.ts";
export * as etag from "./middleware/etag.ts";
export { proxy } from "./middleware/proxy.ts";
export { route, RouteContext, serve, ServeContext } from "./middleware/serve.ts";
export { compose as composeMiddleware } from "./middleware.ts";
export { Request } from "./request.ts";
export { REDIRECT_BACK, Response } from "./response.ts";
export { Router } from "./router.ts";
export { send } from "./send.ts";
/** Utilities for making testing oak servers easier. */ export * as testing from "./testing.ts";
// Re-exported from `std/http`
export { createHttpError, errors as httpErrors, HttpError, isErrorStatus, isHttpError, isRedirectStatus, SecureCookieMap as Cookies, ServerSentEvent, Status, STATUS_TEXT } from "./deps.ts";
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvb2FrQHYxNy4xLjYvbW9kLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjUgdGhlIG9hayBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cblxuLyoqXG4gKiBBIG1pZGRsZXdhcmUgZnJhbWV3b3JrIGZvciBoYW5kbGluZyBIVFRQIHdpdGggW0Rlbm8gQ0xJXShodHRwczovL2Rlbm8ubGFuZCksXG4gKiBbRGVubyBEZXBsb3ldKGh0dHBzOi8vZGVuby5jb20vZGVwbG95KSxcbiAqIFtDbG91ZGZsYXJlIFdvcmtlcnNdKGh0dHBzOi8vd29ya2Vycy5jbG91ZGZsYXJlLmNvbS8pLFxuICogW05vZGUuanNdKGh0dHBzOi8vbm9kZWpzLm9yZy8pLCBhbmQgW0J1bl0oaHR0cHM6Ly9idW4uc2gvKS5cbiAqXG4gKiBvYWsgaXMgaW5zcGlyZWQgYnkgW2tvYV0oaHR0cHM6Ly9rb2Fqcy5jb20vKS5cbiAqXG4gKiAjIyBFeGFtcGxlIHNlcnZlclxuICpcbiAqIEEgbWluaW1hbCByb3V0ZXIgc2VydmVyIHdoaWNoIHJlc3BvbmRzIHdpdGggY29udGVudCBvbiBgL2AuXG4gKlxuICogIyMjIERlbm8gQ0xJIGFuZCBEZW5vIERlcGxveVxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBBcHBsaWNhdGlvbiB9IGZyb20gXCJqc3I6QG9hay9vYWsvYXBwbGljYXRpb25cIjtcbiAqIGltcG9ydCB7IFJvdXRlciB9IGZyb20gXCJqc3I6QG9hay9vYWsvcm91dGVyXCI7XG4gKlxuICogY29uc3Qgcm91dGVyID0gbmV3IFJvdXRlcigpO1xuICogcm91dGVyLmdldChcIi9cIiwgKGN0eCkgPT4ge1xuICogICBjdHgucmVzcG9uc2UuYm9keSA9IGA8IURPQ1RZUEUgaHRtbD5cbiAqICAgICA8aHRtbD5cbiAqICAgICAgIDxoZWFkPjx0aXRsZT5IZWxsbyBvYWshPC90aXRsZT48aGVhZD5cbiAqICAgICAgIDxib2R5PlxuICogICAgICAgICA8aDE+SGVsbG8gb2FrITwvaDE+XG4gKiAgICAgICA8L2JvZHk+XG4gKiAgICAgPC9odG1sPlxuICogICBgO1xuICogfSk7XG4gKlxuICogY29uc3QgYXBwID0gbmV3IEFwcGxpY2F0aW9uKCk7XG4gKiBhcHAudXNlKHJvdXRlci5yb3V0ZXMoKSk7XG4gKiBhcHAudXNlKHJvdXRlci5hbGxvd2VkTWV0aG9kcygpKTtcbiAqXG4gKiBhcHAubGlzdGVuKHsgcG9ydDogODA4MCB9KTtcbiAqIGBgYFxuICpcbiAqICMjIyBOb2RlLmpzIGFuZCBCdW5cbiAqXG4gKiBZb3Ugd2lsbCBoYXZlIHRvIGluc3RhbGwgdGhlIHBhY2thZ2UgYW5kIHRoZW46XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IEFwcGxpY2F0aW9uIH0gZnJvbSBcIkBvYWsvb2FrL2FwcGxpY2F0aW9uXCI7XG4gKiBpbXBvcnQgeyBSb3V0ZXIgfSBmcm9tIFwiQG9hay9vYWsvcm91dGVyXCI7XG4gKlxuICogY29uc3Qgcm91dGVyID0gbmV3IFJvdXRlcigpO1xuICogcm91dGVyLmdldChcIi9cIiwgKGN0eCkgPT4ge1xuICogICBjdHgucmVzcG9uc2UuYm9keSA9IGA8IURPQ1RZUEUgaHRtbD5cbiAqICAgICA8aHRtbD5cbiAqICAgICAgIDxoZWFkPjx0aXRsZT5IZWxsbyBvYWshPC90aXRsZT48aGVhZD5cbiAqICAgICAgIDxib2R5PlxuICogICAgICAgICA8aDE+SGVsbG8gb2FrITwvaDE+XG4gKiAgICAgICA8L2JvZHk+XG4gKiAgICAgPC9odG1sPlxuICogICBgO1xuICogfSk7XG4gKlxuICogY29uc3QgYXBwID0gbmV3IEFwcGxpY2F0aW9uKCk7XG4gKiBhcHAudXNlKHJvdXRlci5yb3V0ZXMoKSk7XG4gKiBhcHAudXNlKHJvdXRlci5hbGxvd2VkTWV0aG9kcygpKTtcbiAqXG4gKiBhcHAubGlzdGVuKHsgcG9ydDogODA4MCB9KTtcbiAqIGBgYFxuICpcbiAqICMjIyBDbG91ZGZsYXJlIFdvcmtlcnNcbiAqXG4gKiBZb3Ugd2lsbCBoYXZlIHRvIGluc3RhbGwgdGhlIHBhY2thZ2UgYW5kIHRoZW46XG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IEFwcGxpY2F0aW9uIH0gZnJvbSBcIkBvYWsvb2FrL2FwcGxpY2F0aW9uXCI7XG4gKiBpbXBvcnQgeyBSb3V0ZXIgfSBmcm9tIFwiQG9hay9vYWsvcm91dGVyXCI7XG4gKlxuICogY29uc3Qgcm91dGVyID0gbmV3IFJvdXRlcigpO1xuICogcm91dGVyLmdldChcIi9cIiwgKGN0eCkgPT4ge1xuICogICBjdHgucmVzcG9uc2UuYm9keSA9IGA8IURPQ1RZUEUgaHRtbD5cbiAqICAgICA8aHRtbD5cbiAqICAgICAgIDxoZWFkPjx0aXRsZT5IZWxsbyBvYWshPC90aXRsZT48aGVhZD5cbiAqICAgICAgIDxib2R5PlxuICogICAgICAgICA8aDE+SGVsbG8gb2FrITwvaDE+XG4gKiAgICAgICA8L2JvZHk+XG4gKiAgICAgPC9odG1sPlxuICogICBgO1xuICogfSk7XG4gKlxuICogY29uc3QgYXBwID0gbmV3IEFwcGxpY2F0aW9uKCk7XG4gKiBhcHAudXNlKHJvdXRlci5yb3V0ZXMoKSk7XG4gKiBhcHAudXNlKHJvdXRlci5hbGxvd2VkTWV0aG9kcygpKTtcbiAqXG4gKiBleHBvcnQgZGVmYXVsdCB7IGZldGNoOiBhcHAuZmV0Y2ggfTtcbiAqIGBgYFxuICpcbiAqIEBtb2R1bGVcbiAqL1xuXG5leHBvcnQge1xuICBBcHBsaWNhdGlvbixcbiAgdHlwZSBBcHBsaWNhdGlvbk9wdGlvbnMsXG4gIHR5cGUgTGlzdGVuT3B0aW9ucyxcbiAgdHlwZSBMaXN0ZW5PcHRpb25zQmFzZSxcbiAgdHlwZSBMaXN0ZW5PcHRpb25zVGxzLFxuICB0eXBlIFN0YXRlLFxufSBmcm9tIFwiLi9hcHBsaWNhdGlvbi50c1wiO1xuZXhwb3J0IHR5cGUgeyBCb2R5VHlwZSB9IGZyb20gXCIuL2JvZHkudHNcIjtcbmV4cG9ydCB7IENvbnRleHQsIHR5cGUgQ29udGV4dFNlbmRPcHRpb25zIH0gZnJvbSBcIi4vY29udGV4dC50c1wiO1xuZXhwb3J0IHsgU2VydmVyIGFzIEh0dHBTZXJ2ZXJOYXRpdmUgfSBmcm9tIFwiLi9odHRwX3NlcnZlcl9uYXRpdmUudHNcIjtcbmV4cG9ydCB7IHR5cGUgTmF0aXZlUmVxdWVzdCB9IGZyb20gXCIuL2h0dHBfc2VydmVyX25hdGl2ZV9yZXF1ZXN0LnRzXCI7XG5leHBvcnQgKiBhcyBldGFnIGZyb20gXCIuL21pZGRsZXdhcmUvZXRhZy50c1wiO1xuZXhwb3J0IHsgcHJveHksIHR5cGUgUHJveHlPcHRpb25zIH0gZnJvbSBcIi4vbWlkZGxld2FyZS9wcm94eS50c1wiO1xuZXhwb3J0IHtcbiAgcm91dGUsXG4gIFJvdXRlQ29udGV4dCxcbiAgc2VydmUsXG4gIFNlcnZlQ29udGV4dCxcbn0gZnJvbSBcIi4vbWlkZGxld2FyZS9zZXJ2ZS50c1wiO1xuZXhwb3J0IHtcbiAgY29tcG9zZSBhcyBjb21wb3NlTWlkZGxld2FyZSxcbiAgdHlwZSBNaWRkbGV3YXJlLFxuICB0eXBlIE1pZGRsZXdhcmVPYmplY3QsXG4gIHR5cGUgTWlkZGxld2FyZU9yTWlkZGxld2FyZU9iamVjdCxcbiAgdHlwZSBOZXh0LFxufSBmcm9tIFwiLi9taWRkbGV3YXJlLnRzXCI7XG5leHBvcnQgeyBSZXF1ZXN0IH0gZnJvbSBcIi4vcmVxdWVzdC50c1wiO1xuZXhwb3J0IHsgUkVESVJFQ1RfQkFDSywgUmVzcG9uc2UgfSBmcm9tIFwiLi9yZXNwb25zZS50c1wiO1xuZXhwb3J0IHtcbiAgdHlwZSBSb3V0ZSxcbiAgdHlwZSBSb3V0ZVBhcmFtcyxcbiAgUm91dGVyLFxuICB0eXBlIFJvdXRlckFsbG93ZWRNZXRob2RzT3B0aW9ucyxcbiAgdHlwZSBSb3V0ZXJDb250ZXh0LFxuICB0eXBlIFJvdXRlck1pZGRsZXdhcmUsXG4gIHR5cGUgUm91dGVyT3B0aW9ucyxcbiAgdHlwZSBSb3V0ZXJQYXJhbU1pZGRsZXdhcmUsXG59IGZyb20gXCIuL3JvdXRlci50c1wiO1xuZXhwb3J0IHsgc2VuZCwgdHlwZSBTZW5kT3B0aW9ucyB9IGZyb20gXCIuL3NlbmQudHNcIjtcbi8qKiBVdGlsaXRpZXMgZm9yIG1ha2luZyB0ZXN0aW5nIG9hayBzZXJ2ZXJzIGVhc2llci4gKi9cbmV4cG9ydCAqIGFzIHRlc3RpbmcgZnJvbSBcIi4vdGVzdGluZy50c1wiO1xuZXhwb3J0IHsgdHlwZSBTZXJ2ZXJDb25zdHJ1Y3RvciB9IGZyb20gXCIuL3R5cGVzLnRzXCI7XG5cbi8vIFJlLWV4cG9ydGVkIGZyb20gYHN0ZC9odHRwYFxuZXhwb3J0IHtcbiAgY3JlYXRlSHR0cEVycm9yLFxuICBlcnJvcnMgYXMgaHR0cEVycm9ycyxcbiAgdHlwZSBFcnJvclN0YXR1cyxcbiAgSHR0cEVycm9yLFxuICB0eXBlIEhUVFBNZXRob2RzLFxuICBpc0Vycm9yU3RhdHVzLFxuICBpc0h0dHBFcnJvcixcbiAgaXNSZWRpcmVjdFN0YXR1cyxcbiAgdHlwZSBSZWRpcmVjdFN0YXR1cyxcbiAgU2VjdXJlQ29va2llTWFwIGFzIENvb2tpZXMsXG4gIHR5cGUgU2VjdXJlQ29va2llTWFwR2V0T3B0aW9ucyBhcyBDb29raWVzR2V0T3B0aW9ucyxcbiAgdHlwZSBTZWN1cmVDb29raWVNYXBTZXREZWxldGVPcHRpb25zIGFzIENvb2tpZXNTZXREZWxldGVPcHRpb25zLFxuICBTZXJ2ZXJTZW50RXZlbnQsXG4gIHR5cGUgU2VydmVyU2VudEV2ZW50SW5pdCxcbiAgdHlwZSBTZXJ2ZXJTZW50RXZlbnRUYXJnZXQsXG4gIFN0YXR1cyxcbiAgU1RBVFVTX1RFWFQsXG59IGZyb20gXCIuL2RlcHMudHNcIjtcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSx5RUFBeUU7QUFFekU7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0NBNEZDLEdBRUQsU0FDRSxXQUFXLFFBTU4sbUJBQW1CO0FBRTFCLFNBQVMsT0FBTyxRQUFpQyxlQUFlO0FBQ2hFLFNBQVMsVUFBVSxnQkFBZ0IsUUFBUSwwQkFBMEI7QUFFckUsT0FBTyxLQUFLLElBQUksTUFBTSx1QkFBdUI7QUFDN0MsU0FBUyxLQUFLLFFBQTJCLHdCQUF3QjtBQUNqRSxTQUNFLEtBQUssRUFDTCxZQUFZLEVBQ1osS0FBSyxFQUNMLFlBQVksUUFDUCx3QkFBd0I7QUFDL0IsU0FDRSxXQUFXLGlCQUFpQixRQUt2QixrQkFBa0I7QUFDekIsU0FBUyxPQUFPLFFBQVEsZUFBZTtBQUN2QyxTQUFTLGFBQWEsRUFBRSxRQUFRLFFBQVEsZ0JBQWdCO0FBQ3hELFNBR0UsTUFBTSxRQU1ELGNBQWM7QUFDckIsU0FBUyxJQUFJLFFBQTBCLFlBQVk7QUFDbkQscURBQXFELEdBQ3JELE9BQU8sS0FBSyxPQUFPLE1BQU0sZUFBZTtBQUd4Qyw4QkFBOEI7QUFDOUIsU0FDRSxlQUFlLEVBQ2YsVUFBVSxVQUFVLEVBRXBCLFNBQVMsRUFFVCxhQUFhLEVBQ2IsV0FBVyxFQUNYLGdCQUFnQixFQUVoQixtQkFBbUIsT0FBTyxFQUcxQixlQUFlLEVBR2YsTUFBTSxFQUNOLFdBQVcsUUFDTixZQUFZIn0=
// denoCacheMetadata=2146958443528868518,12906662325052983990