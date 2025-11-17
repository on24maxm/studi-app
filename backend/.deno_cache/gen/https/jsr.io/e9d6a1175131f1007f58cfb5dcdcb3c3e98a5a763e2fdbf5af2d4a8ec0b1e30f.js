/**
 * A module which provides capabilities to deal with handling HTTP
 * [range requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests).
 *
 * The {@linkcode range} function can be used to determine if a range can be
 * satisfied for a requested resource. The {@linkcode responseRange} can be used
 * to fulfill range requests.
 *
 * The module provides specific support for {@linkcode Deno.FsFile} to provide
 * an efficient way of send the response to the range request without having to
 * read the whole file into memory by using the `.seek()` API.
 *
 * There are also some lower level constructs which can be used for advanced
 * use cases.
 *
 *   - {@linkcode MultiPartByteRangesStream} is a readable stream which
 *     generates a body that converts the source to a multipart byte range
 *     document.
 *   - {@linkcode RangeByteTransformStream} is a transform stream which will
 *     only stream the bytes indicated by the range.
 *   - {@linkcode contentRange} sets the headers that are appropriate when
 *     sending a range content response.
 *   - {@linkcode multiPartByteRanges} sets the headers that are appropriate
 *     when sending a multi part byte range content response.
 *   - {@linkcode asLimitedReadableStream} leverages the `.seek()` APIs with a
 *     {@linkcode Deno.FsFile} to provide a more performant and memory efficient
 *     way to stream just a range of bytes form a file.
 *
 * @example A simple static webserver supporting range requests
 *
 * ```ts
 * import { range, responseRange } from "jsr:@oak/commons/range";
 * import { typeByExtension } from "jsr:@std/media-types/type-by-extension";
 * import { extname } from "jsr:@std/path/extname";
 *
 * Deno.serve(async (req) => {
 *   const url = new URL(req.url);
 *   const file = await Deno.open(`./static${url.pathname}`);
 *   const fileInfo = await file.stat();
 *   const headers = { "accept-ranges": "bytes", "content-type": type };
 *   if (req.method === "HEAD") {
 *     return new Response(null, {
 *       headers: {
 *         ...headers,
 *         "content-length": String(fileInfo.size),
 *       },
 *     });
 *   }
 *   if (req.method === "GET") {
 *     const result = await range(req, fileInfo);
 *     if (result.ok) {
 *       if (result.ranges) {
 *         return responseRange(file, fileInfo.size, result.ranges, {
 *           headers,
 *         }, { type });
 *       } else {
 *         return new Response(file.readable, {
 *           headers: {
 *             ...headers,
 *             "content-length": String(fileInfo.size),
 *           },
 *         });
 *       }
 *     } else {
 *       return new Response(null, {
 *         status: 416,
 *         statusText: "Range Not Satisfiable",
 *         headers,
 *       });
 *     }
 *   }
 *   return new Response(null, { status: 405, statusText: "Method Not Allowed" });
 * });
 * ```
 *
 * @module
 */ import { assert } from "jsr:/@std/assert@^1.0/assert";
