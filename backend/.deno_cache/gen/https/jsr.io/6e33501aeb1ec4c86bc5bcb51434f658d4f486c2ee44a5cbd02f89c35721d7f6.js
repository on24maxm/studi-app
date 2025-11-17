// Copyright 2018-2025 the Deno authors. MIT license.
// This module is browser compatible.
import { isWindows } from "jsr:@std/internal@^1.0.10/os";
import { basename as posixBasename } from "./posix/basename.ts";
import { basename as windowsBasename } from "./windows/basename.ts";
/**
 * Return the last portion of a path.
 *
 * The trailing directory separators are ignored, and optional suffix is
 * removed.
 *
 * @example Usage
 * ```ts
 * import { basename } from "@std/path/basename";
 * import { assertEquals } from "@std/assert";
 *
 * if (Deno.build.os === "windows") {
 *   assertEquals(basename("C:\\user\\Documents\\image.png"), "image.png");
 *   assertEquals(basename(new URL("file:///C:/user/Documents/image.png")), "image.png");
 * } else {
 *   assertEquals(basename("/home/user/Documents/image.png"), "image.png");
 *   assertEquals(basename(new URL("file:///home/user/Documents/image.png")), "image.png");
 * }
 * ```
 *
 * @param path Path to extract the name from.
 * @param suffix Suffix to remove from extracted name.
 *
 * @returns The basename of the path.
 */ export function basename(path, suffix = "") {
  return isWindows ? windowsBasename(path, suffix) : posixBasename(path, suffix);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BzdGQvcGF0aC8xLjEuMi9iYXNlbmFtZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDI1IHRoZSBEZW5vIGF1dGhvcnMuIE1JVCBsaWNlbnNlLlxuLy8gVGhpcyBtb2R1bGUgaXMgYnJvd3NlciBjb21wYXRpYmxlLlxuXG5pbXBvcnQgeyBpc1dpbmRvd3MgfSBmcm9tIFwianNyOkBzdGQvaW50ZXJuYWxAXjEuMC4xMC9vc1wiO1xuaW1wb3J0IHsgYmFzZW5hbWUgYXMgcG9zaXhCYXNlbmFtZSB9IGZyb20gXCIuL3Bvc2l4L2Jhc2VuYW1lLnRzXCI7XG5pbXBvcnQgeyBiYXNlbmFtZSBhcyB3aW5kb3dzQmFzZW5hbWUgfSBmcm9tIFwiLi93aW5kb3dzL2Jhc2VuYW1lLnRzXCI7XG5cbi8qKlxuICogUmV0dXJuIHRoZSBsYXN0IHBvcnRpb24gb2YgYSBwYXRoLlxuICpcbiAqIFRoZSB0cmFpbGluZyBkaXJlY3Rvcnkgc2VwYXJhdG9ycyBhcmUgaWdub3JlZCwgYW5kIG9wdGlvbmFsIHN1ZmZpeCBpc1xuICogcmVtb3ZlZC5cbiAqXG4gKiBAZXhhbXBsZSBVc2FnZVxuICogYGBgdHNcbiAqIGltcG9ydCB7IGJhc2VuYW1lIH0gZnJvbSBcIkBzdGQvcGF0aC9iYXNlbmFtZVwiO1xuICogaW1wb3J0IHsgYXNzZXJ0RXF1YWxzIH0gZnJvbSBcIkBzdGQvYXNzZXJ0XCI7XG4gKlxuICogaWYgKERlbm8uYnVpbGQub3MgPT09IFwid2luZG93c1wiKSB7XG4gKiAgIGFzc2VydEVxdWFscyhiYXNlbmFtZShcIkM6XFxcXHVzZXJcXFxcRG9jdW1lbnRzXFxcXGltYWdlLnBuZ1wiKSwgXCJpbWFnZS5wbmdcIik7XG4gKiAgIGFzc2VydEVxdWFscyhiYXNlbmFtZShuZXcgVVJMKFwiZmlsZTovLy9DOi91c2VyL0RvY3VtZW50cy9pbWFnZS5wbmdcIikpLCBcImltYWdlLnBuZ1wiKTtcbiAqIH0gZWxzZSB7XG4gKiAgIGFzc2VydEVxdWFscyhiYXNlbmFtZShcIi9ob21lL3VzZXIvRG9jdW1lbnRzL2ltYWdlLnBuZ1wiKSwgXCJpbWFnZS5wbmdcIik7XG4gKiAgIGFzc2VydEVxdWFscyhiYXNlbmFtZShuZXcgVVJMKFwiZmlsZTovLy9ob21lL3VzZXIvRG9jdW1lbnRzL2ltYWdlLnBuZ1wiKSksIFwiaW1hZ2UucG5nXCIpO1xuICogfVxuICogYGBgXG4gKlxuICogQHBhcmFtIHBhdGggUGF0aCB0byBleHRyYWN0IHRoZSBuYW1lIGZyb20uXG4gKiBAcGFyYW0gc3VmZml4IFN1ZmZpeCB0byByZW1vdmUgZnJvbSBleHRyYWN0ZWQgbmFtZS5cbiAqXG4gKiBAcmV0dXJucyBUaGUgYmFzZW5hbWUgb2YgdGhlIHBhdGguXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBiYXNlbmFtZShwYXRoOiBzdHJpbmcgfCBVUkwsIHN1ZmZpeCA9IFwiXCIpOiBzdHJpbmcge1xuICByZXR1cm4gaXNXaW5kb3dzXG4gICAgPyB3aW5kb3dzQmFzZW5hbWUocGF0aCwgc3VmZml4KVxuICAgIDogcG9zaXhCYXNlbmFtZShwYXRoLCBzdWZmaXgpO1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLHFEQUFxRDtBQUNyRCxxQ0FBcUM7QUFFckMsU0FBUyxTQUFTLFFBQVEsK0JBQStCO0FBQ3pELFNBQVMsWUFBWSxhQUFhLFFBQVEsc0JBQXNCO0FBQ2hFLFNBQVMsWUFBWSxlQUFlLFFBQVEsd0JBQXdCO0FBRXBFOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0F3QkMsR0FDRCxPQUFPLFNBQVMsU0FBUyxJQUFrQixFQUFFLFNBQVMsRUFBRTtFQUN0RCxPQUFPLFlBQ0gsZ0JBQWdCLE1BQU0sVUFDdEIsY0FBYyxNQUFNO0FBQzFCIn0=
// denoCacheMetadata=14901998572211553807,9911669282410758528