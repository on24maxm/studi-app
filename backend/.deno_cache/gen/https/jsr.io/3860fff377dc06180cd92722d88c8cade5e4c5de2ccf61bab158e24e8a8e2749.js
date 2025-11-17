// Copyright 2018-2025 the oak authors. All rights reserved. MIT license.
// deno-lint-ignore-file no-irregular-whitespace
/**
 * Several APIs designed for processing of media types in request bodies.
 *
 * `MediaType`, `parse()` and `format()` are inspired media-typer at
 * https://github.com/jshttp/media-typer/ which is licensed as follows:
 *
 * Copyright(c) 2014-2017 Douglas Christopher Wilson
 *
 * MIT License
 *
 * `matches()` is inspired by type-is at https://github.com/jshttp/type-is/
 * which is licensed as follows:
 *
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 *
 * MIT License
 *
 * @module
 */ import { typeByExtension } from "jsr:@std/media-types@^1.0/type-by-extension";
const SUBTYPE_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9!#$&^_.-]{0,126}$/;
const TYPE_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9!#$&^_-]{0,126}$/;
const TYPE_RE = /^ *([A-Za-z0-9][A-Za-z0-9!#$&^_-]{0,126})\/([A-Za-z0-9][A-Za-z0-9!#$&^_.+-]{0,126}) *$/;
function mediaTypeMatch(expected, actual) {
  if (!expected) {
    return false;
  }
  const actualParts = actual.split("/");
  const expectedParts = expected.split("/");
  if (actualParts.length !== 2 || expectedParts.length !== 2) {
    return false;
  }
  const [actualType, actualSubtype] = actualParts;
  const [expectedType, expectedSubtype] = expectedParts;
  if (expectedType !== "*" && expectedType !== actualType) {
    return false;
  }
  if (expectedSubtype.substring(0, 2) === "*+") {
    return expectedSubtype.length <= actualSubtype.length + 1 && expectedSubtype.substring(1) === actualSubtype.substring(actualSubtype.length + 1 - expectedSubtype.length);
  }
  if (expectedSubtype !== "*" && expectedSubtype !== actualSubtype) {
    return false;
  }
  return true;
}
function normalize(mediaType) {
  if (mediaType === "urlencoded") {
    return "application/x-www-form-urlencoded";
  }
  if (mediaType === "multipart") {
    return "multipart/*";
  }
  if (mediaType.startsWith("+")) {
    return `*/*${mediaType}`;
  }
  return mediaType.includes("/") ? mediaType : typeByExtension(mediaType);
}
function normalizeType(value) {
  try {
    const [type] = value.split(/\s*;/);
    const mediaType = MediaType.parse(type);
    return mediaType.toString();
  } catch  {
    return undefined;
  }
}
/** A class which encapsulates the information in a media type, allowing
 * inspecting of modifying individual parts of the media type. */ export class MediaType {
  #subtype;
  #suffix;
  #type;
  /** Create an instance of {@linkcode MediaType} by providing the components
   * of `type`, `subtype` and optionally a `suffix`. */ constructor(type, subtype, suffix){
    this.type = type;
    this.subtype = subtype;
    if (suffix) {
      this.suffix = suffix;
    }
  }
  /** The subtype of the media type. */ set subtype(value) {
    if (!SUBTYPE_NAME_RE.test(value)) {
      throw new TypeError("Invalid subtype.");
    }
    this.#subtype = value;
  }
  /** The subtype of the media type. */ get subtype() {
    return this.#subtype;
  }
  /** The optional suffix of the media type. */ set suffix(value) {
    if (value && !TYPE_NAME_RE.test(value)) {
      throw new TypeError("Invalid suffix.");
    }
    this.#suffix = value;
  }
  /** The optional suffix of the media type. */ get suffix() {
    return this.#suffix;
  }
  /** The type of the media type. */ set type(value) {
    if (!TYPE_NAME_RE.test(value)) {
      throw new TypeError("Invalid type.");
    }
    this.#type = value;
  }
  /** The type of the media type. */ get type() {
    return this.#type;
  }
  /** Return the parsed media type in its valid string format. */ toString() {
    return this.#suffix ? `${this.#type}/${this.#subtype}+${this.#suffix}` : `${this.#type}/${this.#subtype}`;
  }
  /** Take a string and attempt to parse it into a {@linkcode MediaType}
   * object. */ static parse(value) {
    const match = TYPE_RE.exec(value.toLowerCase());
    if (!match) {
      throw new TypeError("Invalid media type.");
    }
    let [, type, subtype] = match;
    let suffix;
    const idx = subtype.lastIndexOf("+");
    if (idx >= 0) {
      suffix = subtype.substring(idx + 1);
      subtype = subtype.substring(0, idx);
    }
    return new this(type, subtype, suffix);
  }
}
/** Determines if the provided media type matches one of the supplied media
 * types. If there is a match, the matched media type is returned, otherwise
 * `undefined` is returned.
 *
 * Each type in the media types array can be one of the following:
 *
 * - A file extension name such as `json`. This name will be returned if
 *   matched.
 * - A media type such as `application/json`.
 * - A media type with a wildcard such as `*​/*` or `*​/json` or `application/*`.
 *   The full media type will be returned if matched.
 * - A suffix such as `+json`. This can be combined with a wildcard such as
 *   `*​/vnd+json` or `application/*+json`. The full mime type will be returned
 *   if matched.
 * - Special cases of `urlencoded` and `multipart` which get normalized to
 *   `application/x-www-form-urlencoded` and `multipart/*` respectively.
 */ export function matches(value, mediaTypes) {
  const normalized = normalizeType(value);
  if (!normalized) {
    return undefined;
  }
  if (!mediaTypes.length) {
    return normalized;
  }
  for (const mediaType of mediaTypes){
    if (mediaTypeMatch(normalize(mediaType), normalized)) {
      return mediaType.startsWith("+") || mediaType.includes("*") ? normalized : mediaType;
    }
  }
  return undefined;
}
/**
 * Convert a type, subtype and optional suffix of a media type into its valid
 * string form.
 */ export function format(value) {
  const mediaType = value instanceof MediaType ? value : new MediaType(value.type, value.subtype, value.suffix);
  return mediaType.toString();
}
/** Parses a media type into a {@linkcode MediaType} object which provides
 * parts of the media type as individual properties. */ export function parse(value) {
  return MediaType.parse(value);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BvYWsvY29tbW9ucy8xLjAuMS9tZWRpYV90eXBlcy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDI1IHRoZSBvYWsgYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIGxpY2Vuc2UuXG4vLyBkZW5vLWxpbnQtaWdub3JlLWZpbGUgbm8taXJyZWd1bGFyLXdoaXRlc3BhY2VcblxuLyoqXG4gKiBTZXZlcmFsIEFQSXMgZGVzaWduZWQgZm9yIHByb2Nlc3Npbmcgb2YgbWVkaWEgdHlwZXMgaW4gcmVxdWVzdCBib2RpZXMuXG4gKlxuICogYE1lZGlhVHlwZWAsIGBwYXJzZSgpYCBhbmQgYGZvcm1hdCgpYCBhcmUgaW5zcGlyZWQgbWVkaWEtdHlwZXIgYXRcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9qc2h0dHAvbWVkaWEtdHlwZXIvIHdoaWNoIGlzIGxpY2Vuc2VkIGFzIGZvbGxvd3M6XG4gKlxuICogQ29weXJpZ2h0KGMpIDIwMTQtMjAxNyBEb3VnbGFzIENocmlzdG9waGVyIFdpbHNvblxuICpcbiAqIE1JVCBMaWNlbnNlXG4gKlxuICogYG1hdGNoZXMoKWAgaXMgaW5zcGlyZWQgYnkgdHlwZS1pcyBhdCBodHRwczovL2dpdGh1Yi5jb20vanNodHRwL3R5cGUtaXMvXG4gKiB3aGljaCBpcyBsaWNlbnNlZCBhcyBmb2xsb3dzOlxuICpcbiAqIENvcHlyaWdodChjKSAyMDE0IEpvbmF0aGFuIE9uZ1xuICogQ29weXJpZ2h0KGMpIDIwMTQtMjAxNSBEb3VnbGFzIENocmlzdG9waGVyIFdpbHNvblxuICpcbiAqIE1JVCBMaWNlbnNlXG4gKlxuICogQG1vZHVsZVxuICovXG5cbmltcG9ydCB7IHR5cGVCeUV4dGVuc2lvbiB9IGZyb20gXCJqc3I6QHN0ZC9tZWRpYS10eXBlc0BeMS4wL3R5cGUtYnktZXh0ZW5zaW9uXCI7XG5cbmNvbnN0IFNVQlRZUEVfTkFNRV9SRSA9IC9eW0EtWmEtejAtOV1bQS1aYS16MC05ISMkJl5fLi1dezAsMTI2fSQvO1xuY29uc3QgVFlQRV9OQU1FX1JFID0gL15bQS1aYS16MC05XVtBLVphLXowLTkhIyQmXl8tXXswLDEyNn0kLztcbmNvbnN0IFRZUEVfUkUgPVxuICAvXiAqKFtBLVphLXowLTldW0EtWmEtejAtOSEjJCZeXy1dezAsMTI2fSlcXC8oW0EtWmEtejAtOV1bQS1aYS16MC05ISMkJl5fListXXswLDEyNn0pICokLztcblxuZnVuY3Rpb24gbWVkaWFUeXBlTWF0Y2goZXhwZWN0ZWQ6IHN0cmluZyB8IHVuZGVmaW5lZCwgYWN0dWFsOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgaWYgKCFleHBlY3RlZCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGNvbnN0IGFjdHVhbFBhcnRzID0gYWN0dWFsLnNwbGl0KFwiL1wiKTtcbiAgY29uc3QgZXhwZWN0ZWRQYXJ0cyA9IGV4cGVjdGVkLnNwbGl0KFwiL1wiKTtcblxuICBpZiAoYWN0dWFsUGFydHMubGVuZ3RoICE9PSAyIHx8IGV4cGVjdGVkUGFydHMubGVuZ3RoICE9PSAyKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgY29uc3QgW2FjdHVhbFR5cGUsIGFjdHVhbFN1YnR5cGVdID0gYWN0dWFsUGFydHM7XG4gIGNvbnN0IFtleHBlY3RlZFR5cGUsIGV4cGVjdGVkU3VidHlwZV0gPSBleHBlY3RlZFBhcnRzO1xuXG4gIGlmIChleHBlY3RlZFR5cGUgIT09IFwiKlwiICYmIGV4cGVjdGVkVHlwZSAhPT0gYWN0dWFsVHlwZSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGlmIChleHBlY3RlZFN1YnR5cGUuc3Vic3RyaW5nKDAsIDIpID09PSBcIiorXCIpIHtcbiAgICByZXR1cm4gZXhwZWN0ZWRTdWJ0eXBlLmxlbmd0aCA8PSBhY3R1YWxTdWJ0eXBlLmxlbmd0aCArIDEgJiZcbiAgICAgIGV4cGVjdGVkU3VidHlwZS5zdWJzdHJpbmcoMSkgPT09XG4gICAgICAgIGFjdHVhbFN1YnR5cGUuc3Vic3RyaW5nKFxuICAgICAgICAgIGFjdHVhbFN1YnR5cGUubGVuZ3RoICsgMSAtIGV4cGVjdGVkU3VidHlwZS5sZW5ndGgsXG4gICAgICAgICk7XG4gIH1cblxuICBpZiAoZXhwZWN0ZWRTdWJ0eXBlICE9PSBcIipcIiAmJiBleHBlY3RlZFN1YnR5cGUgIT09IGFjdHVhbFN1YnR5cGUpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplKG1lZGlhVHlwZTogc3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgaWYgKG1lZGlhVHlwZSA9PT0gXCJ1cmxlbmNvZGVkXCIpIHtcbiAgICByZXR1cm4gXCJhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWRcIjtcbiAgfVxuICBpZiAobWVkaWFUeXBlID09PSBcIm11bHRpcGFydFwiKSB7XG4gICAgcmV0dXJuIFwibXVsdGlwYXJ0LypcIjtcbiAgfVxuICBpZiAobWVkaWFUeXBlLnN0YXJ0c1dpdGgoXCIrXCIpKSB7XG4gICAgcmV0dXJuIGAqLyoke21lZGlhVHlwZX1gO1xuICB9XG4gIHJldHVybiBtZWRpYVR5cGUuaW5jbHVkZXMoXCIvXCIpID8gbWVkaWFUeXBlIDogdHlwZUJ5RXh0ZW5zaW9uKG1lZGlhVHlwZSk7XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZVR5cGUodmFsdWU6IHN0cmluZyk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIHRyeSB7XG4gICAgY29uc3QgW3R5cGVdID0gdmFsdWUuc3BsaXQoL1xccyo7Lyk7XG4gICAgY29uc3QgbWVkaWFUeXBlID0gTWVkaWFUeXBlLnBhcnNlKHR5cGUpO1xuICAgIHJldHVybiBtZWRpYVR5cGUudG9TdHJpbmcoKTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxufVxuXG4vKiogQSBjbGFzcyB3aGljaCBlbmNhcHN1bGF0ZXMgdGhlIGluZm9ybWF0aW9uIGluIGEgbWVkaWEgdHlwZSwgYWxsb3dpbmdcbiAqIGluc3BlY3Rpbmcgb2YgbW9kaWZ5aW5nIGluZGl2aWR1YWwgcGFydHMgb2YgdGhlIG1lZGlhIHR5cGUuICovXG5leHBvcnQgY2xhc3MgTWVkaWFUeXBlIHtcbiAgI3N1YnR5cGUhOiBzdHJpbmc7XG4gICNzdWZmaXg/OiBzdHJpbmc7XG4gICN0eXBlITogc3RyaW5nO1xuXG4gIC8qKiBDcmVhdGUgYW4gaW5zdGFuY2Ugb2Yge0BsaW5rY29kZSBNZWRpYVR5cGV9IGJ5IHByb3ZpZGluZyB0aGUgY29tcG9uZW50c1xuICAgKiBvZiBgdHlwZWAsIGBzdWJ0eXBlYCBhbmQgb3B0aW9uYWxseSBhIGBzdWZmaXhgLiAqL1xuICBjb25zdHJ1Y3Rvcih0eXBlOiBzdHJpbmcsIHN1YnR5cGU6IHN0cmluZywgc3VmZml4Pzogc3RyaW5nKSB7XG4gICAgdGhpcy50eXBlID0gdHlwZTtcbiAgICB0aGlzLnN1YnR5cGUgPSBzdWJ0eXBlO1xuICAgIGlmIChzdWZmaXgpIHtcbiAgICAgIHRoaXMuc3VmZml4ID0gc3VmZml4O1xuICAgIH1cbiAgfVxuXG4gIC8qKiBUaGUgc3VidHlwZSBvZiB0aGUgbWVkaWEgdHlwZS4gKi9cbiAgc2V0IHN1YnR5cGUodmFsdWU6IHN0cmluZykge1xuICAgIGlmICghU1VCVFlQRV9OQU1FX1JFLnRlc3QodmFsdWUpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiSW52YWxpZCBzdWJ0eXBlLlwiKTtcbiAgICB9XG4gICAgdGhpcy4jc3VidHlwZSA9IHZhbHVlO1xuICB9XG5cbiAgLyoqIFRoZSBzdWJ0eXBlIG9mIHRoZSBtZWRpYSB0eXBlLiAqL1xuICBnZXQgc3VidHlwZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLiNzdWJ0eXBlO1xuICB9XG5cbiAgLyoqIFRoZSBvcHRpb25hbCBzdWZmaXggb2YgdGhlIG1lZGlhIHR5cGUuICovXG4gIHNldCBzdWZmaXgodmFsdWU6IHN0cmluZyB8IHVuZGVmaW5lZCkge1xuICAgIGlmICh2YWx1ZSAmJiAhVFlQRV9OQU1FX1JFLnRlc3QodmFsdWUpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiSW52YWxpZCBzdWZmaXguXCIpO1xuICAgIH1cbiAgICB0aGlzLiNzdWZmaXggPSB2YWx1ZTtcbiAgfVxuXG4gIC8qKiBUaGUgb3B0aW9uYWwgc3VmZml4IG9mIHRoZSBtZWRpYSB0eXBlLiAqL1xuICBnZXQgc3VmZml4KCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMuI3N1ZmZpeDtcbiAgfVxuXG4gIC8qKiBUaGUgdHlwZSBvZiB0aGUgbWVkaWEgdHlwZS4gKi9cbiAgc2V0IHR5cGUodmFsdWU6IHN0cmluZykge1xuICAgIGlmICghVFlQRV9OQU1FX1JFLnRlc3QodmFsdWUpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiSW52YWxpZCB0eXBlLlwiKTtcbiAgICB9XG4gICAgdGhpcy4jdHlwZSA9IHZhbHVlO1xuICB9XG5cbiAgLyoqIFRoZSB0eXBlIG9mIHRoZSBtZWRpYSB0eXBlLiAqL1xuICBnZXQgdHlwZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLiN0eXBlO1xuICB9XG5cbiAgLyoqIFJldHVybiB0aGUgcGFyc2VkIG1lZGlhIHR5cGUgaW4gaXRzIHZhbGlkIHN0cmluZyBmb3JtYXQuICovXG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuI3N1ZmZpeFxuICAgICAgPyBgJHt0aGlzLiN0eXBlfS8ke3RoaXMuI3N1YnR5cGV9KyR7dGhpcy4jc3VmZml4fWBcbiAgICAgIDogYCR7dGhpcy4jdHlwZX0vJHt0aGlzLiNzdWJ0eXBlfWA7XG4gIH1cblxuICAvKiogVGFrZSBhIHN0cmluZyBhbmQgYXR0ZW1wdCB0byBwYXJzZSBpdCBpbnRvIGEge0BsaW5rY29kZSBNZWRpYVR5cGV9XG4gICAqIG9iamVjdC4gKi9cbiAgc3RhdGljIHBhcnNlKHZhbHVlOiBzdHJpbmcpOiBNZWRpYVR5cGUge1xuICAgIGNvbnN0IG1hdGNoID0gVFlQRV9SRS5leGVjKHZhbHVlLnRvTG93ZXJDYXNlKCkpO1xuXG4gICAgaWYgKCFtYXRjaCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkludmFsaWQgbWVkaWEgdHlwZS5cIik7XG4gICAgfVxuXG4gICAgbGV0IFssIHR5cGUsIHN1YnR5cGVdID0gbWF0Y2g7XG4gICAgbGV0IHN1ZmZpeDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gICAgY29uc3QgaWR4ID0gc3VidHlwZS5sYXN0SW5kZXhPZihcIitcIik7XG4gICAgaWYgKGlkeCA+PSAwKSB7XG4gICAgICBzdWZmaXggPSBzdWJ0eXBlLnN1YnN0cmluZyhpZHggKyAxKTtcbiAgICAgIHN1YnR5cGUgPSBzdWJ0eXBlLnN1YnN0cmluZygwLCBpZHgpO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgdGhpcyh0eXBlLCBzdWJ0eXBlLCBzdWZmaXgpO1xuICB9XG59XG5cbi8qKiBEZXRlcm1pbmVzIGlmIHRoZSBwcm92aWRlZCBtZWRpYSB0eXBlIG1hdGNoZXMgb25lIG9mIHRoZSBzdXBwbGllZCBtZWRpYVxuICogdHlwZXMuIElmIHRoZXJlIGlzIGEgbWF0Y2gsIHRoZSBtYXRjaGVkIG1lZGlhIHR5cGUgaXMgcmV0dXJuZWQsIG90aGVyd2lzZVxuICogYHVuZGVmaW5lZGAgaXMgcmV0dXJuZWQuXG4gKlxuICogRWFjaCB0eXBlIGluIHRoZSBtZWRpYSB0eXBlcyBhcnJheSBjYW4gYmUgb25lIG9mIHRoZSBmb2xsb3dpbmc6XG4gKlxuICogLSBBIGZpbGUgZXh0ZW5zaW9uIG5hbWUgc3VjaCBhcyBganNvbmAuIFRoaXMgbmFtZSB3aWxsIGJlIHJldHVybmVkIGlmXG4gKiAgIG1hdGNoZWQuXG4gKiAtIEEgbWVkaWEgdHlwZSBzdWNoIGFzIGBhcHBsaWNhdGlvbi9qc29uYC5cbiAqIC0gQSBtZWRpYSB0eXBlIHdpdGggYSB3aWxkY2FyZCBzdWNoIGFzIGAq4oCLLypgIG9yIGAq4oCLL2pzb25gIG9yIGBhcHBsaWNhdGlvbi8qYC5cbiAqICAgVGhlIGZ1bGwgbWVkaWEgdHlwZSB3aWxsIGJlIHJldHVybmVkIGlmIG1hdGNoZWQuXG4gKiAtIEEgc3VmZml4IHN1Y2ggYXMgYCtqc29uYC4gVGhpcyBjYW4gYmUgY29tYmluZWQgd2l0aCBhIHdpbGRjYXJkIHN1Y2ggYXNcbiAqICAgYCrigIsvdm5kK2pzb25gIG9yIGBhcHBsaWNhdGlvbi8qK2pzb25gLiBUaGUgZnVsbCBtaW1lIHR5cGUgd2lsbCBiZSByZXR1cm5lZFxuICogICBpZiBtYXRjaGVkLlxuICogLSBTcGVjaWFsIGNhc2VzIG9mIGB1cmxlbmNvZGVkYCBhbmQgYG11bHRpcGFydGAgd2hpY2ggZ2V0IG5vcm1hbGl6ZWQgdG9cbiAqICAgYGFwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZGAgYW5kIGBtdWx0aXBhcnQvKmAgcmVzcGVjdGl2ZWx5LlxuICovXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2hlcyhcbiAgdmFsdWU6IHN0cmluZyxcbiAgbWVkaWFUeXBlczogc3RyaW5nW10sXG4pOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICBjb25zdCBub3JtYWxpemVkID0gbm9ybWFsaXplVHlwZSh2YWx1ZSk7XG5cbiAgaWYgKCFub3JtYWxpemVkKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIGlmICghbWVkaWFUeXBlcy5sZW5ndGgpIHtcbiAgICByZXR1cm4gbm9ybWFsaXplZDtcbiAgfVxuXG4gIGZvciAoY29uc3QgbWVkaWFUeXBlIG9mIG1lZGlhVHlwZXMpIHtcbiAgICBpZiAobWVkaWFUeXBlTWF0Y2gobm9ybWFsaXplKG1lZGlhVHlwZSksIG5vcm1hbGl6ZWQpKSB7XG4gICAgICByZXR1cm4gbWVkaWFUeXBlLnN0YXJ0c1dpdGgoXCIrXCIpIHx8IG1lZGlhVHlwZS5pbmNsdWRlcyhcIipcIilcbiAgICAgICAgPyBub3JtYWxpemVkXG4gICAgICAgIDogbWVkaWFUeXBlO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB1bmRlZmluZWQ7XG59XG5cbi8qKlxuICogQ29udmVydCBhIHR5cGUsIHN1YnR5cGUgYW5kIG9wdGlvbmFsIHN1ZmZpeCBvZiBhIG1lZGlhIHR5cGUgaW50byBpdHMgdmFsaWRcbiAqIHN0cmluZyBmb3JtLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0KFxuICB2YWx1ZTogeyB0eXBlOiBzdHJpbmc7IHN1YnR5cGU6IHN0cmluZzsgc3VmZml4Pzogc3RyaW5nIH0sXG4pOiBzdHJpbmcge1xuICBjb25zdCBtZWRpYVR5cGUgPSB2YWx1ZSBpbnN0YW5jZW9mIE1lZGlhVHlwZVxuICAgID8gdmFsdWVcbiAgICA6IG5ldyBNZWRpYVR5cGUodmFsdWUudHlwZSwgdmFsdWUuc3VidHlwZSwgdmFsdWUuc3VmZml4KTtcbiAgcmV0dXJuIG1lZGlhVHlwZS50b1N0cmluZygpO1xufVxuXG4vKiogUGFyc2VzIGEgbWVkaWEgdHlwZSBpbnRvIGEge0BsaW5rY29kZSBNZWRpYVR5cGV9IG9iamVjdCB3aGljaCBwcm92aWRlc1xuICogcGFydHMgb2YgdGhlIG1lZGlhIHR5cGUgYXMgaW5kaXZpZHVhbCBwcm9wZXJ0aWVzLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlKHZhbHVlOiBzdHJpbmcpOiBNZWRpYVR5cGUge1xuICByZXR1cm4gTWVkaWFUeXBlLnBhcnNlKHZhbHVlKTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSx5RUFBeUU7QUFDekUsZ0RBQWdEO0FBRWhEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0NBbUJDLEdBRUQsU0FBUyxlQUFlLFFBQVEsOENBQThDO0FBRTlFLE1BQU0sa0JBQWtCO0FBQ3hCLE1BQU0sZUFBZTtBQUNyQixNQUFNLFVBQ0o7QUFFRixTQUFTLGVBQWUsUUFBNEIsRUFBRSxNQUFjO0VBQ2xFLElBQUksQ0FBQyxVQUFVO0lBQ2IsT0FBTztFQUNUO0VBRUEsTUFBTSxjQUFjLE9BQU8sS0FBSyxDQUFDO0VBQ2pDLE1BQU0sZ0JBQWdCLFNBQVMsS0FBSyxDQUFDO0VBRXJDLElBQUksWUFBWSxNQUFNLEtBQUssS0FB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
// denoCacheMetadata=16563721482089274435,9279061648051425044