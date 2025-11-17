// Copyright 2018-2025 the Deno authors. MIT license.
// This module is browser compatible.
/**
 * Test whether the given string is a glob.
 *
 * @example Usage
 * ```ts
 * import { isGlob } from "@std/path/is-glob";
 * import { assert } from "@std/assert";
 *
 * assert(!isGlob("foo/bar/../baz"));
 * assert(isGlob("foo/*ar/../baz"));
 * ```
 *
 * @param str String to test.
 * @returns `true` if the given string is a glob, otherwise `false`
 */ export function isGlob(str) {
  const chars = {
    "{": "}",
    "(": ")",
    "[": "]"
  };
  const regex = /\\(.)|(^!|\*|\?|[\].+)]\?|\[[^[\\\]]+\]|\{[^{\\}]+\}|\(\?[:!=][^\\)]+\)|\([^(|]+\|[^\\)]+\))/;
  if (str === "") {
    return false;
  }
  let match;
  while(match = regex.exec(str)){
    if (match[2]) return true;
    let idx = match.index + match[0].length;
    // if an open bracket/brace/paren is escaped,
    // set the index to the next closing character
    const open = match[1];
    const close = open ? chars[open] : null;
    if (open && close) {
      const n = str.indexOf(close, idx);
      if (n !== -1) {
        idx = n + 1;
      }
    }
    str = str.slice(idx);
  }
  return false;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BzdGQvcGF0aC8xLjEuMi9pc19nbG9iLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjUgdGhlIERlbm8gYXV0aG9ycy4gTUlUIGxpY2Vuc2UuXG4vLyBUaGlzIG1vZHVsZSBpcyBicm93c2VyIGNvbXBhdGlibGUuXG5cbi8qKlxuICogVGVzdCB3aGV0aGVyIHRoZSBnaXZlbiBzdHJpbmcgaXMgYSBnbG9iLlxuICpcbiAqIEBleGFtcGxlIFVzYWdlXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgaXNHbG9iIH0gZnJvbSBcIkBzdGQvcGF0aC9pcy1nbG9iXCI7XG4gKiBpbXBvcnQgeyBhc3NlcnQgfSBmcm9tIFwiQHN0ZC9hc3NlcnRcIjtcbiAqXG4gKiBhc3NlcnQoIWlzR2xvYihcImZvby9iYXIvLi4vYmF6XCIpKTtcbiAqIGFzc2VydChpc0dsb2IoXCJmb28vKmFyLy4uL2JhelwiKSk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gc3RyIFN0cmluZyB0byB0ZXN0LlxuICogQHJldHVybnMgYHRydWVgIGlmIHRoZSBnaXZlbiBzdHJpbmcgaXMgYSBnbG9iLCBvdGhlcndpc2UgYGZhbHNlYFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNHbG9iKHN0cjogc3RyaW5nKTogYm9vbGVhbiB7XG4gIGNvbnN0IGNoYXJzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0geyBcIntcIjogXCJ9XCIsIFwiKFwiOiBcIilcIiwgXCJbXCI6IFwiXVwiIH07XG4gIGNvbnN0IHJlZ2V4ID1cbiAgICAvXFxcXCguKXwoXiF8XFwqfFxcP3xbXFxdLispXVxcP3xcXFtbXltcXFxcXFxdXStcXF18XFx7W157XFxcXH1dK1xcfXxcXChcXD9bOiE9XVteXFxcXCldK1xcKXxcXChbXih8XStcXHxbXlxcXFwpXStcXCkpLztcblxuICBpZiAoc3RyID09PSBcIlwiKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgbGV0IG1hdGNoOiBSZWdFeHBFeGVjQXJyYXkgfCBudWxsO1xuXG4gIHdoaWxlICgobWF0Y2ggPSByZWdleC5leGVjKHN0cikpKSB7XG4gICAgaWYgKG1hdGNoWzJdKSByZXR1cm4gdHJ1ZTtcbiAgICBsZXQgaWR4ID0gbWF0Y2guaW5kZXggKyBtYXRjaFswXS5sZW5ndGg7XG5cbiAgICAvLyBpZiBhbiBvcGVuIGJyYWNrZXQvYnJhY2UvcGFyZW4gaXMgZXNjYXBlZCxcbiAgICAvLyBzZXQgdGhlIGluZGV4IHRvIHRoZSBuZXh0IGNsb3NpbmcgY2hhcmFjdGVyXG4gICAgY29uc3Qgb3BlbiA9IG1hdGNoWzFdO1xuICAgIGNvbnN0IGNsb3NlID0gb3BlbiA/IGNoYXJzW29wZW5dIDogbnVsbDtcbiAgICBpZiAob3BlbiAmJiBjbG9zZSkge1xuICAgICAgY29uc3QgbiA9IHN0ci5pbmRleE9mKGNsb3NlLCBpZHgpO1xuICAgICAgaWYgKG4gIT09IC0xKSB7XG4gICAgICAgIGlkeCA9IG4gKyAxO1xuICAgICAgfVxuICAgIH1cblxuICAgIHN0ciA9IHN0ci5zbGljZShpZHgpO1xuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLHFEQUFxRDtBQUNyRCxxQ0FBcUM7QUFFckM7Ozs7Ozs7Ozs7Ozs7O0NBY0MsR0FDRCxPQUFPLFNBQVMsT0FBTyxHQUFXO0VBQ2hDLE1BQU0sUUFBZ0M7SUFBRSxLQUFLO0lBQUssS0FBSztJQUFLLEtBQUs7RUFBSTtFQUNyRSxNQUFNLFFBQ0o7RUFFRixJQUFJLFFBQVEsSUFBSTtJQUNkLE9BQU87RUFDVDtFQUVBLElBQUk7RUFFSixNQUFRLFFBQVEsTUFBTSxJQUFJLENBQUMsS0FBTztJQUNoQyxJQUFJLEtBQUssQ0FBQyxFQUFFLEVBQUUsT0FBTztJQUNyQixJQUFJLE1BQU0sTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLEVBQUUsQ0FBQyxNQUFNO0lBRXZDLDZDQUE2QztJQUM3Qyw4Q0FBOEM7SUFDOUMsTUFBTSxPQUFPLEtBQUssQ0FBQyxFQUFFO0lBQ3JCLE1BQU0sUUFBUSxPQUFPLEtBQUssQ0FBQyxLQUFLLEdBQUc7SUFDbkMsSUFBSSxRQUFRLE9BQU87TUFDakIsTUFBTSxJQUFJLElBQUksT0FBTyxDQUFDLE9BQU87TUFDN0IsSUFBSSxNQUFNLENBQUMsR0FBRztRQUNaLE1BQU0sSUFBSTtNQUNaO0lBQ0Y7SUFFQSxNQUFNLElBQUksS0FBSyxDQUFDO0VBQ2xCO0VBRUEsT0FBTztBQUNUIn0=
// denoCacheMetadata=12507625816780778485,13579216667104146024