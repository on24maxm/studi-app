// Copyright 2018-2025 the Deno authors. MIT license.
// This module is browser compatible.
import { assertArg } from "../_common/dirname.ts";
import { stripTrailingSeparators } from "../_common/strip_trailing_separators.ts";
import { isPosixPathSeparator } from "./_util.ts";
import { fromFileUrl } from "./from_file_url.ts";
/**
 * Return the directory path of a `path`.
 *
 * @example Usage
 * ```ts
 * import { dirname } from "@std/path/posix/dirname";
 * import { assertEquals } from "@std/assert";
 *
 * assertEquals(dirname("/home/user/Documents/"), "/home/user");
 * assertEquals(dirname("/home/user/Documents/image.png"), "/home/user/Documents");
 * assertEquals(dirname("https://deno.land/std/path/mod.ts"), "https://deno.land/std/path");
 * assertEquals(dirname(new URL("file:///home/user/Documents/image.png")), "/home/user/Documents");
 * ```
 *
 * @example Working with URLs
 *
 * ```ts
 * import { dirname } from "@std/path/posix/dirname";
 * import { assertEquals } from "@std/assert";
 *
 * assertEquals(dirname("https://deno.land/std/path/mod.ts"), "https://deno.land/std/path");
 * assertEquals(dirname("https://deno.land/std/path/mod.ts?a=b"), "https://deno.land/std/path");
 * assertEquals(dirname("https://deno.land/std/path/mod.ts#header"), "https://deno.land/std/path");
 * ```
 *
 * @param path The path to get the directory from.
 * @returns The directory path.
 */ export function dirname(path) {
  if (path instanceof URL) {
    path = fromFileUrl(path);
  }
  assertArg(path);
  let end = -1;
  let matchedNonSeparator = false;
  for(let i = path.length - 1; i >= 1; --i){
    if (isPosixPathSeparator(path.charCodeAt(i))) {
      if (matchedNonSeparator) {
        end = i;
        break;
      }
    } else {
      matchedNonSeparator = true;
    }
  }
  // No matches. Fallback based on provided path:
  //
  // - leading slashes paths
  //     "/foo" => "/"
  //     "///foo" => "/"
  // - no slash path
  //     "foo" => "."
  if (end === -1) {
    return isPosixPathSeparator(path.charCodeAt(0)) ? "/" : ".";
  }
  return stripTrailingSeparators(path.slice(0, end), isPosixPathSeparator);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BzdGQvcGF0aC8xLjEuMi9wb3NpeC9kaXJuYW1lLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjUgdGhlIERlbm8gYXV0aG9ycy4gTUlUIGxpY2Vuc2UuXG4vLyBUaGlzIG1vZHVsZSBpcyBicm93c2VyIGNvbXBhdGlibGUuXG5cbmltcG9ydCB7IGFzc2VydEFyZyB9IGZyb20gXCIuLi9fY29tbW9uL2Rpcm5hbWUudHNcIjtcbmltcG9ydCB7IHN0cmlwVHJhaWxpbmdTZXBhcmF0b3JzIH0gZnJvbSBcIi4uL19jb21tb24vc3RyaXBfdHJhaWxpbmdfc2VwYXJhdG9ycy50c1wiO1xuaW1wb3J0IHsgaXNQb3NpeFBhdGhTZXBhcmF0b3IgfSBmcm9tIFwiLi9fdXRpbC50c1wiO1xuaW1wb3J0IHsgZnJvbUZpbGVVcmwgfSBmcm9tIFwiLi9mcm9tX2ZpbGVfdXJsLnRzXCI7XG5cbi8qKlxuICogUmV0dXJuIHRoZSBkaXJlY3RvcnkgcGF0aCBvZiBhIGBwYXRoYC5cbiAqXG4gKiBAZXhhbXBsZSBVc2FnZVxuICogYGBgdHNcbiAqIGltcG9ydCB7IGRpcm5hbWUgfSBmcm9tIFwiQHN0ZC9wYXRoL3Bvc2l4L2Rpcm5hbWVcIjtcbiAqIGltcG9ydCB7IGFzc2VydEVxdWFscyB9IGZyb20gXCJAc3RkL2Fzc2VydFwiO1xuICpcbiAqIGFzc2VydEVxdWFscyhkaXJuYW1lKFwiL2hvbWUvdXNlci9Eb2N1bWVudHMvXCIpLCBcIi9ob21lL3VzZXJcIik7XG4gKiBhc3NlcnRFcXVhbHMoZGlybmFtZShcIi9ob21lL3VzZXIvRG9jdW1lbnRzL2ltYWdlLnBuZ1wiKSwgXCIvaG9tZS91c2VyL0RvY3VtZW50c1wiKTtcbiAqIGFzc2VydEVxdWFscyhkaXJuYW1lKFwiaHR0cHM6Ly9kZW5vLmxhbmQvc3RkL3BhdGgvbW9kLnRzXCIpLCBcImh0dHBzOi8vZGVuby5sYW5kL3N0ZC9wYXRoXCIpO1xuICogYXNzZXJ0RXF1YWxzKGRpcm5hbWUobmV3IFVSTChcImZpbGU6Ly8vaG9tZS91c2VyL0RvY3VtZW50cy9pbWFnZS5wbmdcIikpLCBcIi9ob21lL3VzZXIvRG9jdW1lbnRzXCIpO1xuICogYGBgXG4gKlxuICogQGV4YW1wbGUgV29ya2luZyB3aXRoIFVSTHNcbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgZGlybmFtZSB9IGZyb20gXCJAc3RkL3BhdGgvcG9zaXgvZGlybmFtZVwiO1xuICogaW1wb3J0IHsgYXNzZXJ0RXF1YWxzIH0gZnJvbSBcIkBzdGQvYXNzZXJ0XCI7XG4gKlxuICogYXNzZXJ0RXF1YWxzKGRpcm5hbWUoXCJodHRwczovL2Rlbm8ubGFuZC9zdGQvcGF0aC9tb2QudHNcIiksIFwiaHR0cHM6Ly9kZW5vLmxhbmQvc3RkL3BhdGhcIik7XG4gKiBhc3NlcnRFcXVhbHMoZGlybmFtZShcImh0dHBzOi8vZGVuby5sYW5kL3N0ZC9wYXRoL21vZC50cz9hPWJcIiksIFwiaHR0cHM6Ly9kZW5vLmxhbmQvc3RkL3BhdGhcIik7XG4gKiBhc3NlcnRFcXVhbHMoZGlybmFtZShcImh0dHBzOi8vZGVuby5sYW5kL3N0ZC9wYXRoL21vZC50cyNoZWFkZXJcIiksIFwiaHR0cHM6Ly9kZW5vLmxhbmQvc3RkL3BhdGhcIik7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gcGF0aCBUaGUgcGF0aCB0byBnZXQgdGhlIGRpcmVjdG9yeSBmcm9tLlxuICogQHJldHVybnMgVGhlIGRpcmVjdG9yeSBwYXRoLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZGlybmFtZShwYXRoOiBzdHJpbmcgfCBVUkwpOiBzdHJpbmcge1xuICBpZiAocGF0aCBpbnN0YW5jZW9mIFVSTCkge1xuICAgIHBhdGggPSBmcm9tRmlsZVVybChwYXRoKTtcbiAgfVxuICBhc3NlcnRBcmcocGF0aCk7XG5cbiAgbGV0IGVuZCA9IC0xO1xuICBsZXQgbWF0Y2hlZE5vblNlcGFyYXRvciA9IGZhbHNlO1xuXG4gIGZvciAobGV0IGkgPSBwYXRoLmxlbmd0aCAtIDE7IGkgPj0gMTsgLS1pKSB7XG4gICAgaWYgKGlzUG9zaXhQYXRoU2VwYXJhdG9yKHBhdGguY2hhckNvZGVBdChpKSkpIHtcbiAgICAgIGlmIChtYXRjaGVkTm9uU2VwYXJhdG9yKSB7XG4gICAgICAgIGVuZCA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBtYXRjaGVkTm9uU2VwYXJhdG9yID0gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICAvLyBObyBtYXRjaGVzLiBGYWxsYmFjayBiYXNlZCBvbiBwcm92aWRlZCBwYXRoOlxuICAvL1xuICAvLyAtIGxlYWRpbmcgc2xhc2hlcyBwYXRoc1xuICAvLyAgICAgXCIvZm9vXCIgPT4gXCIvXCJcbiAgLy8gICAgIFwiLy8vZm9vXCIgPT4gXCIvXCJcbiAgLy8gLSBubyBzbGFzaCBwYXRoXG4gIC8vICAgICBcImZvb1wiID0+IFwiLlwiXG4gIGlmIChlbmQgPT09IC0xKSB7XG4gICAgcmV0dXJuIGlzUG9zaXhQYXRoU2VwYXJhdG9yKHBhdGguY2hhckNvZGVBdCgwKSkgPyBcIi9cIiA6IFwiLlwiO1xuICB9XG5cbiAgcmV0dXJuIHN0cmlwVHJhaWxpbmdTZXBhcmF0b3JzKFxuICAgIHBhdGguc2xpY2UoMCwgZW5kKSxcbiAgICBpc1Bvc2l4UGF0aFNlcGFyYXRvcixcbiAgKTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxxREFBcUQ7QUFDckQscUNBQXFDO0FBRXJDLFNBQVMsU0FBUyxRQUFRLHdCQUF3QjtBQUNsRCxTQUFTLHVCQUF1QixRQUFRLDBDQUEwQztBQUNsRixTQUFTLG9CQUFvQixRQUFRLGFBQWE7QUFDbEQsU0FBUyxXQUFXLFFBQVEscUJBQXFCO0FBRWpEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0EyQkMsR0FDRCxPQUFPLFNBQVMsUUFBUSxJQUFrQjtFQUN4QyxJQUFJLGdCQUFnQixLQUFLO0lBQ3ZCLE9BQU8sWUFBWTtFQUNyQjtFQUNBLFVBQVU7RUFFVixJQUFJLE1BQU0sQ0FBQztFQUNYLElBQUksc0JBQXNCO0VBRTFCLElBQUssSUFBSSxJQUFJLEtBQUssTUFBTSxHQUFHLEdBQUcsS0FBSyxHQUFHLEVBQUUsRUFBRztJQUN6QyxJQUFJLHFCQUFxQixLQUFLLFVBQVUsQ0FBQyxLQUFLO01BQzVDLElBQUkscUJBQXFCO1FBQ3ZCLE1BQU07UUFDTjtNQUNGO0lBQ0YsT0FBTztNQUNMLHNCQUFzQjtJQUN4QjtFQUNGO0VBRUEsK0NBQStDO0VBQy9DLEVBQUU7RUFDRiwwQkFBMEI7RUFDMUIsb0JBQW9CO0VBQ3BCLHNCQUFzQjtFQUN0QixrQkFBa0I7RUFDbEIsbUJBQW1CO0VBQ25CLElBQUksUUFBUSxDQUFDLEdBQUc7SUFDZCxPQUFPLHFCQUFxQixLQUFLLFVBQVUsQ0FBQyxNQUFNLE1BQU07RUFDMUQ7RUFFQSxPQUFPLHdCQUNMLEtBQUssS0FBSyxDQUFDLEdBQUcsTUFDZDtBQUVKIn0=
// denoCacheMetadata=5121474864374160082,12593095555095027191