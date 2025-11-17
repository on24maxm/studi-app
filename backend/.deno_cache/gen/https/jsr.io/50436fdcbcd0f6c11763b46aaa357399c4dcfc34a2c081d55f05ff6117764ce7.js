// Copyright 2018-2025 the Deno authors. MIT license.
// This module is browser compatible.
function toDataView(value) {
  if (value instanceof DataView) {
    return value;
  }
  return ArrayBuffer.isView(value) ? new DataView(value.buffer, value.byteOffset, value.byteLength) : new DataView(value);
}
/**
 * When checking the values of cryptographic hashes are equal, default
 * comparisons can be susceptible to timing based attacks, where attacker is
 * able to find out information about the host system by repeatedly checking
 * response times to equality comparisons of values.
 *
 * It is likely some form of timing safe equality will make its way to the
 * WebCrypto standard (see:
 * {@link https://github.com/w3c/webcrypto/issues/270 | w3c/webcrypto#270}), but until
 * that time, `timingSafeEqual()` is provided:
 *
 * @example Usage
 * ```ts
 * import { timingSafeEqual } from "@std/crypto/timing-safe-equal";
 * import { assert } from "@std/assert";
 *
 * const a = await crypto.subtle.digest(
 *   "SHA-384",
 *   new TextEncoder().encode("hello world"),
 * );
 * const b = await crypto.subtle.digest(
 *   "SHA-384",
 *   new TextEncoder().encode("hello world"),
 * );
 *
 * assert(timingSafeEqual(a, b));
 * ```
 *
 * @param a The first value to compare.
 * @param b The second value to compare.
 * @returns `true` if the values are equal, otherwise `false`.
 */ export function timingSafeEqual(a, b) {
  if (a.byteLength !== b.byteLength) return false;
  const dataViewA = toDataView(a);
  const dataViewB = toDataView(b);
  const length = a.byteLength;
  let out = 0;
  let i = -1;
  while(++i < length){
    out |= dataViewA.getUint8(i) ^ dataViewB.getUint8(i);
  }
  return out === 0;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BzdGQvY3J5cHRvLzEuMC41L3RpbWluZ19zYWZlX2VxdWFsLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjUgdGhlIERlbm8gYXV0aG9ycy4gTUlUIGxpY2Vuc2UuXG4vLyBUaGlzIG1vZHVsZSBpcyBicm93c2VyIGNvbXBhdGlibGUuXG5cbmZ1bmN0aW9uIHRvRGF0YVZpZXcoXG4gIHZhbHVlOiBBcnJheUJ1ZmZlclZpZXcgfCBBcnJheUJ1ZmZlckxpa2UgfCBEYXRhVmlldyxcbik6IERhdGFWaWV3IHtcbiAgaWYgKHZhbHVlIGluc3RhbmNlb2YgRGF0YVZpZXcpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbiAgcmV0dXJuIEFycmF5QnVmZmVyLmlzVmlldyh2YWx1ZSlcbiAgICA/IG5ldyBEYXRhVmlldyh2YWx1ZS5idWZmZXIsIHZhbHVlLmJ5dGVPZmZzZXQsIHZhbHVlLmJ5dGVMZW5ndGgpXG4gICAgOiBuZXcgRGF0YVZpZXcodmFsdWUpO1xufVxuXG4vKipcbiAqIFdoZW4gY2hlY2tpbmcgdGhlIHZhbHVlcyBvZiBjcnlwdG9ncmFwaGljIGhhc2hlcyBhcmUgZXF1YWwsIGRlZmF1bHRcbiAqIGNvbXBhcmlzb25zIGNhbiBiZSBzdXNjZXB0aWJsZSB0byB0aW1pbmcgYmFzZWQgYXR0YWNrcywgd2hlcmUgYXR0YWNrZXIgaXNcbiAqIGFibGUgdG8gZmluZCBvdXQgaW5mb3JtYXRpb24gYWJvdXQgdGhlIGhvc3Qgc3lzdGVtIGJ5IHJlcGVhdGVkbHkgY2hlY2tpbmdcbiAqIHJlc3BvbnNlIHRpbWVzIHRvIGVxdWFsaXR5IGNvbXBhcmlzb25zIG9mIHZhbHVlcy5cbiAqXG4gKiBJdCBpcyBsaWtlbHkgc29tZSBmb3JtIG9mIHRpbWluZyBzYWZlIGVxdWFsaXR5IHdpbGwgbWFrZSBpdHMgd2F5IHRvIHRoZVxuICogV2ViQ3J5cHRvIHN0YW5kYXJkIChzZWU6XG4gKiB7QGxpbmsgaHR0cHM6Ly9naXRodWIuY29tL3czYy93ZWJjcnlwdG8vaXNzdWVzLzI3MCB8IHczYy93ZWJjcnlwdG8jMjcwfSksIGJ1dCB1bnRpbFxuICogdGhhdCB0aW1lLCBgdGltaW5nU2FmZUVxdWFsKClgIGlzIHByb3ZpZGVkOlxuICpcbiAqIEBleGFtcGxlIFVzYWdlXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgdGltaW5nU2FmZUVxdWFsIH0gZnJvbSBcIkBzdGQvY3J5cHRvL3RpbWluZy1zYWZlLWVxdWFsXCI7XG4gKiBpbXBvcnQgeyBhc3NlcnQgfSBmcm9tIFwiQHN0ZC9hc3NlcnRcIjtcbiAqXG4gKiBjb25zdCBhID0gYXdhaXQgY3J5cHRvLnN1YnRsZS5kaWdlc3QoXG4gKiAgIFwiU0hBLTM4NFwiLFxuICogICBuZXcgVGV4dEVuY29kZXIoKS5lbmNvZGUoXCJoZWxsbyB3b3JsZFwiKSxcbiAqICk7XG4gKiBjb25zdCBiID0gYXdhaXQgY3J5cHRvLnN1YnRsZS5kaWdlc3QoXG4gKiAgIFwiU0hBLTM4NFwiLFxuICogICBuZXcgVGV4dEVuY29kZXIoKS5lbmNvZGUoXCJoZWxsbyB3b3JsZFwiKSxcbiAqICk7XG4gKlxuICogYXNzZXJ0KHRpbWluZ1NhZmVFcXVhbChhLCBiKSk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0gYSBUaGUgZmlyc3QgdmFsdWUgdG8gY29tcGFyZS5cbiAqIEBwYXJhbSBiIFRoZSBzZWNvbmQgdmFsdWUgdG8gY29tcGFyZS5cbiAqIEByZXR1cm5zIGB0cnVlYCBpZiB0aGUgdmFsdWVzIGFyZSBlcXVhbCwgb3RoZXJ3aXNlIGBmYWxzZWAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0aW1pbmdTYWZlRXF1YWwoXG4gIGE6IEFycmF5QnVmZmVyVmlldyB8IEFycmF5QnVmZmVyTGlrZSB8IERhdGFWaWV3LFxuICBiOiBBcnJheUJ1ZmZlclZpZXcgfCBBcnJheUJ1ZmZlckxpa2UgfCBEYXRhVmlldyxcbik6IGJvb2xlYW4ge1xuICBpZiAoYS5ieXRlTGVuZ3RoICE9PSBiLmJ5dGVMZW5ndGgpIHJldHVybiBmYWxzZTtcbiAgY29uc3QgZGF0YVZpZXdBID0gdG9EYXRhVmlldyhhKTtcbiAgY29uc3QgZGF0YVZpZXdCID0gdG9EYXRhVmlldyhiKTtcbiAgY29uc3QgbGVuZ3RoID0gYS5ieXRlTGVuZ3RoO1xuICBsZXQgb3V0ID0gMDtcbiAgbGV0IGkgPSAtMTtcbiAgd2hpbGUgKCsraSA8IGxlbmd0aCkge1xuICAgIG91dCB8PSBkYXRhVmlld0EuZ2V0VWludDgoaSkgXiBkYXRhVmlld0IuZ2V0VWludDgoaSk7XG4gIH1cbiAgcmV0dXJuIG91dCA9PT0gMDtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxxREFBcUQ7QUFDckQscUNBQXFDO0FBRXJDLFNBQVMsV0FDUCxLQUFtRDtFQUVuRCxJQUFJLGlCQUFpQixVQUFVO0lBQzdCLE9BQU87RUFDVDtFQUNBLE9BQU8sWUFBWSxNQUFNLENBQUMsU0FDdEIsSUFBSSxTQUFTLE1BQU0sTUFBTSxFQUFFLE1BQU0sVUFBVSxFQUFFLE1BQU0sVUFBVSxJQUM3RCxJQUFJLFNBQVM7QUFDbkI7QUFFQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztDQStCQyxHQUNELE9BQU8sU0FBUyxnQkFDZCxDQUErQyxFQUMvQyxDQUErQztFQUUvQyxJQUFJLEVBQUUsVUFBVSxLQUFLLEVBQUUsVUFBVSxFQUFFLE9BQU87RUFDMUMsTUFBTSxZQUFZLFdBQVc7RUFDN0IsTUFBTSxZQUFZLFdBQVc7RUFDN0IsTUFBTSxTQUFTLEVBQUUsVUFBVTtFQUMzQixJQUFJLE1BQU07RUFDVixJQUFJLElBQUksQ0FBQztFQUNULE1BQU8sRUFBRSxJQUFJLE9BQVE7SUFDbkIsT0FBTyxVQUFVLFFBQVEsQ0FBQyxLQUFLLFVBQVUsUUFBUSxDQUFDO0VBQ3BEO0VBQ0EsT0FBTyxRQUFRO0FBQ2pCIn0=
// denoCacheMetadata=9905522918827504986,11441947053478693991