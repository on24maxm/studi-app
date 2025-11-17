// Copyright 2018-2025 the oak authors. All rights reserved. MIT license.
import { createHttpError } from "../deps.ts";
/**
 * Safely decode a URI component, where if it fails, instead of throwing,
 * just returns the original string
 */ export function decode(pathname) {
  try {
    return decodeURI(pathname);
  } catch (err) {
    if (err instanceof URIError) {
      throw createHttpError(400, "Failed to decode URI", {
        expose: false
      });
    }
    throw err;
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvb2FrQHYxNy4xLjYvdXRpbHMvZGVjb2RlLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjUgdGhlIG9hayBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cblxuaW1wb3J0IHsgY3JlYXRlSHR0cEVycm9yIH0gZnJvbSBcIi4uL2RlcHMudHNcIjtcblxuLyoqXG4gKiBTYWZlbHkgZGVjb2RlIGEgVVJJIGNvbXBvbmVudCwgd2hlcmUgaWYgaXQgZmFpbHMsIGluc3RlYWQgb2YgdGhyb3dpbmcsXG4gKiBqdXN0IHJldHVybnMgdGhlIG9yaWdpbmFsIHN0cmluZ1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGVjb2RlKHBhdGhuYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICB0cnkge1xuICAgIHJldHVybiBkZWNvZGVVUkkocGF0aG5hbWUpO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBpZiAoZXJyIGluc3RhbmNlb2YgVVJJRXJyb3IpIHtcbiAgICAgIHRocm93IGNyZWF0ZUh0dHBFcnJvcig0MDAsIFwiRmFpbGVkIHRvIGRlY29kZSBVUklcIiwgeyBleHBvc2U6IGZhbHNlIH0pO1xuICAgIH1cbiAgICB0aHJvdyBlcnI7XG4gIH1cbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSx5RUFBeUU7QUFFekUsU0FBUyxlQUFlLFFBQVEsYUFBYTtBQUU3Qzs7O0NBR0MsR0FDRCxPQUFPLFNBQVMsT0FBTyxRQUFnQjtFQUNyQyxJQUFJO0lBQ0YsT0FBTyxVQUFVO0VBQ25CLEVBQUUsT0FBTyxLQUFLO0lBQ1osSUFBSSxlQUFlLFVBQVU7TUFDM0IsTUFBTSxnQkFBZ0IsS0FBSyx3QkFBd0I7UUFBRSxRQUFRO01BQU07SUFDckU7SUFDQSxNQUFNO0VBQ1I7QUFDRiJ9
// denoCacheMetadata=3009314095734943553,2626055685571779737