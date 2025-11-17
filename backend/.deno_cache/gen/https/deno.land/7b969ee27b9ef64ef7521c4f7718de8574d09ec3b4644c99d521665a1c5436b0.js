// Copyright 2018-2025 the oak authors. All rights reserved. MIT license.
import { BODY_TYPES } from "./consts.ts";
const encoder = new TextEncoder();
/**
 * Create a `ReadableStream<Uint8Array>` from an `AsyncIterable`.
 */ export function readableStreamFromAsyncIterable(source) {
  return new ReadableStream({
    async start (controller) {
      for await (const chunk of source){
        if (BODY_TYPES.includes(typeof chunk)) {
          controller.enqueue(encoder.encode(String(chunk)));
        } else if (chunk instanceof Uint8Array) {
          controller.enqueue(chunk);
        } else if (ArrayBuffer.isView(chunk)) {
          controller.enqueue(new Uint8Array(chunk.buffer));
        } else if (chunk instanceof ArrayBuffer) {
          controller.enqueue(new Uint8Array(chunk));
        } else {
          try {
            controller.enqueue(encoder.encode(JSON.stringify(chunk)));
          } catch  {
          // we just swallow errors here
          }
        }
      }
      controller.close();
    }
  });
}
/** A utility class that transforms "any" chunk into an `Uint8Array`. */ export class Uint8ArrayTransformStream extends TransformStream {
  constructor(){
    const init = {
      async transform (chunk, controller) {
        chunk = await chunk;
        switch(typeof chunk){
          case "object":
            if (chunk === null) {
              controller.terminate();
            } else if (ArrayBuffer.isView(chunk)) {
              controller.enqueue(new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength));
            } else if (Array.isArray(chunk) && chunk.every((value)=>typeof value === "number")) {
              controller.enqueue(new Uint8Array(chunk));
            } else if (typeof chunk.valueOf === "function" && chunk.valueOf() !== chunk) {
              this.transform(chunk.valueOf(), controller);
            } else if ("toJSON" in chunk) {
              this.transform(JSON.stringify(chunk), controller);
            }
            break;
          case "symbol":
            controller.error(new TypeError("Cannot transform a symbol to a Uint8Array"));
            break;
          case "undefined":
            controller.error(new TypeError("Cannot transform undefined to a Uint8Array"));
            break;
          default:
            controller.enqueue(this.encoder.encode(String(chunk)));
        }
      },
      encoder
    };
    super(init);
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvb2FrQHYxNy4xLjYvdXRpbHMvc3RyZWFtcy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDI1IHRoZSBvYWsgYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIGxpY2Vuc2UuXG5cbmltcG9ydCB7IEJPRFlfVFlQRVMgfSBmcm9tIFwiLi9jb25zdHMudHNcIjtcblxuY29uc3QgZW5jb2RlciA9IG5ldyBUZXh0RW5jb2RlcigpO1xuXG4vKipcbiAqIENyZWF0ZSBhIGBSZWFkYWJsZVN0cmVhbTxVaW50OEFycmF5PmAgZnJvbSBhbiBgQXN5bmNJdGVyYWJsZWAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkYWJsZVN0cmVhbUZyb21Bc3luY0l0ZXJhYmxlKFxuICBzb3VyY2U6IEFzeW5jSXRlcmFibGU8dW5rbm93bj4sXG4pOiBSZWFkYWJsZVN0cmVhbTxVaW50OEFycmF5PiB7XG4gIHJldHVybiBuZXcgUmVhZGFibGVTdHJlYW0oe1xuICAgIGFzeW5jIHN0YXJ0KGNvbnRyb2xsZXIpIHtcbiAgICAgIGZvciBhd2FpdCAoY29uc3QgY2h1bmsgb2Ygc291cmNlKSB7XG4gICAgICAgIGlmIChCT0RZX1RZUEVTLmluY2x1ZGVzKHR5cGVvZiBjaHVuaykpIHtcbiAgICAgICAgICBjb250cm9sbGVyLmVucXVldWUoZW5jb2Rlci5lbmNvZGUoU3RyaW5nKGNodW5rKSkpO1xuICAgICAgICB9IGVsc2UgaWYgKGNodW5rIGluc3RhbmNlb2YgVWludDhBcnJheSkge1xuICAgICAgICAgIGNvbnRyb2xsZXIuZW5xdWV1ZShjaHVuayk7XG4gICAgICAgIH0gZWxzZSBpZiAoQXJyYXlCdWZmZXIuaXNWaWV3KGNodW5rKSkge1xuICAgICAgICAgIGNvbnRyb2xsZXIuZW5xdWV1ZShuZXcgVWludDhBcnJheShjaHVuay5idWZmZXIpKTtcbiAgICAgICAgfSBlbHNlIGlmIChjaHVuayBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB7XG4gICAgICAgICAgY29udHJvbGxlci5lbnF1ZXVlKG5ldyBVaW50OEFycmF5KGNodW5rKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnRyb2xsZXIuZW5xdWV1ZShlbmNvZGVyLmVuY29kZShKU09OLnN0cmluZ2lmeShjaHVuaykpKTtcbiAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgIC8vIHdlIGp1c3Qgc3dhbGxvdyBlcnJvcnMgaGVyZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY29udHJvbGxlci5jbG9zZSgpO1xuICAgIH0sXG4gIH0pO1xufVxuXG4vKiogQSB1dGlsaXR5IGNsYXNzIHRoYXQgdHJhbnNmb3JtcyBcImFueVwiIGNodW5rIGludG8gYW4gYFVpbnQ4QXJyYXlgLiAqL1xuZXhwb3J0IGNsYXNzIFVpbnQ4QXJyYXlUcmFuc2Zvcm1TdHJlYW1cbiAgZXh0ZW5kcyBUcmFuc2Zvcm1TdHJlYW08dW5rbm93biwgVWludDhBcnJheT4ge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBjb25zdCBpbml0ID0ge1xuICAgICAgYXN5bmMgdHJhbnNmb3JtKFxuICAgICAgICBjaHVuazogdW5rbm93bixcbiAgICAgICAgY29udHJvbGxlcjogVHJhbnNmb3JtU3RyZWFtRGVmYXVsdENvbnRyb2xsZXI8VWludDhBcnJheT4sXG4gICAgICApIHtcbiAgICAgICAgY2h1bmsgPSBhd2FpdCBjaHVuaztcbiAgICAgICAgc3dpdGNoICh0eXBlb2YgY2h1bmspIHtcbiAgICAgICAgICBjYXNlIFwib2JqZWN0XCI6XG4gICAgICAgICAgICBpZiAoY2h1bmsgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgY29udHJvbGxlci50ZXJtaW5hdGUoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoQXJyYXlCdWZmZXIuaXNWaWV3KGNodW5rKSkge1xuICAgICAgICAgICAgICBjb250cm9sbGVyLmVucXVldWUoXG4gICAgICAgICAgICAgICAgbmV3IFVpbnQ4QXJyYXkoXG4gICAgICAgICAgICAgICAgICBjaHVuay5idWZmZXIsXG4gICAgICAgICAgICAgICAgICBjaHVuay5ieXRlT2Zmc2V0LFxuICAgICAgICAgICAgICAgICAgY2h1bmsuYnl0ZUxlbmd0aCxcbiAgICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgICAgICAgQXJyYXkuaXNBcnJheShjaHVuaykgJiZcbiAgICAgICAgICAgICAgY2h1bmsuZXZlcnkoKHZhbHVlKSA9PiB0eXBlb2YgdmFsdWUgPT09IFwibnVtYmVyXCIpXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgY29udHJvbGxlci5lbnF1ZXVlKG5ldyBVaW50OEFycmF5KGNodW5rKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKFxuICAgICAgICAgICAgICB0eXBlb2YgY2h1bmsudmFsdWVPZiA9PT0gXCJmdW5jdGlvblwiICYmIGNodW5rLnZhbHVlT2YoKSAhPT0gY2h1bmtcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICB0aGlzLnRyYW5zZm9ybShjaHVuay52YWx1ZU9mKCksIGNvbnRyb2xsZXIpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChcInRvSlNPTlwiIGluIGNodW5rKSB7XG4gICAgICAgICAgICAgIHRoaXMudHJhbnNmb3JtKEpTT04uc3RyaW5naWZ5KGNodW5rKSwgY29udHJvbGxlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlIFwic3ltYm9sXCI6XG4gICAgICAgICAgICBjb250cm9sbGVyLmVycm9yKFxuICAgICAgICAgICAgICBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IHRyYW5zZm9ybSBhIHN5bWJvbCB0byBhIFVpbnQ4QXJyYXlcIiksXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSBcInVuZGVmaW5lZFwiOlxuICAgICAgICAgICAgY29udHJvbGxlci5lcnJvcihcbiAgICAgICAgICAgICAgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCB0cmFuc2Zvcm0gdW5kZWZpbmVkIHRvIGEgVWludDhBcnJheVwiKSxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgY29udHJvbGxlci5lbnF1ZXVlKHRoaXMuZW5jb2Rlci5lbmNvZGUoU3RyaW5nKGNodW5rKSkpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgZW5jb2RlcixcbiAgICB9O1xuICAgIHN1cGVyKGluaXQpO1xuICB9XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEseUVBQXlFO0FBRXpFLFNBQVMsVUFBVSxRQUFRLGNBQWM7QUFFekMsTUFBTSxVQUFVLElBQUk7QUFFcEI7O0NBRUMsR0FDRCxPQUFPLFNBQVMsZ0NBQ2QsTUFBOEI7RUFFOUIsT0FBTyxJQUFJLGVBQWU7SUFDeEIsTUFBTSxPQUFNLFVBQVU7TUFDcEIsV0FBVyxNQUFNLFNBQVMsT0FBUTtRQUNoQyxJQUFJLFdBQVcsUUFBUSxDQUFDLE9BQU8sUUFBUTtVQUNyQyxXQUFXLE9BQU8sQ0FBQyxRQUFRLE1BQU0sQ0FBQyxPQUFPO1FBQzNDLE9BQU8sSUFBSSxpQkFBaUIsWUFBWTtVQUN0QyxXQUFXLE9BQU8sQ0FBQztRQUNyQixPQUFPLElBQUksWUFBWSxNQUFNLENBQUMsUUFBUTtVQUNwQyxXQUFXLE9BQU8sQ0FBQyxJQUFJLFdBQVcsTUFBTSxNQUFNO1FBQ2hELE9BQU8sSUFBSSxpQkFBaUIsYUFBYTtVQUN2QyxXQUFXLE9BQU8sQ0FBQyxJQUFJLFdBQVc7UUFDcEMsT0FBTztVQUNMLElBQUk7WUFDRixXQUFXLE9BQU8sQ0FBQyxRQUFRLE1BQU0sQ0FBQyxLQUFLLFNBQVMsQ0FBQztVQUNuRCxFQUFFLE9BQU07VUFDTiw4QkFBOEI7VUFDaEM7UUFDRjtNQUNGO01BQ0EsV0FBVyxLQUFLO0lBQ2xCO0VBQ0Y7QUFDRjtBQUVBLHNFQUFzRSxHQUN0RSxPQUFPLE1BQU0sa0NBQ0g7RUFDUixhQUFjO0lBQ1osTUFBTSxPQUFPO01BQ1gsTUFBTSxXQUNKLEtBQWMsRUFDZCxVQUF3RDtRQUV4RCxRQUFRLE1BQU07UUFDZCxPQUFRLE9BQU87VUFDYixLQUFLO1lBQ0gsSUFBSSxVQUFVLE1BQU07Y0FDbEIsV0FBVyxTQUFTO1lBQ3RCLE9BQU8sSUFBSSxZQUFZLE1BQU0sQ0FBQyxRQUFRO2NBQ3BDLFdBQVcsT0FBTyxDQUNoQixJQUFJLFdBQ0YsTUFBTSxNQUFNLEVBQ1osTUFBTSxVQUFVLEVBQ2hCLE1BQU0sVUFBVTtZQUd0QixPQUFPLElBQ0wsTUFBTSxPQUFPLENBQUMsVUFDZCxNQUFNLEtBQUssQ0FBQyxDQUFDLFFBQVUsT0FBTyxVQUFVLFdBQ3hDO2NBQ0EsV0FBVyxPQUFPLENBQUMsSUFBSSxXQUFXO1lBQ3BDLE9BQU8sSUFDTCxPQUFPLE1BQU0sT0FBTyxLQUFLLGNBQWMsTUFBTSxPQUFPLE9BQU8sT0FDM0Q7Y0FDQSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sT0FBTyxJQUFJO1lBQ2xDLE9BQU8sSUFBSSxZQUFZLE9BQU87Y0FDNUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLFNBQVMsQ0FBQyxRQUFRO1lBQ3hDO1lBQ0E7VUFDRixLQUFLO1lBQ0gsV0FBVyxLQUFLLENBQ2QsSUFBSSxVQUFVO1lBRWhCO1VBQ0YsS0FBSztZQUNILFdBQVcsS0FBSyxDQUNkLElBQUksVUFBVTtZQUVoQjtVQUNGO1lBQ0UsV0FBVyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsT0FBTztRQUNsRDtNQUNGO01BQ0E7SUFDRjtJQUNBLEtBQUssQ0FBQztFQUNSO0FBQ0YifQ==
// denoCacheMetadata=14424016331267357730,2782857427948297424