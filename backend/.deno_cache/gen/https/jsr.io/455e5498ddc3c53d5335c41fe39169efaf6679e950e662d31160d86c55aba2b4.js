// Copyright 2018-2025 the Deno authors. MIT license.
// This module is browser compatible.
import { isWindows } from "jsr:@std/internal@^1.0.10/os";
import { dirname as posixDirname } from "./posix/dirname.ts";
import { dirname as windowsDirname } from "./windows/dirname.ts";
/**
 * Return the directory path of a path.
 *
 * @example Usage
 * ```ts
 * import { dirname } from "@std/path/dirname";
 * import { assertEquals } from "@std/assert";
 *
 * if (Deno.build.os === "windows") {
 *   assertEquals(dirname("C:\\home\\user\\Documents\\image.png"), "C:\\home\\user\\Documents");
 *   assertEquals(dirname(new URL("file:///C:/home/user/Documents/image.png")), "C:\\home\\user\\Documents");
 * } else {
 *   assertEquals(dirname("/home/user/Documents/image.png"), "/home/user/Documents");
 *   assertEquals(dirname(new URL("file:///home/user/Documents/image.png")), "/home/user/Documents");
 * }
 * ```
 *
 * @param path Path to extract the directory from.
 * @returns The directory path.
 */ export function dirname(path) {
  return isWindows ? windowsDirname(path) : posixDirname(path);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BzdGQvcGF0aC8xLjEuMi9kaXJuYW1lLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjUgdGhlIERlbm8gYXV0aG9ycy4gTUlUIGxpY2Vuc2UuXG4vLyBUaGlzIG1vZHVsZSBpcyBicm93c2VyIGNvbXBhdGlibGUuXG5cbmltcG9ydCB7IGlzV2luZG93cyB9IGZyb20gXCJqc3I6QHN0ZC9pbnRlcm5hbEBeMS4wLjEwL29zXCI7XG5pbXBvcnQgeyBkaXJuYW1lIGFzIHBvc2l4RGlybmFtZSB9IGZyb20gXCIuL3Bvc2l4L2Rpcm5hbWUudHNcIjtcbmltcG9ydCB7IGRpcm5hbWUgYXMgd2luZG93c0Rpcm5hbWUgfSBmcm9tIFwiLi93aW5kb3dzL2Rpcm5hbWUudHNcIjtcblxuLyoqXG4gKiBSZXR1cm4gdGhlIGRpcmVjdG9yeSBwYXRoIG9mIGEgcGF0aC5cbiAqXG4gKiBAZXhhbXBsZSBVc2FnZVxuICogYGBgdHNcbiAqIGltcG9ydCB7IGRpcm5hbWUgfSBmcm9tIFwiQHN0ZC9wYXRoL2Rpcm5hbWVcIjtcbiAqIGltcG9ydCB7IGFzc2VydEVxdWFscyB9IGZyb20gXCJAc3RkL2Fzc2VydFwiO1xuICpcbiAqIGlmIChEZW5vLmJ1aWxkLm9zID09PSBcIndpbmRvd3NcIikge1xuICogICBhc3NlcnRFcXVhbHMoZGlybmFtZShcIkM6XFxcXGhvbWVcXFxcdXNlclxcXFxEb2N1bWVudHNcXFxcaW1hZ2UucG5nXCIpLCBcIkM6XFxcXGhvbWVcXFxcdXNlclxcXFxEb2N1bWVudHNcIik7XG4gKiAgIGFzc2VydEVxdWFscyhkaXJuYW1lKG5ldyBVUkwoXCJmaWxlOi8vL0M6L2hvbWUvdXNlci9Eb2N1bWVudHMvaW1hZ2UucG5nXCIpKSwgXCJDOlxcXFxob21lXFxcXHVzZXJcXFxcRG9jdW1lbnRzXCIpO1xuICogfSBlbHNlIHtcbiAqICAgYXNzZXJ0RXF1YWxzKGRpcm5hbWUoXCIvaG9tZS91c2VyL0RvY3VtZW50cy9pbWFnZS5wbmdcIiksIFwiL2hvbWUvdXNlci9Eb2N1bWVudHNcIik7XG4gKiAgIGFzc2VydEVxdWFscyhkaXJuYW1lKG5ldyBVUkwoXCJmaWxlOi8vL2hvbWUvdXNlci9Eb2N1bWVudHMvaW1hZ2UucG5nXCIpKSwgXCIvaG9tZS91c2VyL0RvY3VtZW50c1wiKTtcbiAqIH1cbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBwYXRoIFBhdGggdG8gZXh0cmFjdCB0aGUgZGlyZWN0b3J5IGZyb20uXG4gKiBAcmV0dXJucyBUaGUgZGlyZWN0b3J5IHBhdGguXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkaXJuYW1lKHBhdGg6IHN0cmluZyB8IFVSTCk6IHN0cmluZyB7XG4gIHJldHVybiBpc1dpbmRvd3MgPyB3aW5kb3dzRGlybmFtZShwYXRoKSA6IHBvc2l4RGlybmFtZShwYXRoKTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxxREFBcUQ7QUFDckQscUNBQXFDO0FBRXJDLFNBQVMsU0FBUyxRQUFRLCtCQUErQjtBQUN6RCxTQUFTLFdBQVcsWUFBWSxRQUFRLHFCQUFxQjtBQUM3RCxTQUFTLFdBQVcsY0FBYyxRQUFRLHVCQUF1QjtBQUVqRTs7Ozs7Ozs7Ozs7Ozs7Ozs7OztDQW1CQyxHQUNELE9BQU8sU0FBUyxRQUFRLElBQWtCO0VBQ3hDLE9BQU8sWUFBWSxlQUFlLFFBQVEsYUFBYTtBQUN6RCJ9
// denoCacheMetadata=5027089103885305867,14274394805896482310