// Copyright 2018-2025 the Deno authors. MIT license.
// This module is browser compatible.
import { AssertionError } from "./assertion_error.ts";
/**
 * Make an assertion, error will be thrown if `expr` does not have truthy value.
 *
 * @example Usage
 * ```ts ignore
 * import { assert } from "@std/assert";
 *
 * assert("hello".includes("ello")); // Doesn't throw
 * assert("hello".includes("world")); // Throws
 * ```
 *
 * @param expr The expression to test.
 * @param msg The optional message to display if the assertion fails.
 */ export function assert(expr, msg = "") {
  if (!expr) {
    throw new AssertionError(msg);
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BzdGQvYXNzZXJ0LzEuMC4xNC9hc3NlcnQudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IDIwMTgtMjAyNSB0aGUgRGVubyBhdXRob3JzLiBNSVQgbGljZW5zZS5cbi8vIFRoaXMgbW9kdWxlIGlzIGJyb3dzZXIgY29tcGF0aWJsZS5cbmltcG9ydCB7IEFzc2VydGlvbkVycm9yIH0gZnJvbSBcIi4vYXNzZXJ0aW9uX2Vycm9yLnRzXCI7XG5cbi8qKlxuICogTWFrZSBhbiBhc3NlcnRpb24sIGVycm9yIHdpbGwgYmUgdGhyb3duIGlmIGBleHByYCBkb2VzIG5vdCBoYXZlIHRydXRoeSB2YWx1ZS5cbiAqXG4gKiBAZXhhbXBsZSBVc2FnZVxuICogYGBgdHMgaWdub3JlXG4gKiBpbXBvcnQgeyBhc3NlcnQgfSBmcm9tIFwiQHN0ZC9hc3NlcnRcIjtcbiAqXG4gKiBhc3NlcnQoXCJoZWxsb1wiLmluY2x1ZGVzKFwiZWxsb1wiKSk7IC8vIERvZXNuJ3QgdGhyb3dcbiAqIGFzc2VydChcImhlbGxvXCIuaW5jbHVkZXMoXCJ3b3JsZFwiKSk7IC8vIFRocm93c1xuICogYGBgXG4gKlxuICogQHBhcmFtIGV4cHIgVGhlIGV4cHJlc3Npb24gdG8gdGVzdC5cbiAqIEBwYXJhbSBtc2cgVGhlIG9wdGlvbmFsIG1lc3NhZ2UgdG8gZGlzcGxheSBpZiB0aGUgYXNzZXJ0aW9uIGZhaWxzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0KGV4cHI6IHVua25vd24sIG1zZyA9IFwiXCIpOiBhc3NlcnRzIGV4cHIge1xuICBpZiAoIWV4cHIpIHtcbiAgICB0aHJvdyBuZXcgQXNzZXJ0aW9uRXJyb3IobXNnKTtcbiAgfVxufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLHFEQUFxRDtBQUNyRCxxQ0FBcUM7QUFDckMsU0FBUyxjQUFjLFFBQVEsdUJBQXVCO0FBRXREOzs7Ozs7Ozs7Ozs7O0NBYUMsR0FDRCxPQUFPLFNBQVMsT0FBTyxJQUFhLEVBQUUsTUFBTSxFQUFFO0VBQzVDLElBQUksQ0FBQyxNQUFNO0lBQ1QsTUFBTSxJQUFJLGVBQWU7RUFDM0I7QUFDRiJ9
// denoCacheMetadata=9882790896452294092,9143965306155656430