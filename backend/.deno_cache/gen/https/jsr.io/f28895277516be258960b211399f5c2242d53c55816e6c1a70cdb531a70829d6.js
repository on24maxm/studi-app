// Copyright 2018-2025 the Deno authors. MIT license.
// This module is browser compatible.
import { CHAR_COLON } from "../_common/constants.ts";
import { normalizeString } from "../_common/normalize_string.ts";
import { assertPath } from "../_common/assert_path.ts";
import { isPathSeparator, isWindowsDeviceRoot } from "./_util.ts";
/**
 * Resolves path segments into a `path`.
 *
 * @example Usage
 * ```ts
 * import { resolve } from "@std/path/windows/resolve";
 * import { assertEquals } from "@std/assert";
 *
 * const resolved = resolve("C:\\foo\\bar", "..\\baz");
 * assertEquals(resolved, "C:\\foo\\baz");
 * ```
 *
 * @param pathSegments The path segments to process to path
 * @returns The resolved path
 */ export function resolve(...pathSegments) {
  let resolvedDevice = "";
  let resolvedTail = "";
  let resolvedAbsolute = false;
  for(let i = pathSegments.length - 1; i >= -1; i--){
    let path;
    // deno-lint-ignore no-explicit-any
    const { Deno } = globalThis;
    if (i >= 0) {
      path = pathSegments[i];
    } else if (!resolvedDevice) {
      if (typeof Deno?.cwd !== "function") {
        throw new TypeError("Resolved a drive-letter-less path without a current working directory (CWD)");
      }
      path = Deno.cwd();
    } else {
      if (typeof Deno?.env?.get !== "function" || typeof Deno?.cwd !== "function") {
        throw new TypeError("Resolved a relative path without a current working directory (CWD)");
      }
      path = Deno.cwd();
      // Verify that a cwd was found and that it actually points
      // to our drive. If not, default to the drive's root.
      if (path === undefined || path.slice(0, 3).toLowerCase() !== `${resolvedDevice.toLowerCase()}\\`) {
        path = `${resolvedDevice}\\`;
      }
    }
    assertPath(path);
    const len = path.length;
    // Skip empty entries
    if (len === 0) continue;
    let rootEnd = 0;
    let device = "";
    let isAbsolute = false;
    const code = path.charCodeAt(0);
    // Try to match a root
    if (len > 1) {
      if (isPathSeparator(code)) {
        // Possible UNC root
        // If we started with a separator, we know we at least have an
        // absolute path of some kind (UNC or otherwise)
        isAbsolute = true;
        if (isPathSeparator(path.charCodeAt(1))) {
          // Matched double path separator at beginning
          let j = 2;
          let last = j;
          // Match 1 or more non-path separators
          for(; j < len; ++j){
            if (isPathSeparator(path.charCodeAt(j))) break;
          }
          if (j < len && j !== last) {
            const firstPart = path.slice(last, j);
            // Matched!
            last = j;
            // Match 1 or more path separators
            for(; j < len; ++j){
              if (!isPathSeparator(path.charCodeAt(j))) break;
            }
            if (j < len && j !== last) {
              // Matched!
              last = j;
              // Match 1 or more non-path separators
              for(; j < len; ++j){
                if (isPathSeparator(path.charCodeAt(j))) break;
              }
              if (j === len) {
                // We matched a UNC root only
                device = `\\\\${firstPart}\\${path.slice(last)}`;
                rootEnd = j;
              } else if (j !== last) {
                // We matched a UNC root with leftovers
                device = `\\\\${firstPart}\\${path.slice(last, j)}`;
                rootEnd = j;
              }
            }
          }
        } else {
          rootEnd = 1;
        }
      } else if (isWindowsDeviceRoot(code)) {
        // Possible device root
        if (path.charCodeAt(1) === CHAR_COLON) {
          device = path.slice(0, 2);
          rootEnd = 2;
          if (len > 2) {
            if (isPathSeparator(path.charCodeAt(2))) {
              // Treat separator following drive name as an absolute path
              // indicator
              isAbsolute = true;
              rootEnd = 3;
            }
          }
        }
      }
    } else if (isPathSeparator(code)) {
      // `path` contains just a path separator
      rootEnd = 1;
      isAbsolute = true;
    }
    if (device.length > 0 && resolvedDevice.length > 0 && device.toLowerCase() !== resolvedDevice.toLowerCase()) {
      continue;
    }
    if (resolvedDevice.length === 0 && device.length > 0) {
      resolvedDevice = device;
    }
    if (!resolvedAbsolute) {
      resolvedTail = `${path.slice(rootEnd)}\\${resolvedTail}`;
      resolvedAbsolute = isAbsolute;
    }
    if (resolvedAbsolute && resolvedDevice.length > 0) break;
  }
  // At this point the path should be resolved to a full absolute path,
  // but handle relative paths to be safe (might happen when Deno.cwd()
  // fails)
  // Normalize the tail path
  resolvedTail = normalizeString(resolvedTail, !resolvedAbsolute, "\\", isPathSeparator);
  return resolvedDevice + (resolvedAbsolute ? "\\" : "") + resolvedTail || ".";
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BzdGQvcGF0aC8xLjEuMi93aW5kb3dzL3Jlc29sdmUudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IDIwMTgtMjAyNSB0aGUgRGVubyBhdXRob3JzLiBNSVQgbGljZW5zZS5cbi8vIFRoaXMgbW9kdWxlIGlzIGJyb3dzZXIgY29tcGF0aWJsZS5cblxuaW1wb3J0IHsgQ0hBUl9DT0xPTiB9IGZyb20gXCIuLi9fY29tbW9uL2NvbnN0YW50cy50c1wiO1xuaW1wb3J0IHsgbm9ybWFsaXplU3RyaW5nIH0gZnJvbSBcIi4uL19jb21tb24vbm9ybWFsaXplX3N0cmluZy50c1wiO1xuaW1wb3J0IHsgYXNzZXJ0UGF0aCB9IGZyb20gXCIuLi9fY29tbW9uL2Fzc2VydF9wYXRoLnRzXCI7XG5pbXBvcnQgeyBpc1BhdGhTZXBhcmF0b3IsIGlzV2luZG93c0RldmljZVJvb3QgfSBmcm9tIFwiLi9fdXRpbC50c1wiO1xuXG4vKipcbiAqIFJlc29sdmVzIHBhdGggc2VnbWVudHMgaW50byBhIGBwYXRoYC5cbiAqXG4gKiBAZXhhbXBsZSBVc2FnZVxuICogYGBgdHNcbiAqIGltcG9ydCB7IHJlc29sdmUgfSBmcm9tIFwiQHN0ZC9wYXRoL3dpbmRvd3MvcmVzb2x2ZVwiO1xuICogaW1wb3J0IHsgYXNzZXJ0RXF1YWxzIH0gZnJvbSBcIkBzdGQvYXNzZXJ0XCI7XG4gKlxuICogY29uc3QgcmVzb2x2ZWQgPSByZXNvbHZlKFwiQzpcXFxcZm9vXFxcXGJhclwiLCBcIi4uXFxcXGJhelwiKTtcbiAqIGFzc2VydEVxdWFscyhyZXNvbHZlZCwgXCJDOlxcXFxmb29cXFxcYmF6XCIpO1xuICogYGBgXG4gKlxuICogQHBhcmFtIHBhdGhTZWdtZW50cyBUaGUgcGF0aCBzZWdtZW50cyB0byBwcm9jZXNzIHRvIHBhdGhcbiAqIEByZXR1cm5zIFRoZSByZXNvbHZlZCBwYXRoXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlKC4uLnBhdGhTZWdtZW50czogc3RyaW5nW10pOiBzdHJpbmcge1xuICBsZXQgcmVzb2x2ZWREZXZpY2UgPSBcIlwiO1xuICBsZXQgcmVzb2x2ZWRUYWlsID0gXCJcIjtcbiAgbGV0IHJlc29sdmVkQWJzb2x1dGUgPSBmYWxzZTtcblxuICBmb3IgKGxldCBpID0gcGF0aFNlZ21lbnRzLmxlbmd0aCAtIDE7IGkgPj0gLTE7IGktLSkge1xuICAgIGxldCBwYXRoOiBzdHJpbmc7XG4gICAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgICBjb25zdCB7IERlbm8gfSA9IGdsb2JhbFRoaXMgYXMgYW55O1xuICAgIGlmIChpID49IDApIHtcbiAgICAgIHBhdGggPSBwYXRoU2VnbWVudHNbaV0hO1xuICAgIH0gZWxzZSBpZiAoIXJlc29sdmVkRGV2aWNlKSB7XG4gICAgICBpZiAodHlwZW9mIERlbm8/LmN3ZCAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAgICAgXCJSZXNvbHZlZCBhIGRyaXZlLWxldHRlci1sZXNzIHBhdGggd2l0aG91dCBhIGN1cnJlbnQgd29ya2luZyBkaXJlY3RvcnkgKENXRClcIixcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIHBhdGggPSBEZW5vLmN3ZCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoXG4gICAgICAgIHR5cGVvZiBEZW5vPy5lbnY/LmdldCAhPT0gXCJmdW5jdGlvblwiIHx8IHR5cGVvZiBEZW5vPy5jd2QgIT09IFwiZnVuY3Rpb25cIlxuICAgICAgKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAgICAgXCJSZXNvbHZlZCBhIHJlbGF0aXZlIHBhdGggd2l0aG91dCBhIGN1cnJlbnQgd29ya2luZyBkaXJlY3RvcnkgKENXRClcIixcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIHBhdGggPSBEZW5vLmN3ZCgpO1xuXG4gICAgICAvLyBWZXJpZnkgdGhhdCBhIGN3ZCB3YXMgZm91bmQgYW5kIHRoYXQgaXQgYWN0dWFsbHkgcG9pbnRzXG4gICAgICAvLyB0byBvdXIgZHJpdmUuIElmIG5vdCwgZGVmYXVsdCB0byB0aGUgZHJpdmUncyByb290LlxuICAgICAgaWYgKFxuICAgICAgICBwYXRoID09PSB1bmRlZmluZWQgfHxcbiAgICAgICAgcGF0aC5zbGljZSgwLCAzKS50b0xvd2VyQ2FzZSgpICE9PSBgJHtyZXNvbHZlZERldmljZS50b0xvd2VyQ2FzZSgpfVxcXFxgXG4gICAgICApIHtcbiAgICAgICAgcGF0aCA9IGAke3Jlc29sdmVkRGV2aWNlfVxcXFxgO1xuICAgICAgfVxuICAgIH1cblxuICAgIGFzc2VydFBhdGgocGF0aCk7XG5cbiAgICBjb25zdCBsZW4gPSBwYXRoLmxlbmd0aDtcblxuICAgIC8vIFNraXAgZW1wdHkgZW50cmllc1xuICAgIGlmIChsZW4gPT09IDApIGNvbnRpbnVlO1xuXG4gICAgbGV0IHJvb3RFbmQgPSAwO1xuICAgIGxldCBkZXZpY2UgPSBcIlwiO1xuICAgIGxldCBpc0Fic29sdXRlID0gZmFsc2U7XG4gICAgY29uc3QgY29kZSA9IHBhdGguY2hhckNvZGVBdCgwKTtcblxuICAgIC8vIFRyeSB0byBtYXRjaCBhIHJvb3RcbiAgICBpZiAobGVuID4gMSkge1xuICAgICAgaWYgKGlzUGF0aFNlcGFyYXRvcihjb2RlKSkge1xuICAgICAgICAvLyBQb3NzaWJsZSBVTkMgcm9vdFxuXG4gICAgICAgIC8vIElmIHdlIHN0YXJ0ZWQgd2l0aCBhIHNlcGFyYXRvciwgd2Uga25vdyB3ZSBhdCBsZWFzdCBoYXZlIGFuXG4gICAgICAgIC8vIGFic29sdXRlIHBhdGggb2Ygc29tZSBraW5kIChVTkMgb3Igb3RoZXJ3aXNlKVxuICAgICAgICBpc0Fic29sdXRlID0gdHJ1ZTtcblxuICAgICAgICBpZiAoaXNQYXRoU2VwYXJhdG9yKHBhdGguY2hhckNvZGVBdCgxKSkpIHtcbiAgICAgICAgICAvLyBNYXRjaGVkIGRvdWJsZSBwYXRoIHNlcGFyYXRvciBhdCBiZWdpbm5pbmdcbiAgICAgICAgICBsZXQgaiA9IDI7XG4gICAgICAgICAgbGV0IGxhc3QgPSBqO1xuICAgICAgICAgIC8vIE1hdGNoIDEgb3IgbW9yZSBub24tcGF0aCBzZXBhcmF0b3JzXG4gICAgICAgICAgZm9yICg7IGogPCBsZW47ICsraikge1xuICAgICAgICAgICAgaWYgKGlzUGF0aFNlcGFyYXRvcihwYXRoLmNoYXJDb2RlQXQoaikpKSBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGogPCBsZW4gJiYgaiAhPT0gbGFzdCkge1xuICAgICAgICAgICAgY29uc3QgZmlyc3RQYXJ0ID0gcGF0aC5zbGljZShsYXN0LCBqKTtcbiAgICAgICAgICAgIC8vIE1hdGNoZWQhXG4gICAgICAgICAgICBsYXN0ID0gajtcbiAgICAgICAgICAgIC8vIE1hdGNoIDEgb3IgbW9yZSBwYXRoIHNlcGFyYXRvcnNcbiAgICAgICAgICAgIGZvciAoOyBqIDwgbGVuOyArK2opIHtcbiAgICAgICAgICAgICAgaWYgKCFpc1BhdGhTZXBhcmF0b3IocGF0aC5jaGFyQ29kZUF0KGopKSkgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaiA8IGxlbiAmJiBqICE9PSBsYXN0KSB7XG4gICAgICAgICAgICAgIC8vIE1hdGNoZWQhXG4gICAgICAgICAgICAgIGxhc3QgPSBqO1xuICAgICAgICAgICAgICAvLyBNYXRjaCAxIG9yIG1vcmUgbm9uLXBhdGggc2VwYXJhdG9yc1xuICAgICAgICAgICAgICBmb3IgKDsgaiA8IGxlbjsgKytqKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzUGF0aFNlcGFyYXRvcihwYXRoLmNoYXJDb2RlQXQoaikpKSBicmVhaztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAoaiA9PT0gbGVuKSB7XG4gICAgICAgICAgICAgICAgLy8gV2UgbWF0Y2hlZCBhIFVOQyByb290IG9ubHlcbiAgICAgICAgICAgICAgICBkZXZpY2UgPSBgXFxcXFxcXFwke2ZpcnN0UGFydH1cXFxcJHtwYXRoLnNsaWNlKGxhc3QpfWA7XG4gICAgICAgICAgICAgICAgcm9vdEVuZCA9IGo7XG4gICAgICAgICAgICAgIH0gZWxzZSBpZiAoaiAhPT0gbGFzdCkge1xuICAgICAgICAgICAgICAgIC8vIFdlIG1hdGNoZWQgYSBVTkMgcm9vdCB3aXRoIGxlZnRvdmVyc1xuXG4gICAgICAgICAgICAgICAgZGV2aWNlID0gYFxcXFxcXFxcJHtmaXJzdFBhcnR9XFxcXCR7cGF0aC5zbGljZShsYXN0LCBqKX1gO1xuICAgICAgICAgICAgICAgIHJvb3RFbmQgPSBqO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJvb3RFbmQgPSAxO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGlzV2luZG93c0RldmljZVJvb3QoY29kZSkpIHtcbiAgICAgICAgLy8gUG9zc2libGUgZGV2aWNlIHJvb3RcblxuICAgICAgICBpZiAocGF0aC5jaGFyQ29kZUF0KDEpID09PSBDSEFSX0NPTE9OKSB7XG4gICAgICAgICAgZGV2aWNlID0gcGF0aC5zbGljZSgwLCAyKTtcbiAgICAgICAgICByb290RW5kID0gMjtcbiAgICAgICAgICBpZiAobGVuID4gMikge1xuICAgICAgICAgICAgaWYgKGlzUGF0aFNlcGFyYXRvcihwYXRoLmNoYXJDb2RlQXQoMikpKSB7XG4gICAgICAgICAgICAgIC8vIFRyZWF0IHNlcGFyYXRvciBmb2xsb3dpbmcgZHJpdmUgbmFtZSBhcyBhbiBhYnNvbHV0ZSBwYXRoXG4gICAgICAgICAgICAgIC8vIGluZGljYXRvclxuICAgICAgICAgICAgICBpc0Fic29sdXRlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgcm9vdEVuZCA9IDM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChpc1BhdGhTZXBhcmF0b3IoY29kZSkpIHtcbiAgICAgIC8vIGBwYXRoYCBjb250YWlucyBqdXN0IGEgcGF0aCBzZXBhcmF0b3JcbiAgICAgIHJvb3RFbmQgPSAxO1xuICAgICAgaXNBYnNvbHV0ZSA9IHRydWU7XG4gICAgfVxuXG4gICAgaWYgKFxuICAgICAgZGV2aWNlLmxlbmd0aCA+IDAgJiZcbiAgICAgIHJlc29sdmVkRGV2aWNlLmxlbmd0aCA+IDAgJiZcbiAgICAgIGRldmljZS50b0xvd2VyQ2FzZSgpICE9PSByZXNvbHZlZERldmljZS50b0xvd2VyQ2FzZSgpXG4gICAgKSB7XG4gICAgICAvLyBUaGlzIHBhdGggcG9pbnRzIHRvIGFub3RoZXIgZGV2aWNlIHNvIGl0IGlzIG5vdCBhcHBsaWNhYmxlXG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAocmVzb2x2ZWREZXZpY2UubGVuZ3RoID09PSAwICYmIGRldmljZS5sZW5ndGggPiAwKSB7XG4gICAgICByZXNvbHZlZERldmljZSA9IGRldmljZTtcbiAgICB9XG4gICAgaWYgKCFyZXNvbHZlZEFic29sdXRlKSB7XG4gICAgICByZXNvbHZlZFRhaWwgPSBgJHtwYXRoLnNsaWNlKHJvb3RFbmQpfVxcXFwke3Jlc29sdmVkVGFpbH1gO1xuICAgICAgcmVzb2x2ZWRBYnNvbHV0ZSA9IGlzQWJzb2x1dGU7XG4gICAgfVxuXG4gICAgaWYgKHJlc29sdmVkQWJzb2x1dGUgJiYgcmVzb2x2ZWREZXZpY2UubGVuZ3RoID4gMCkgYnJlYWs7XG4gIH1cblxuICAvLyBBdCB0aGlzIHBvaW50IHRoZSBwYXRoIHNob3VsZCBiZSByZXNvbHZlZCB0byBhIGZ1bGwgYWJzb2x1dGUgcGF0aCxcbiAgLy8gYnV0IGhhbmRsZSByZWxhdGl2ZSBwYXRocyB0byBiZSBzYWZlIChtaWdodCBoYXBwZW4gd2hlbiBEZW5vLmN3ZCgpXG4gIC8vIGZhaWxzKVxuXG4gIC8vIE5vcm1hbGl6ZSB0aGUgdGFpbCBwYXRoXG4gIHJlc29sdmVkVGFpbCA9IG5vcm1hbGl6ZVN0cmluZyhcbiAgICByZXNvbHZlZFRhaWwsXG4gICAgIXJlc29sdmVkQWJzb2x1dGUsXG4gICAgXCJcXFxcXCIsXG4gICAgaXNQYXRoU2VwYXJhdG9yLFxuICApO1xuXG4gIHJldHVybiByZXNvbHZlZERldmljZSArIChyZXNvbHZlZEFic29sdXRlID8gXCJcXFxcXCIgOiBcIlwiKSArIHJlc29sdmVkVGFpbCB8fCBcIi5cIjtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxxREFBcUQ7QUFDckQscUNBQXFDO0FBRXJDLFNBQVMsVUFBVSxRQUFRLDBCQUEwQjtBQUNyRCxTQUFTLGVBQWUsUUFBUSxpQ0FBaUM7QUFDakUsU0FBUyxVQUFVLFFBQVEsNEJBQTRCO0FBQ3ZELFNBQVMsZUFBZSxFQUFFLG1CQUFtQixRQUFRLGFBQWE7QUFFbEU7Ozs7Ozs7Ozs7Ozs7O0NBY0MsR0FDRCxPQUFPLFNBQVMsUUFBUSxHQUFHLFlBQXNCO0VBQy9DLElBQUksaUJBQWlCO0VBQ3JCLElBQUksZUFBZTtFQUNuQixJQUFJLG1CQUFtQjtFQUV2QixJQUFLLElBQUksSUFBSSxhQUFhLE1BQU0sR0FBRyxHQUFHLEtBQUssQ0FBQyxHQUFHLElBQUs7SUFDbEQsSUFBSTtJQUNKLG1DQUFtQztJQUNuQyxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUc7SUFDakIsSUFBSSxLQUFLLEdBQUc7TUFDVixPQUFPLFlBQVksQ0FBQyxFQUFFO0lBQ3hCLE9BQU8sSUFBSSxDQUFDLGdCQUFnQjtNQUMxQixJQUFJLE9BQU8sTUFBTSxRQUFRLFlBQVk7UUFDbkMsTUFBTSxJQUFJLFVBQ1I7TUFFSjtNQUNBLE9BQU8sS0FBSyxHQUFHO0lBQ2pCLE9BQU87TUFDTCxJQUNFLE9BQU8sTUFBTSxLQUFLLFFBQVEsY0FBYyxPQUFPLE1BQU0sUUFBUSxZQUM3RDtRQUNBLE1BQU0sSUFBSSxVQUNSO01BRUo7TUFDQSxPQUFPLEtBQUssR0FBRztNQUVmLDBEQUEwRDtNQUMxRCxxREFBcUQ7TUFDckQsSUFDRSxTQUFTLGFBQ1QsS0FBSyxLQUFLLENBQUMsR0FBRyxHQUFHLFdBQVcsT0FB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
// denoCacheMetadata=7791553265137747814,7387660557613633235