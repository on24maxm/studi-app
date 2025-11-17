// Copyright 2018-2025 the oak authors. All rights reserved. MIT license.
/**
 * Provides the {@linkcode KeyStack} class which implements a key ring interface
 * for managing rotatable keys.
 *
 * @module
 */ var _computedKey, _computedKey1;
import { timingSafeEqual } from "jsr:/@std/crypto@^1.0/timing-safe-equal";
import { encodeBase64Url } from "jsr:/@std/encoding@^1.0/base64url";
const encoder = new TextEncoder();
function importKey(key) {
  if (typeof key === "string") {
    key = encoder.encode(key);
  } else if (Array.isArray(key)) {
    key = new Uint8Array(key);
  }
  return crypto.subtle.importKey("raw", key, {
    name: "HMAC",
    hash: {
      name: "SHA-256"
    }
  }, true, [
    "sign",
    "verify"
  ]);
}
function sign(data, key) {
  if (typeof data === "string") {
    data = encoder.encode(data);
  } else if (Array.isArray(data)) {
    data = Uint8Array.from(data);
  }
  return crypto.subtle.sign("HMAC", key, data);
}
/**
 * Compare two strings, Uint8Arrays, ArrayBuffers, or arrays of numbers in a
 * way that avoids timing based attacks on the comparisons on the values.
 *
 * The function will return `true` if the values match, or `false`, if they
 * do not match.
 *
 * This was inspired by https://github.com/suryagh/tsscmp which provides a
 * timing safe string comparison to avoid timing attacks as described in
 * https://codahale.com/a-lesson-in-timing-attacks/.
 */ async function compare(a, b) {
  const key = new Uint8Array(32);
  globalThis.crypto.getRandomValues(key);
  const cryptoKey = await importKey(key);
  const [ah, bh] = await Promise.all([
    sign(a, cryptoKey),
    sign(b, cryptoKey)
  ]);
  return timingSafeEqual(ah, bh);
}
_computedKey = Symbol.for("Deno.customInspect"), _computedKey1 = Symbol.for("nodejs.util.inspect.custom");
/**
 * A cryptographic key chain which allows signing of data to prevent tampering,
 * but also allows for easy key rotation without needing to re-sign the data.
 *
 * Data is signed as SHA256 HMAC.
 *
 * This was inspired by {@link https://github.com/crypto-utils/keygrip/ | keygrip}.
 *
 * @example
 * ```ts
 * import { KeyStack } from "@oak/commons/keystack";
 *
 * const keyStack = new KeyStack(["hello", "world"]);
 * const digest = await keyStack.sign("some data");
 *
 * const rotatedStack = new KeyStack(["deno", "says", "hello", "world"]);
 * await rotatedStack.verify("some data", digest); // true
 * ```
 */ export class KeyStack {
  #cryptoKeys = new Map();
  #keys;
  async #toCryptoKey(key) {
    if (!this.#cryptoKeys.has(key)) {
      this.#cryptoKeys.set(key, await importKey(key));
    }
    return this.#cryptoKeys.get(key);
  }
  /** Number of keys */ get length() {
    return this.#keys.length;
  }
  /**
   * A class which accepts an array of keys that are used to sign and verify
   * data and allows easy key rotation without invalidation of previously signed
   * data.
   *
   * @param keys An iterable of keys, of which the index 0 will be used to sign
   *             data, but verification can happen against any key.
   */ constructor(keys){
    const values = Array.isArray(keys) ? keys : [
      ...keys
    ];
    if (!values.length) {
      throw new TypeError("keys must contain at least one value");
    }
    this.#keys = values;
  }
  /**
   * Take `data` and return a SHA256 HMAC digest that uses the current 0 index
   * of the `keys` passed to the constructor.  This digest is in the form of a
   * URL safe base64 encoded string.
   */ async sign(data) {
    const key = await this.#toCryptoKey(this.#keys[0]);
    return encodeBase64Url(await sign(data, key));
  }
  /**
   * Given `data` and a `digest`, verify that one of the `keys` provided the
   * constructor was used to generate the `digest`.  Returns `true` if one of
   * the keys was used, otherwise `false`.
   */ async verify(data, digest) {
    return await this.indexOf(data, digest) > -1;
  }
  /**
   * Given `data` and a `digest`, return the current index of the key in the
   * `keys` passed the constructor that was used to generate the digest.  If no
   * key can be found, the method returns `-1`.
   */ async indexOf(data, digest) {
    for(let i = 0; i < this.#keys.length; i++){
      const key = this.#keys[i];
      const cryptoKey = await this.#toCryptoKey(key);
      if (await compare(digest, encodeBase64Url(await sign(data, cryptoKey)))) {
        return i;
      }
    }
    return -1;
  }
  /** Custom output for {@linkcode Deno.inspect}. */ [_computedKey](inspect) {
    const { length } = this;
    return `${this.constructor.name} ${inspect({
      length
    })}`;
  }
  /**
   * Custom output for Node's
   * {@linkcode https://nodejs.org/api/util.html#utilinspectobject-options|util.inspect}.
   */ [_computedKey1](depth, // deno-lint-ignore no-explicit-any
  options, inspect) {
    if (depth < 0) {
      return options.stylize(`[${this.constructor.name}]`, "special");
    }
    const newOptions = Object.assign({}, options, {
      depth: options.depth === null ? null : options.depth - 1
    });
    const { length } = this;
    return `${options.stylize(this.constructor.name, "special")} ${inspect({
      length
    }, newOptions)}`;
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BvYWsvY29tbW9ucy8xLjAuMS9rZXlzdGFjay50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDI1IHRoZSBvYWsgYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIGxpY2Vuc2UuXG5cbi8qKlxuICogUHJvdmlkZXMgdGhlIHtAbGlua2NvZGUgS2V5U3RhY2t9IGNsYXNzIHdoaWNoIGltcGxlbWVudHMgYSBrZXkgcmluZyBpbnRlcmZhY2VcbiAqIGZvciBtYW5hZ2luZyByb3RhdGFibGUga2V5cy5cbiAqXG4gKiBAbW9kdWxlXG4gKi9cblxuaW1wb3J0IHsgdGltaW5nU2FmZUVxdWFsIH0gZnJvbSBcImpzcjovQHN0ZC9jcnlwdG9AXjEuMC90aW1pbmctc2FmZS1lcXVhbFwiO1xuaW1wb3J0IHsgZW5jb2RlQmFzZTY0VXJsIH0gZnJvbSBcImpzcjovQHN0ZC9lbmNvZGluZ0BeMS4wL2Jhc2U2NHVybFwiO1xuXG4vKiogVHlwZXMgb2YgZGF0YSB0aGF0IGNhbiBiZSBzaWduZWQgY3J5cHRvZ3JhcGhpY2FsbHkuICovXG5leHBvcnQgdHlwZSBEYXRhID0gc3RyaW5nIHwgbnVtYmVyW10gfCBBcnJheUJ1ZmZlciB8IFVpbnQ4QXJyYXk7XG5cbi8qKiBUeXBlcyBvZiBrZXlzIHRoYXQgY2FuIGJlIHVzZWQgdG8gc2lnbiBkYXRhLiAqL1xuZXhwb3J0IHR5cGUgS2V5ID0gc3RyaW5nIHwgbnVtYmVyW10gfCBBcnJheUJ1ZmZlciB8IFVpbnQ4QXJyYXk7XG5cbmNvbnN0IGVuY29kZXIgPSBuZXcgVGV4dEVuY29kZXIoKTtcblxuZnVuY3Rpb24gaW1wb3J0S2V5KGtleTogS2V5KTogUHJvbWlzZTxDcnlwdG9LZXk+IHtcbiAgaWYgKHR5cGVvZiBrZXkgPT09IFwic3RyaW5nXCIpIHtcbiAgICBrZXkgPSBlbmNvZGVyLmVuY29kZShrZXkpO1xuICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoa2V5KSkge1xuICAgIGtleSA9IG5ldyBVaW50OEFycmF5KGtleSk7XG4gIH1cbiAgcmV0dXJuIGNyeXB0by5zdWJ0bGUuaW1wb3J0S2V5KFxuICAgIFwicmF3XCIsXG4gICAga2V5LFxuICAgIHtcbiAgICAgIG5hbWU6IFwiSE1BQ1wiLFxuICAgICAgaGFzaDogeyBuYW1lOiBcIlNIQS0yNTZcIiB9LFxuICAgIH0sXG4gICAgdHJ1ZSxcbiAgICBbXCJzaWduXCIsIFwidmVyaWZ5XCJdLFxuICApO1xufVxuXG5mdW5jdGlvbiBzaWduKGRhdGE6IERhdGEsIGtleTogQ3J5cHRvS2V5KTogUHJvbWlzZTxBcnJheUJ1ZmZlcj4ge1xuICBpZiAodHlwZW9mIGRhdGEgPT09IFwic3RyaW5nXCIpIHtcbiAgICBkYXRhID0gZW5jb2Rlci5lbmNvZGUoZGF0YSk7XG4gIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShkYXRhKSkge1xuICAgIGRhdGEgPSBVaW50OEFycmF5LmZyb20oZGF0YSk7XG4gIH1cbiAgcmV0dXJuIGNyeXB0by5zdWJ0bGUuc2lnbihcIkhNQUNcIiwga2V5LCBkYXRhKTtcbn1cblxuLyoqXG4gKiBDb21wYXJlIHR3byBzdHJpbmdzLCBVaW50OEFycmF5cywgQXJyYXlCdWZmZXJzLCBvciBhcnJheXMgb2YgbnVtYmVycyBpbiBhXG4gKiB3YXkgdGhhdCBhdm9pZHMgdGltaW5nIGJhc2VkIGF0dGFja3Mgb24gdGhlIGNvbXBhcmlzb25zIG9uIHRoZSB2YWx1ZXMuXG4gKlxuICogVGhlIGZ1bmN0aW9uIHdpbGwgcmV0dXJuIGB0cnVlYCBpZiB0aGUgdmFsdWVzIG1hdGNoLCBvciBgZmFsc2VgLCBpZiB0aGV5XG4gKiBkbyBub3QgbWF0Y2guXG4gKlxuICogVGhpcyB3YXMgaW5zcGlyZWQgYnkgaHR0cHM6Ly9naXRodWIuY29tL3N1cnlhZ2gvdHNzY21wIHdoaWNoIHByb3ZpZGVzIGFcbiAqIHRpbWluZyBzYWZlIHN0cmluZyBjb21wYXJpc29uIHRvIGF2b2lkIHRpbWluZyBhdHRhY2tzIGFzIGRlc2NyaWJlZCBpblxuICogaHR0cHM6Ly9jb2RhaGFsZS5jb20vYS1sZXNzb24taW4tdGltaW5nLWF0dGFja3MvLlxuICovXG5hc3luYyBmdW5jdGlvbiBjb21wYXJlKGE6IERhdGEsIGI6IERhdGEpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgY29uc3Qga2V5ID0gbmV3IFVpbnQ4QXJyYXkoMzIpO1xuICBnbG9iYWxUaGlzLmNyeXB0by5nZXRSYW5kb21WYWx1ZXMoa2V5KTtcbiAgY29uc3QgY3J5cHRvS2V5ID0gYXdhaXQgaW1wb3J0S2V5KGtleSk7XG4gIGNvbnN0IFthaCwgYmhdID0gYXdhaXQgUHJvbWlzZS5hbGwoW1xuICAgIHNpZ24oYSwgY3J5cHRvS2V5KSxcbiAgICBzaWduKGIsIGNyeXB0b0tleSksXG4gIF0pO1xuICByZXR1cm4gdGltaW5nU2FmZUVxdWFsKGFoLCBiaCk7XG59XG5cbi8qKlxuICogQSBjcnlwdG9ncmFwaGljIGtleSBjaGFpbiB3aGljaCBhbGxvd3Mgc2lnbmluZyBvZiBkYXRhIHRvIHByZXZlbnQgdGFtcGVyaW5nLFxuICogYnV0IGFsc28gYWxsb3dzIGZvciBlYXN5IGtleSByb3RhdGlvbiB3aXRob3V0IG5lZWRpbmcgdG8gcmUtc2lnbiB0aGUgZGF0YS5cbiAqXG4gKiBEYXRhIGlzIHNpZ25lZCBhcyBTSEEyNTYgSE1BQy5cbiAqXG4gKiBUaGlzIHdhcyBpbnNwaXJlZCBieSB7QGxpbmsgaHR0cHM6Ly9naXRodWIuY29tL2NyeXB0by11dGlscy9rZXlncmlwLyB8IGtleWdyaXB9LlxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0c1xuICogaW1wb3J0IHsgS2V5U3RhY2sgfSBmcm9tIFwiQG9hay9jb21tb25zL2tleXN0YWNrXCI7XG4gKlxuICogY29uc3Qga2V5U3RhY2sgPSBuZXcgS2V5U3RhY2soW1wiaGVsbG9cIiwgXCJ3b3JsZFwiXSk7XG4gKiBjb25zdCBkaWdlc3QgPSBhd2FpdCBrZXlTdGFjay5zaWduKFwic29tZSBkYXRhXCIpO1xuICpcbiAqIGNvbnN0IHJvdGF0ZWRTdGFjayA9IG5ldyBLZXlTdGFjayhbXCJkZW5vXCIsIFwic2F5c1wiLCBcImhlbGxvXCIsIFwid29ybGRcIl0pO1xuICogYXdhaXQgcm90YXRlZFN0YWNrLnZlcmlmeShcInNvbWUgZGF0YVwiLCBkaWdlc3QpOyAvLyB0cnVlXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIEtleVN0YWNrIHtcbiAgI2NyeXB0b0tleXMgPSBuZXcgTWFwPEtleSwgQ3J5cHRvS2V5PigpO1xuICAja2V5czogS2V5W107XG5cbiAgYXN5bmMgI3RvQ3J5cHRvS2V5KGtleTogS2V5KTogUHJvbWlzZTxDcnlwdG9LZXk+IHtcbiAgICBpZiAoIXRoaXMuI2NyeXB0b0tleXMuaGFzKGtleSkpIHtcbiAgICAgIHRoaXMuI2NyeXB0b0tleXMuc2V0KGtleSwgYXdhaXQgaW1wb3J0S2V5KGtleSkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy4jY3J5cHRvS2V5cy5nZXQoa2V5KSE7XG4gIH1cblxuICAvKiogTnVtYmVyIG9mIGtleXMgKi9cbiAgZ2V0IGxlbmd0aCgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLiNrZXlzLmxlbmd0aDtcbiAgfVxuXG4gIC8qKlxuICAgKiBBIGNsYXNzIHdoaWNoIGFjY2VwdHMgYW4gYXJyYXkgb2Yga2V5cyB0aGF0IGFyZSB1c2VkIHRvIHNpZ24gYW5kIHZlcmlmeVxuICAgKiBkYXRhIGFuZCBhbGxvd3MgZWFzeSBrZXkgcm90YXRpb24gd2l0aG91dCBpbnZhbGlkYXRpb24gb2YgcHJldmlvdXNseSBzaWduZWRcbiAgICogZGF0YS5cbiAgICpcbiAgICogQHBhcmFtIGtleXMgQW4gaXRlcmFibGUgb2Yga2V5cywgb2Ygd2hpY2ggdGhlIGluZGV4IDAgd2lsbCBiZSB1c2VkIHRvIHNpZ25cbiAgICogICAgICAgICAgICAgZGF0YSwgYnV0IHZlcmlmaWNhdGlvbiBjYW4gaGFwcGVuIGFnYWluc3QgYW55IGtleS5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGtleXM6IEl0ZXJhYmxlPEtleT4pIHtcbiAgICBjb25zdCB2YWx1ZXMgPSBBcnJheS5pc0FycmF5KGtleXMpID8ga2V5cyA6IFsuLi5rZXlzXTtcbiAgICBpZiAoISh2YWx1ZXMubGVuZ3RoKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImtleXMgbXVzdCBjb250YWluIGF0IGxlYXN0IG9uZSB2YWx1ZVwiKTtcbiAgICB9XG4gICAgdGhpcy4ja2V5cyA9IHZhbHVlcztcbiAgfVxuXG4gIC8qKlxuICAgKiBUYWtlIGBkYXRhYCBhbmQgcmV0dXJuIGEgU0hBMjU2IEhNQUMgZGlnZXN0IHRoYXQgdXNlcyB0aGUgY3VycmVudCAwIGluZGV4XG4gICAqIG9mIHRoZSBga2V5c2AgcGFzc2VkIHRvIHRoZSBjb25zdHJ1Y3Rvci4gIFRoaXMgZGlnZXN0IGlzIGluIHRoZSBmb3JtIG9mIGFcbiAgICogVVJMIHNhZmUgYmFzZTY0IGVuY29kZWQgc3RyaW5nLlxuICAgKi9cbiAgYXN5bmMgc2lnbihkYXRhOiBEYXRhKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICBjb25zdCBrZXkgPSBhd2FpdCB0aGlzLiN0b0NyeXB0b0tleSh0aGlzLiNrZXlzWzBdISk7XG4gICAgcmV0dXJuIGVuY29kZUJhc2U2NFVybChhd2FpdCBzaWduKGRhdGEsIGtleSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdpdmVuIGBkYXRhYCBhbmQgYSBgZGlnZXN0YCwgdmVyaWZ5IHRoYXQgb25lIG9mIHRoZSBga2V5c2AgcHJvdmlkZWQgdGhlXG4gICAqIGNvbnN0cnVjdG9yIHdhcyB1c2VkIHRvIGdlbmVyYXRlIHRoZSBgZGlnZXN0YC4gIFJldHVybnMgYHRydWVgIGlmIG9uZSBvZlxuICAgKiB0aGUga2V5cyB3YXMgdXNlZCwgb3RoZXJ3aXNlIGBmYWxzZWAuXG4gICAqL1xuICBhc3luYyB2ZXJpZnkoZGF0YTogRGF0YSwgZGlnZXN0OiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICByZXR1cm4gKGF3YWl0IHRoaXMuaW5kZXhPZihkYXRhLCBkaWdlc3QpKSA+IC0xO1xuICB9XG5cbiAgLyoqXG4gICAqIEdpdmVuIGBkYXRhYCBhbmQgYSBgZGlnZXN0YCwgcmV0dXJuIHRoZSBjdXJyZW50IGluZGV4IG9mIHRoZSBrZXkgaW4gdGhlXG4gICAqIGBrZXlzYCBwYXNzZWQgdGhlIGNvbnN0cnVjdG9yIHRoYXQgd2FzIHVzZWQgdG8gZ2VuZXJhdGUgdGhlIGRpZ2VzdC4gIElmIG5vXG4gICAqIGtleSBjYW4gYmUgZm91bmQsIHRoZSBtZXRob2QgcmV0dXJucyBgLTFgLlxuICAgKi9cbiAgYXN5bmMgaW5kZXhPZihkYXRhOiBEYXRhLCBkaWdlc3Q6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLiNrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBrZXkgPSB0aGlzLiNrZXlzW2ldIGFzIEtleTtcbiAgICAgIGNvbnN0IGNyeXB0b0tleSA9IGF3YWl0IHRoaXMuI3RvQ3J5cHRvS2V5KGtleSk7XG4gICAgICBpZiAoXG4gICAgICAgIGF3YWl0IGNvbXBhcmUoZGlnZXN0LCBlbmNvZGVCYXNlNjRVcmwoYXdhaXQgc2lnbihkYXRhLCBjcnlwdG9LZXkpKSlcbiAgICAgICkge1xuICAgICAgICByZXR1cm4gaTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIC0xO1xuICB9XG5cbiAgLyoqIEN1c3RvbSBvdXRwdXQgZm9yIHtAbGlua2NvZGUgRGVuby5pbnNwZWN0fS4gKi9cbiAgW1N5bWJvbC5mb3IoXCJEZW5vLmN1c3RvbUluc3BlY3RcIildKFxuICAgIGluc3BlY3Q6ICh2YWx1ZTogdW5rbm93bikgPT4gc3RyaW5nLFxuICApOiBzdHJpbmcge1xuICAgIGNvbnN0IHsgbGVuZ3RoIH0gPSB0aGlzO1xuICAgIHJldHVybiBgJHt0aGlzLmNvbnN0cnVjdG9yLm5hbWV9ICR7aW5zcGVjdCh7IGxlbmd0aCB9KX1gO1xuICB9XG5cbiAgLyoqXG4gICAqIEN1c3RvbSBvdXRwdXQgZm9yIE5vZGUnc1xuICAgKiB7QGxpbmtjb2RlIGh0dHBzOi8vbm9kZWpzLm9yZy9hcGkvdXRpbC5odG1sI3V0aWxpbnNwZWN0b2JqZWN0LW9wdGlvbnN8dXRpbC5pbnNwZWN0fS5cbiAgICovXG4gIFtTeW1ib2wuZm9yKFwibm9kZWpzLnV0aWwuaW5zcGVjdC5jdXN0b21cIildKFxuICAgIGRlcHRoOiBudW1iZXIsXG4gICAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgICBvcHRpb25zOiBhbnksXG4gICAgaW5zcGVjdDogKHZhbHVlOiB1bmtub3duLCBvcHRpb25zPzogdW5rbm93bikgPT4gc3RyaW5nLFxuICApOiBzdHJpbmcge1xuICAgIGlmIChkZXB0aCA8IDApIHtcbiAgICAgIHJldHVybiBvcHRpb25zLnN0eWxpemUoYFske3RoaXMuY29uc3RydWN0b3IubmFtZX1dYCwgXCJzcGVjaWFsXCIpO1xuICAgIH1cblxuICAgIGNvbnN0IG5ld09wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCBvcHRpb25zLCB7XG4gICAgICBkZXB0aDogb3B0aW9ucy5kZXB0aCA9PT0gbnVsbCA/IG51bGwgOiBvcHRpb25zLmRlcHRoIC0gMSxcbiAgICB9KTtcbiAgICBjb25zdCB7IGxlbmd0aCB9ID0gdGhpcztcbiAgICByZXR1cm4gYCR7b3B0aW9ucy5zdHlsaXplKHRoaXMuY29uc3RydWN0b3IubmFtZSwgXCJzcGVjaWFsXCIpfSAke1xuICAgICAgaW5zcGVjdCh7IGxlbmd0aCB9LCBuZXdPcHRpb25zKVxuICAgIH1gO1xuICB9XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEseUVBQXlFO0FBRXpFOzs7OztDQUtDO0FBRUQsU0FBUyxlQUFlLFFBQVEsMENBQTBDO0FBQzFFLFNBQVMsZUFBZSxRQUFRLG9DQUFvQztBQVFwRSxNQUFNLFVBQVUsSUFBSTtBQUVwQixTQUFTLFVBQVUsR0FBUTtFQUN6QixJQUFJLE9BQU8sUUFBUSxVQUFVO0lBQzNCLE1BQU0sUUFBUSxNQUFNLENBQUM7RUFDdkIsT0FB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
// denoCacheMetadata=9432407649791299115,1196125685671932687