// Copyright 2018-2025 the oak authors. All rights reserved. MIT license.
/** The abstraction that oak uses when dealing with requests and responses
 * within the Deno runtime.
 *
 * @module
 */ var _computedKey;
import { NativeRequest } from "./http_server_native_request.ts";
import { createPromiseWithResolvers } from "./utils/create_promise_with_resolvers.ts";
const serve = "Deno" in globalThis && "serve" in globalThis.Deno ? globalThis.Deno.serve.bind(globalThis.Deno) : undefined;
_computedKey = Symbol.asyncIterator;
/** The oak abstraction of the Deno native HTTP server which is used internally
 * for handling native HTTP requests. Generally users of oak do not need to
 * worry about this class. */ // deno-lint-ignore no-explicit-any
export class Server {
  #app;
  #closed = false;
  #httpServer;
  #options;
  #stream;
  constructor(app, options){
    if (!serve) {
      throw new Error("The native bindings for serving HTTP are not available.");
    }
    this.#app = app;
    this.#options = options;
  }
  get app() {
    return this.#app;
  }
  get closed() {
    return this.#closed;
  }
  async close() {
    if (this.#closed) {
      return;
    }
    if (this.#httpServer) {
      this.#httpServer.unref();
      await this.#httpServer.shutdown();
      this.#httpServer = undefined;
    }
    this.#closed = true;
  }
  listen() {
    if (this.#httpServer) {
      throw new Error("Server already listening.");
    }
    const { signal } = this.#options;
    const { onListen, ...options } = this.#options;
    const { promise, resolve } = createPromiseWithResolvers();
    this.#stream = new ReadableStream({
      start: (controller)=>{
        this.#httpServer = serve?.({
          handler: (req, info)=>{
            const nativeRequest = new NativeRequest(req, info);
            controller.enqueue(nativeRequest);
            return nativeRequest.response;
          },
          onListen ({ hostname, port }) {
            if (onListen) {
              onListen({
                hostname,
                port
              });
            }
            resolve({
              addr: {
                hostname,
                port
              }
            });
          },
          signal,
          ...options
        });
      }
    });
    signal?.addEventListener("abort", ()=>this.close(), {
      once: true
    });
    return promise;
  }
  [_computedKey]() {
    if (!this.#stream) {
      throw new TypeError("Server hasn't started listening.");
    }
    return this.#stream[Symbol.asyncIterator]();
  }
  static type = "native";
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvb2FrQHYxNy4xLjYvaHR0cF9zZXJ2ZXJfbmF0aXZlLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjUgdGhlIG9hayBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cblxuLyoqIFRoZSBhYnN0cmFjdGlvbiB0aGF0IG9hayB1c2VzIHdoZW4gZGVhbGluZyB3aXRoIHJlcXVlc3RzIGFuZCByZXNwb25zZXNcbiAqIHdpdGhpbiB0aGUgRGVubyBydW50aW1lLlxuICpcbiAqIEBtb2R1bGVcbiAqL1xuXG5pbXBvcnQgdHlwZSB7IEFwcGxpY2F0aW9uLCBTdGF0ZSB9IGZyb20gXCIuL2FwcGxpY2F0aW9uLnRzXCI7XG5pbXBvcnQgeyBOYXRpdmVSZXF1ZXN0IH0gZnJvbSBcIi4vaHR0cF9zZXJ2ZXJfbmF0aXZlX3JlcXVlc3QudHNcIjtcbmltcG9ydCB0eXBlIHtcbiAgSHR0cFNlcnZlcixcbiAgTGlzdGVuZXIsXG4gIE9ha1NlcnZlcixcbiAgU2VydmVJbml0LFxuICBTZXJ2ZU9wdGlvbnMsXG4gIFNlcnZlVGxzT3B0aW9ucyxcbn0gZnJvbSBcIi4vdHlwZXMudHNcIjtcbmltcG9ydCB7IGNyZWF0ZVByb21pc2VXaXRoUmVzb2x2ZXJzIH0gZnJvbSBcIi4vdXRpbHMvY3JlYXRlX3Byb21pc2Vfd2l0aF9yZXNvbHZlcnMudHNcIjtcblxuY29uc3Qgc2VydmU6XG4gIHwgKChcbiAgICBvcHRpb25zOiBTZXJ2ZUluaXQgJiAoU2VydmVPcHRpb25zIHwgU2VydmVUbHNPcHRpb25zKSxcbiAgKSA9PiBIdHRwU2VydmVyKVxuICB8IHVuZGVmaW5lZCA9IFwiRGVub1wiIGluIGdsb2JhbFRoaXMgJiYgXCJzZXJ2ZVwiIGluIGdsb2JhbFRoaXMuRGVub1xuICAgID8gZ2xvYmFsVGhpcy5EZW5vLnNlcnZlLmJpbmQoZ2xvYmFsVGhpcy5EZW5vKVxuICAgIDogdW5kZWZpbmVkO1xuXG4vKiogVGhlIG9hayBhYnN0cmFjdGlvbiBvZiB0aGUgRGVubyBuYXRpdmUgSFRUUCBzZXJ2ZXIgd2hpY2ggaXMgdXNlZCBpbnRlcm5hbGx5XG4gKiBmb3IgaGFuZGxpbmcgbmF0aXZlIEhUVFAgcmVxdWVzdHMuIEdlbmVyYWxseSB1c2VycyBvZiBvYWsgZG8gbm90IG5lZWQgdG9cbiAqIHdvcnJ5IGFib3V0IHRoaXMgY2xhc3MuICovXG4vLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuZXhwb3J0IGNsYXNzIFNlcnZlcjxBUyBleHRlbmRzIFN0YXRlID0gUmVjb3JkPHN0cmluZywgYW55Pj5cbiAgaW1wbGVtZW50cyBPYWtTZXJ2ZXI8TmF0aXZlUmVxdWVzdD4ge1xuICAjYXBwOiBBcHBsaWNhdGlvbjxBUz47XG4gICNjbG9zZWQgPSBmYWxzZTtcbiAgI2h0dHBTZXJ2ZXI/OiBIdHRwU2VydmVyO1xuICAjb3B0aW9uczogU2VydmVPcHRpb25zIHwgU2VydmVUbHNPcHRpb25zO1xuICAjc3RyZWFtPzogUmVhZGFibGVTdHJlYW08TmF0aXZlUmVxdWVzdD47XG5cbiAgY29uc3RydWN0b3IoXG4gICAgYXBwOiBBcHBsaWNhdGlvbjxBUz4sXG4gICAgb3B0aW9uczogT21pdDxTZXJ2ZU9wdGlvbnMgfCBTZXJ2ZVRsc09wdGlvbnMsIFwic2lnbmFsXCI+LFxuICApIHtcbiAgICBpZiAoIXNlcnZlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIFwiVGhlIG5hdGl2ZSBiaW5kaW5ncyBmb3Igc2VydmluZyBIVFRQIGFyZSBub3QgYXZhaWxhYmxlLlwiLFxuICAgICAgKTtcbiAgICB9XG4gICAgdGhpcy4jYXBwID0gYXBwO1xuICAgIHRoaXMuI29wdGlvbnMgPSBvcHRpb25zO1xuICB9XG5cbiAgZ2V0IGFwcCgpOiBBcHBsaWNhdGlvbjxBUz4ge1xuICAgIHJldHVybiB0aGlzLiNhcHA7XG4gIH1cblxuICBnZXQgY2xvc2VkKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLiNjbG9zZWQ7XG4gIH1cblxuICBhc3luYyBjbG9zZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAodGhpcy4jY2xvc2VkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuI2h0dHBTZXJ2ZXIpIHtcbiAgICAgIHRoaXMuI2h0dHBTZXJ2ZXIudW5yZWYoKTtcbiAgICAgIGF3YWl0IHRoaXMuI2h0dHBTZXJ2ZXIuc2h1dGRvd24oKTtcbiAgICAgIHRoaXMuI2h0dHBTZXJ2ZXIgPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHRoaXMuI2Nsb3NlZCA9IHRydWU7XG4gIH1cblxuICBsaXN0ZW4oKTogUHJvbWlzZTxMaXN0ZW5lcj4ge1xuICAgIGlmICh0aGlzLiNodHRwU2VydmVyKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJTZXJ2ZXIgYWxyZWFkeSBsaXN0ZW5pbmcuXCIpO1xuICAgIH1cbiAgICBjb25zdCB7IHNpZ25hbCB9ID0gdGhpcy4jb3B0aW9ucztcbiAgICBjb25zdCB7IG9uTGlzdGVuLCAuLi5vcHRpb25zIH0gPSB0aGlzLiNvcHRpb25zO1xuICAgIGNvbnN0IHsgcHJvbWlzZSwgcmVzb2x2ZSB9ID0gY3JlYXRlUHJvbWlzZVdpdGhSZXNvbHZlcnM8TGlzdGVuZXI+KCk7XG4gICAgdGhpcy4jc3RyZWFtID0gbmV3IFJlYWRhYmxlU3RyZWFtPE5hdGl2ZVJlcXVlc3Q+KHtcbiAgICAgIHN0YXJ0OiAoY29udHJvbGxlcikgPT4ge1xuICAgICAgICB0aGlzLiNodHRwU2VydmVyID0gc2VydmU/Lih7XG4gICAgICAgICAgaGFuZGxlcjogKHJlcSwgaW5mbykgPT4ge1xuICAgICAgICAgICAgY29uc3QgbmF0aXZlUmVxdWVzdCA9IG5ldyBOYXRpdmVSZXF1ZXN0KHJlcSwgaW5mbyk7XG4gICAgICAgICAgICBjb250cm9sbGVyLmVucXVldWUobmF0aXZlUmVxdWVzdCk7XG4gICAgICAgICAgICByZXR1cm4gbmF0aXZlUmVxdWVzdC5yZXNwb25zZTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIG9uTGlzdGVuKHsgaG9zdG5hbWUsIHBvcnQgfSkge1xuICAgICAgICAgICAgaWYgKG9uTGlzdGVuKSB7XG4gICAgICAgICAgICAgIG9uTGlzdGVuKHsgaG9zdG5hbWUsIHBvcnQgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXNvbHZlKHsgYWRkcjogeyBob3N0bmFtZSwgcG9ydCB9IH0pO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgc2lnbmFsLFxuICAgICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIH0pO1xuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHNpZ25hbD8uYWRkRXZlbnRMaXN0ZW5lcihcImFib3J0XCIsICgpID0+IHRoaXMuY2xvc2UoKSwgeyBvbmNlOiB0cnVlIH0pO1xuICAgIHJldHVybiBwcm9taXNlO1xuICB9XG5cbiAgW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSgpOiBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8TmF0aXZlUmVxdWVzdD4ge1xuICAgIGlmICghdGhpcy4jc3RyZWFtKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU2VydmVyIGhhc24ndCBzdGFydGVkIGxpc3RlbmluZy5cIik7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLiNzdHJlYW1bU3ltYm9sLmFzeW5jSXRlcmF0b3JdKCk7XG4gIH1cblxuICBzdGF0aWMgdHlwZTogXCJuYXRpdmVcIiA9IFwibmF0aXZlXCI7XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEseUVBQXlFO0FBRXpFOzs7O0NBSUM7QUFHRCxTQUFTLGFBQWEsUUFBUSxrQ0FBa0M7QUFTaEUsU0FBUywwQkFBMEIsUUFBUSwyQ0FBMkM7QUFFdEYsTUFBTSxRQUlVLFVBQVUsY0FBYyxXQUFXLFdBQVcsSUFBSSxHQUM1RCxXQUFXLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsSUFBSSxJQUMxQztlQStFSCxPQUFPLGFBQWE7QUE3RXZCOzsyQkFFMkIsR0FDM0IsbUNBQW1DO0FBQ25DLE9BQU8sTUFBTTtFQUVYLENBQUEsR0FBSSxDQUFrQjtFQUN0QixDQUFBLE1BQU8sR0FBRyxNQUFNO0VBQ2hCLENBQUEsVUFBVyxDQUFjO0VBQ3pCLENBQUEsT0FBUSxDQUFpQztFQUN6QyxDQUFBLE1BQU8sQ0FBaUM7RUFFeEMsWUFDRSxHQUFvQixFQUNwQixPQUF1RCxDQUN2RDtJQUNBLElBQUksQ0FBQyxPQUFPO01BQ1YsTUFBTSxJQUFJLE1BQ1I7SUFFSjtJQUNBLElBQUksQ0FBQyxDQUFBLEdBQUksR0FBRztJQUNaLElBQUksQ0FBQyxDQUFBLE9BQVEsR0FBRztFQUNsQjtFQUVBLElBQUksTUFBdUI7SUFDekIsT0FBTyxJQUFJLENBQUMsQ0FBQSxHQUFJO0VBQ2xCO0VBRUEsSUFBSSxTQUFrQjtJQUNwQixPQUFPLElBQUksQ0FBQyxDQUFBLE1BQU87RUFDckI7RUFFQSxNQUFNLFFBQXVCO0lBQzNCLElBQUksSUFBSSxDQUFDLENBQUEsTUFBTyxFQUFFO01BQ2hCO0lBQ0Y7SUFFQSxJQUFJLElBQUksQ0FBQyxDQUFBLFVBQVcsRUFBRTtNQUNwQixJQUFJLENBQUMsQ0FBQSxVQUFXLENBQUMsS0FBSztNQUN0QixNQUFNLElBQUksQ0FBQyxDQUFBLFVBQVcsQ0FBQyxRQUFRO01BQy9CLElBQUksQ0FBQyxDQUFBLFVBQVcsR0FBRztJQUNyQjtJQUNBLElBQUksQ0FBQyxDQUFBLE1BQU8sR0FBRztFQUNqQjtFQUVBLFNBQTRCO0lBQzFCLElBQUksSUFBSSxDQUFDLENBQUEsVUFBVyxFQUFFO01BQ3BCLE1BQU0sSUFBSSxNQUFNO0lBQ2xCO0lBQ0EsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFBLE9BQVE7SUFDaEMsTUFBTSxFQUFFLFFBQVEsRUFBRSxHQUFHLFNBQVMsR0FBRyxJQUFJLENBQUMsQ0FBQSxPQUFRO0lBQzlDLE1BQU0sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEdBQUc7SUFDN0IsSUFBSSxDQUFDLENBQUEsTUFBTyxHQUFHLElBQUksZUFBOEI7TUFDL0MsT0FBTyxDQUFDO1FBQ04sSUFBSSxDQUFDLENBQUEsVUFBVyxHQUFHLFFBQVE7VUFDekIsU0FBUyxDQUFDLEtBQUs7WUFDYixNQUFNLGdCQUFnQixJQUFJLGNBQWMsS0FBSztZQUM3QyxXQUFXLE9BQU8sQ0FBQztZQUNuQixPQUFPLGNBQWMsUUFBUTtVQUMvQjtVQUNBLFVBQVMsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFO1lBQ3pCLElBQUksVUFBVTtjQUNaLFNBQVM7Z0JBQUU7Z0JBQVU7Y0FBSztZQUM1QjtZQUNBLFFBQVE7Y0FBRSxNQUFNO2dCQUFFO2dCQUFVO2NBQUs7WUFBRTtVQUNyQztVQUNBO1VBQ0EsR0FBRyxPQUFPO1FBQ1o7TUFDRjtJQUNGO0lBRUEsUUFBUSxpQkFBaUIsU0FBUyxJQUFNLElBQUksQ0FBQyxLQUFLLElBQUk7TUFBRSxNQUFNO0lBQUs7SUFDbkUsT0FBTztFQUNUO0VBRUEsaUJBQStEO0lBQzdELElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQSxNQUFPLEVBQUU7TUFDakIsTUFBTSxJQUFJLFVBQVU7SUFDdEI7SUFDQSxPQUFPLElBQUksQ0FBQyxDQUFBLE1BQU8sQ0FBQyxPQUFPLGFBQWEsQ0FBQztFQUMzQztFQUVBLE9BQU8sT0FBaUIsU0FBUztBQUNuQyJ9
// denoCacheMetadata=10458175921953759253,15625014062005417045