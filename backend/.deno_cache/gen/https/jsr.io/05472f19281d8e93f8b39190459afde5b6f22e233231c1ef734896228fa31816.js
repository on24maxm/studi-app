// Copyright 2018-2025 the Deno authors. MIT license.
// This module is browser compatible.
import { isWindows } from "jsr:@std/internal@^1.0.10/os";
import { extname as posixExtname } from "./posix/extname.ts";
import { extname as windowsExtname } from "./windows/extname.ts";
/**
 * Return the extension of the path with leading period (".").
 *
 * @example Usage
 * ```ts
 * import { extname } from "@std/path/extname";
 * import { assertEquals } from "@std/assert";
 *
 * if (Deno.build.os === "windows") {
 *   assertEquals(extname("C:\\home\\user\\Documents\\image.png"), ".png");
 *   assertEquals(extname(new URL("file:///C:/home/user/Documents/image.png")), ".png");
 * } else {
 *   assertEquals(extname("/home/user/Documents/image.png"), ".png");
 *   assertEquals(extname(new URL("file:///home/user/Documents/image.png")), ".png");
 * }
 * ```
 *
 * @param path Path with extension.
 * @returns The file extension. E.g. returns `.ts` for `file.ts`.
 */ export function extname(path) {
  return isWindows ? windowsExtname(path) : posixExtname(path);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BzdGQvcGF0aC8xLjEuMi9leHRuYW1lLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjUgdGhlIERlbm8gYXV0aG9ycy4gTUlUIGxpY2Vuc2UuXG4vLyBUaGlzIG1vZHVsZSBpcyBicm93c2VyIGNvbXBhdGlibGUuXG5cbmltcG9ydCB7IGlzV2luZG93cyB9IGZyb20gXCJqc3I6QHN0ZC9pbnRlcm5hbEBeMS4wLjEwL29zXCI7XG5pbXBvcnQgeyBleHRuYW1lIGFzIHBvc2l4RXh0bmFtZSB9IGZyb20gXCIuL3Bvc2l4L2V4dG5hbWUudHNcIjtcbmltcG9ydCB7IGV4dG5hbWUgYXMgd2luZG93c0V4dG5hbWUgfSBmcm9tIFwiLi93aW5kb3dzL2V4dG5hbWUudHNcIjtcbi8qKlxuICogUmV0dXJuIHRoZSBleHRlbnNpb24gb2YgdGhlIHBhdGggd2l0aCBsZWFkaW5nIHBlcmlvZCAoXCIuXCIpLlxuICpcbiAqIEBleGFtcGxlIFVzYWdlXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgZXh0bmFtZSB9IGZyb20gXCJAc3RkL3BhdGgvZXh0bmFtZVwiO1xuICogaW1wb3J0IHsgYXNzZXJ0RXF1YWxzIH0gZnJvbSBcIkBzdGQvYXNzZXJ0XCI7XG4gKlxuICogaWYgKERlbm8uYnVpbGQub3MgPT09IFwid2luZG93c1wiKSB7XG4gKiAgIGFzc2VydEVxdWFscyhleHRuYW1lKFwiQzpcXFxcaG9tZVxcXFx1c2VyXFxcXERvY3VtZW50c1xcXFxpbWFnZS5wbmdcIiksIFwiLnBuZ1wiKTtcbiAqICAgYXNzZXJ0RXF1YWxzKGV4dG5hbWUobmV3IFVSTChcImZpbGU6Ly8vQzovaG9tZS91c2VyL0RvY3VtZW50cy9pbWFnZS5wbmdcIikpLCBcIi5wbmdcIik7XG4gKiB9IGVsc2Uge1xuICogICBhc3NlcnRFcXVhbHMoZXh0bmFtZShcIi9ob21lL3VzZXIvRG9jdW1lbnRzL2ltYWdlLnBuZ1wiKSwgXCIucG5nXCIpO1xuICogICBhc3NlcnRFcXVhbHMoZXh0bmFtZShuZXcgVVJMKFwiZmlsZTovLy9ob21lL3VzZXIvRG9jdW1lbnRzL2ltYWdlLnBuZ1wiKSksIFwiLnBuZ1wiKTtcbiAqIH1cbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBwYXRoIFBhdGggd2l0aCBleHRlbnNpb24uXG4gKiBAcmV0dXJucyBUaGUgZmlsZSBleHRlbnNpb24uIEUuZy4gcmV0dXJucyBgLnRzYCBmb3IgYGZpbGUudHNgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZXh0bmFtZShwYXRoOiBzdHJpbmcgfCBVUkwpOiBzdHJpbmcge1xuICByZXR1cm4gaXNXaW5kb3dzID8gd2luZG93c0V4dG5hbWUocGF0aCkgOiBwb3NpeEV4dG5hbWUocGF0aCk7XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEscURBQXFEO0FBQ3JELHFDQUFxQztBQUVyQyxTQUFTLFNBQVMsUUFBUSwrQkFBK0I7QUFDekQsU0FBUyxXQUFXLFlBQVksUUFBUSxxQkFBcUI7QUFDN0QsU0FBUyxXQUFXLGNBQWMsUUFBUSx1QkFBdUI7QUFDakU7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0FtQkMsR0FDRCxPQUFPLFNBQVMsUUFBUSxJQUFrQjtFQUN4QyxPQUFPLFlBQVksZUFBZSxRQUFRLGFBQWE7QUFDekQifQ==
// denoCacheMetadata=4759410154916672020,6893217284934823033