import { concat } from "jsr:/@std/bytes@^1.0/concat";
import { eTag } from "jsr:/@std/http@^1.0/etag";
const DEFAULT_CHUNK_SIZE = 524_288;
const ETAG_RE = /(?:W\/)?"[ !#-\x7E\x80-\xFF]+"/;
const encoder = new TextEncoder();
function isDenoFsFile(value) {
  if (!value || value === null || !("Deno" in globalThis) || !Deno.FsFile) {
    return false;
  }
  return value instanceof Deno.FsFile;
}
function isFileInfo(value) {
  return !!(typeof value === "object" && value && "mtime" in value);
}
function isModified(value, mtime) {
  const a = new Date(value).getTime();
  let b = mtime.getTime();
  // adjust to the precision of HTTP UTC time
  b -= b % 1000;
  return a < b;
}
async function readRange(file, { start, end }) {
  const parts = [];
  let read = 0;
  const length = end - start + 1;
  const pos = await file.seek(start, Deno.SeekMode.Start);
  if (pos !== start) {
    throw new RangeError("Could not seek to range start.");
  }
  while(read < length){
    const chunk = new Uint8Array(length - read);
    const count = await file.read(chunk);
    if (count === null) {
      throw new RangeError("Could not read to range end.");
    }
    parts.push(chunk);
    read += count;
  }
  return parts.length > 1 ? concat(parts) : parts[0];
}
/**
 * A readable stream that will stream a body formatted as a
 * `multipart/byteranges` document. The `source` needs to be a
 * {@linkcode Deno.FsFile}, {@linkcode ReadableStream}, {@linkcode Blob},
 * {@linkcode BufferSource}, or a `string`.
 */ export class MultiPartByteRangesStream extends ReadableStream {
  #boundary;
  #contentLength;
  #postscript;
  #previous;
  #ranges;
  #seen = 0;
  #source;
  #type;
  /**
   * The boundary being used when segmenting different parts of the body
   * response. This should be reflected in the `Content-Type` header when
   * being sent to a client.
   */ get boundary() {
    return this.#boundary;
  }
  /**
   * The length of the content being supplied by the stream. This should be
   * reflected in the `Content-Length` header when being sent to a client.
   */ get contentLength() {
    return this.#contentLength;
  }
  async #readRange({ start, end }) {
    if (isDenoFsFile(this.#source)) {
      return readRange(this.#source, {
        start,
        end
      });
    }
    if (this.#source instanceof Blob) {
      return new Uint8Array(await this.#source.slice(start, end + 1).arrayBuffer());
    }
    if (this.#source instanceof ArrayBuffer) {
      return new Uint8Array(this.#source.slice(start, end + 1));
    }
    const length = end - start;
    let read = 0;
    let result;
    const processChunk = (chunk)=>{
      if (this.#seen + chunk.byteLength >= start) {
        if (this.#seen < start) {
          chunk = chunk.slice(start - this.#seen);
          this.#seen = start;
        }
        if (read + chunk.byteLength > length + 1) {
          this.#previous = chunk.slice(length - read + 1);
          chunk = chunk.slice(0, length - read + 1);
        }
        read += chunk.byteLength;
        this.#seen += chunk.byteLength;
        return chunk;
      }
      this.#seen += chunk.byteLength;
    };
    if (this.#previous) {
      const chunk = this.#previous;
      this.#previous = undefined;
      const res = processChunk(chunk);
      if (res) {
        result = res;
      }
    }
    while(read < length){
      const { done, value: chunk } = await this.#source.read();
      if (chunk) {
        const res = processChunk(chunk);
        if (res) {
          result = result ? concat([
            result,
            res
          ]) : res;
        }
      }
      if (done) {
        throw new RangeError("Unable to read range.");
      }
    }
    assert(result);
    return result;
  }
  constructor(source, ranges, size, options = {}){
    const { autoClose = true, boundary = "OAK-COMMONS-BOUNDARY", type } = options;
    super({
      pull: async (controller)=>{
        const range = this.#ranges.shift();
        if (!range) {
          controller.enqueue(this.#postscript);
          controller.close();
          if (autoClose && isDenoFsFile(this.#source)) {
            this.#source.close();
          }
          if (this.#source instanceof ReadableStreamDefaultReader) {
            this.#source.releaseLock();
          }
          return;
        }
        const bytes = await this.#readRange(range);
        const preamble = encoder.encode(`\r\n--${boundary}\r\nContent-Type: ${this.#type}\r\nContent-Range: ${range.start}-${range.end}/${size}\r\n\r\n`);
        controller.enqueue(concat([
          preamble,
          bytes
        ]));
      }
    });
    this.#boundary = boundary;
    this.#ranges = [
      ...ranges
    ];
    this.#ranges.sort(({ start: a }, { start: b })=>a - b);
    if (ArrayBuffer.isView(source)) {
      this.#source = source.buffer;
    } else if (typeof source === "string") {
      this.#source = encoder.encode(source).buffer;
    } else if (source instanceof ReadableStream) {
      this.#source = source.getReader();
    } else {
      this.#source = source;
    }
    this.#type = type || source instanceof Blob && source.type || "application/octet-stream";
    this.#postscript = encoder.encode(`\r\n--${boundary}--\r\n`);
    this.#contentLength = ranges.reduce((prev, { start, end })=>prev + encoder.encode(`\r\n--${boundary}\r\nContent-Type: ${this.#type}\r\nContent-Range: ${start}-${end}/${size}\r\n\r\n`).byteLength + (end - start) + 1, this.#postscript.byteLength);
  }
}
/**
 * A {@linkcode TransformStream} which will only provide the range of bytes from
 * the source stream.
 */ export class RangeByteTransformStream extends TransformStream {
  constructor(range){
    const { start, end } = range;
    const length = end - start;
    let seen = 0;
    let read = 0;
    super({
      transform (chunk, controller) {
        if (seen + chunk.byteLength >= start) {
          if (seen < start) {
            // start is part way through chunk
            chunk = chunk.slice(start - seen);
            seen = start;
          }
          if (read + chunk.byteLength > length + 1) {
            // chunk extends past end
            chunk = chunk.slice(0, length - read + 1);
          }
          read += chunk.byteLength;
          seen += chunk.byteLength;
          controller.enqueue(chunk);
          if (read >= length) {
            controller.terminate();
          }
        } else {
          // skip chunk
          seen += chunk.byteLength;
        }
      }
    });
  }
}
/**
 * Set {@linkcode Headers} related to returning a content range to the client.
 *
 * This will set the `Accept-Ranges`, `Content-Range` and `Content-Length` as
 * appropriate. If the headers does not contain a `Content-Type` header, and one
 * is supplied, it will be added.
 */ export function contentRange(headers, range, size, type) {
  const { start, end } = range;
  headers.set("accept-ranges", "bytes");
  headers.set("content-range", `bytes ${start}-${end}/${size}`);
  headers.set("content-length", String(end - start + 1));
  if (type && !headers.has("content-type")) {
    headers.set("content-type", type);
  }
}
/**
 * Set {@linkcode Headers} related to returning a multipart byte range response.
 *
 * This will set the `Content-Type` and `Content-Length` headers as appropriate.
 */ export function multiPartByteRanges(headers, init) {
  const { contentLength, boundary } = init;
  headers.set("content-type", `multipart/byteranges; boundary=${boundary}`);
  headers.set("content-length", String(contentLength));
}
/**
 * Converts a {@linkcode DenoFile} and a {@linkcode ByteRange} into a byte
 * {@linkcode ReadableStream} which will provide just the range of bytes.
 *
 * When the stream is finished being ready, the file will be closed. Changing
 * the option to `autoClose` to `false` will disable this behavior.
 */ export function asLimitedReadableStream(fsFile, range, options = {}) {
  const { start, end } = range;
  const { autoClose = true, chunkSize = DEFAULT_CHUNK_SIZE } = options;
  let read = 0;
  const length = end - start + 1;
  return new ReadableStream({
    start (controller) {
      const pos = fsFile.seekSync(start, Deno.SeekMode.Start);
      if (pos !== start) {
        controller.error(new RangeError("Could not seek to range start."));
      }
    },
    async pull (controller) {
      const chunk = new Uint8Array(Math.min(length - read, chunkSize));
      const count = await fsFile.read(chunk);
      if (count == null) {
        controller.error(new RangeError("Could not read to range end."));
        return;
      }
      controller.enqueue(chunk);
      read += count;
      if (read >= length) {
        controller.close();
        if (autoClose) {
          fsFile.close();
        }
      }
    },
    autoAllocateChunkSize: chunkSize,
    type: "bytes"
  });
}
export async function range(request, entity, fileInfo) {
  const ifRange = request.headers.get("if-range");
  if (ifRange) {
    const matches = ETAG_RE.exec(ifRange);
    if (matches) {
      const [match] = matches;
      // this indicates that it would be a weak tag, and we cannot compare on
      // weak tags, the full entity should be returned
      if (!fileInfo || match.startsWith("W")) {
        return {
          ok: true,
          ranges: null
        };
      }
      // @ts-ignore the types for eTag are not correct
      if (match !== await eTag(entity)) {
        return {
          ok: true,
          ranges: null
        };
      }
    } else {
      assert(fileInfo || isFileInfo(entity));
      const { mtime } = fileInfo ?? entity;
      if (!mtime || isModified(ifRange, mtime)) {
        return {
          ok: true,
          ranges: null
        };
      }
    }
  }
  const value = request.headers.get("range");
  if (!value) {
    return {
      ok: true,
      ranges: null
    };
  }
  const [unit, rangesStr] = value.split("=");
  if (unit !== "bytes") {
    return {
      ok: false,
      ranges: null
    };
  }
  const ranges = [];
  for (const range of rangesStr.split(/\s*,\s+/)){
    const item = range.split("-");
    if (item.length !== 2) {
      return {
        ok: false,
        ranges: null
      };
    }
    const { size } = fileInfo ?? entity;
    const [startStr, endStr] = item;
    let start;
    let end;
    try {
      if (startStr === "") {
        start = size - parseInt(endStr, 10) - 1;
        end = size - 1;
      } else if (endStr === "") {
        start = parseInt(startStr, 10);
        end = size - 1;
      } else {
        start = parseInt(startStr, 10);
        end = parseInt(endStr, 10);
      }
    } catch  {
      return {
        ok: false,
        ranges: null
      };
    }
    if (start < 0 || start >= size || end < 0 || end >= size || start > end) {
      return {
        ok: false,
        ranges: null
      };
    }
    ranges.push({
      start,
      end
    });
  }
  return {
    ok: true,
    ranges
  };
}
/**
 * Resolves with a {@linkcode Response} with a body which is just the range of
 * bytes supplied, along with the appropriate headers which indicate that it is
 * the fulfillment of a range request.
 *
 * The `body` is a {@linkcode Response} {@linkcode BodyInit} with the addition
 * of supporting {@linkcode Deno.FsFile} and does not accept
 * {@linkcode FormData} or {@linkcode URLSearchParams}. When using
 * {@linkcode Deno.FsFile} the seek capabilities in order to read ranges more
 * efficiently.
 *
 * The `size` is the total number of bytes in the resource being responded to.
 * This needs to be provided, because the full size of the resource being
 * requested it may not be easy to determine at the time being requested.
 *
 * @example
 *
 * ```ts
 * import { responseRange } from "jsr:@oak/commons/range";
 *
 * const file = await Deno.open("./movie.mp4");
 * const { size } = await file.stat();
 * const res = responseRange(
 *   file,
 *   size,
 *   { start: 0, end: 1_048_575 },
 *   { headers: { "content-type": "video/mp4" } },
 * );
 * const ab = await res.arrayBuffer();
 * // ab will be the first 1MB of the video file
 * ```
 */ export function responseRange(body, size, ranges, init = {}, options = {}) {
  if (!ranges.length) {
    throw new RangeError("At least one range expected.");
  }
  if (ranges.length === 1) {
    const [range] = ranges;
    let type = options.type ?? "application/octet-stream";
    if (isDenoFsFile(body)) {
      body = asLimitedReadableStream(body, range, options);
    } else if (body instanceof ReadableStream) {
      body = body.pipeThrough(new RangeByteTransformStream(range));
    } else if (body instanceof Blob) {
      type = body.type;
      body = body.slice(range.start, range.end + 1);
    } else if (ArrayBuffer.isView(body)) {
      body = body.buffer.slice(range.start, range.end + 1);
    } else if (body instanceof ArrayBuffer) {
      body = body.slice(range.start, range.end + 1);
    } else if (typeof body === "string") {
      body = encoder.encode(body).slice(range.start, range.end + 1);
    } else {
      throw TypeError("Invalid body type.");
    }
    const res = new Response(body, {
      ...init,
      status: 206,
      statusText: "Partial Content"
    });
    contentRange(res.headers, range, size, type);
    return res;
  }
  const stream = new MultiPartByteRangesStream(body, ranges, size, options);
  const res = new Response(stream, {
    ...init,
    status: 206,
    statusText: "Partial Content"
  });
  multiPartByteRanges(res.headers, stream);
  return res;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BvYWsvY29tbW9ucy8xLjAuMS9yYW5nZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEEgbW9kdWxlIHdoaWNoIHByb3ZpZGVzIGNhcGFiaWxpdGllcyB0byBkZWFsIHdpdGggaGFuZGxpbmcgSFRUUFxuICogW3JhbmdlIHJlcXVlc3RzXShodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9IVFRQL1JhbmdlX3JlcXVlc3RzKS5cbiAqXG4gKiBUaGUge0BsaW5rY29kZSByYW5nZX0gZnVuY3Rpb24gY2FuIGJlIHVzZWQgdG8gZGV0ZXJtaW5lIGlmIGEgcmFuZ2UgY2FuIGJlXG4gKiBzYXRpc2ZpZWQgZm9yIGEgcmVxdWVzdGVkIHJlc291cmNlLiBUaGUge0BsaW5rY29kZSByZXNwb25zZVJhbmdlfSBjYW4gYmUgdXNlZFxuICogdG8gZnVsZmlsbCByYW5nZSByZXF1ZXN0cy5cbiAqXG4gKiBUaGUgbW9kdWxlIHByb3ZpZGVzIHNwZWNpZmljIHN1cHBvcnQgZm9yIHtAbGlua2NvZGUgRGVuby5Gc0ZpbGV9IHRvIHByb3ZpZGVcbiAqIGFuIGVmZmljaWVudCB3YXkgb2Ygc2VuZCB0aGUgcmVzcG9uc2UgdG8gdGhlIHJhbmdlIHJlcXVlc3Qgd2l0aG91dCBoYXZpbmcgdG9cbiAqIHJlYWQgdGhlIHdob2xlIGZpbGUgaW50byBtZW1vcnkgYnkgdXNpbmcgdGhlIGAuc2VlaygpYCBBUEkuXG4gKlxuICogVGhlcmUgYXJlIGFsc28gc29tZSBsb3dlciBsZXZlbCBjb25zdHJ1Y3RzIHdoaWNoIGNhbiBiZSB1c2VkIGZvciBhZHZhbmNlZFxuICogdXNlIGNhc2VzLlxuICpcbiAqICAgLSB7QGxpbmtjb2RlIE11bHRpUGFydEJ5dGVSYW5nZXNTdHJlYW19IGlzIGEgcmVhZGFibGUgc3RyZWFtIHdoaWNoXG4gKiAgICAgZ2VuZXJhdGVzIGEgYm9keSB0aGF0IGNvbnZlcnRzIHRoZSBzb3VyY2UgdG8gYSBtdWx0aXBhcnQgYnl0ZSByYW5nZVxuICogICAgIGRvY3VtZW50LlxuICogICAtIHtAbGlua2NvZGUgUmFuZ2VCeXRlVHJhbnNmb3JtU3RyZWFtfSBpcyBhIHRyYW5zZm9ybSBzdHJlYW0gd2hpY2ggd2lsbFxuICogICAgIG9ubHkgc3RyZWFtIHRoZSBieXRlcyBpbmRpY2F0ZWQgYnkgdGhlIHJhbmdlLlxuICogICAtIHtAbGlua2NvZGUgY29udGVudFJhbmdlfSBzZXRzIHRoZSBoZWFkZXJzIHRoYXQgYXJlIGFwcHJvcHJpYXRlIHdoZW5cbiAqICAgICBzZW5kaW5nIGEgcmFuZ2UgY29udGVudCByZXNwb25zZS5cbiAqICAgLSB7QGxpbmtjb2RlIG11bHRpUGFydEJ5dGVSYW5nZXN9IHNldHMgdGhlIGhlYWRlcnMgdGhhdCBhcmUgYXBwcm9wcmlhdGVcbiAqICAgICB3aGVuIHNlbmRpbmcgYSBtdWx0aSBwYXJ0IGJ5dGUgcmFuZ2UgY29udGVudCByZXNwb25zZS5cbiAqICAgLSB7QGxpbmtjb2RlIGFzTGltaXRlZFJlYWRhYmxlU3RyZWFtfSBsZXZlcmFnZXMgdGhlIGAuc2VlaygpYCBBUElzIHdpdGggYVxuICogICAgIHtAbGlua2NvZGUgRGVuby5Gc0ZpbGV9IHRvIHByb3ZpZGUgYSBtb3JlIHBlcmZvcm1hbnQgYW5kIG1lbW9yeSBlZmZpY2llbnRcbiAqICAgICB3YXkgdG8gc3RyZWFtIGp1c3QgYSByYW5nZSBvZiBieXRlcyBmb3JtIGEgZmlsZS5cbiAqXG4gKiBAZXhhbXBsZSBBIHNpbXBsZSBzdGF0aWMgd2Vic2VydmVyIHN1cHBvcnRpbmcgcmFuZ2UgcmVxdWVzdHNcbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgcmFuZ2UsIHJlc3BvbnNlUmFuZ2UgfSBmcm9tIFwianNyOkBvYWsvY29tbW9ucy9yYW5nZVwiO1xuICogaW1wb3J0IHsgdHlwZUJ5RXh0ZW5zaW9uIH0gZnJvbSBcImpzcjpAc3RkL21lZGlhLXR5cGVzL3R5cGUtYnktZXh0ZW5zaW9uXCI7XG4gKiBpbXBvcnQgeyBleHRuYW1lIH0gZnJvbSBcImpzcjpAc3RkL3BhdGgvZXh0bmFtZVwiO1xuICpcbiAqIERlbm8uc2VydmUoYXN5bmMgKHJlcSkgPT4ge1xuICogICBjb25zdCB1cmwgPSBuZXcgVVJMKHJlcS51cmwpO1xuICogICBjb25zdCBmaWxlID0gYXdhaXQgRGVuby5vcGVuKGAuL3N0YXRpYyR7dXJsLnBhdGhuYW1lfWApO1xuICogICBjb25zdCBmaWxlSW5mbyA9IGF3YWl0IGZpbGUuc3RhdCgpO1xuICogICBjb25zdCBoZWFkZXJzID0geyBcImFjY2VwdC1yYW5nZXNcIjogXCJieXRlc1wiLCBcImNvbnRlbnQtdHlwZVwiOiB0eXBlIH07XG4gKiAgIGlmIChyZXEubWV0aG9kID09PSBcIkhFQURcIikge1xuICogICAgIHJldHVybiBuZXcgUmVzcG9uc2UobnVsbCwge1xuICogICAgICAgaGVhZGVyczoge1xuICogICAgICAgICAuLi5oZWFkZXJzLFxuICogICAgICAgICBcImNvbnRlbnQtbGVuZ3RoXCI6IFN0cmluZyhmaWxlSW5mby5zaXplKSxcbiAqICAgICAgIH0sXG4gKiAgICAgfSk7XG4gKiAgIH1cbiAqICAgaWYgKHJlcS5tZXRob2QgPT09IFwiR0VUXCIpIHtcbiAqICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCByYW5nZShyZXEsIGZpbGVJbmZvKTtcbiAqICAgICBpZiAocmVzdWx0Lm9rKSB7XG4gKiAgICAgICBpZiAocmVzdWx0LnJhbmdlcykge1xuICogICAgICAgICByZXR1cm4gcmVzcG9uc2VSYW5nZShmaWxlLCBmaWxlSW5mby5zaXplLCByZXN1bHQucmFuZ2VzLCB7XG4gKiAgICAgICAgICAgaGVhZGVycyxcbiAqICAgICAgICAgfSwgeyB0eXBlIH0pO1xuICogICAgICAgfSBlbHNlIHtcbiAqICAgICAgICAgcmV0dXJuIG5ldyBSZXNwb25zZShmaWxlLnJlYWRhYmxlLCB7XG4gKiAgICAgICAgICAgaGVhZGVyczoge1xuICogICAgICAgICAgICAgLi4uaGVhZGVycyxcbiAqICAgICAgICAgICAgIFwiY29udGVudC1sZW5ndGhcIjogU3RyaW5nKGZpbGVJbmZvLnNpemUpLFxuICogICAgICAgICAgIH0sXG4gKiAgICAgICAgIH0pO1xuICogICAgICAgfVxuICogICAgIH0gZWxzZSB7XG4gKiAgICAgICByZXR1cm4gbmV3IFJlc3BvbnNlKG51bGwsIHtcbiAqICAgICAgICAgc3RhdHVzOiA0MTYsXG4gKiAgICAgICAgIHN0YXR1c1RleHQ6IFwiUmFuZ2UgTm90IFNhdGlzZmlhYmxlXCIsXG4gKiAgICAgICAgIGhlYWRlcnMsXG4gKiAgICAgICB9KTtcbiAqICAgICB9XG4gKiAgIH1cbiAqICAgcmV0dXJuIG5ldyBSZXNwb25zZShudWxsLCB7IHN0YXR1czogNDA1LCBzdGF0dXNUZXh0OiBcIk1ldGhvZCBOb3QgQWxsb3dlZFwiIH0pO1xuICogfSk7XG4gKiBgYGBcbiAqXG4gKiBAbW9kdWxlXG4gKi9cblxuaW1wb3J0IHsgYXNzZXJ0IH0gZnJvbSBcImpzcjovQHN0ZC9hc3NlcnRAXjEuMC9hc3NlcnRcIjtcbmltcG9ydCB7IGNvbmNhdCB9IGZyb20gXCJqc3I6L0BzdGQvYnl0ZXNAXjEuMC9jb25jYXRcIjtcbmltcG9ydCB7IGVUYWcsIHR5cGUgRmlsZUluZm8gfSBmcm9tIFwianNyOi9Ac3RkL2h0dHBAXjEuMC9ldGFnXCI7XG5cbi8qKlxuICogQSBkZXNjcmlwdG9yIGZvciB0aGUgc3RhcnQgYW5kIGVuZCBvZiBhIGJ5dGUgcmFuZ2UsIHdoaWNoIGFyZSBpbmNsdXNpdmUgb2ZcbiAqIHRoZSBieXRlcy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBCeXRlUmFuZ2Uge1xuICAvKiogVGhlIHN0YXJ0IGJ5dGUgb2YgdGhlIHJhbmdlLiBUaGUgbnVtYmVyIGlzIHplcm8gaW5kZXhlZC4gKi9cbiAgc3RhcnQ6IG51bWJlcjtcbiAgLyoqIFRoZSBsYXN0IGJ5dGUgdG8gYmUgaW5jbHVkZWQgaW4gdGhlIHJhbmdlLiBUaGUgbnVtYmVyIGlzIHplcm8gaW5kZXhlZC4gKi9cbiAgZW5kOiBudW1iZXI7XG59XG5cbi8qKlxuICogT3B0aW9ucyB3aGljaCBjYW4gYmUgdXNlZCB3aGVuIGNyZWF0aW5nIGFcbiAqIHtAbGlua2NvZGUgTXVsdGlQYXJ0Qnl0ZVJhbmdlc1N0cmVhbX0uXG4gKi9cbmludGVyZmFjZSBNdWx0aVBhcnRCeXRlUmFuZ2VTdHJlYW1PcHRpb25zIHtcbiAgLyoqXG4gICAqIElmIHRoZSBzb3VyY2UgaXMgYSB7QGxpbmtjb2RlIERlbm8uRnNGaWxlfSwgY2xvc2UgdGhlIGZpbGUgb25jZSB0aGUgcmFuZ2VzXG4gICAqIGhhdmUgYmVlbiByZWFkIGZyb20gdGhlIGZpbGUuIFRoaXMgZGVmYXVsdHMgdG8gYHRydWVgLlxuICAgKi9cbiAgYXV0b0Nsb3NlPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFRoZSBib3VuZGFyeSB0aGF0IHNob3VsZCBiZSB1c2VkIHdoZW4gY3JlYXRpbmcgcGFydHMgb2YgdGhlIHJlc3BvbnNlLiBBXG4gICAqIGRlZmF1bHQgb25lIGlzIHVzZWQgaWYgbm9uZSBpcyBzdXBwbGllZC5cbiAgICovXG4gIGJvdW5kYXJ5Pzogc3RyaW5nO1xuICAvKipcbiAgICogQSBjb250ZW50IHR5cGUgdG8gYmUgdXNlZCB3aXRoIHRoZSBwYXJ0cyBvZiB0aGUgcmVzcG9uc2UuIElmIG9uZSBpcyBub3RcbiAgICogc3VwcGxpZWQgYW5kIHRoZSBzb3VyY2UgaXMgYSB7QGxpbmtjb2RlIEJsb2J9LCB0aGUgYmxvYidzIGAudHlwZWAgd2lsbCBiZVxuICAgKiB1c2VkLCBvdGhlcndpc2UgYFwiYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtXCJgLlxuICAgKi9cbiAgdHlwZT86IHN0cmluZztcbn1cblxuLyoqXG4gKiBMaWtlIHtAbGlua2NvZGUgQm9keUluaXR9IGJ1dCBvbmx5IGFjY2VwdHMgdGhlIGJvZGllcyB3aGljaCBjYW4gYmUgcHJvdmlkZWRcbiAqIGFzIHJhbmdlcyBhcyB3ZWxsIGFzIGFkZHMge0BsaW5rY29kZSBEZW5vLkZzRmlsZX0uXG4gKi9cbmV4cG9ydCB0eXBlIFJhbmdlQm9keUluaXQgPVxuICB8IEJsb2JcbiAgfCBCdWZmZXJTb3VyY2VcbiAgfCBSZWFkYWJsZVN0cmVhbTxVaW50OEFycmF5PlxuICB8IHN0cmluZ1xuICB8IERlbm8uRnNGaWxlO1xuXG4vKipcbiAqIFRoZSByZXN1bHRzIG9iamVjdCB3aGVuIGNhbGxpbmcge0BsaW5rY29kZSByYW5nZX0uXG4gKi9cbmV4cG9ydCB0eXBlIFJhbmdlUmVzdWx0ID0ge1xuICBvazogdHJ1ZTtcbiAgcmFuZ2VzOiBCeXRlUmFuZ2VbXSB8IG51bGw7XG59IHwge1xuICBvazogZmFsc2U7XG4gIHJhbmdlczogbnVsbDtcbn07XG5cbi8qKlxuICogT3B0aW9ucyB3aGljaCBjYW4gYmUgc2V0IHdpdGgge0BsaW5rY29kZSByZXNwb25zZVJhbmdlfSBvclxuICoge0BsaW5rY29kZSBhc0xpbWl0ZWRSZWFkYWJsZVN0cmVhbX0uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUmVzcG9uc2VSYW5nZU9wdGlvbnMge1xuICAvKipcbiAgICogT25jZSB0aGUgc3RyZWFtIG9yIGJvZHkgaXMgZmluaXNoZWQgYmVpbmcgcmVhZCwgY2xvc2UgdGhlIHNvdXJjZVxuICAgKiB7QGxpbmtjb2RlIERlbm8uRnNGaWxlfS5cbiAgICpcbiAgICogQGRlZmF1bHQgdHJ1ZVxuICAgKi9cbiAgYXV0b0Nsb3NlPzogYm9vbGVhbjtcbiAgLyoqXG4gICAqIFdoZW4gaGFuZGxpbmcgbXVsdGlwbGUgcmFuZ2VzIGFuZCBzZW5kaW5nIGEgbXVsdGlwbGUgcmVzcG9uc2UsIG92ZXJyaWRlXG4gICAqIHRoZSBkZWZhdWx0IGJvdW5kYXJ5LlxuICAgKi9cbiAgYm91bmRhcnk/OiBzdHJpbmc7XG4gIC8qKlxuICAgKiBUaGUgc2l6ZSBvZiB3aGljaCBjaHVua3MgYXJlIGF0dGVtcHRlZCB0byBiZSByZWFkLiBUaGlzIGRlZmF1bHRzIHRvIDUxMmsuXG4gICAqIFRoZSB2YWx1ZSBpcyBzcGVjaWZpZWQgaW4gbnVtYmVyIG9mIGJ5dGVzLlxuICAgKi9cbiAgY2h1bmtTaXplPzogbnVtYmVyO1xuICAvKipcbiAgICogUHJvdmlkZSBhIGNvbnRlbnQgdHlwZSBmb3IgdGhlIHJlc3BvbnNlLiBUaGlzIHdpbGwgb3ZlcnJpZGUgYW55IGF1dG9tYXRpY1xuICAgKiBkZXRlcm1pbmF0aW9uIG9mIHRoZSB0eXBlLlxuICAgKi9cbiAgdHlwZT86IHN0cmluZztcbn1cblxuLyoqXG4gKiBUaGUgdmFsaWQgZm9ybXMgb2YgYW4gZW50aXR5IHdoaWNoIGNhbiBiZSB1c2VkIHdpdGggdGhlIHJhbmdlIGZ1bmN0aW9ucy5cbiAqL1xuZXhwb3J0IHR5cGUgRW50aXR5ID0gRmlsZUluZm8gfCBzdHJpbmcgfCBVaW50OEFycmF5O1xuXG5jb25zdCBERUZBVUxUX0NIVU5LX1NJWkUgPSA1MjRfMjg4O1xuY29uc3QgRVRBR19SRSA9IC8oPzpXXFwvKT9cIlsgISMtXFx4N0VcXHg4MC1cXHhGRl0rXCIvO1xuY29uc3QgZW5jb2RlciA9IG5ldyBUZXh0RW5jb2RlcigpO1xuXG5mdW5jdGlvbiBpc0Rlbm9Gc0ZpbGUodmFsdWU6IHVua25vd24pOiB2YWx1ZSBpcyBEZW5vLkZzRmlsZSB7XG4gIGlmICghdmFsdWUgfHwgdmFsdWUgPT09IG51bGwgfHwgIShcIkRlbm9cIiBpbiBnbG9iYWxUaGlzKSB8fCAhRGVuby5Gc0ZpbGUpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgRGVuby5Gc0ZpbGU7XG59XG5cbmZ1bmN0aW9uIGlzRmlsZUluZm8odmFsdWU6IHVua25vd24pOiB2YWx1ZSBpcyBGaWxlSW5mbyB7XG4gIHJldHVybiAhISh0eXBlb2YgdmFsdWUgPT09IFwib2JqZWN0XCIgJiYgdmFsdWUgJiYgXCJtdGltZVwiIGluIHZhbHVlKTtcbn1cblxuZnVuY3Rpb24gaXNNb2RpZmllZCh2YWx1ZTogc3RyaW5nLCBtdGltZTogRGF0ZSk6IGJvb2xlYW4ge1xuICBjb25zdCBhID0gbmV3IERhdGUodmFsdWUpLmdldFRpbWUoKTtcbiAgbGV0IGIgPSBtdGltZS5nZXRUaW1lKCk7XG4gIC8vIGFkanVzdCB0byB0aGUgcHJlY2lzaW9uIG9mIEhUVFAgVVRDIHRpbWVcbiAgYiAtPSBiICUgMTAwMDtcbiAgcmV0dXJuIGEgPCBiO1xufVxuXG5hc3luYyBmdW5jdGlvbiByZWFkUmFuZ2UoXG4gIGZpbGU6IERlbm8uRnNGaWxlLFxuICB7IHN0YXJ0LCBlbmQgfTogQnl0ZVJhbmdlLFxuKTogUHJvbWlzZTxVaW50OEFycmF5PiB7XG4gIGNvbnN0IHBhcnRzOiBVaW50OEFycmF5W10gPSBbXTtcbiAgbGV0IHJlYWQgPSAwO1xuICBjb25zdCBsZW5ndGggPSBlbmQgLSBzdGFydCArIDE7XG4gIGNvbnN0IHBvcyA9IGF3YWl0IGZpbGUuc2VlayhzdGFydCwgRGVuby5TZWVrTW9kZS5TdGFydCk7XG4gIGlmIChwb3MgIT09IHN0YXJ0KSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoXCJDb3VsZCBub3Qgc2VlayB0byByYW5nZSBzdGFydC5cIik7XG4gIH1cbiAgd2hpbGUgKHJlYWQgPCBsZW5ndGgpIHtcbiAgICBjb25zdCBjaHVuayA9IG5ldyBVaW50OEFycmF5KGxlbmd0aCAtIHJlYWQpO1xuICAgIGNvbnN0IGNvdW50ID0gYXdhaXQgZmlsZS5yZWFkKGNodW5rKTtcbiAgICBpZiAoY291bnQgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKFwiQ291bGQgbm90IHJlYWQgdG8gcmFuZ2UgZW5kLlwiKTtcbiAgICB9XG4gICAgcGFydHMucHVzaChjaHVuayk7XG4gICAgcmVhZCArPSBjb3VudDtcbiAgfVxuICByZXR1cm4gcGFydHMubGVuZ3RoID4gMSA/IGNvbmNhdChwYXJ0cykgOiBwYXJ0c1swXTtcbn1cblxuLyoqXG4gKiBBIHJlYWRhYmxlIHN0cmVhbSB0aGF0IHdpbGwgc3RyZWFtIGEgYm9keSBmb3JtYXR0ZWQgYXMgYVxuICogYG11bHRpcGFydC9ieXRlcmFuZ2VzYCBkb2N1bWVudC4gVGhlIGBzb3VyY2VgIG5lZWRzIHRvIGJlIGFcbiAqIHtAbGlua2NvZGUgRGVuby5Gc0ZpbGV9LCB7QGxpbmtjb2RlIFJlYWRhYmxlU3RyZWFtfSwge0BsaW5rY29kZSBCbG9ifSxcbiAqIHtAbGlua2NvZGUgQnVmZmVyU291cmNlfSwgb3IgYSBgc3RyaW5nYC5cbiAqL1xuZXhwb3J0IGNsYXNzIE11bHRpUGFydEJ5dGVSYW5nZXNTdHJlYW0gZXh0ZW5kcyBSZWFkYWJsZVN0cmVhbTxVaW50OEFycmF5PiB7XG4gICNib3VuZGFyeTogc3RyaW5nO1xuICAjY29udGVudExlbmd0aDogbnVtYmVyO1xuICAjcG9zdHNjcmlwdDogVWludDhBcnJheTtcbiAgI3ByZXZpb3VzOiBVaW50OEFycmF5IHwgdW5kZWZpbmVkO1xuICAjcmFuZ2VzOiBCeXRlUmFuZ2VbXTtcbiAgI3NlZW4gPSAwO1xuICAjc291cmNlOlxuICAgIHwgQXJyYXlCdWZmZXJcbiAgICB8IEJsb2JcbiAgICB8IFJlYWRhYmxlU3RyZWFtRGVmYXVsdFJlYWRlcjxVaW50OEFycmF5PlxuICAgIHwgRGVuby5Gc0ZpbGU7XG4gICN0eXBlOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFRoZSBib3VuZGFyeSBiZWluZyB1c2VkIHdoZW4gc2VnbWVudGluZyBkaWZmZXJlbnQgcGFydHMgb2YgdGhlIGJvZHlcbiAgICogcmVzcG9uc2UuIFRoaXMgc2hvdWxkIGJlIHJlZmxlY3RlZCBpbiB0aGUgYENvbnRlbnQtVHlwZWAgaGVhZGVyIHdoZW5cbiAgICogYmVpbmcgc2VudCB0byBhIGNsaWVudC5cbiAgICovXG4gIGdldCBib3VuZGFyeSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLiNib3VuZGFyeTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgbGVuZ3RoIG9mIHRoZSBjb250ZW50IGJlaW5nIHN1cHBsaWVkIGJ5IHRoZSBzdHJlYW0uIFRoaXMgc2hvdWxkIGJlXG4gICAqIHJlZmxlY3RlZCBpbiB0aGUgYENvbnRlbnQtTGVuZ3RoYCBoZWFkZXIgd2hlbiBiZWluZyBzZW50IHRvIGEgY2xpZW50LlxuICAgKi9cbiAgZ2V0IGNvbnRlbnRMZW5ndGgoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy4jY29udGVudExlbmd0aDtcbiAgfVxuXG4gIGFzeW5jICNyZWFkUmFuZ2UoeyBzdGFydCwgZW5kIH06IEJ5dGVSYW5nZSk6IFByb21pc2U8VWludDhBcnJheT4ge1xuICAgIGlmIChpc0Rlbm9Gc0ZpbGUodGhpcy4jc291cmNlKSkge1xuICAgICAgcmV0dXJuIHJlYWRSYW5nZSh0aGlzLiNzb3VyY2UsIHsgc3RhcnQsIGVuZCB9KTtcbiAgICB9XG4gICAgaWYgKHRoaXMuI3NvdXJjZSBpbnN0YW5jZW9mIEJsb2IpIHtcbiAgICAgIHJldHVybiBuZXcgVWludDhBcnJheShcbiAgICAgICAgYXdhaXQgdGhpcy4jc291cmNlLnNsaWNlKHN0YXJ0LCBlbmQgKyAxKS5hcnJheUJ1ZmZlcigpLFxuICAgICAgKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuI3NvdXJjZSBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB7XG4gICAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkodGhpcy4jc291cmNlLnNsaWNlKHN0YXJ0LCBlbmQgKyAxKSk7XG4gICAgfVxuXG4gICAgY29uc3QgbGVuZ3RoID0gZW5kIC0gc3RhcnQ7XG4gICAgbGV0IHJlYWQgPSAwO1xuICAgIGxldCByZXN1bHQ6IFVpbnQ4QXJyYXkgfCB1bmRlZmluZWQ7XG5cbiAgICBjb25zdCBwcm9jZXNzQ2h1bmsgPSAoY2h1bms6IFVpbnQ4QXJyYXkpOiBVaW50OEFycmF5IHwgdW5kZWZpbmVkID0+IHtcbiAgICAgIGlmICh0aGlzLiNzZWVuICsgY2h1bmsuYnl0ZUxlbmd0aCA+PSBzdGFydCkge1xuICAgICAgICBpZiAodGhpcy4jc2VlbiA8IHN0YXJ0KSB7XG4gICAgICAgICAgY2h1bmsgPSBjaHVuay5zbGljZShzdGFydCAtIHRoaXMuI3NlZW4pO1xuICAgICAgICAgIHRoaXMuI3NlZW4gPSBzdGFydDtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVhZCArIGNodW5rLmJ5dGVMZW5ndGggPiBsZW5ndGggKyAxKSB7XG4gICAgICAgICAgdGhpcy4jcHJldmlvdXMgPSBjaHVuay5zbGljZShsZW5ndGggLSByZWFkICsgMSk7XG4gICAgICAgICAgY2h1bmsgPSBjaHVuay5zbGljZSgwLCBsZW5ndGggLSByZWFkICsgMSk7XG4gICAgICAgIH1cbiAgICAgICAgcmVhZCArPSBjaHVuay5ieXRlTGVuZ3RoO1xuICAgICAgICB0aGlzLiNzZWVuICs9IGNodW5rLmJ5dGVMZW5ndGg7XG4gICAgICAgIHJldHVybiBjaHVuaztcbiAgICAgIH1cbiAgICAgIHRoaXMuI3NlZW4gKz0gY2h1bmsuYnl0ZUxlbmd0aDtcbiAgICB9O1xuXG4gICAgaWYgKHRoaXMuI3ByZXZpb3VzKSB7XG4gICAgICBjb25zdCBjaHVuayA9IHRoaXMuI3ByZXZpb3VzO1xuICAgICAgdGhpcy4jcHJldmlvdXMgPSB1bmRlZmluZWQ7XG4gICAgICBjb25zdCByZXMgPSBwcm9jZXNzQ2h1bmsoY2h1bmspO1xuICAgICAgaWYgKHJlcykge1xuICAgICAgICByZXN1bHQgPSByZXM7XG4gICAgICB9XG4gICAgfVxuXG4gICAgd2hpbGUgKHJlYWQgPCBsZW5ndGgpIHtcbiAgICAgIGNvbnN0IHsgZG9uZSwgdmFsdWU6IGNodW5rIH0gPSBhd2FpdCB0aGlzLiNzb3VyY2UucmVhZCgpO1xuICAgICAgaWYgKGNodW5rKSB7XG4gICAgICAgIGNvbnN0IHJlcyA9IHByb2Nlc3NDaHVuayhjaHVuayk7XG4gICAgICAgIGlmIChyZXMpIHtcbiAgICAgICAgICByZXN1bHQgPSByZXN1bHQgPyBjb25jYXQoW3Jlc3VsdCwgcmVzXSkgOiByZXM7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChkb25lKSB7XG4gICAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKFwiVW5hYmxlIHRvIHJlYWQgcmFuZ2UuXCIpO1xuICAgICAgfVxuICAgIH1cbiAgICBhc3NlcnQocmVzdWx0KTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgY29uc3RydWN0b3IoXG4gICAgc291cmNlOiBSYW5nZUJvZHlJbml0LFxuICAgIHJhbmdlczogQnl0ZVJhbmdlW10sXG4gICAgc2l6ZTogbnVtYmVyLFxuICAgIG9wdGlvbnM6IE11bHRpUGFydEJ5dGVSYW5nZVN0cmVhbU9wdGlvbnMgPSB7fSxcbiAgKSB7XG4gICAgY29uc3Qge1xuICAgICAgYXV0b0Nsb3NlID0gdHJ1ZSxcbiAgICAgIGJvdW5kYXJ5ID0gXCJPQUstQ09NTU9OUy1CT1VOREFSWVwiLFxuICAgICAgdHlwZSxcbiAgICB9ID0gb3B0aW9ucztcbiAgICBzdXBlcih7XG4gICAgICBwdWxsOiBhc3luYyAoY29udHJvbGxlcikgPT4ge1xuICAgICAgICBjb25zdCByYW5nZSA9IHRoaXMuI3Jhbmdlcy5zaGlmdCgpO1xuICAgICAgICBpZiAoIXJhbmdlKSB7XG4gICAgICAgICAgY29udHJvbGxlci5lbnF1ZXVlKHRoaXMuI3Bvc3RzY3JpcHQpO1xuICAgICAgICAgIGNvbnRyb2xsZXIuY2xvc2UoKTtcbiAgICAgICAgICBpZiAoYXV0b0Nsb3NlICYmIGlzRGVub0ZzRmlsZSh0aGlzLiNzb3VyY2UpKSB7XG4gICAgICAgICAgICB0aGlzLiNzb3VyY2UuY2xvc2UoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHRoaXMuI3NvdXJjZSBpbnN0YW5jZW9mIFJlYWRhYmxlU3RyZWFtRGVmYXVsdFJlYWRlcikge1xuICAgICAgICAgICAgdGhpcy4jc291cmNlLnJlbGVhc2VMb2NrKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBieXRlcyA9IGF3YWl0IHRoaXMuI3JlYWRSYW5nZShyYW5nZSk7XG4gICAgICAgIGNvbnN0IHByZWFtYmxlID0gZW5jb2Rlci5lbmNvZGUoXG4gICAgICAgICAgYFxcclxcbi0tJHtib3VuZGFyeX1cXHJcXG5Db250ZW50LVR5cGU6ICR7dGhpcy4jdHlwZX1cXHJcXG5Db250ZW50LVJhbmdlOiAke3JhbmdlLnN0YXJ0fS0ke3JhbmdlLmVuZH0vJHtzaXplfVxcclxcblxcclxcbmAsXG4gICAgICAgICk7XG4gICAgICAgIGNvbnRyb2xsZXIuZW5xdWV1ZShjb25jYXQoW3ByZWFtYmxlLCBieXRlc10pKTtcbiAgICAgIH0sXG4gICAgfSk7XG4gICAgdGhpcy4jYm91bmRhcnkgPSBib3VuZGFyeTtcbiAgICB0aGlzLiNyYW5nZXMgPSBbLi4ucmFuZ2VzXTtcbiAgICB0aGlzLiNyYW5nZXMuc29ydCgoeyBzdGFydDogYSB9LCB7IHN0YXJ0OiBiIH0pID0+IGEgLSBiKTtcbiAgICBpZiAoQXJyYXlCdWZmZXIuaXNWaWV3KHNvdXJjZSkpIHtcbiAgICAgIHRoaXMuI3NvdXJjZSA9IHNvdXJjZS5idWZmZXIgYXMgQXJyYXlCdWZmZXI7XG4gICAgfSBlbHNlIGlmICh0eXBlb2Ygc291cmNlID09PSBcInN0cmluZ1wiKSB7XG4gICAgICB0aGlzLiNzb3VyY2UgPSBlbmNvZGVyLmVuY29kZShzb3VyY2UpLmJ1ZmZlciBhcyBBcnJheUJ1ZmZlcjtcbiAgICB9IGVsc2UgaWYgKHNvdXJjZSBpbnN0YW5jZW9mIFJlYWRhYmxlU3RyZWFtKSB7XG4gICAgICB0aGlzLiNzb3VyY2UgPSBzb3VyY2UuZ2V0UmVhZGVyKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuI3NvdXJjZSA9IHNvdXJjZTtcbiAgICB9XG4gICAgdGhpcy4jdHlwZSA9IHR5cGUgfHwgKHNvdXJjZSBpbnN0YW5jZW9mIEJsb2IgJiYgc291cmNlLnR5cGUpIHx8XG4gICAgICBcImFwcGxpY2F0aW9uL29jdGV0LXN0cmVhbVwiO1xuICAgIHRoaXMuI3Bvc3RzY3JpcHQgPSBlbmNvZGVyLmVuY29kZShgXFxyXFxuLS0ke2JvdW5kYXJ5fS0tXFxyXFxuYCk7XG4gICAgdGhpcy4jY29udGVudExlbmd0aCA9IHJhbmdlcy5yZWR1Y2UoXG4gICAgICAocHJldiwgeyBzdGFydCwgZW5kIH0pOiBudW1iZXIgPT5cbiAgICAgICAgcHJldiArXG4gICAgICAgIGVuY29kZXIuZW5jb2RlKFxuICAgICAgICAgIGBcXHJcXG4tLSR7Ym91bmRhcnl9XFxyXFxuQ29udGVudC1UeXBlOiAke3RoaXMuI3R5cGV9XFxyXFxuQ29udGVudC1SYW5nZTogJHtzdGFydH0tJHtlbmR9LyR7c2l6ZX1cXHJcXG5cXHJcXG5gLFxuICAgICAgICApLmJ5dGVMZW5ndGggKyAoZW5kIC0gc3RhcnQpICsgMSxcbiAgICAgIHRoaXMuI3Bvc3RzY3JpcHQuYnl0ZUxlbmd0aCxcbiAgICApO1xuICB9XG59XG5cbi8qKlxuICogQSB7QGxpbmtjb2RlIFRyYW5zZm9ybVN0cmVhbX0gd2hpY2ggd2lsbCBvbmx5IHByb3ZpZGUgdGhlIHJhbmdlIG9mIGJ5dGVzIGZyb21cbiAqIHRoZSBzb3VyY2Ugc3RyZWFtLlxuICovXG5leHBvcnQgY2xhc3MgUmFuZ2VCeXRlVHJhbnNmb3JtU3RyZWFtXG4gIGV4dGVuZHMgVHJhbnNmb3JtU3RyZWFtPFVpbnQ4QXJyYXksIFVpbnQ4QXJyYXk+IHtcbiAgY29uc3RydWN0b3IocmFuZ2U6IEJ5dGVSYW5nZSkge1xuICAgIGNvbnN0IHsgc3RhcnQsIGVuZCB9ID0gcmFuZ2U7XG4gICAgY29uc3QgbGVuZ3RoID0gZW5kIC0gc3RhcnQ7XG4gICAgbGV0IHNlZW4gPSAwO1xuICAgIGxldCByZWFkID0gMDtcbiAgICBzdXBlcih7XG4gICAgICB0cmFuc2Zvcm0oY2h1bmssIGNvbnRyb2xsZXIpIHtcbiAgICAgICAgaWYgKHNlZW4gKyBjaHVuay5ieXRlTGVuZ3RoID49IHN0YXJ0KSB7XG4gICAgICAgICAgaWYgKHNlZW4gPCBzdGFydCkge1xuICAgICAgICAgICAgLy8gc3RhcnQgaXMgcGFydCB3YXkgdGhyb3VnaCBjaHVua1xuICAgICAgICAgICAgY2h1bmsgPSBjaHVuay5zbGljZShzdGFydCAtIHNlZW4pO1xuICAgICAgICAgICAgc2VlbiA9IHN0YXJ0O1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAocmVhZCArIGNodW5rLmJ5dGVMZW5ndGggPiBsZW5ndGggKyAxKSB7XG4gICAgICAgICAgICAvLyBjaHVuayBleHRlbmRzIHBhc3QgZW5kXG4gICAgICAgICAgICBjaHVuayA9IGNodW5rLnNsaWNlKDAsIGxlbmd0aCAtIHJlYWQgKyAxKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVhZCArPSBjaHVuay5ieXRlTGVuZ3RoO1xuICAgICAgICAgIHNlZW4gKz0gY2h1bmsuYnl0ZUxlbmd0aDtcbiAgICAgICAgICBjb250cm9sbGVyLmVucXVldWUoY2h1bmspO1xuICAgICAgICAgIGlmIChyZWFkID49IGxlbmd0aCkge1xuICAgICAgICAgICAgY29udHJvbGxlci50ZXJtaW5hdGUoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gc2tpcCBjaHVua1xuICAgICAgICAgIHNlZW4gKz0gY2h1bmsuYnl0ZUxlbmd0aDtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICB9KTtcbiAgfVxufVxuXG4vKipcbiAqIFNldCB7QGxpbmtjb2RlIEhlYWRlcnN9IHJlbGF0ZWQgdG8gcmV0dXJuaW5nIGEgY29udGVudCByYW5nZSB0byB0aGUgY2xpZW50LlxuICpcbiAqIFRoaXMgd2lsbCBzZXQgdGhlIGBBY2NlcHQtUmFuZ2VzYCwgYENvbnRlbnQtUmFuZ2VgIGFuZCBgQ29udGVudC1MZW5ndGhgIGFzXG4gKiBhcHByb3ByaWF0ZS4gSWYgdGhlIGhlYWRlcnMgZG9lcyBub3QgY29udGFpbiBhIGBDb250ZW50LVR5cGVgIGhlYWRlciwgYW5kIG9uZVxuICogaXMgc3VwcGxpZWQsIGl0IHdpbGwgYmUgYWRkZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb250ZW50UmFuZ2UoXG4gIGhlYWRlcnM6IEhlYWRlcnMsXG4gIHJhbmdlOiBCeXRlUmFuZ2UsXG4gIHNpemU6IG51bWJlcixcbiAgdHlwZT86IHN0cmluZyxcbik6IHZvaWQge1xuICBjb25zdCB7IHN0YXJ0LCBlbmQgfSA9IHJhbmdlO1xuICBoZWFkZXJzLnNldChcImFjY2VwdC1yYW5nZXNcIiwgXCJieXRlc1wiKTtcbiAgaGVhZGVycy5zZXQoXCJjb250ZW50LXJhbmdlXCIsIGBieXRlcyAke3N0YXJ0fS0ke2VuZH0vJHtzaXplfWApO1xuICBoZWFkZXJzLnNldChcImNvbnRlbnQtbGVuZ3RoXCIsIFN0cmluZyhlbmQgLSBzdGFydCArIDEpKTtcbiAgaWYgKHR5cGUgJiYgIWhlYWRlcnMuaGFzKFwiY29udGVudC10eXBlXCIpKSB7XG4gICAgaGVhZGVycy5zZXQoXCJjb250ZW50LXR5cGVcIiwgdHlwZSk7XG4gIH1cbn1cblxuLyoqXG4gKiBTZXQge0BsaW5rY29kZSBIZWFkZXJzfSByZWxhdGVkIHRvIHJldHVybmluZyBhIG11bHRpcGFydCBieXRlIHJhbmdlIHJlc3BvbnNlLlxuICpcbiAqIFRoaXMgd2lsbCBzZXQgdGhlIGBDb250ZW50LVR5cGVgIGFuZCBgQ29udGVudC1MZW5ndGhgIGhlYWRlcnMgYXMgYXBwcm9wcmlhdGUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtdWx0aVBhcnRCeXRlUmFuZ2VzKFxuICBoZWFkZXJzOiBIZWFkZXJzLFxuICBpbml0OiB7IGNvbnRlbnRMZW5ndGg6IG51bWJlcjsgYm91bmRhcnk6IHN0cmluZyB9LFxuKSB7XG4gIGNvbnN0IHsgY29udGVudExlbmd0aCwgYm91bmRhcnkgfSA9IGluaXQ7XG4gIGhlYWRlcnMuc2V0KFwiY29udGVudC10eXBlXCIsIGBtdWx0aXBhcnQvYnl0ZXJhbmdlczsgYm91bmRhcnk9JHtib3VuZGFyeX1gKTtcbiAgaGVhZGVycy5zZXQoXCJjb250ZW50LWxlbmd0aFwiLCBTdHJpbmcoY29udGVudExlbmd0aCkpO1xufVxuXG4vKipcbiAqIENvbnZlcnRzIGEge0BsaW5rY29kZSBEZW5vRmlsZX0gYW5kIGEge0BsaW5rY29kZSBCeXRlUmFuZ2V9IGludG8gYSBieXRlXG4gKiB7QGxpbmtjb2RlIFJlYWRhYmxlU3RyZWFtfSB3aGljaCB3aWxsIHByb3ZpZGUganVzdCB0aGUgcmFuZ2Ugb2YgYnl0ZXMuXG4gKlxuICogV2hlbiB0aGUgc3RyZWFtIGlzIGZpbmlzaGVkIGJlaW5nIHJlYWR5LCB0aGUgZmlsZSB3aWxsIGJlIGNsb3NlZC4gQ2hhbmdpbmdcbiAqIHRoZSBvcHRpb24gdG8gYGF1dG9DbG9zZWAgdG8gYGZhbHNlYCB3aWxsIGRpc2FibGUgdGhpcyBiZWhhdmlvci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFzTGltaXRlZFJlYWRhYmxlU3RyZWFtKFxuICBmc0ZpbGU6IERlbm8uRnNGaWxlLFxuICByYW5nZTogQnl0ZVJhbmdlLFxuICBvcHRpb25zOiBSZXNwb25zZVJhbmdlT3B0aW9ucyA9IHt9LFxuKTogUmVhZGFibGVTdHJlYW08VWludDhBcnJheT4ge1xuICBjb25zdCB7IHN0YXJ0LCBlbmQgfSA9IHJhbmdlO1xuICBjb25zdCB7IGF1dG9DbG9zZSA9IHRydWUsIGNodW5rU2l6ZSA9IERFRkFVTFRfQ0hVTktfU0laRSB9ID0gb3B0aW9ucztcbiAgbGV0IHJlYWQgPSAwO1xuICBjb25zdCBsZW5ndGggPSBlbmQgLSBzdGFydCArIDE7XG4gIHJldHVybiBuZXcgUmVhZGFibGVTdHJlYW0oe1xuICAgIHN0YXJ0KGNvbnRyb2xsZXIpIHtcbiAgICAgIGNvbnN0IHBvcyA9IGZzRmlsZS5zZWVrU3luYyhzdGFydCwgRGVuby5TZWVrTW9kZS5TdGFydCk7XG4gICAgICBpZiAocG9zICE9PSBzdGFydCkge1xuICAgICAgICBjb250cm9sbGVyLmVycm9yKG5ldyBSYW5nZUVycm9yKFwiQ291bGQgbm90IHNlZWsgdG8gcmFuZ2Ugc3RhcnQuXCIpKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIGFzeW5jIHB1bGwoY29udHJvbGxlcikge1xuICAgICAgY29uc3QgY2h1bmsgPSBuZXcgVWludDhBcnJheShNYXRoLm1pbihsZW5ndGggLSByZWFkLCBjaHVua1NpemUpKTtcbiAgICAgIGNvbnN0IGNvdW50ID0gYXdhaXQgZnNGaWxlLnJlYWQoY2h1bmspO1xuICAgICAgaWYgKGNvdW50ID09IG51bGwpIHtcbiAgICAgICAgY29udHJvbGxlci5lcnJvcihuZXcgUmFuZ2VFcnJvcihcIkNvdWxkIG5vdCByZWFkIHRvIHJhbmdlIGVuZC5cIikpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb250cm9sbGVyLmVucXVldWUoY2h1bmspO1xuICAgICAgcmVhZCArPSBjb3VudDtcbiAgICAgIGlmIChyZWFkID49IGxlbmd0aCkge1xuICAgICAgICBjb250cm9sbGVyLmNsb3NlKCk7XG4gICAgICAgIGlmIChhdXRvQ2xvc2UpIHtcbiAgICAgICAgICBmc0ZpbGUuY2xvc2UoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgYXV0b0FsbG9jYXRlQ2h1bmtTaXplOiBjaHVua1NpemUsXG4gICAgdHlwZTogXCJieXRlc1wiLFxuICB9KTtcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYSByZXF1ZXN0ZWQgYnl0ZSByYW5nZSBjYW4gYmUgZnVsZmlsbGVkLiBCb3RoIHRoZSBgUmFuZ2VgIGFuZFxuICogYElmLVJhbmdlYCBoZWFkZXIgd2lsbCBiZSBpbnNwZWN0ZWQgaWYgcHJlc2VudCB0byBkZXRlcm1pbmUgaWYgdGhlIHJlcXVlc3RcbiAqIGNhbiBiZSBmdWxmaWxsZWQuXG4gKlxuICogVGhlIGByZXF1ZXN0YCBpcyB0aGUgY3VycmVudCB7QGxpbmtjb2RlIFJlcXVlc3R9LCB0aGUgYGVudGl0eWAgaXMgdGhlXG4gKiByZXNvdXJjZSBiZWluZyByZXF1ZXN0ZWQuIElmIHtAbGlua2NvZGUgRmlsZUluZm99IGlzIGJlaW5nIHVzZWQgZm9yIHRoZVxuICogZW50aXR5LCBubyBmdXJ0aGVyIGluZm9ybWF0aW9uIG5lZWRzIHRvIGJlIHByb3ZpZGVkLCBidXQgaWYgdGhlIGVudGl0eSBpcyBhXG4gKiBgc3RyaW5nYCBvciB7QGxpbmtjb2RlIFVpbnQ4QXJyYXl9LCB0aGUgYGZpbGVJbmZvYCBhcmd1bWVudCBhbHNvIG5lZWRzIHRvXG4gKiBiZSBwcm92aWRlZC5cbiAqXG4gKiBUaHJlZSBkaWZmZXJlbnQgc2NlbmFyaW9zIGNhbiByZXN1bHQ6XG4gKlxuICogfCBSZXN1bHQgfCBUeXBpY2FsIFJlc3BvbnNlIHxcbiAqIHwgLSB8IC0gfFxuICogfCBPayBhbmQgYnl0ZSByYW5nZXMgc3VwcGxpZWQgfCBUaGUgcmFuZ2UgcmVxdWVzdCBjYW4gYmUgZnVsZmlsbGVkLiBUaGUgcmVzcG9uc2Ugc2hvdWxkIGJlIGEgYDIwNiBQYXJ0aWFsIENvbnRlbnRgIGFuZCBwcm92aWRlIHRoZSByZXF1ZXN0ZWQgYnl0ZXMuIHxcbiAqIHwgT2sgYW5kIHJhbmdlcyBhcmUgYG51bGxgIHwgQSByYW5nZSB3YXMgcmVxdWVzdGVkLCBidXQgdGhlIHJlcXVlc3QgaXMgb3V0IG9mIGRhdGUuIFRoZSByZXNwb25zZSBzaG91bGQgYmUgYSBgMjAwIE9rYCBhbmQgdGhlIGZ1bGwgZW50aXR5IGJlIHByb3ZpZGVkLiB8XG4gKiB8IE5vdCBvayB8IEEgcmFuZ2Ugd2FzIHJlcXVlc3RlZCwgYnV0IGNhbm5vdCBiZSBmdWxmaWxsZWQuIFRoZSByZXNwb25zZSBzaG91bGQgYmUgYSBgNDE2IFJhbmdlIE5vdCBTYXRpc2ZpYWJsZWAgYW5kIG5vIGNvbnRlbnQgc2hvdWxkIGJlIHByb3ZpZGVkLiB8XG4gKlxuICogQGV4YW1wbGVcbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgcmFuZ2UgfSBmcm9tIFwianNyOi9Ab2FrL2NvbW1vbnMvcmFuZ2VcIjtcbiAqXG4gKiBjb25zdCByZXEgPSBuZXcgUmVxdWVzdChcbiAqICAgXCJodHRwczovL2xvY2FsaG9zdDo4MDgwL21vdmllLm1wNFwiLFxuICogICB7IGhlYWRlcnM6IHsgXCJSYW5nZVwiOiBcImJ5dGVzPTAtNDk5XCIgfSB9XG4gKiApO1xuICogY29uc3QgcmVzID0gcmFuZ2UocmVxLCB7IHNpemU6IDUwMDAsIG10aW1lOiBudWxsIH0pO1xuICogaWYgKHJlcy5vayAmJiByZXMucmFuZ2UpIHtcbiAqICAgLy8gcmVzcG9uZCB3aXRoIDIwNiBQYXJ0aWFsIENvbnRlbnRcbiAqIH0gZWxzZSBpZiAocmVzLm9rKSB7XG4gKiAgIC8vIHJlc3BvbnNlIHdpdGggMjAwIE9LXG4gKiB9IGVsc2Uge1xuICogICAvLyByZXNwb25kIHdpdGggNDE2IFJhbmdlIE5vdCBTYXRpc2ZpYWJsZVxuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByYW5nZShcbiAgcmVxdWVzdDogUmVxdWVzdCxcbiAgZW50aXR5OiBGaWxlSW5mbyxcbik6IFByb21pc2U8UmFuZ2VSZXN1bHQ+O1xuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYSByZXF1ZXN0ZWQgYnl0ZSByYW5nZSBjYW4gYmUgZnVsZmlsbGVkLiBCb3RoIHRoZSBgUmFuZ2VgIGFuZFxuICogYElmLVJhbmdlYCBoZWFkZXIgd2lsbCBiZSBpbnNwZWN0ZWQgaWYgcHJlc2VudCB0byBkZXRlcm1pbmUgaWYgdGhlIHJlcXVlc3RcbiAqIGNhbiBiZSBmdWxmaWxsZWQuXG4gKlxuICogVGhlIGByZXF1ZXN0YCBpcyB0aGUgY3VycmVudCB7QGxpbmtjb2RlIFJlcXVlc3R9LCB0aGUgYGVudGl0eWAgaXMgdGhlXG4gKiByZXNvdXJjZSBiZWluZyByZXF1ZXN0ZWQuIElmIHtAbGlua2NvZGUgRmlsZUluZm99IGlzIGJlaW5nIHVzZWQgZm9yIHRoZVxuICogZW50aXR5LCBubyBmdXJ0aGVyIGluZm9ybWF0aW9uIG5lZWRzIHRvIGJlIHByb3ZpZGVkLCBidXQgaWYgdGhlIGVudGl0eSBpcyBhXG4gKiBgc3RyaW5nYCBvciB7QGxpbmtjb2RlIFVpbnQ4QXJyYXl9LCB0aGUgYGZpbGVJbmZvYCBhcmd1bWVudCBhbHNvIG5lZWRzIHRvXG4gKiBiZSBwcm92aWRlZC5cbiAqXG4gKiBUaHJlZSBkaWZmZXJlbnQgc2NlbmFyaW9zIGNhbiByZXN1bHQ6XG4gKlxuICogfCBSZXN1bHQgfCBUeXBpY2FsIFJlc3BvbnNlIHxcbiAqIHwgLSB8IC0gfFxuICogfCBPayBhbmQgYnl0ZSByYW5nZXMgc3VwcGxpZWQgfCBUaGUgcmFuZ2UgcmVxdWVzdCBjYW4gYmUgZnVsZmlsbGVkLiBUaGUgcmVzcG9uc2Ugc2hvdWxkIGJlIGEgYDIwNiBQYXJ0aWFsIENvbnRlbnRgIGFuZCBwcm92aWRlIHRoZSByZXF1ZXN0ZWQgYnl0ZXMuIHxcbiAqIHwgT2sgYW5kIHJhbmdlcyBhcmUgYG51bGxgIHwgQSByYW5nZSB3YXMgcmVxdWVzdGVkLCBidXQgdGhlIHJlcXVlc3QgaXMgb3V0IG9mIGRhdGUuIFRoZSByZXNwb25zZSBzaG91bGQgYmUgYSBgMjAwIE9rYCBhbmQgdGhlIGZ1bGwgZW50aXR5IGJlIHByb3ZpZGVkLiB8XG4gKiB8IE5vdCBvayB8IEEgcmFuZ2Ugd2FzIHJlcXVlc3RlZCwgYnV0IGNhbm5vdCBiZSBmdWxmaWxsZWQuIFRoZSByZXNwb25zZSBzaG91bGQgYmUgYSBgNDE2IFJhbmdlIE5vdCBTYXRpc2ZpYWJsZWAgYW5kIG5vIGNvbnRlbnQgc2hvdWxkIGJlIHByb3ZpZGVkLiB8XG4gKlxuICogQGV4YW1wbGVcbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgcmFuZ2UgfSBmcm9tIFwianNyOi9Ab2FrL2NvbW1vbnMvcmFuZ2VcIjtcbiAqXG4gKiBjb25zdCByZXEgPSBuZXcgUmVxdWVzdChcbiAqICAgXCJodHRwczovL2xvY2FsaG9zdDo4MDgwL21vdmllLm1wNFwiLFxuICogICB7IGhlYWRlcnM6IHsgXCJSYW5nZVwiOiBcImJ5dGVzPTAtNDk5XCIgfSB9XG4gKiApO1xuICogY29uc3QgcmVzID0gcmFuZ2UocmVxLCB7IHNpemU6IDUwMDAsIG10aW1lOiBudWxsIH0pO1xuICogaWYgKHJlcy5vayAmJiByZXMucmFuZ2UpIHtcbiAqICAgLy8gcmVzcG9uZCB3aXRoIDIwNiBQYXJ0aWFsIENvbnRlbnRcbiAqIH0gZWxzZSBpZiAocmVzLm9rKSB7XG4gKiAgIC8vIHJlc3BvbnNlIHdpdGggMjAwIE9LXG4gKiB9IGVsc2Uge1xuICogICAvLyByZXNwb25kIHdpdGggNDE2IFJhbmdlIE5vdCBTYXRpc2ZpYWJsZVxuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByYW5nZShcbiAgcmVxdWVzdDogUmVxdWVzdCxcbiAgZW50aXR5OiBzdHJpbmcgfCBVaW50OEFycmF5LFxuICBmaWxlSW5mbzogRmlsZUluZm8sXG4pOiBQcm9taXNlPFJhbmdlUmVzdWx0PjtcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByYW5nZShcbiAgcmVxdWVzdDogUmVxdWVzdCxcbiAgZW50aXR5OiBFbnRpdHksXG4gIGZpbGVJbmZvPzogRmlsZUluZm8sXG4pOiBQcm9taXNlPFJhbmdlUmVzdWx0PiB7XG4gIGNvbnN0IGlmUmFuZ2UgPSByZXF1ZXN0LmhlYWRlcnMuZ2V0KFwiaWYtcmFuZ2VcIik7XG4gIGlmIChpZlJhbmdlKSB7XG4gICAgY29uc3QgbWF0Y2hlcyA9IEVUQUdfUkUuZXhlYyhpZlJhbmdlKTtcbiAgICBpZiAobWF0Y2hlcykge1xuICAgICAgY29uc3QgW21hdGNoXSA9IG1hdGNoZXM7XG4gICAgICAvLyB0aGlzIGluZGljYXRlcyB0aGF0IGl0IHdvdWxkIGJlIGEgd2VhayB0YWcsIGFuZCB3ZSBjYW5ub3QgY29tcGFyZSBvblxuICAgICAgLy8gd2VhayB0YWdzLCB0aGUgZnVsbCBlbnRpdHkgc2hvdWxkIGJlIHJldHVybmVkXG4gICAgICBpZiAoIWZpbGVJbmZvIHx8IG1hdGNoLnN0YXJ0c1dpdGgoXCJXXCIpKSB7XG4gICAgICAgIHJldHVybiB7IG9rOiB0cnVlLCByYW5nZXM6IG51bGwgfTtcbiAgICAgIH1cbiAgICAgIC8vIEB0cy1pZ25vcmUgdGhlIHR5cGVzIGZvciBlVGFnIGFyZSBub3QgY29ycmVjdFxuICAgICAgaWYgKG1hdGNoICE9PSBhd2FpdCBlVGFnKGVudGl0eSkpIHtcbiAgICAgICAgcmV0dXJuIHsgb2s6IHRydWUsIHJhbmdlczogbnVsbCB9O1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBhc3NlcnQoZmlsZUluZm8gfHwgaXNGaWxlSW5mbyhlbnRpdHkpKTtcbiAgICAgIGNvbnN0IHsgbXRpbWUgfSA9IGZpbGVJbmZvID8/IChlbnRpdHkgYXMgRmlsZUluZm8pO1xuICAgICAgaWYgKCFtdGltZSB8fCBpc01vZGlmaWVkKGlmUmFuZ2UsIG10aW1lKSkge1xuICAgICAgICByZXR1cm4geyBvazogdHJ1ZSwgcmFuZ2VzOiBudWxsIH07XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGNvbnN0IHZhbHVlID0gcmVxdWVzdC5oZWFkZXJzLmdldChcInJhbmdlXCIpO1xuICBpZiAoIXZhbHVlKSB7XG4gICAgcmV0dXJuIHsgb2s6IHRydWUsIHJhbmdlczogbnVsbCB9O1xuICB9XG4gIGNvbnN0IFt1bml0LCByYW5nZXNTdHJdID0gdmFsdWUuc3BsaXQoXCI9XCIpO1xuICBpZiAodW5pdCAhPT0gXCJieXRlc1wiKSB7XG4gICAgcmV0dXJuIHsgb2s6IGZhbHNlLCByYW5nZXM6IG51bGwgfTtcbiAgfVxuICBjb25zdCByYW5nZXM6IEJ5dGVSYW5nZVtdID0gW107XG4gIGZvciAoY29uc3QgcmFuZ2Ugb2YgcmFuZ2VzU3RyLnNwbGl0KC9cXHMqLFxccysvKSkge1xuICAgIGNvbnN0IGl0ZW0gPSByYW5nZS5zcGxpdChcIi1cIik7XG4gICAgaWYgKGl0ZW0ubGVuZ3RoICE9PSAyKSB7XG4gICAgICByZXR1cm4geyBvazogZmFsc2UsIHJhbmdlczogbnVsbCB9O1xuICAgIH1cbiAgICBjb25zdCB7IHNpemUgfSA9IGZpbGVJbmZvID8/IChlbnRpdHkgYXMgRmlsZUluZm8pO1xuICAgIGNvbnN0IFtzdGFydFN0ciwgZW5kU3RyXSA9IGl0ZW07XG4gICAgbGV0IHN0YXJ0OiBudW1iZXI7XG4gICAgbGV0IGVuZDogbnVtYmVyO1xuICAgIHRyeSB7XG4gICAgICBpZiAoc3RhcnRTdHIgPT09IFwiXCIpIHtcbiAgICAgICAgc3RhcnQgPSBzaXplIC0gcGFyc2VJbnQoZW5kU3RyLCAxMCkgLSAxO1xuICAgICAgICBlbmQgPSBzaXplIC0gMTtcbiAgICAgIH0gZWxzZSBpZiAoZW5kU3RyID09PSBcIlwiKSB7XG4gICAgICAgIHN0YXJ0ID0gcGFyc2VJbnQoc3RhcnRTdHIsIDEwKTtcbiAgICAgICAgZW5kID0gc2l6ZSAtIDE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdGFydCA9IHBhcnNlSW50KHN0YXJ0U3RyLCAxMCk7XG4gICAgICAgIGVuZCA9IHBhcnNlSW50KGVuZFN0ciwgMTApO1xuICAgICAgfVxuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIHsgb2s6IGZhbHNlLCByYW5nZXM6IG51bGwgfTtcbiAgICB9XG4gICAgaWYgKHN0YXJ0IDwgMCB8fCBzdGFydCA+PSBzaXplIHx8IGVuZCA8IDAgfHwgZW5kID49IHNpemUgfHwgc3RhcnQgPiBlbmQpIHtcbiAgICAgIHJldHVybiB7IG9rOiBmYWxzZSwgcmFuZ2VzOiBudWxsIH07XG4gICAgfVxuICAgIHJhbmdlcy5wdXNoKHsgc3RhcnQsIGVuZCB9KTtcbiAgfVxuICByZXR1cm4geyBvazogdHJ1ZSwgcmFuZ2VzIH07XG59XG5cbi8qKlxuICogUmVzb2x2ZXMgd2l0aCBhIHtAbGlua2NvZGUgUmVzcG9uc2V9IHdpdGggYSBib2R5IHdoaWNoIGlzIGp1c3QgdGhlIHJhbmdlIG9mXG4gKiBieXRlcyBzdXBwbGllZCwgYWxvbmcgd2l0aCB0aGUgYXBwcm9wcmlhdGUgaGVhZGVycyB3aGljaCBpbmRpY2F0ZSB0aGF0IGl0IGlzXG4gKiB0aGUgZnVsZmlsbG1lbnQgb2YgYSByYW5nZSByZXF1ZXN0LlxuICpcbiAqIFRoZSBgYm9keWAgaXMgYSB7QGxpbmtjb2RlIFJlc3BvbnNlfSB7QGxpbmtjb2RlIEJvZHlJbml0fSB3aXRoIHRoZSBhZGRpdGlvblxuICogb2Ygc3VwcG9ydGluZyB7QGxpbmtjb2RlIERlbm8uRnNGaWxlfSBhbmQgZG9lcyBub3QgYWNjZXB0XG4gKiB7QGxpbmtjb2RlIEZvcm1EYXRhfSBvciB7QGxpbmtjb2RlIFVSTFNlYXJjaFBhcmFtc30uIFdoZW4gdXNpbmdcbiAqIHtAbGlua2NvZGUgRGVuby5Gc0ZpbGV9IHRoZSBzZWVrIGNhcGFiaWxpdGllcyBpbiBvcmRlciB0byByZWFkIHJhbmdlcyBtb3JlXG4gKiBlZmZpY2llbnRseS5cbiAqXG4gKiBUaGUgYHNpemVgIGlzIHRoZSB0b3RhbCBudW1iZXIgb2YgYnl0ZXMgaW4gdGhlIHJlc291cmNlIGJlaW5nIHJlc3BvbmRlZCB0by5cbiAqIFRoaXMgbmVlZHMgdG8gYmUgcHJvdmlkZWQsIGJlY2F1c2UgdGhlIGZ1bGwgc2l6ZSBvZiB0aGUgcmVzb3VyY2UgYmVpbmdcbiAqIHJlcXVlc3RlZCBpdCBtYXkgbm90IGJlIGVhc3kgdG8gZGV0ZXJtaW5lIGF0IHRoZSB0aW1lIGJlaW5nIHJlcXVlc3RlZC5cbiAqXG4gKiBAZXhhbXBsZVxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyByZXNwb25zZVJhbmdlIH0gZnJvbSBcImpzcjpAb2FrL2NvbW1vbnMvcmFuZ2VcIjtcbiAqXG4gKiBjb25zdCBmaWxlID0gYXdhaXQgRGVuby5vcGVuKFwiLi9tb3ZpZS5tcDRcIik7XG4gKiBjb25zdCB7IHNpemUgfSA9IGF3YWl0IGZpbGUuc3RhdCgpO1xuICogY29uc3QgcmVzID0gcmVzcG9uc2VSYW5nZShcbiAqICAgZmlsZSxcbiAqICAgc2l6ZSxcbiAqICAgeyBzdGFydDogMCwgZW5kOiAxXzA0OF81NzUgfSxcbiAqICAgeyBoZWFkZXJzOiB7IFwiY29udGVudC10eXBlXCI6IFwidmlkZW8vbXA0XCIgfSB9LFxuICogKTtcbiAqIGNvbnN0IGFiID0gYXdhaXQgcmVzLmFycmF5QnVmZmVyKCk7XG4gKiAvLyBhYiB3aWxsIGJlIHRoZSBmaXJzdCAxTUIgb2YgdGhlIHZpZGVvIGZpbGVcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVzcG9uc2VSYW5nZShcbiAgYm9keTogUmFuZ2VCb2R5SW5pdCxcbiAgc2l6ZTogbnVtYmVyLFxuICByYW5nZXM6IEJ5dGVSYW5nZVtdLFxuICBpbml0OiBSZXNwb25zZUluaXQgPSB7fSxcbiAgb3B0aW9uczogUmVzcG9uc2VSYW5nZU9wdGlvbnMgPSB7fSxcbik6IFJlc3BvbnNlIHtcbiAgaWYgKCFyYW5nZXMubGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoXCJBdCBsZWFzdCBvbmUgcmFuZ2UgZXhwZWN0ZWQuXCIpO1xuICB9XG4gIGlmIChyYW5nZXMubGVuZ3RoID09PSAxKSB7XG4gICAgY29uc3QgW3JhbmdlXSA9IHJhbmdlcztcbiAgICBsZXQgdHlwZSA9IG9wdGlvbnMudHlwZSA/PyBcImFwcGxpY2F0aW9uL29jdGV0LXN0cmVhbVwiO1xuICAgIGlmIChpc0Rlbm9Gc0ZpbGUoYm9keSkpIHtcbiAgICAgIGJvZHkgPSBhc0xpbWl0ZWRSZWFkYWJsZVN0cmVhbShib2R5LCByYW5nZSwgb3B0aW9ucyk7XG4gICAgfSBlbHNlIGlmIChib2R5IGluc3RhbmNlb2YgUmVhZGFibGVTdHJlYW0pIHtcbiAgICAgIGJvZHkgPSBib2R5LnBpcGVUaHJvdWdoKG5ldyBSYW5nZUJ5dGVUcmFuc2Zvcm1TdHJlYW0ocmFuZ2UpKTtcbiAgICB9IGVsc2UgaWYgKGJvZHkgaW5zdGFuY2VvZiBCbG9iKSB7XG4gICAgICB0eXBlID0gYm9keS50eXBlO1xuICAgICAgYm9keSA9IGJvZHkuc2xpY2UocmFuZ2Uuc3RhcnQsIHJhbmdlLmVuZCArIDEpO1xuICAgIH0gZWxzZSBpZiAoQXJyYXlCdWZmZXIuaXNWaWV3KGJvZHkpKSB7XG4gICAgICBib2R5ID0gYm9keS5idWZmZXIuc2xpY2UocmFuZ2Uuc3RhcnQsIHJhbmdlLmVuZCArIDEpIGFzIEFycmF5QnVmZmVyO1xuICAgIH0gZWxzZSBpZiAoYm9keSBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB7XG4gICAgICBib2R5ID0gYm9keS5zbGljZShyYW5nZS5zdGFydCwgcmFuZ2UuZW5kICsgMSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgYm9keSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgYm9keSA9IGVuY29kZXIuZW5jb2RlKGJvZHkpLnNsaWNlKHJhbmdlLnN0YXJ0LCByYW5nZS5lbmQgKyAxKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgVHlwZUVycm9yKFwiSW52YWxpZCBib2R5IHR5cGUuXCIpO1xuICAgIH1cbiAgICBjb25zdCByZXMgPSBuZXcgUmVzcG9uc2UoYm9keSwge1xuICAgICAgLi4uaW5pdCxcbiAgICAgIHN0YXR1czogMjA2LFxuICAgICAgc3RhdHVzVGV4dDogXCJQYXJ0aWFsIENvbnRlbnRcIixcbiAgICB9KTtcbiAgICBjb250ZW50UmFuZ2UocmVzLmhlYWRlcnMsIHJhbmdlLCBzaXplLCB0eXBlKTtcbiAgICByZXR1cm4gcmVzO1xuICB9XG4gIGNvbnN0IHN0cmVhbSA9IG5ldyBNdWx0aVBhcnRCeXRlUmFuZ2VzU3RyZWFtKGJvZHksIHJhbmdlcywgc2l6ZSwgb3B0aW9ucyk7XG4gIGNvbnN0IHJlcyA9IG5ldyBSZXNwb25zZShzdHJlYW0sIHtcbiAgICAuLi5pbml0LFxuICAgIHN0YXR1czogMjA2LFxuICAgIHN0YXR1c1RleHQ6IFwiUGFydGlhbCBDb250ZW50XCIsXG4gIH0pO1xuICBtdWx0aVBhcnRCeXRlUmFuZ2VzKHJlcy5oZWFkZXJzLCBzdHJlYW0pO1xuICByZXR1cm4gcmVzO1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0NBNEVDLEdBRUQsU0FBUyxNQUFNLFFBQVEsK0JBQStCO0FBQ3RELFNBQVMsTUFBTSxRQUFRLDhCQUE4QjtBQUNyRCxTQUFTLElBQUksUUFBdUIsMkJBQTJCO0FBNEYvRCxNQUFNLHFCQUFxQjtBQUMzQixNQUFNLFVBQVU7QUFDaEIsTUFBTSxVQUFVLElBQUk7QUFFcEIsU0FBUyxhQUFhLEtBQWM7RUFDbEMsSUFBSSxDQUFDLFNBQVMsVUFBVSxRQUFRLENBQUMsQ0FBQyxVQUFVLFVBQVUsS0FBSyxDQUFDLEtBQUssTUFBTSxFQUFFO0lBQ3ZFLE9BQU87RUFDVDtFQUNBLE9BQU8saUJBQWlCLEtBQUssTUFBTTtBQUNyQztBQUVBLFNBQVMsV0FB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
// denoCacheMetadata=18003128160163518666,9355376439885183859