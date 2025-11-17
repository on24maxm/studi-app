// Copyright 2018-2025 the oak authors. All rights reserved. MIT license.
/**
 * Contains the oak abstraction to represent a request {@linkcode Body}.
 *
 * This is not normally used directly by end users.
 *
 * @module
 */ var _computedKey, _computedKey1;
import { createHttpError, matches, parseFormData, Status } from "./deps.ts";
const KNOWN_BODY_TYPES = [
  [
    "binary",
    [
      "image",
      "audio",
      "application/octet-stream"
    ]
  ],
  [
    "form",
    [
      "urlencoded"
    ]
  ],
  [
    "form-data",
    [
      "multipart"
    ]
  ],
  [
    "json",
    [
      "json",
      "application/*+json",
      "application/csp-report"
    ]
  ],
  [
    "text",
    [
      "text"
    ]
  ]
];
async function readBlob(body, type) {
  if (!body) {
    return new Blob(undefined, type ? {
      type
    } : undefined);
  }
  const chunks = [];
  for await (const chunk of body){
    chunks.push(chunk);
  }
  return new Blob(chunks, type ? {
    type
  } : undefined);
}
_computedKey = Symbol.for("Deno.customInspect"), _computedKey1 = Symbol.for("nodejs.util.inspect.custom");
/** An object which encapsulates information around a request body. */ export class Body {
  #body;
  #memo = null;
  #memoType = null;
  #headers;
  #request;
  #reviver;
  #type;
  #used = false;
  constructor(serverRequest, reviver){
    if (serverRequest.request) {
      this.#request = serverRequest.request;
    } else {
      this.#headers = serverRequest.headers;
      this.#body = serverRequest.getBody();
    }
    this.#reviver = reviver;
  }
  /** Is `true` if the request might have a body, otherwise `false`.
   *
   * **WARNING** this is an unreliable API. In HTTP/2 in many situations you
   * cannot determine if a request has a body or not unless you attempt to read
   * the body, due to the streaming nature of HTTP/2. As of Deno 1.16.1, for
   * HTTP/1.1, Deno also reflects that behavior.  The only reliable way to
   * determine if a request has a body or not is to attempt to read the body.
   */ get has() {
    return !!(this.#request ? this.#request.body : this.#body);
  }
  /** Exposes the "raw" `ReadableStream` of the body. */ get stream() {
    return this.#request ? this.#request.body : this.#body;
  }
  /** Returns `true` if the body has been consumed yet, otherwise `false`. */ get used() {
    return this.#request?.bodyUsed ?? !!this.#used;
  }
  /** Return the body to be reused as BodyInit. */ async init() {
    if (!this.has) {
      return null;
    }
    return await this.#memo ?? this.stream;
  }
  /** Reads a body to the end and resolves with the value as an
   * {@linkcode ArrayBuffer} */ async arrayBuffer() {
    if (this.#memoType === "arrayBuffer") {
      return this.#memo;
    } else if (this.#memoType) {
      throw new TypeError("Body already used as a different type.");
    }
    this.#memoType = "arrayBuffer";
    if (this.#request) {
      return this.#memo = this.#request.arrayBuffer();
    }
    this.#used = true;
    return this.#memo = (await readBlob(this.#body)).arrayBuffer();
  }
  /** Reads a body to the end and resolves with the value as a
   * {@linkcode Blob}. */ blob() {
    if (this.#memoType === "blob") {
      return this.#memo;
    } else if (this.#memoType) {
      throw new TypeError("Body already used as a different type.");
    }
    this.#memoType = "blob";
    if (this.#request) {
      return this.#memo = this.#request.blob();
    }
    this.#used = true;
    return this.#memo = readBlob(this.#body, this.#headers?.get("content-type"));
  }
  /** Reads a body as a URL encoded form, resolving the value as
   * {@linkcode URLSearchParams}. */ async form() {
    const text = await this.text();
    return new URLSearchParams(text);
  }
  /** Reads a body to the end attempting to parse the body as a set of
   * {@linkcode FormData}. */ formData() {
    if (this.#memoType === "formData") {
      return this.#memo;
    } else if (this.#memoType) {
      throw new TypeError("Body already used as a different type.");
    }
    this.#memoType = "formData";
    if (this.#request) {
      return this.#memo = this.#request.formData();
    }
    this.#used = true;
    if (this.#body && this.#headers) {
      const contentType = this.#headers.get("content-type");
      if (contentType) {
        return this.#memo = parseFormData(contentType, this.#body);
      }
    }
    throw createHttpError(Status.BadRequest, "Missing content type.");
  }
  /** Reads a body to the end attempting to parse the body as a JSON value.
   *
   * If a JSON reviver has been assigned, it will be used to parse the body.
   */ // deno-lint-ignore no-explicit-any
  async json() {
    try {
      return JSON.parse(await this.text(), this.#reviver);
    } catch (err) {
      if (err instanceof Error) {
        throw createHttpError(Status.BadRequest, err.message);
      }
      throw createHttpError(Status.BadRequest, JSON.stringify(err));
    }
  }
  /** Reads the body to the end resolving with a string. */ async text() {
    if (this.#memoType === "text") {
      return this.#memo;
    } else if (this.#memoType) {
      throw new TypeError("Body already used as a different type.");
    }
    this.#memoType = "text";
    if (this.#request) {
      return this.#memo = this.#request.text();
    }
    this.#used = true;
    return this.#memo = (await readBlob(this.#body)).text();
  }
  /** Attempts to determine what type of the body is to help determine how best
   * to attempt to decode the body. This performs analysis on the supplied
   * `Content-Type` header of the request.
   *
   * **Note** these are not authoritative and should only be used as guidance.
   *
   * There is the ability to provide custom types when attempting to discern
   * the type. Custom types are provided in the format of an object where the
   * key is on of {@linkcode BodyType} and the value is an array of media types
   * to attempt to match. Values supplied will be additive to known media types.
   *
   * The returned value is one of the following:
   *
   * - `"binary"` - The body appears to be binary data and should be consumed as
   *   an array buffer, readable stream or blob.
   * - `"form"` - The value appears to be an URL encoded form and should be
   *   consumed as a form (`URLSearchParams`).
   * - `"form-data"` - The value appears to be multipart form data and should be
   *   consumed as form data.
   * - `"json"` - The value appears to be JSON data and should be consumed as
   *   decoded JSON.
   * - `"text"` - The value appears to be text data and should be consumed as
   *   text.
   * - `"unknown"` - Either there is no body or the body type could not be
   *   determined.
   */ type(customMediaTypes) {
    if (this.#type && !customMediaTypes) {
      return this.#type;
    }
    customMediaTypes = customMediaTypes ?? {};
    const headers = this.#request?.headers ?? this.#headers;
    const contentType = headers?.get("content-type");
    if (contentType) {
      for (const [bodyType, knownMediaTypes] of KNOWN_BODY_TYPES){
        const customTypes = customMediaTypes[bodyType] ?? [];
        if (matches(contentType, [
          ...knownMediaTypes,
          ...customTypes
        ])) {
          this.#type = bodyType;
          return this.#type;
        }
      }
    }
    return this.#type = "unknown";
  }
  [_computedKey](inspect) {
    const { has, used } = this;
    return `${this.constructor.name} ${inspect({
      has,
      used
    })}`;
  }
  [_computedKey1](depth, // deno-lint-ignore no-explicit-any
  options, inspect) {
    if (depth < 0) {
      return options.stylize(`[${this.constructor.name}]`, "special");
    }
    const newOptions = Object.assign({}, options, {
      depth: options.depth === null ? null : options.depth - 1
    });
    const { has, used } = this;
    return `${options.stylize(this.constructor.name, "special")} ${inspect({
      has,
      used
    }, newOptions)}`;
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvb2FrQHYxNy4xLjYvYm9keS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDI1IHRoZSBvYWsgYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIGxpY2Vuc2UuXG5cbi8qKlxuICogQ29udGFpbnMgdGhlIG9hayBhYnN0cmFjdGlvbiB0byByZXByZXNlbnQgYSByZXF1ZXN0IHtAbGlua2NvZGUgQm9keX0uXG4gKlxuICogVGhpcyBpcyBub3Qgbm9ybWFsbHkgdXNlZCBkaXJlY3RseSBieSBlbmQgdXNlcnMuXG4gKlxuICogQG1vZHVsZVxuICovXG5cbmltcG9ydCB7IGNyZWF0ZUh0dHBFcnJvciwgbWF0Y2hlcywgcGFyc2VGb3JtRGF0YSwgU3RhdHVzIH0gZnJvbSBcIi4vZGVwcy50c1wiO1xuaW1wb3J0IHR5cGUgeyBTZXJ2ZXJSZXF1ZXN0IH0gZnJvbSBcIi4vdHlwZXMudHNcIjtcblxudHlwZSBKc29uUmV2aXZlciA9IChrZXk6IHN0cmluZywgdmFsdWU6IHVua25vd24pID0+IHVua25vd247XG5cbmV4cG9ydCB0eXBlIEJvZHlUeXBlID1cbiAgfCBcImJpbmFyeVwiXG4gIHwgXCJmb3JtXCJcbiAgfCBcImZvcm0tZGF0YVwiXG4gIHwgXCJqc29uXCJcbiAgfCBcInRleHRcIlxuICB8IFwidW5rbm93blwiO1xuXG5jb25zdCBLTk9XTl9CT0RZX1RZUEVTOiBbYm9keVR5cGU6IEJvZHlUeXBlLCBrbm93bk1lZGlhVHlwZXM6IHN0cmluZ1tdXVtdID0gW1xuICBbXCJiaW5hcnlcIiwgW1wiaW1hZ2VcIiwgXCJhdWRpb1wiLCBcImFwcGxpY2F0aW9uL29jdGV0LXN0cmVhbVwiXV0sXG4gIFtcImZvcm1cIiwgW1widXJsZW5jb2RlZFwiXV0sXG4gIFtcImZvcm0tZGF0YVwiLCBbXCJtdWx0aXBhcnRcIl1dLFxuICBbXCJqc29uXCIsIFtcImpzb25cIiwgXCJhcHBsaWNhdGlvbi8qK2pzb25cIiwgXCJhcHBsaWNhdGlvbi9jc3AtcmVwb3J0XCJdXSxcbiAgW1widGV4dFwiLCBbXCJ0ZXh0XCJdXSxcbl07XG5cbmFzeW5jIGZ1bmN0aW9uIHJlYWRCbG9iKFxuICBib2R5PzogUmVhZGFibGVTdHJlYW08VWludDhBcnJheT4gfCBudWxsLFxuICB0eXBlPzogc3RyaW5nIHwgbnVsbCxcbik6IFByb21pc2U8QmxvYj4ge1xuICBpZiAoIWJvZHkpIHtcbiAgICByZXR1cm4gbmV3IEJsb2IodW5kZWZpbmVkLCB0eXBlID8geyB0eXBlIH0gOiB1bmRlZmluZWQpO1xuICB9XG4gIGNvbnN0IGNodW5rczogVWludDhBcnJheVtdID0gW107XG4gIGZvciBhd2FpdCAoY29uc3QgY2h1bmsgb2YgYm9keSkge1xuICAgIGNodW5rcy5wdXNoKGNodW5rKTtcbiAgfVxuICByZXR1cm4gbmV3IEJsb2IoY2h1bmtzLCB0eXBlID8geyB0eXBlIH0gOiB1bmRlZmluZWQpO1xufVxuXG4vKiogQW4gb2JqZWN0IHdoaWNoIGVuY2Fwc3VsYXRlcyBpbmZvcm1hdGlvbiBhcm91bmQgYSByZXF1ZXN0IGJvZHkuICovXG5leHBvcnQgY2xhc3MgQm9keSB7XG4gICNib2R5PzogUmVhZGFibGVTdHJlYW08VWludDhBcnJheT4gfCBudWxsO1xuICAjbWVtbzogUHJvbWlzZTxBcnJheUJ1ZmZlciB8IEJsb2IgfCBGb3JtRGF0YSB8IHN0cmluZz4gfCBudWxsID0gbnVsbDtcbiAgI21lbW9UeXBlOiBcImFycmF5QnVmZmVyXCIgfCBcImJsb2JcIiB8IFwiZm9ybURhdGFcIiB8IFwidGV4dFwiIHwgbnVsbCA9IG51bGw7XG4gICNoZWFkZXJzPzogSGVhZGVycztcbiAgI3JlcXVlc3Q/OiBSZXF1ZXN0O1xuICAjcmV2aXZlcj86IEpzb25SZXZpdmVyO1xuICAjdHlwZT86IEJvZHlUeXBlO1xuICAjdXNlZCA9IGZhbHNlO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHNlcnZlclJlcXVlc3Q6IFBpY2s8U2VydmVyUmVxdWVzdCwgXCJyZXF1ZXN0XCIgfCBcImhlYWRlcnNcIiB8IFwiZ2V0Qm9keVwiPixcbiAgICByZXZpdmVyPzogSnNvblJldml2ZXIsXG4gICkge1xuICAgIGlmIChzZXJ2ZXJSZXF1ZXN0LnJlcXVlc3QpIHtcbiAgICAgIHRoaXMuI3JlcXVlc3QgPSBzZXJ2ZXJSZXF1ZXN0LnJlcXVlc3Q7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuI2hlYWRlcnMgPSBzZXJ2ZXJSZXF1ZXN0LmhlYWRlcnM7XG4gICAgICB0aGlzLiNib2R5ID0gc2VydmVyUmVxdWVzdC5nZXRCb2R5KCk7XG4gICAgfVxuICAgIHRoaXMuI3Jldml2ZXIgPSByZXZpdmVyO1xuICB9XG5cbiAgLyoqIElzIGB0cnVlYCBpZiB0aGUgcmVxdWVzdCBtaWdodCBoYXZlIGEgYm9keSwgb3RoZXJ3aXNlIGBmYWxzZWAuXG4gICAqXG4gICAqICoqV0FSTklORyoqIHRoaXMgaXMgYW4gdW5yZWxpYWJsZSBBUEkuIEluIEhUVFAvMiBpbiBtYW55IHNpdHVhdGlvbnMgeW91XG4gICAqIGNhbm5vdCBkZXRlcm1pbmUgaWYgYSByZXF1ZXN0IGhhcyBhIGJvZHkgb3Igbm90IHVubGVzcyB5b3UgYXR0ZW1wdCB0byByZWFkXG4gICAqIHRoZSBib2R5LCBkdWUgdG8gdGhlIHN0cmVhbWluZyBuYXR1cmUgb2YgSFRUUC8yLiBBcyBvZiBEZW5vIDEuMTYuMSwgZm9yXG4gICAqIEhUVFAvMS4xLCBEZW5vIGFsc28gcmVmbGVjdHMgdGhhdCBiZWhhdmlvci4gIFRoZSBvbmx5IHJlbGlhYmxlIHdheSB0b1xuICAgKiBkZXRlcm1pbmUgaWYgYSByZXF1ZXN0IGhhcyBhIGJvZHkgb3Igbm90IGlzIHRvIGF0dGVtcHQgdG8gcmVhZCB0aGUgYm9keS5cbiAgICovXG4gIGdldCBoYXMoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICEhKHRoaXMuI3JlcXVlc3QgPyB0aGlzLiNyZXF1ZXN0LmJvZHkgOiB0aGlzLiNib2R5KTtcbiAgfVxuXG4gIC8qKiBFeHBvc2VzIHRoZSBcInJhd1wiIGBSZWFkYWJsZVN0cmVhbWAgb2YgdGhlIGJvZHkuICovXG4gIGdldCBzdHJlYW0oKTogUmVhZGFibGVTdHJlYW08VWludDhBcnJheT4gfCBudWxsIHtcbiAgICByZXR1cm4gdGhpcy4jcmVxdWVzdCA/IHRoaXMuI3JlcXVlc3QuYm9keSA6IHRoaXMuI2JvZHkhO1xuICB9XG5cbiAgLyoqIFJldHVybnMgYHRydWVgIGlmIHRoZSBib2R5IGhhcyBiZWVuIGNvbnN1bWVkIHlldCwgb3RoZXJ3aXNlIGBmYWxzZWAuICovXG4gIGdldCB1c2VkKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLiNyZXF1ZXN0Py5ib2R5VXNlZCA/PyAhIXRoaXMuI3VzZWQ7XG4gIH1cblxuICAvKiogUmV0dXJuIHRoZSBib2R5IHRvIGJlIHJldXNlZCBhcyBCb2R5SW5pdC4gKi9cbiAgYXN5bmMgaW5pdCgpOiBQcm9taXNlPEJvZHlJbml0IHwgbnVsbD4ge1xuICAgIGlmICghdGhpcy5oYXMpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gYXdhaXQgdGhpcy4jbWVtbyA/PyB0aGlzLnN0cmVhbTtcbiAgfVxuXG4gIC8qKiBSZWFkcyBhIGJvZHkgdG8gdGhlIGVuZCBhbmQgcmVzb2x2ZXMgd2l0aCB0aGUgdmFsdWUgYXMgYW5cbiAgICoge0BsaW5rY29kZSBBcnJheUJ1ZmZlcn0gKi9cbiAgYXN5bmMgYXJyYXlCdWZmZXIoKTogUHJvbWlzZTxBcnJheUJ1ZmZlcj4ge1xuICAgIGlmICh0aGlzLiNtZW1vVHlwZSA9PT0gXCJhcnJheUJ1ZmZlclwiKSB7XG4gICAgICByZXR1cm4gdGhpcy4jbWVtbyBhcyBQcm9taXNlPEFycmF5QnVmZmVyPjtcbiAgICB9IGVsc2UgaWYgKHRoaXMuI21lbW9UeXBlKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQm9keSBhbHJlYWR5IHVzZWQgYXMgYSBkaWZmZXJlbnQgdHlwZS5cIik7XG4gICAgfVxuICAgIHRoaXMuI21lbW9UeXBlID0gXCJhcnJheUJ1ZmZlclwiO1xuICAgIGlmICh0aGlzLiNyZXF1ZXN0KSB7XG4gICAgICByZXR1cm4gdGhpcy4jbWVtbyA9IHRoaXMuI3JlcXVlc3QuYXJyYXlCdWZmZXIoKTtcbiAgICB9XG4gICAgdGhpcy4jdXNlZCA9IHRydWU7XG4gICAgcmV0dXJuIHRoaXMuI21lbW8gPSAoYXdhaXQgcmVhZEJsb2IodGhpcy4jYm9keSkpLmFycmF5QnVmZmVyKCk7XG4gIH1cblxuICAvKiogUmVhZHMgYSBib2R5IHRvIHRoZSBlbmQgYW5kIHJlc29sdmVzIHdpdGggdGhlIHZhbHVlIGFzIGFcbiAgICoge0BsaW5rY29kZSBCbG9ifS4gKi9cbiAgYmxvYigpOiBQcm9taXNlPEJsb2I+IHtcbiAgICBpZiAodGhpcy4jbWVtb1R5cGUgPT09IFwiYmxvYlwiKSB7XG4gICAgICByZXR1cm4gdGhpcy4jbWVtbyBhcyBQcm9taXNlPEJsb2I+O1xuICAgIH0gZWxzZSBpZiAodGhpcy4jbWVtb1R5cGUpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJCb2R5IGFscmVhZHkgdXNlZCBhcyBhIGRpZmZlcmVudCB0eXBlLlwiKTtcbiAgICB9XG4gICAgdGhpcy4jbWVtb1R5cGUgPSBcImJsb2JcIjtcbiAgICBpZiAodGhpcy4jcmVxdWVzdCkge1xuICAgICAgcmV0dXJuIHRoaXMuI21lbW8gPSB0aGlzLiNyZXF1ZXN0LmJsb2IoKTtcbiAgICB9XG4gICAgdGhpcy4jdXNlZCA9IHRydWU7XG4gICAgcmV0dXJuIHRoaXMuI21lbW8gPSByZWFkQmxvYihcbiAgICAgIHRoaXMuI2JvZHksXG4gICAgICB0aGlzLiNoZWFkZXJzPy5nZXQoXCJjb250ZW50LXR5cGVcIiksXG4gICAgKTtcbiAgfVxuXG4gIC8qKiBSZWFkcyBhIGJvZHkgYXMgYSBVUkwgZW5jb2RlZCBmb3JtLCByZXNvbHZpbmcgdGhlIHZhbHVlIGFzXG4gICAqIHtAbGlua2NvZGUgVVJMU2VhcmNoUGFyYW1zfS4gKi9cbiAgYXN5bmMgZm9ybSgpOiBQcm9taXNlPFVSTFNlYXJjaFBhcmFtcz4ge1xuICAgIGNvbnN0IHRleHQgPSBhd2FpdCB0aGlzLnRleHQoKTtcbiAgICByZXR1cm4gbmV3IFVSTFNlYXJjaFBhcmFtcyh0ZXh0KTtcbiAgfVxuXG4gIC8qKiBSZWFkcyBhIGJvZHkgdG8gdGhlIGVuZCBhdHRlbXB0aW5nIHRvIHBhcnNlIHRoZSBib2R5IGFzIGEgc2V0IG9mXG4gICAqIHtAbGlua2NvZGUgRm9ybURhdGF9LiAqL1xuICBmb3JtRGF0YSgpOiBQcm9taXNlPEZvcm1EYXRhPiB7XG4gICAgaWYgKHRoaXMuI21lbW9UeXBlID09PSBcImZvcm1EYXRhXCIpIHtcbiAgICAgIHJldHVybiB0aGlzLiNtZW1vIGFzIFByb21pc2U8Rm9ybURhdGE+O1xuICAgIH0gZWxzZSBpZiAodGhpcy4jbWVtb1R5cGUpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJCb2R5IGFscmVhZHkgdXNlZCBhcyBhIGRpZmZlcmVudCB0eXBlLlwiKTtcbiAgICB9XG4gICAgdGhpcy4jbWVtb1R5cGUgPSBcImZvcm1EYXRhXCI7XG4gICAgaWYgKHRoaXMuI3JlcXVlc3QpIHtcbiAgICAgIHJldHVybiB0aGlzLiNtZW1vID0gdGhpcy4jcmVxdWVzdC5mb3JtRGF0YSgpO1xuICAgIH1cbiAgICB0aGlzLiN1c2VkID0gdHJ1ZTtcbiAgICBpZiAodGhpcy4jYm9keSAmJiB0aGlzLiNoZWFkZXJzKSB7XG4gICAgICBjb25zdCBjb250ZW50VHlwZSA9IHRoaXMuI2hlYWRlcnMuZ2V0KFwiY29udGVudC10eXBlXCIpO1xuICAgICAgaWYgKGNvbnRlbnRUeXBlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLiNtZW1vID0gcGFyc2VGb3JtRGF0YShjb250ZW50VHlwZSwgdGhpcy4jYm9keSk7XG4gICAgICB9XG4gICAgfVxuICAgIHRocm93IGNyZWF0ZUh0dHBFcnJvcihTdGF0dXMuQmFkUmVxdWVzdCwgXCJNaXNzaW5nIGNvbnRlbnQgdHlwZS5cIik7XG4gIH1cblxuICAvKiogUmVhZHMgYSBib2R5IHRvIHRoZSBlbmQgYXR0ZW1wdGluZyB0byBwYXJzZSB0aGUgYm9keSBhcyBhIEpTT04gdmFsdWUuXG4gICAqXG4gICAqIElmIGEgSlNPTiByZXZpdmVyIGhhcyBiZWVuIGFzc2lnbmVkLCBpdCB3aWxsIGJlIHVzZWQgdG8gcGFyc2UgdGhlIGJvZHkuXG4gICAqL1xuICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICBhc3luYyBqc29uKCk6IFByb21pc2U8YW55PiB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBKU09OLnBhcnNlKGF3YWl0IHRoaXMudGV4dCgpLCB0aGlzLiNyZXZpdmVyKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGlmIChlcnIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICB0aHJvdyBjcmVhdGVIdHRwRXJyb3IoU3RhdHVzLkJhZFJlcXVlc3QsIGVyci5tZXNzYWdlKTtcbiAgICAgIH1cbiAgICAgIHRocm93IGNyZWF0ZUh0dHBFcnJvcihTdGF0dXMuQmFkUmVxdWVzdCwgSlNPTi5zdHJpbmdpZnkoZXJyKSk7XG4gICAgfVxuICB9XG5cbiAgLyoqIFJlYWRzIHRoZSBib2R5IHRvIHRoZSBlbmQgcmVzb2x2aW5nIHdpdGggYSBzdHJpbmcuICovXG4gIGFzeW5jIHRleHQoKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICBpZiAodGhpcy4jbWVtb1R5cGUgPT09IFwidGV4dFwiKSB7XG4gICAgICByZXR1cm4gdGhpcy4jbWVtbyBhcyBQcm9taXNlPHN0cmluZz47XG4gICAgfSBlbHNlIGlmICh0aGlzLiNtZW1vVHlwZSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkJvZHkgYWxyZWFkeSB1c2VkIGFzIGEgZGlmZmVyZW50IHR5cGUuXCIpO1xuICAgIH1cbiAgICB0aGlzLiNtZW1vVHlwZSA9IFwidGV4dFwiO1xuICAgIGlmICh0aGlzLiNyZXF1ZXN0KSB7XG4gICAgICByZXR1cm4gdGhpcy4jbWVtbyA9IHRoaXMuI3JlcXVlc3QudGV4dCgpO1xuICAgIH1cbiAgICB0aGlzLiN1c2VkID0gdHJ1ZTtcbiAgICByZXR1cm4gdGhpcy4jbWVtbyA9IChhd2FpdCByZWFkQmxvYih0aGlzLiNib2R5KSkudGV4dCgpO1xuICB9XG5cbiAgLyoqIEF0dGVtcHRzIHRvIGRldGVybWluZSB3aGF0IHR5cGUgb2YgdGhlIGJvZHkgaXMgdG8gaGVscCBkZXRlcm1pbmUgaG93IGJlc3RcbiAgICogdG8gYXR0ZW1wdCB0byBkZWNvZGUgdGhlIGJvZHkuIFRoaXMgcGVyZm9ybXMgYW5hbHlzaXMgb24gdGhlIHN1cHBsaWVkXG4gICAqIGBDb250ZW50LVR5cGVgIGhlYWRlciBvZiB0aGUgcmVxdWVzdC5cbiAgICpcbiAgICogKipOb3RlKiogdGhlc2UgYXJlIG5vdCBhdXRob3JpdGF0aXZlIGFuZCBzaG91bGQgb25seSBiZSB1c2VkIGFzIGd1aWRhbmNlLlxuICAgKlxuICAgKiBUaGVyZSBpcyB0aGUgYWJpbGl0eSB0byBwcm92aWRlIGN1c3RvbSB0eXBlcyB3aGVuIGF0dGVtcHRpbmcgdG8gZGlzY2VyblxuICAgKiB0aGUgdHlwZS4gQ3VzdG9tIHR5cGVzIGFyZSBwcm92aWRlZCBpbiB0aGUgZm9ybWF0IG9mIGFuIG9iamVjdCB3aGVyZSB0aGVcbiAgICoga2V5IGlzIG9uIG9mIHtAbGlua2NvZGUgQm9keVR5cGV9IGFuZCB0aGUgdmFsdWUgaXMgYW4gYXJyYXkgb2YgbWVkaWEgdHlwZXNcbiAgICogdG8gYXR0ZW1wdCB0byBtYXRjaC4gVmFsdWVzIHN1cHBsaWVkIHdpbGwgYmUgYWRkaXRpdmUgdG8ga25vd24gbWVkaWEgdHlwZXMuXG4gICAqXG4gICAqIFRoZSByZXR1cm5lZCB2YWx1ZSBpcyBvbmUgb2YgdGhlIGZvbGxvd2luZzpcbiAgICpcbiAgICogLSBgXCJiaW5hcnlcImAgLSBUaGUgYm9keSBhcHBlYXJzIHRvIGJlIGJpbmFyeSBkYXRhIGFuZCBzaG91bGQgYmUgY29uc3VtZWQgYXNcbiAgICogICBhbiBhcnJheSBidWZmZXIsIHJlYWRhYmxlIHN0cmVhbSBvciBibG9iLlxuICAgKiAtIGBcImZvcm1cImAgLSBUaGUgdmFsdWUgYXBwZWFycyB0byBiZSBhbiBVUkwgZW5jb2RlZCBmb3JtIGFuZCBzaG91bGQgYmVcbiAgICogICBjb25zdW1lZCBhcyBhIGZvcm0gKGBVUkxTZWFyY2hQYXJhbXNgKS5cbiAgICogLSBgXCJmb3JtLWRhdGFcImAgLSBUaGUgdmFsdWUgYXBwZWFycyB0byBiZSBtdWx0aXBhcnQgZm9ybSBkYXRhIGFuZCBzaG91bGQgYmVcbiAgICogICBjb25zdW1lZCBhcyBmb3JtIGRhdGEuXG4gICAqIC0gYFwianNvblwiYCAtIFRoZSB2YWx1ZSBhcHBlYXJzIHRvIGJlIEpTT04gZGF0YSBhbmQgc2hvdWxkIGJlIGNvbnN1bWVkIGFzXG4gICAqICAgZGVjb2RlZCBKU09OLlxuICAgKiAtIGBcInRleHRcImAgLSBUaGUgdmFsdWUgYXBwZWFycyB0byBiZSB0ZXh0IGRhdGEgYW5kIHNob3VsZCBiZSBjb25zdW1lZCBhc1xuICAgKiAgIHRleHQuXG4gICAqIC0gYFwidW5rbm93blwiYCAtIEVpdGhlciB0aGVyZSBpcyBubyBib2R5IG9yIHRoZSBib2R5IHR5cGUgY291bGQgbm90IGJlXG4gICAqICAgZGV0ZXJtaW5lZC5cbiAgICovXG4gIHR5cGUoY3VzdG9tTWVkaWFUeXBlcz86IFBhcnRpYWw8UmVjb3JkPEJvZHlUeXBlLCBzdHJpbmdbXT4+KTogQm9keVR5cGUge1xuICAgIGlmICh0aGlzLiN0eXBlICYmICFjdXN0b21NZWRpYVR5cGVzKSB7XG4gICAgICByZXR1cm4gdGhpcy4jdHlwZTtcbiAgICB9XG4gICAgY3VzdG9tTWVkaWFUeXBlcyA9IGN1c3RvbU1lZGlhVHlwZXMgPz8ge307XG4gICAgY29uc3QgaGVhZGVycyA9IHRoaXMuI3JlcXVlc3Q/LmhlYWRlcnMgPz8gdGhpcy4jaGVhZGVycztcbiAgICBjb25zdCBjb250ZW50VHlwZSA9IGhlYWRlcnM/LmdldChcImNvbnRlbnQtdHlwZVwiKTtcbiAgICBpZiAoY29udGVudFR5cGUpIHtcbiAgICAgIGZvciAoY29uc3QgW2JvZHlUeXBlLCBrbm93bk1lZGlhVHlwZXNdIG9mIEtOT1dOX0JPRFlfVFlQRVMpIHtcbiAgICAgICAgY29uc3QgY3VzdG9tVHlwZXMgPSBjdXN0b21NZWRpYVR5cGVzW2JvZHlUeXBlXSA/PyBbXTtcbiAgICAgICAgaWYgKG1hdGNoZXMoY29udGVudFR5cGUsIFsuLi5rbm93bk1lZGlhVHlwZXMsIC4uLmN1c3RvbVR5cGVzXSkpIHtcbiAgICAgICAgICB0aGlzLiN0eXBlID0gYm9keVR5cGU7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuI3R5cGU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuI3R5cGUgPSBcInVua25vd25cIjtcbiAgfVxuXG4gIFtTeW1ib2wuZm9yKFwiRGVuby5jdXN0b21JbnNwZWN0XCIpXShcbiAgICBpbnNwZWN0OiAodmFsdWU6IHVua25vd24pID0+IHN0cmluZyxcbiAgKTogc3RyaW5nIHtcbiAgICBjb25zdCB7IGhhcywgdXNlZCB9ID0gdGhpcztcbiAgICByZXR1cm4gYCR7dGhpcy5jb25zdHJ1Y3Rvci5uYW1lfSAke2luc3BlY3QoeyBoYXMsIHVzZWQgfSl9YDtcbiAgfVxuXG4gIFtTeW1ib2wuZm9yKFwibm9kZWpzLnV0aWwuaW5zcGVjdC5jdXN0b21cIildKFxuICAgIGRlcHRoOiBudW1iZXIsXG4gICAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgICBvcHRpb25zOiBhbnksXG4gICAgaW5zcGVjdDogKHZhbHVlOiB1bmtub3duLCBvcHRpb25zPzogdW5rbm93bikgPT4gc3RyaW5nLFxuICAgIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gICk6IGFueSB7XG4gICAgaWYgKGRlcHRoIDwgMCkge1xuICAgICAgcmV0dXJuIG9wdGlvbnMuc3R5bGl6ZShgWyR7dGhpcy5jb25zdHJ1Y3Rvci5uYW1lfV1gLCBcInNwZWNpYWxcIik7XG4gICAgfVxuXG4gICAgY29uc3QgbmV3T3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe30sIG9wdGlvbnMsIHtcbiAgICAgIGRlcHRoOiBvcHRpb25zLmRlcHRoID09PSBudWxsID8gbnVsbCA6IG9wdGlvbnMuZGVwdGggLSAxLFxuICAgIH0pO1xuICAgIGNvbnN0IHsgaGFzLCB1c2VkIH0gPSB0aGlzO1xuICAgIHJldHVybiBgJHtvcHRpb25zLnN0eWxpemUodGhpcy5jb25zdHJ1Y3Rvci5uYW1lLCBcInNwZWNpYWxcIil9ICR7XG4gICAgICBpbnNwZWN0KFxuICAgICAgICB7IGhhcywgdXNlZCB9LFxuICAgICAgICBuZXdPcHRpb25zLFxuICAgICAgKVxuICAgIH1gO1xuICB9XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEseUVBQXlFO0FBRXpFOzs7Ozs7Q0FNQztBQUVELFNBQVMsZUFBZSxFQUFFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxRQUFRLFlBQVk7QUFhNUUsTUFBTSxtQkFBc0U7RUFDMUU7SUFBQztJQUFVO01BQUM7TUFBUztNQUFTO0tBQTJCO0dBQUM7RUFDMUQ7SUFBQztJQUFRO01BQUM7S0FBYTtHQUFDO0VBQ3hCO0lBQUM7SUFBYTtNQUFDO0tBQVk7R0FBQztFQUM1QjtJQUFDO0lBQVE7TUFBQztNQUFRO01BQXNCO0tBQXlCO0dBQUM7RUFDbEU7SUFBQztJQUFRO01BQUM7S0FBTztHQUFDO0NBQ25CO0FBRUQsZUFBZSxTQUNiLElBQXdDLEVBQ3hDLElBQW9CO0VBRXBCLElBQUksQ0FBQyxNQUFNO0lBQ1QsT0FBTyxJQUFJLEtBQUssV0FBVyxPQUFPO01BQUU7SUFBSyxJQUFJO0VBQy9DO0VBQ0EsTUFBTSxTQUF1QixFQUFFO0VBQy9CLFdBQVcsTUFBTSxTQUFTLEtBQU07SUFDOUIsT0FBTyxJQUFJLENBQUM7RUFDZDtFQUNBLE9BQU8sSUFBSSxLQUFLLFFBQVEsT0FBTztJQUFFO0VBQUssSUFBSTtBQUM1QztlQW9NRyxPQUFPLEdBQUcsQ0FBQyx1Q0FPWCxPQUFPLEdBQUcsQ0FB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
// denoCacheMetadata=5910546180298401065,7402882392277391425