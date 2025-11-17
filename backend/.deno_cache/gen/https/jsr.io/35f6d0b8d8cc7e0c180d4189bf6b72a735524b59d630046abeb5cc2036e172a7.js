// Copyright 2018-2025 the Deno authors. MIT license.
// This module is browser compatible.
import { assertArg } from "../_common/dirname.ts";
import { CHAR_COLON } from "../_common/constants.ts";
import { stripTrailingSeparators } from "../_common/strip_trailing_separators.ts";
import { isPathSeparator, isPosixPathSeparator, isWindowsDeviceRoot } from "./_util.ts";
import { fromFileUrl } from "./from_file_url.ts";
/**
 * Return the directory path of a `path`.
 *
 * @example Usage
 * ```ts
 * import { dirname } from "@std/path/windows/dirname";
 * import { assertEquals } from "@std/assert";
 *
 * assertEquals(dirname("C:\\foo\\bar\\baz.ext"), "C:\\foo\\bar");
 * assertEquals(dirname(new URL("file:///C:/foo/bar/baz.ext")), "C:\\foo\\bar");
 * ```
 *
 * @param path The path to get the directory from.
 * @returns The directory path.
 */ export function dirname(path) {
  if (path instanceof URL) {
    path = fromFileUrl(path);
  }
  assertArg(path);
  const len = path.length;
  let rootEnd = -1;
  let end = -1;
  let matchedSlash = true;
  let offset = 0;
  const code = path.charCodeAt(0);
  // Try to match a root
  if (len > 1) {
    if (isPathSeparator(code)) {
      // Possible UNC root
      rootEnd = offset = 1;
      if (isPathSeparator(path.charCodeAt(1))) {
        // Matched double path separator at beginning
        let j = 2;
        let last = j;
        // Match 1 or more non-path separators
        for(; j < len; ++j){
          if (isPathSeparator(path.charCodeAt(j))) break;
        }
        if (j < len && j !== last) {
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
              return path;
            }
            if (j !== last) {
              // We matched a UNC root with leftovers
              // Offset by 1 to include the separator after the UNC root to
              // treat it as a "normal root" on top of a (UNC) root
              rootEnd = offset = j + 1;
            }
          }
        }
      }
    } else if (isWindowsDeviceRoot(code)) {
      // Possible device root
      if (path.charCodeAt(1) === CHAR_COLON) {
        rootEnd = offset = 2;
        if (len > 2) {
          if (isPathSeparator(path.charCodeAt(2))) rootEnd = offset = 3;
        }
      }
    }
  } else if (isPathSeparator(code)) {
    // `path` contains just a path separator, exit early to avoid
    // unnecessary work
    return path;
  }
  for(let i = len - 1; i >= offset; --i){
    if (isPathSeparator(path.charCodeAt(i))) {
      if (!matchedSlash) {
        end = i;
        break;
      }
    } else {
      // We saw the first non-path separator
      matchedSlash = false;
    }
  }
  if (end === -1) {
    if (rootEnd === -1) return ".";
    else end = rootEnd;
  }
  return stripTrailingSeparators(path.slice(0, end), isPosixPathSeparator);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BzdGQvcGF0aC8xLjEuMi93aW5kb3dzL2Rpcm5hbWUudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IDIwMTgtMjAyNSB0aGUgRGVubyBhdXRob3JzLiBNSVQgbGljZW5zZS5cbi8vIFRoaXMgbW9kdWxlIGlzIGJyb3dzZXIgY29tcGF0aWJsZS5cblxuaW1wb3J0IHsgYXNzZXJ0QXJnIH0gZnJvbSBcIi4uL19jb21tb24vZGlybmFtZS50c1wiO1xuaW1wb3J0IHsgQ0hBUl9DT0xPTiB9IGZyb20gXCIuLi9fY29tbW9uL2NvbnN0YW50cy50c1wiO1xuaW1wb3J0IHsgc3RyaXBUcmFpbGluZ1NlcGFyYXRvcnMgfSBmcm9tIFwiLi4vX2NvbW1vbi9zdHJpcF90cmFpbGluZ19zZXBhcmF0b3JzLnRzXCI7XG5pbXBvcnQge1xuICBpc1BhdGhTZXBhcmF0b3IsXG4gIGlzUG9zaXhQYXRoU2VwYXJhdG9yLFxuICBpc1dpbmRvd3NEZXZpY2VSb290LFxufSBmcm9tIFwiLi9fdXRpbC50c1wiO1xuaW1wb3J0IHsgZnJvbUZpbGVVcmwgfSBmcm9tIFwiLi9mcm9tX2ZpbGVfdXJsLnRzXCI7XG5cbi8qKlxuICogUmV0dXJuIHRoZSBkaXJlY3RvcnkgcGF0aCBvZiBhIGBwYXRoYC5cbiAqXG4gKiBAZXhhbXBsZSBVc2FnZVxuICogYGBgdHNcbiAqIGltcG9ydCB7IGRpcm5hbWUgfSBmcm9tIFwiQHN0ZC9wYXRoL3dpbmRvd3MvZGlybmFtZVwiO1xuICogaW1wb3J0IHsgYXNzZXJ0RXF1YWxzIH0gZnJvbSBcIkBzdGQvYXNzZXJ0XCI7XG4gKlxuICogYXNzZXJ0RXF1YWxzKGRpcm5hbWUoXCJDOlxcXFxmb29cXFxcYmFyXFxcXGJhei5leHRcIiksIFwiQzpcXFxcZm9vXFxcXGJhclwiKTtcbiAqIGFzc2VydEVxdWFscyhkaXJuYW1lKG5ldyBVUkwoXCJmaWxlOi8vL0M6L2Zvby9iYXIvYmF6LmV4dFwiKSksIFwiQzpcXFxcZm9vXFxcXGJhclwiKTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBwYXRoIFRoZSBwYXRoIHRvIGdldCB0aGUgZGlyZWN0b3J5IGZyb20uXG4gKiBAcmV0dXJucyBUaGUgZGlyZWN0b3J5IHBhdGguXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkaXJuYW1lKHBhdGg6IHN0cmluZyB8IFVSTCk6IHN0cmluZyB7XG4gIGlmIChwYXRoIGluc3RhbmNlb2YgVVJMKSB7XG4gICAgcGF0aCA9IGZyb21GaWxlVXJsKHBhdGgpO1xuICB9XG4gIGFzc2VydEFyZyhwYXRoKTtcblxuICBjb25zdCBsZW4gPSBwYXRoLmxlbmd0aDtcbiAgbGV0IHJvb3RFbmQgPSAtMTtcbiAgbGV0IGVuZCA9IC0xO1xuICBsZXQgbWF0Y2hlZFNsYXNoID0gdHJ1ZTtcbiAgbGV0IG9mZnNldCA9IDA7XG4gIGNvbnN0IGNvZGUgPSBwYXRoLmNoYXJDb2RlQXQoMCk7XG5cbiAgLy8gVHJ5IHRvIG1hdGNoIGEgcm9vdFxuICBpZiAobGVuID4gMSkge1xuICAgIGlmIChpc1BhdGhTZXBhcmF0b3IoY29kZSkpIHtcbiAgICAgIC8vIFBvc3NpYmxlIFVOQyByb290XG5cbiAgICAgIHJvb3RFbmQgPSBvZmZzZXQgPSAxO1xuXG4gICAgICBpZiAoaXNQYXRoU2VwYXJhdG9yKHBhdGguY2hhckNvZGVBdCgxKSkpIHtcbiAgICAgICAgLy8gTWF0Y2hlZCBkb3VibGUgcGF0aCBzZXBhcmF0b3IgYXQgYmVnaW5uaW5nXG4gICAgICAgIGxldCBqID0gMjtcbiAgICAgICAgbGV0IGxhc3QgPSBqO1xuICAgICAgICAvLyBNYXRjaCAxIG9yIG1vcmUgbm9uLXBhdGggc2VwYXJhdG9yc1xuICAgICAgICBmb3IgKDsgaiA8IGxlbjsgKytqKSB7XG4gICAgICAgICAgaWYgKGlzUGF0aFNlcGFyYXRvcihwYXRoLmNoYXJDb2RlQXQoaikpKSBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBpZiAoaiA8IGxlbiAmJiBqICE9PSBsYXN0KSB7XG4gICAgICAgICAgLy8gTWF0Y2hlZCFcbiAgICAgICAgICBsYXN0ID0gajtcbiAgICAgICAgICAvLyBNYXRjaCAxIG9yIG1vcmUgcGF0aCBzZXBhcmF0b3JzXG4gICAgICAgICAgZm9yICg7IGogPCBsZW47ICsraikge1xuICAgICAgICAgICAgaWYgKCFpc1BhdGhTZXBhcmF0b3IocGF0aC5jaGFyQ29kZUF0KGopKSkgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChqIDwgbGVuICYmIGogIT09IGxhc3QpIHtcbiAgICAgICAgICAgIC8vIE1hdGNoZWQhXG4gICAgICAgICAgICBsYXN0ID0gajtcbiAgICAgICAgICAgIC8vIE1hdGNoIDEgb3IgbW9yZSBub24tcGF0aCBzZXBhcmF0b3JzXG4gICAgICAgICAgICBmb3IgKDsgaiA8IGxlbjsgKytqKSB7XG4gICAgICAgICAgICAgIGlmIChpc1BhdGhTZXBhcmF0b3IocGF0aC5jaGFyQ29kZUF0KGopKSkgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaiA9PT0gbGVuKSB7XG4gICAgICAgICAgICAgIC8vIFdlIG1hdGNoZWQgYSBVTkMgcm9vdCBvbmx5XG4gICAgICAgICAgICAgIHJldHVybiBwYXRoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGogIT09IGxhc3QpIHtcbiAgICAgICAgICAgICAgLy8gV2UgbWF0Y2hlZCBhIFVOQyByb290IHdpdGggbGVmdG92ZXJzXG5cbiAgICAgICAgICAgICAgLy8gT2Zmc2V0IGJ5IDEgdG8gaW5jbHVkZSB0aGUgc2VwYXJhdG9yIGFmdGVyIHRoZSBVTkMgcm9vdCB0b1xuICAgICAgICAgICAgICAvLyB0cmVhdCBpdCBhcyBhIFwibm9ybWFsIHJvb3RcIiBvbiB0b3Agb2YgYSAoVU5DKSByb290XG4gICAgICAgICAgICAgIHJvb3RFbmQgPSBvZmZzZXQgPSBqICsgMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlzV2luZG93c0RldmljZVJvb3QoY29kZSkpIHtcbiAgICAgIC8vIFBvc3NpYmxlIGRldmljZSByb290XG5cbiAgICAgIGlmIChwYXRoLmNoYXJDb2RlQXQoMSkgPT09IENIQVJfQ09MT04pIHtcbiAgICAgICAgcm9vdEVuZCA9IG9mZnNldCA9IDI7XG4gICAgICAgIGlmIChsZW4gPiAyKSB7XG4gICAgICAgICAgaWYgKGlzUGF0aFNlcGFyYXRvcihwYXRoLmNoYXJDb2RlQXQoMikpKSByb290RW5kID0gb2Zmc2V0ID0gMztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIGlmIChpc1BhdGhTZXBhcmF0b3IoY29kZSkpIHtcbiAgICAvLyBgcGF0aGAgY29udGFpbnMganVzdCBhIHBhdGggc2VwYXJhdG9yLCBleGl0IGVhcmx5IHRvIGF2b2lkXG4gICAgLy8gdW5uZWNlc3Nhcnkgd29ya1xuICAgIHJldHVybiBwYXRoO1xuICB9XG5cbiAgZm9yIChsZXQgaSA9IGxlbiAtIDE7IGkgPj0gb2Zmc2V0OyAtLWkpIHtcbiAgICBpZiAoaXNQYXRoU2VwYXJhdG9yKHBhdGguY2hhckNvZGVBdChpKSkpIHtcbiAgICAgIGlmICghbWF0Y2hlZFNsYXNoKSB7XG4gICAgICAgIGVuZCA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBXZSBzYXcgdGhlIGZpcnN0IG5vbi1wYXRoIHNlcGFyYXRvclxuICAgICAgbWF0Y2hlZFNsYXNoID0gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgaWYgKGVuZCA9PT0gLTEpIHtcbiAgICBpZiAocm9vdEVuZCA9PT0gLTEpIHJldHVybiBcIi5cIjtcbiAgICBlbHNlIGVuZCA9IHJvb3RFbmQ7XG4gIH1cbiAgcmV0dXJuIHN0cmlwVHJhaWxpbmdTZXBhcmF0b3JzKHBhdGguc2xpY2UoMCwgZW5kKSwgaXNQb3NpeFBhdGhTZXBhcmF0b3IpO1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLHFEQUFxRDtBQUNyRCxx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
// denoCacheMetadata=16484307724459915894,10706074381016293739