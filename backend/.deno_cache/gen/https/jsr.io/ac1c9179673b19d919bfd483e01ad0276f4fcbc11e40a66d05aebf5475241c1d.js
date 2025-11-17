// Copyright 2018-2025 the Deno authors. MIT license.
// This module is browser compatible.
import { CHAR_COLON, CHAR_DOT } from "../_common/constants.ts";
import { assertPath } from "../_common/assert_path.ts";
import { isPathSeparator, isWindowsDeviceRoot } from "./_util.ts";
import { fromFileUrl } from "./from_file_url.ts";
/**
 * Return the extension of the `path` with leading period.
 *
 * @example Usage
 * ```ts
 * import { extname } from "@std/path/windows/extname";
 * import { assertEquals } from "@std/assert";
 *
 * assertEquals(extname("file.ts"), ".ts");
 * assertEquals(extname(new URL("file:///C:/foo/bar/baz.ext")), ".ext");
 * ```
 *
 * @param path The path to get the extension from.
 * @returns The extension of the `path`.
 */ export function extname(path) {
  if (path instanceof URL) {
    path = fromFileUrl(path);
  }
  assertPath(path);
  let start = 0;
  let startDot = -1;
  let startPart = 0;
  let end = -1;
  let matchedSlash = true;
  // Track the state of characters (if any) we see before our first dot and
  // after any path separator we find
  let preDotState = 0;
  // Check for a drive letter prefix so as not to mistake the following
  // path separator as an extra separator at the end of the path that can be
  // disregarded
  if (path.length >= 2 && path.charCodeAt(1) === CHAR_COLON && isWindowsDeviceRoot(path.charCodeAt(0))) {
    start = startPart = 2;
  }
  for(let i = path.length - 1; i >= start; --i){
    const code = path.charCodeAt(i);
    if (isPathSeparator(code)) {
      // If we reached a path separator that was not part of a set of path
      // separators at the end of the string, stop now
      if (!matchedSlash) {
        startPart = i + 1;
        break;
      }
      continue;
    }
    if (end === -1) {
      // We saw the first non-path separator, mark this as the end of our
      // extension
      matchedSlash = false;
      end = i + 1;
    }
    if (code === CHAR_DOT) {
      // If this is our first dot, mark it as the start of our extension
      if (startDot === -1) startDot = i;
      else if (preDotState !== 1) preDotState = 1;
    } else if (startDot !== -1) {
      // We saw a non-dot and non-path separator before our dot, so we should
      // have a good chance at having a non-empty extension
      preDotState = -1;
    }
  }
  if (startDot === -1 || end === -1 || // We saw a non-dot character immediately before the dot
  preDotState === 0 || // The (right-most) trimmed path component is exactly '..'
  preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
    return "";
  }
  return path.slice(startDot, end);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BzdGQvcGF0aC8xLjEuMi93aW5kb3dzL2V4dG5hbWUudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IDIwMTgtMjAyNSB0aGUgRGVubyBhdXRob3JzLiBNSVQgbGljZW5zZS5cbi8vIFRoaXMgbW9kdWxlIGlzIGJyb3dzZXIgY29tcGF0aWJsZS5cblxuaW1wb3J0IHsgQ0hBUl9DT0xPTiwgQ0hBUl9ET1QgfSBmcm9tIFwiLi4vX2NvbW1vbi9jb25zdGFudHMudHNcIjtcbmltcG9ydCB7IGFzc2VydFBhdGggfSBmcm9tIFwiLi4vX2NvbW1vbi9hc3NlcnRfcGF0aC50c1wiO1xuaW1wb3J0IHsgaXNQYXRoU2VwYXJhdG9yLCBpc1dpbmRvd3NEZXZpY2VSb290IH0gZnJvbSBcIi4vX3V0aWwudHNcIjtcbmltcG9ydCB7IGZyb21GaWxlVXJsIH0gZnJvbSBcIi4vZnJvbV9maWxlX3VybC50c1wiO1xuXG4vKipcbiAqIFJldHVybiB0aGUgZXh0ZW5zaW9uIG9mIHRoZSBgcGF0aGAgd2l0aCBsZWFkaW5nIHBlcmlvZC5cbiAqXG4gKiBAZXhhbXBsZSBVc2FnZVxuICogYGBgdHNcbiAqIGltcG9ydCB7IGV4dG5hbWUgfSBmcm9tIFwiQHN0ZC9wYXRoL3dpbmRvd3MvZXh0bmFtZVwiO1xuICogaW1wb3J0IHsgYXNzZXJ0RXF1YWxzIH0gZnJvbSBcIkBzdGQvYXNzZXJ0XCI7XG4gKlxuICogYXNzZXJ0RXF1YWxzKGV4dG5hbWUoXCJmaWxlLnRzXCIpLCBcIi50c1wiKTtcbiAqIGFzc2VydEVxdWFscyhleHRuYW1lKG5ldyBVUkwoXCJmaWxlOi8vL0M6L2Zvby9iYXIvYmF6LmV4dFwiKSksIFwiLmV4dFwiKTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBwYXRoIFRoZSBwYXRoIHRvIGdldCB0aGUgZXh0ZW5zaW9uIGZyb20uXG4gKiBAcmV0dXJucyBUaGUgZXh0ZW5zaW9uIG9mIHRoZSBgcGF0aGAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHRuYW1lKHBhdGg6IHN0cmluZyB8IFVSTCk6IHN0cmluZyB7XG4gIGlmIChwYXRoIGluc3RhbmNlb2YgVVJMKSB7XG4gICAgcGF0aCA9IGZyb21GaWxlVXJsKHBhdGgpO1xuICB9XG4gIGFzc2VydFBhdGgocGF0aCk7XG5cbiAgbGV0IHN0YXJ0ID0gMDtcbiAgbGV0IHN0YXJ0RG90ID0gLTE7XG4gIGxldCBzdGFydFBhcnQgPSAwO1xuICBsZXQgZW5kID0gLTE7XG4gIGxldCBtYXRjaGVkU2xhc2ggPSB0cnVlO1xuICAvLyBUcmFjayB0aGUgc3RhdGUgb2YgY2hhcmFjdGVycyAoaWYgYW55KSB3ZSBzZWUgYmVmb3JlIG91ciBmaXJzdCBkb3QgYW5kXG4gIC8vIGFmdGVyIGFueSBwYXRoIHNlcGFyYXRvciB3ZSBmaW5kXG4gIGxldCBwcmVEb3RTdGF0ZSA9IDA7XG5cbiAgLy8gQ2hlY2sgZm9yIGEgZHJpdmUgbGV0dGVyIHByZWZpeCBzbyBhcyBub3QgdG8gbWlzdGFrZSB0aGUgZm9sbG93aW5nXG4gIC8vIHBhdGggc2VwYXJhdG9yIGFzIGFuIGV4dHJhIHNlcGFyYXRvciBhdCB0aGUgZW5kIG9mIHRoZSBwYXRoIHRoYXQgY2FuIGJlXG4gIC8vIGRpc3JlZ2FyZGVkXG5cbiAgaWYgKFxuICAgIHBhdGgubGVuZ3RoID49IDIgJiZcbiAgICBwYXRoLmNoYXJDb2RlQXQoMSkgPT09IENIQVJfQ09MT04gJiZcbiAgICBpc1dpbmRvd3NEZXZpY2VSb290KHBhdGguY2hhckNvZGVBdCgwKSlcbiAgKSB7XG4gICAgc3RhcnQgPSBzdGFydFBhcnQgPSAyO1xuICB9XG5cbiAgZm9yIChsZXQgaSA9IHBhdGgubGVuZ3RoIC0gMTsgaSA+PSBzdGFydDsgLS1pKSB7XG4gICAgY29uc3QgY29kZSA9IHBhdGguY2hhckNvZGVBdChpKTtcbiAgICBpZiAoaXNQYXRoU2VwYXJhdG9yKGNvZGUpKSB7XG4gICAgICAvLyBJZiB3ZSByZWFjaGVkIGEgcGF0aCBzZXBhcmF0b3IgdGhhdCB3YXMgbm90IHBhcnQgb2YgYSBzZXQgb2YgcGF0aFxuICAgICAgLy8gc2VwYXJhdG9ycyBhdCB0aGUgZW5kIG9mIHRoZSBzdHJpbmcsIHN0b3Agbm93XG4gICAgICBpZiAoIW1hdGNoZWRTbGFzaCkge1xuICAgICAgICBzdGFydFBhcnQgPSBpICsgMTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgaWYgKGVuZCA9PT0gLTEpIHtcbiAgICAgIC8vIFdlIHNhdyB0aGUgZmlyc3Qgbm9uLXBhdGggc2VwYXJhdG9yLCBtYXJrIHRoaXMgYXMgdGhlIGVuZCBvZiBvdXJcbiAgICAgIC8vIGV4dGVuc2lvblxuICAgICAgbWF0Y2hlZFNsYXNoID0gZmFsc2U7XG4gICAgICBlbmQgPSBpICsgMTtcbiAgICB9XG4gICAgaWYgKGNvZGUgPT09IENIQVJfRE9UKSB7XG4gICAgICAvLyBJZiB0aGlzIGlzIG91ciBmaXJzdCBkb3QsIG1hcmsgaXQgYXMgdGhlIHN0YXJ0IG9mIG91ciBleHRlbnNpb25cbiAgICAgIGlmIChzdGFydERvdCA9PT0gLTEpIHN0YXJ0RG90ID0gaTtcbiAgICAgIGVsc2UgaWYgKHByZURvdFN0YXRlICE9PSAxKSBwcmVEb3RTdGF0ZSA9IDE7XG4gICAgfSBlbHNlIGlmIChzdGFydERvdCAhPT0gLTEpIHtcbiAgICAgIC8vIFdlIHNhdyBhIG5vbi1kb3QgYW5kIG5vbi1wYXRoIHNlcGFyYXRvciBiZWZvcmUgb3VyIGRvdCwgc28gd2Ugc2hvdWxkXG4gICAgICAvLyBoYXZlIGEgZ29vZCBjaGFuY2UgYXQgaGF2aW5nIGEgbm9uLWVtcHR5IGV4dGVuc2lvblxuICAgICAgcHJlRG90U3RhdGUgPSAtMTtcbiAgICB9XG4gIH1cblxuICBpZiAoXG4gICAgc3RhcnREb3QgPT09IC0xIHx8XG4gICAgZW5kID09PSAtMSB8fFxuICAgIC8vIFdlIHNhdyBhIG5vbi1kb3QgY2hhcmFjdGVyIGltbWVkaWF0ZWx5IGJlZm9yZSB0aGUgZG90XG4gICAgcHJlRG90U3RhdGUgPT09IDAgfHxcbiAgICAvLyBUaGUgKHJpZ2h0LW1vc3QpIHRyaW1tZWQgcGF0aCBjb21wb25lbnQgaXMgZXhhY3RseSAnLi4nXG4gICAgKHByZURvdFN0YXRlID09PSAxICYmIHN0YXJ0RG90ID09PSBlbmQgLSAxICYmIHN0YXJ0RG90ID09PSBzdGFydFBhcnQgKyAxKVxuICApIHtcbiAgICByZXR1cm4gXCJcIjtcbiAgfVxuICByZXR1cm4gcGF0aC5zbGljZShzdGFydERvdCwgZW5kKTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxxREFBcUQ7QUFDckQscUNBQXFDO0FBRXJDLFNBQVMsVUFBVSxFQUFFLFFBQVEsUUFBUSwwQkFBMEI7QUFDL0QsU0FBUyxVQUFVLFFBQVEsNEJBQTRCO0FBQ3ZELFNBQVMsZUFBZSxFQUFFLG1CQUFtQixRQUFRLGFBQWE7QUFDbEUsU0FBUyxXQUFXLFFBQVEscUJBQXFCO0FBRWpEOzs7Ozs7Ozs7Ozs7OztDQWNDLEdBQ0QsT0FBTyxTQUFTLFFBQVEsSUFBa0I7RUFDeEMsSUFBSSxnQkFBZ0IsS0FBSztJQUN2QixPQUFPLFlBQVk7RUFDckI7RUFDQSxXQUFXO0VBRVgsSUFBSSxRQUFRO0VBQ1osSUFBSSxXQUFXLENBQUM7RUFDaEIsSUFBSSxZQUFZO0VBQ2hCLElBQUksTUFBTSxDQUFDO0VBQ1gsSUFBSSxlQUFlO0VBQ25CLHlFQUF5RTtFQUN6RSxtQ0FBbUM7RUFDbkMsSUFBSSxjQUFjO0VBRWxCLHFFQUFxRTtFQUNyRSwwRUFBMEU7RUFDMUUsY0FBYztFQUVkLElBQ0UsS0FBSyxNQUFNLElBQUksS0FDZixLQUFLLFVBQVUsQ0FBQyxPQUFPLGNBQ3ZCLG9CQUFvQixLQUFLLFVBQVUsQ0FBQyxLQUNwQztJQUNBLFFBQVEsWUFBWTtFQUN0QjtFQUVBLElBQUssSUFBSSxJQUFJLEtBQUssTUFBTSxHQUFHLEdBQUcsS0FBSyxPQUFPLEVBQUUsRUFBRztJQUM3QyxNQUFNLE9BQU8sS0FBSyxVQUFVLENBQUM7SUFDN0IsSUFBSSxnQkFBZ0IsT0FBTztNQUN6QixvRUFBb0U7TUFDcEUsZ0RBQWdEO01BQ2hELElBQUksQ0FBQyxjQUFjO1FBQ2pCLFlBQVksSUFBSTtRQUNoQjtNQUNGO01BQ0E7SUFDRjtJQUNBLElBQUksUUFBUSxDQUFDLEdBQUc7TUFDZCxtRUFBbUU7TUFDbkUsWUFBWTtNQUNaLGVBQWU7TUFDZixNQUFNLElBQUk7SUFDWjtJQUNBLElBQUksU0FBUyxVQUFVO01BQ3JCLGtFQUFrRTtNQUNsRSxJQUFJLGFBQWEsQ0FBQyxHQUFHLFdBQVc7V0FDM0IsSUFBSSxnQkFBZ0IsR0FBRyxjQUFjO0lBQzVDLE9BQU8sSUFBSSxhQUFhLENBQUMsR0FBRztNQUMxQix1RUFBdUU7TUFDdkUscURBQXFEO01BQ3JELGNBQWMsQ0FBQztJQUNqQjtFQUNGO0VBRUEsSUFDRSxhQUFhLENBQUMsS0FDZCxRQUFRLENBQUMsS0FDVCx3REFBd0Q7RUFDeEQsZ0JBQWdCLEtBQ2hCLDBEQUEwRDtFQUN6RCxnQkFBZ0IsS0FBSyxhQUFhLE1BQU0sS0FBSyxhQUFhLFlBQVksR0FDdkU7SUFDQSxPQUFPO0VBQ1Q7RUFDQSxPQUFPLEtBQUssS0FBSyxDQUFDLFVBQVU7QUFDOUIifQ==
// denoCacheMetadata=3444547072155936681,549708904509255343