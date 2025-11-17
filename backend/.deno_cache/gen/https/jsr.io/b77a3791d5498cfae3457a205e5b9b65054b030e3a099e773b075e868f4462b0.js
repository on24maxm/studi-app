// Copyright 2018-2025 the Deno authors. MIT license.
// This module is browser compatible.
import { CHAR_BACKWARD_SLASH } from "../_common/constants.ts";
import { resolve } from "./resolve.ts";
import { assertArgs } from "../_common/relative.ts";
/**
 * Return the relative path from `from` to `to` based on current working directory.
 *
 * An example in windws, for instance:
 *  from = 'C:\\orandea\\test\\aaa'
 *  to = 'C:\\orandea\\impl\\bbb'
 * The output of the function should be: '..\\..\\impl\\bbb'
 *
 * @example Usage
 * ```ts
 * import { relative } from "@std/path/windows/relative";
 * import { assertEquals } from "@std/assert";
 *
 * const relativePath = relative("C:\\foobar\\test\\aaa", "C:\\foobar\\impl\\bbb");
 * assertEquals(relativePath, "..\\..\\impl\\bbb");
 * ```
 *
 * @param from The path from which to calculate the relative path
 * @param to The path to which to calculate the relative path
 * @returns The relative path from `from` to `to`
 */ export function relative(from, to) {
  assertArgs(from, to);
  const fromOrig = resolve(from);
  const toOrig = resolve(to);
  if (fromOrig === toOrig) return "";
  from = fromOrig.toLowerCase();
  to = toOrig.toLowerCase();
  if (from === to) return "";
  // Trim any leading backslashes
  let fromStart = 0;
  let fromEnd = from.length;
  for(; fromStart < fromEnd; ++fromStart){
    if (from.charCodeAt(fromStart) !== CHAR_BACKWARD_SLASH) break;
  }
  // Trim trailing backslashes (applicable to UNC paths only)
  for(; fromEnd - 1 > fromStart; --fromEnd){
    if (from.charCodeAt(fromEnd - 1) !== CHAR_BACKWARD_SLASH) break;
  }
  const fromLen = fromEnd - fromStart;
  // Trim any leading backslashes
  let toStart = 0;
  let toEnd = to.length;
  for(; toStart < toEnd; ++toStart){
    if (to.charCodeAt(toStart) !== CHAR_BACKWARD_SLASH) break;
  }
  // Trim trailing backslashes (applicable to UNC paths only)
  for(; toEnd - 1 > toStart; --toEnd){
    if (to.charCodeAt(toEnd - 1) !== CHAR_BACKWARD_SLASH) break;
  }
  const toLen = toEnd - toStart;
  // Compare paths to find the longest common path from root
  const length = fromLen < toLen ? fromLen : toLen;
  let lastCommonSep = -1;
  let i = 0;
  for(; i <= length; ++i){
    if (i === length) {
      if (toLen > length) {
        if (to.charCodeAt(toStart + i) === CHAR_BACKWARD_SLASH) {
          // We get here if `from` is the exact base path for `to`.
          // For example: from='C:\\foo\\bar'; to='C:\\foo\\bar\\baz'
          return toOrig.slice(toStart + i + 1);
        } else if (i === 2) {
          // We get here if `from` is the device root.
          // For example: from='C:\\'; to='C:\\foo'
          return toOrig.slice(toStart + i);
        }
      }
      if (fromLen > length) {
        if (from.charCodeAt(fromStart + i) === CHAR_BACKWARD_SLASH) {
          // We get here if `to` is the exact base path for `from`.
          // For example: from='C:\\foo\\bar'; to='C:\\foo'
          lastCommonSep = i;
        } else if (i === 2) {
          // We get here if `to` is the device root.
          // For example: from='C:\\foo\\bar'; to='C:\\'
          lastCommonSep = 3;
        }
      }
      break;
    }
    const fromCode = from.charCodeAt(fromStart + i);
    const toCode = to.charCodeAt(toStart + i);
    if (fromCode !== toCode) break;
    else if (fromCode === CHAR_BACKWARD_SLASH) lastCommonSep = i;
  }
  // We found a mismatch before the first common path separator was seen, so
  // return the original `to`.
  if (i !== length && lastCommonSep === -1) {
    return toOrig;
  }
  let out = "";
  if (lastCommonSep === -1) lastCommonSep = 0;
  // Generate the relative path based on the path difference between `to` and
  // `from`
  for(i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i){
    if (i === fromEnd || from.charCodeAt(i) === CHAR_BACKWARD_SLASH) {
      if (out.length === 0) out += "..";
      else out += "\\..";
    }
  }
  // Lastly, append the rest of the destination (`to`) path that comes after
  // the common path parts
  if (out.length > 0) {
    return out + toOrig.slice(toStart + lastCommonSep, toEnd);
  } else {
    toStart += lastCommonSep;
    if (toOrig.charCodeAt(toStart) === CHAR_BACKWARD_SLASH) ++toStart;
    return toOrig.slice(toStart, toEnd);
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BzdGQvcGF0aC8xLjEuMi93aW5kb3dzL3JlbGF0aXZlLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjUgdGhlIERlbm8gYXV0aG9ycy4gTUlUIGxpY2Vuc2UuXG4vLyBUaGlzIG1vZHVsZSBpcyBicm93c2VyIGNvbXBhdGlibGUuXG5cbmltcG9ydCB7IENIQVJfQkFDS1dBUkRfU0xBU0ggfSBmcm9tIFwiLi4vX2NvbW1vbi9jb25zdGFudHMudHNcIjtcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tIFwiLi9yZXNvbHZlLnRzXCI7XG5pbXBvcnQgeyBhc3NlcnRBcmdzIH0gZnJvbSBcIi4uL19jb21tb24vcmVsYXRpdmUudHNcIjtcblxuLyoqXG4gKiBSZXR1cm4gdGhlIHJlbGF0aXZlIHBhdGggZnJvbSBgZnJvbWAgdG8gYHRvYCBiYXNlZCBvbiBjdXJyZW50IHdvcmtpbmcgZGlyZWN0b3J5LlxuICpcbiAqIEFuIGV4YW1wbGUgaW4gd2luZHdzLCBmb3IgaW5zdGFuY2U6XG4gKiAgZnJvbSA9ICdDOlxcXFxvcmFuZGVhXFxcXHRlc3RcXFxcYWFhJ1xuICogIHRvID0gJ0M6XFxcXG9yYW5kZWFcXFxcaW1wbFxcXFxiYmInXG4gKiBUaGUgb3V0cHV0IG9mIHRoZSBmdW5jdGlvbiBzaG91bGQgYmU6ICcuLlxcXFwuLlxcXFxpbXBsXFxcXGJiYidcbiAqXG4gKiBAZXhhbXBsZSBVc2FnZVxuICogYGBgdHNcbiAqIGltcG9ydCB7IHJlbGF0aXZlIH0gZnJvbSBcIkBzdGQvcGF0aC93aW5kb3dzL3JlbGF0aXZlXCI7XG4gKiBpbXBvcnQgeyBhc3NlcnRFcXVhbHMgfSBmcm9tIFwiQHN0ZC9hc3NlcnRcIjtcbiAqXG4gKiBjb25zdCByZWxhdGl2ZVBhdGggPSByZWxhdGl2ZShcIkM6XFxcXGZvb2JhclxcXFx0ZXN0XFxcXGFhYVwiLCBcIkM6XFxcXGZvb2JhclxcXFxpbXBsXFxcXGJiYlwiKTtcbiAqIGFzc2VydEVxdWFscyhyZWxhdGl2ZVBhdGgsIFwiLi5cXFxcLi5cXFxcaW1wbFxcXFxiYmJcIik7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gZnJvbSBUaGUgcGF0aCBmcm9tIHdoaWNoIHRvIGNhbGN1bGF0ZSB0aGUgcmVsYXRpdmUgcGF0aFxuICogQHBhcmFtIHRvIFRoZSBwYXRoIHRvIHdoaWNoIHRvIGNhbGN1bGF0ZSB0aGUgcmVsYXRpdmUgcGF0aFxuICogQHJldHVybnMgVGhlIHJlbGF0aXZlIHBhdGggZnJvbSBgZnJvbWAgdG8gYHRvYFxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVsYXRpdmUoZnJvbTogc3RyaW5nLCB0bzogc3RyaW5nKTogc3RyaW5nIHtcbiAgYXNzZXJ0QXJncyhmcm9tLCB0byk7XG5cbiAgY29uc3QgZnJvbU9yaWcgPSByZXNvbHZlKGZyb20pO1xuICBjb25zdCB0b09yaWcgPSByZXNvbHZlKHRvKTtcblxuICBpZiAoZnJvbU9yaWcgPT09IHRvT3JpZykgcmV0dXJuIFwiXCI7XG5cbiAgZnJvbSA9IGZyb21PcmlnLnRvTG93ZXJDYXNlKCk7XG4gIHRvID0gdG9PcmlnLnRvTG93ZXJDYXNlKCk7XG5cbiAgaWYgKGZyb20gPT09IHRvKSByZXR1cm4gXCJcIjtcblxuICAvLyBUcmltIGFueSBsZWFkaW5nIGJhY2tzbGFzaGVzXG4gIGxldCBmcm9tU3RhcnQgPSAwO1xuICBsZXQgZnJvbUVuZCA9IGZyb20ubGVuZ3RoO1xuICBmb3IgKDsgZnJvbVN0YXJ0IDwgZnJvbUVuZDsgKytmcm9tU3RhcnQpIHtcbiAgICBpZiAoZnJvbS5jaGFyQ29kZUF0KGZyb21TdGFydCkgIT09IENIQVJfQkFDS1dBUkRfU0xBU0gpIGJyZWFrO1xuICB9XG4gIC8vIFRyaW0gdHJhaWxpbmcgYmFja3NsYXNoZXMgKGFwcGxpY2FibGUgdG8gVU5DIHBhdGhzIG9ubHkpXG4gIGZvciAoOyBmcm9tRW5kIC0gMSA+IGZyb21TdGFydDsgLS1mcm9tRW5kKSB7XG4gICAgaWYgKGZyb20uY2hhckNvZGVBdChmcm9tRW5kIC0gMSkgIT09IENIQVJfQkFDS1dBUkRfU0xBU0gpIGJyZWFrO1xuICB9XG4gIGNvbnN0IGZyb21MZW4gPSBmcm9tRW5kIC0gZnJvbVN0YXJ0O1xuXG4gIC8vIFRyaW0gYW55IGxlYWRpbmcgYmFja3NsYXNoZXNcbiAgbGV0IHRvU3RhcnQgPSAwO1xuICBsZXQgdG9FbmQgPSB0by5sZW5ndGg7XG4gIGZvciAoOyB0b1N0YXJ0IDwgdG9FbmQ7ICsrdG9TdGFydCkge1xuICAgIGlmICh0by5jaGFyQ29kZUF0KHRvU3RhcnQpICE9PSBDSEFSX0JBQ0tXQVJEX1NMQVNIKSBicmVhaztcbiAgfVxuICAvLyBUcmltIHRyYWlsaW5nIGJhY2tzbGFzaGVzIChhcHBsaWNhYmxlIHRvIFVOQyBwYXRocyBvbmx5KVxuICBmb3IgKDsgdG9FbmQgLSAxID4gdG9TdGFydDsgLS10b0VuZCkge1xuICAgIGlmICh0by5jaGFyQ29kZUF0KHRvRW5kIC0gMSkgIT09IENIQVJfQkFDS1dBUkRfU0xBU0gpIGJyZWFrO1xuICB9XG4gIGNvbnN0IHRvTGVuID0gdG9FbmQgLSB0b1N0YXJ0O1xuXG4gIC8vIENvbXBhcmUgcGF0aHMgdG8gZmluZCB0aGUgbG9uZ2VzdCBjb21tb24gcGF0aCBmcm9tIHJvb3RcbiAgY29uc3QgbGVuZ3RoID0gZnJvbUxlbiA8IHRvTGVuID8gZnJvbUxlbiA6IHRvTGVuO1xuICBsZXQgbGFzdENvbW1vblNlcCA9IC0xO1xuICBsZXQgaSA9IDA7XG4gIGZvciAoOyBpIDw9IGxlbmd0aDsgKytpKSB7XG4gICAgaWYgKGkgPT09IGxlbmd0aCkge1xuICAgICAgaWYgKHRvTGVuID4gbGVuZ3RoKSB7XG4gICAgICAgIGlmICh0by5jaGFyQ29kZUF0KHRvU3RhcnQgKyBpKSA9PT0gQ0hBUl9CQUNLV0FSRF9TTEFTSCkge1xuICAgICAgICAgIC8vIFdlIGdldCBoZXJlIGlmIGBmcm9tYCBpcyB0aGUgZXhhY3QgYmFzZSBwYXRoIGZvciBgdG9gLlxuICAgICAgICAgIC8vIEZvciBleGFtcGxlOiBmcm9tPSdDOlxcXFxmb29cXFxcYmFyJzsgdG89J0M6XFxcXGZvb1xcXFxiYXJcXFxcYmF6J1xuICAgICAgICAgIHJldHVybiB0b09yaWcuc2xpY2UodG9TdGFydCArIGkgKyAxKTtcbiAgICAgICAgfSBlbHNlIGlmIChpID09PSAyKSB7XG4gICAgICAgICAgLy8gV2UgZ2V0IGhlcmUgaWYgYGZyb21gIGlzIHRoZSBkZXZpY2Ugcm9vdC5cbiAgICAgICAgICAvLyBGb3IgZXhhbXBsZTogZnJvbT0nQzpcXFxcJzsgdG89J0M6XFxcXGZvbydcbiAgICAgICAgICByZXR1cm4gdG9PcmlnLnNsaWNlKHRvU3RhcnQgKyBpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGZyb21MZW4gPiBsZW5ndGgpIHtcbiAgICAgICAgaWYgKGZyb20uY2hhckNvZGVBdChmcm9tU3RhcnQgKyBpKSA9PT0gQ0hBUl9CQUNLV0FSRF9TTEFTSCkge1xuICAgICAgICAgIC8vIFdlIGdldCBoZXJlIGlmIGB0b2AgaXMgdGhlIGV4YWN0IGJhc2UgcGF0aCBmb3IgYGZyb21gLlxuICAgICAgICAgIC8vIEZvciBleGFtcGxlOiBmcm9tPSdDOlxcXFxmb29cXFxcYmFyJzsgdG89J0M6XFxcXGZvbydcbiAgICAgICAgICBsYXN0Q29tbW9uU2VwID0gaTtcbiAgICAgICAgfSBlbHNlIGlmIChpID09PSAyKSB7XG4gICAgICAgICAgLy8gV2UgZ2V0IGhlcmUgaWYgYHRvYCBpcyB0aGUgZGV2aWNlIHJvb3QuXG4gICAgICAgICAgLy8gRm9yIGV4YW1wbGU6IGZyb209J0M6XFxcXGZvb1xcXFxiYXInOyB0bz0nQzpcXFxcJ1xuICAgICAgICAgIGxhc3RDb21tb25TZXAgPSAzO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgY29uc3QgZnJvbUNvZGUgPSBmcm9tLmNoYXJDb2RlQXQoZnJvbVN0YXJ0ICsgaSk7XG4gICAgY29uc3QgdG9Db2RlID0gdG8uY2hhckNvZGVBdCh0b1N0YXJ0ICsgaSk7XG4gICAgaWYgKGZyb21Db2RlICE9PSB0b0NvZGUpIGJyZWFrO1xuICAgIGVsc2UgaWYgKGZyb21Db2RlID09PSBDSEFSX0JBQ0tXQVJEX1NMQVNIKSBsYXN0Q29tbW9uU2VwID0gaTtcbiAgfVxuXG4gIC8vIFdlIGZvdW5kIGEgbWlzbWF0Y2ggYmVmb3JlIHRoZSBmaXJzdCBjb21tb24gcGF0aCBzZXBhcmF0b3Igd2FzIHNlZW4sIHNvXG4gIC8vIHJldHVybiB0aGUgb3JpZ2luYWwgYHRvYC5cbiAgaWYgKGkgIT09IGxlbmd0aCAmJiBsYXN0Q29tbW9uU2VwID09PSAtMSkge1xuICAgIHJldHVybiB0b09yaWc7XG4gIH1cblxuICBsZXQgb3V0ID0gXCJcIjtcbiAgaWYgKGxhc3RDb21tb25TZXAgPT09IC0xKSBsYXN0Q29tbW9uU2VwID0gMDtcbiAgLy8gR2VuZXJhdGUgdGhlIHJlbGF0aXZlIHBhdGggYmFzZWQgb24gdGhlIHBhdGggZGlmZmVyZW5jZSBiZXR3ZWVuIGB0b2AgYW5kXG4gIC8vIGBmcm9tYFxuICBmb3IgKGkgPSBmcm9tU3RhcnQgKyBsYXN0Q29tbW9uU2VwICsgMTsgaSA8PSBmcm9tRW5kOyArK2kpIHtcbiAgICBpZiAoaSA9PT0gZnJvbUVuZCB8fCBmcm9tLmNoYXJDb2RlQXQoaSkgPT09IENIQVJfQkFDS1dBUkRfU0xBU0gpIHtcbiAgICAgIGlmIChvdXQubGVuZ3RoID09PSAwKSBvdXQgKz0gXCIuLlwiO1xuICAgICAgZWxzZSBvdXQgKz0gXCJcXFxcLi5cIjtcbiAgICB9XG4gIH1cblxuICAvLyBMYXN0bHksIGFwcGVuZCB0aGUgcmVzdCBvZiB0aGUgZGVzdGluYXRpb24gKGB0b2ApIHBhdGggdGhhdCBjb21lcyBhZnRlclxuICAvLyB0aGUgY29tbW9uIHBhdGggcGFydHNcbiAgaWYgKG91dC5sZW5ndGggPiAwKSB7XG4gICAgcmV0dXJuIG91dCArIHRvT3JpZy5zbGljZSh0b1N0YXJ0ICsgbGFzdENvbW1vblNlcCwgdG9FbmQpO1xuICB9IGVsc2Uge1xuICAgIHRvU3RhcnQgKz0gbGFzdENvbW1vblNlcDtcbiAgICBpZiAodG9PcmlnLmNoYXJDb2RlQXQodG9TdGFydCkgPT09IENIQVJfQkFDS1dBUkRfU0xBU0gpICsrdG9TdGFydDtcbiAgICByZXR1cm4gdG9PcmlnLnNsaWNlKHRvU3RhcnQsIHRvRW5kKTtcbiAgfVxufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLHFEQUFxRDtBQUNyRCxxQ0FBcUM7QUFFckMsU0FBUyxtQkFBbUIsUUFBUSwwQkFBMEI7QUFDOUQsU0FBUyxPQUFPLFFBQVEsZUFBZTtBQUN2QyxTQUFTLFVBQVUsUUFBUSx5QkFBeUI7QUFFcEQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0NBb0JDLEdBQ0QsT0FBTyxTQUFTLFNBQVMsSUFBWSxFQUFFLEVBQVU7RUFDL0MsV0FBVyxNQUFNO0VBRWpCLE1BQU0sV0FBVyxRQUFRO0VBQ3pCLE1BQU0sU0FBUyxRQUFRO0VBRXZCLElBQUksYUFBYSxRQUFRLE9BQU87RUFFaEMsT0FBTyxTQUFTLFdBQVc7RUFDM0IsS0FBSyxPQUFPLFdBQVc7RUFFdkIsSUFBSSxTQUFTLElBQUksT0FBTztFQUV4QiwrQkFBK0I7RUFDL0IsSUFBSSxZQUFZO0VBQ2hCLElBQUksVUFBVSxLQUFLLE1BQU07RUFDekIsTUFBTyxZQUFZLFNBQVMsRUFBRSxVQUFXO0lBQ3ZDLElBQUksS0FBSyxVQUFVLENBQUMsZUFBZSxxQkFBcUI7RUFDMUQ7RUFDQSwyREFBMkQ7RUFDM0QsTUFBTyxVQUFVLElBQUksV0FBVyxFQUFFLFFBQVM7SUFDekMsSUFBSSxLQUFLLFVBQVUsQ0FBQyxVQUFVLE9BQU8scUJBQXFCO0VBQzVEO0VBQ0EsTUFBTSxVQUFVLFVBQVU7RUFFMUIsK0JBQStCO0VBQy9CLElBQUksVUFBVTtFQUNkLElBQUksUUFBUSxHQUFHLE1BQU07RUFDckIsTUFBTyxVQUFVLE9BQU8sRUFBRSxRQUFTO0lBQ2pDLElBQUksR0FBRyxVQUFVLENBQUMsYUFBYSxxQkFBcUI7RUFDdEQ7RUFDQSwyREFBMkQ7RUFDM0QsTUFBTyxRQUFRLElBQUksU0FBUyxFQUFFLE1BQU87SUFDbkMsSUFBSSxHQUFHLFVBQVUsQ0FBQyxRQUFRLE9BQU8scUJBQXFCO0VBQ3hEO0VBQ0EsTUFBTSxRQUFRLFFBQVE7RUFFdEIsMERBQTBEO0VBQzFELE1BQU0sU0FBUyxVQUFVLFFBQVEsVUFBVTtFQUMzQyxJQUFJLGdCQUFnQixDQUFDO0VBQ3JCLElBQUksSUFBSTtFQUNSLE1BQU8sS0FBSyxRQUFRLEVBQUUsRUFBRztJQUN2QixJQUFJLE1BQU0sUUFBUTtNQUNoQixJQUFJLFFBQVEsUUFBUTtRQUNsQixJQUFJLEdBQUcsVUFBVSxDQUFDLFVBQVUsT0FBTyxxQkFBcUI7VUFDdEQseURBQXlEO1VBQ3pELDJEQUEyRDtVQUMzRCxPQUFPLE9BQU8sS0FBSyxDQUFDLFVBQVUsSUFBSTtRQUNwQyxPQUFPLElBQUksTUFBTSxHQUFHO1VBQ2xCLDRDQUE0QztVQUM1Qyx5Q0FBeUM7VUFDekMsT0FBTyxPQUFPLEtBQUssQ0FBQyxVQUFVO1FBQ2hDO01BQ0Y7TUFDQSxJQUFJLFVBQVUsUUFBUTtRQUNwQixJQUFJLEtBQUssVUFBVSxDQUFDLFlBQVksT0FBTyxxQkFBcUI7VUFDMUQseURBQXlEO1VBQ3pELGlEQUFpRDtVQUNqRCxnQkFBZ0I7UUFDbEIsT0FBTyxJQUFJLE1BQU0sR0FBRztVQUNsQiwwQ0FBMEM7VUFDMUMsOENBQThDO1VBQzlDLGdCQUFnQjtRQUNsQjtNQUNGO01BQ0E7SUFDRjtJQUNBLE1BQU0sV0FBVyxLQUFLLFVBQVUsQ0FBQyxZQUFZO0lBQzdDLE1BQU0sU0FBUyxHQUFHLFVBQVUsQ0FBQyxVQUFVO0lBQ3ZDLElBQUksYUFBYSxRQUFRO1NBQ3BCLElBQUksYUFBYSxxQkFBcUIsZ0JBQWdCO0VBQzdEO0VBRUEsMEVBQTBFO0VBQzFFLDRCQUE0QjtFQUM1QixJQUFJLE1BQU0sVUFBVSxrQkFBa0IsQ0FBQyxHQUFHO0lBQ3hDLE9BQU87RUFDVDtFQUVBLElBQUksTUFBTTtFQUNWLElBQUksa0JBQWtCLENBQUMsR0FBRyxnQkFBZ0I7RUFDMUMsMkVBQTJFO0VBQzNFLFNBQVM7RUFDVCxJQUFLLElBQUksWUFBWSxnQkFBZ0IsR0FBRyxLQUFLLFNBQVMsRUFBRSxFQUFHO0lBQ3pELElBQUksTUFBTSxXQUFXLEtBQUssVUFBVSxDQUFDLE9BQU8scUJBQXFCO01BQy9ELElBQUksSUFBSSxNQUFNLEtBQUssR0FBRyxPQUFPO1dBQ3hCLE9BQU87SUFDZDtFQUNGO0VBRUEsMEVBQTBFO0VBQzFFLHdCQUF3QjtFQUN4QixJQUFJLElBQUksTUFBTSxHQUFHLEdBQUc7SUFDbEIsT0FBTyxNQUFNLE9BQU8sS0FBSyxDQUFDLFVBQVUsZUFBZTtFQUNyRCxPQUFPO0lBQ0wsV0FBVztJQUNYLElBQUksT0FBTyxVQUFVLENBQUMsYUFBYSxxQkFBcUIsRUFBRTtJQUMxRCxPQUFPLE9BQU8sS0FBSyxDQUFDLFNBQVM7RUFDL0I7QUFDRiJ9
// denoCacheMetadata=12270401773593208906,6289152119656243873