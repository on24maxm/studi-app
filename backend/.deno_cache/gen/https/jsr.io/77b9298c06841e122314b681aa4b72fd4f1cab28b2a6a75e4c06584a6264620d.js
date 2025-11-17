// Copyright 2018-2025 the oak authors. All rights reserved. MIT license.
/**
 * Provides a iterable map interfaces for managing cookies server side.
 *
 * @example
 * To access the keys in a request and have any set keys available for creating
 * a response:
 *
 * ```ts
 * import { CookieMap, mergeHeaders } from "jsr:@oak/commons/cookie_map";
 *
 * const request = new Request("https://localhost/", {
 *   headers: { "cookie": "foo=bar; bar=baz;"}
 * });
 *
 * const cookies = new CookieMap(request, { secure: true });
 * console.log(cookies.get("foo")); // logs "bar"
 * cookies.set("session", "1234567", { secure: true });
 *
 * const response = new Response("hello", {
 *   headers: mergeHeaders({
 *     "content-type": "text/plain",
 *   }, cookies),
 * });
 * ```
 *
 * @example
 * To have automatic management of cryptographically signed cookies, you can use
 * the {@linkcode SecureCookieMap} instead of {@linkcode CookieMap}. The biggest
 * difference is that the methods operate async in order to be able to support
 * async signing and validation of cookies:
 *
 * ```ts
 * import {
 *   SecureCookieMap,
 *   mergeHeaders,
 *   type KeyRing,
 * } from "jsr:@oak/commons/cookie_map";
 *
 * const request = new Request("https://localhost/", {
 *   headers: { "cookie": "foo=bar; bar=baz;"}
 * });
 *
 * // The keys must implement the `KeyRing` interface.
 * declare const keys: KeyRing;
 *
 * const cookies = new SecureCookieMap(request, { keys, secure: true });
 * console.log(await cookies.get("foo")); // logs "bar"
 * // the cookie will be automatically signed using the supplied key ring.
 * await cookies.set("session", "1234567");
 *
 * const response = new Response("hello", {
 *   headers: mergeHeaders({
 *     "content-type": "text/plain",
 *   }, cookies),
 * });
 * ```
 *
 * In addition, if you have a {@linkcode Response} or {@linkcode Headers} for a
 * response at construction of the cookies object, they can be passed and any
 * set cookies will be added directly to those headers:
 *
 * ```ts
 * import { CookieMap } from "jsr:@oak/commons/cookie_map";
 *
 * const request = new Request("https://localhost/", {
 *   headers: { "cookie": "foo=bar; bar=baz;"}
 * });
 *
 * const response = new Response("hello", {
 *   headers: { "content-type": "text/plain" },
 * });
 *
 * const cookies = new CookieMap(request, { response });
 * console.log(cookies.get("foo")); // logs "bar"
 * cookies.set("session", "1234567");
 * ```
 *
 * @module
 */ var _computedKey, _computedKey1, _computedKey2, _computedKey3;
// deno-lint-ignore no-control-regex
const FIELD_CONTENT_REGEXP = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;
const KEY_REGEXP = /(?:^|;) *([^=]*)=[^;]*/g;
const SAME_SITE_REGEXP = /^(?:lax|none|strict)$/i;
const matchCache = {};
function getPattern(name) {
  if (name in matchCache) {
    return matchCache[name];
  }
  return matchCache[name] = new RegExp(`(?:^|;) *${name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}=([^;]*)`);
}
function pushCookie(values, cookie) {
  if (cookie.overwrite) {
    for(let i = values.length - 1; i >= 0; i--){
      if (values[i].indexOf(`${cookie.name}=`) === 0) {
        values.splice(i, 1);
      }
    }
  }
  values.push(cookie.toHeaderValue());
}
function validateCookieProperty(key, value) {
  if (value && !FIELD_CONTENT_REGEXP.test(value)) {
    throw new TypeError(`The "${key}" of the cookie (${value}) is invalid.`);
  }
}
/** An internal abstraction to manage cookies. */ class Cookie {
  domain;
  expires;
  httpOnly = true;
  maxAge;
  name;
  overwrite = false;
  path = "/";
  sameSite = false;
  secure = false;
  signed;
  value;
  constructor(name, value, attributes){
    validateCookieProperty("name", name);
    this.name = name;
    validateCookieProperty("value", value);
    this.value = value ?? "";
    Object.assign(this, attributes);
    if (!this.value) {
      this.expires = new Date(0);
      this.maxAge = undefined;
    }
    validateCookieProperty("path", this.path);
    validateCookieProperty("domain", this.domain);
    if (this.sameSite && typeof this.sameSite === "string" && !SAME_SITE_REGEXP.test(this.sameSite)) {
      throw new TypeError(`The "sameSite" of the cookie ("${this.sameSite}") is invalid.`);
    }
  }
  toHeaderValue() {
    let value = this.toString();
    if (this.maxAge) {
      this.expires = new Date(Date.now() + this.maxAge * 1000);
    }
    if (this.path) {
      value += `; path=${this.path}`;
    }
    if (this.expires) {
      value += `; expires=${this.expires.toUTCString()}`;
    }
    if (this.domain) {
      value += `; domain=${this.domain}`;
    }
    if (this.sameSite) {
      value += `; samesite=${this.sameSite === true ? "strict" : this.sameSite.toLowerCase()}`;
    }
    if (this.secure) {
      value += "; secure";
    }
    if (this.httpOnly) {
      value += "; httponly";
    }
    return value;
  }
  toString() {
    return `${this.name}=${this.value}`;
  }
}
/**
 * Symbol which is used in {@link mergeHeaders} to extract a
 * `[string | string][]` from an instance to generate the final set of
 * headers.
 */ export const cookieMapHeadersInitSymbol = Symbol.for("oak.commons.cookieMap.headersInit");
function isMergeable(value) {
  return value !== null && value !== undefined && typeof value === "object" && cookieMapHeadersInitSymbol in value;
}
/**
 * Allows merging of various sources of headers into a final set of headers
 * which can be used in a {@linkcode Response}.
 *
 * Note, that unlike when passing a `Response` or {@linkcode Headers} used in a
 * response to {@linkcode CookieMap} or {@linkcode SecureCookieMap}, merging
 * will not ensure that there are no other `Set-Cookie` headers from other
 * sources, it will simply append the various headers together.
 */ export function mergeHeaders(...sources) {
  const headers = new Headers();
  for (const source of sources){
    let entries;
    if (source instanceof Headers) {
      entries = source;
    } else if ("headers" in source && source.headers instanceof Headers) {
      entries = source.headers;
    } else if (isMergeable(source)) {
      entries = source[cookieMapHeadersInitSymbol]();
    } else if (Array.isArray(source)) {
      entries = source;
    } else {
      entries = Object.entries(source);
    }
    for (const [key, value] of entries){
      headers.append(key, value);
    }
  }
  return headers;
}
const keys = Symbol("#keys");
const requestHeaders = Symbol("#requestHeaders");
const responseHeaders = Symbol("#responseHeaders");
const isSecure = Symbol("#secure");
const requestKeys = Symbol("#requestKeys");
_computedKey = Symbol.for("Deno.customInspect"), _computedKey1 = Symbol.for("nodejs.util.inspect.custom");
/** An internal abstract class which provides common functionality for
 * {@link CookieMap} and {@link SecureCookieMap}.
 */ class CookieMapBase {
  [keys];
  [requestHeaders];
  [responseHeaders];
  [isSecure];
  [requestKeys]() {
    if (this[keys]) {
      return this[keys];
    }
    const result = this[keys] = [];
    const header = this[requestHeaders].get("cookie");
    if (!header) {
      return result;
    }
    let matches;
    while(matches = KEY_REGEXP.exec(header)){
      const [, key] = matches;
      result.push(key);
    }
    return result;
  }
  constructor(request, options){
    this[requestHeaders] = "headers" in request ? request.headers : request;
    const { secure = false, response = new Headers() } = options;
    this[responseHeaders] = "headers" in response ? response.headers : response;
    this[isSecure] = secure;
  }
  /** A method used by {@linkcode mergeHeaders} to be able to merge
   * headers from various sources when forming a {@linkcode Response}. */ [cookieMapHeadersInitSymbol]() {
    const init = [];
    for (const [key, value] of this[responseHeaders]){
      if (key === "set-cookie") {
        init.push([
          key,
          value
        ]);
      }
    }
    return init;
  }
  [_computedKey]() {
    return `${this.constructor.name} []`;
  }
  [_computedKey1](depth, // deno-lint-ignore no-explicit-any
  options, inspect) {
    if (depth < 0) {
      return options.stylize(`[${this.constructor.name}]`, "special");
    }
    const newOptions = Object.assign({}, options, {
      depth: options.depth === null ? null : options.depth - 1
    });
    return `${options.stylize(this.constructor.name, "special")} ${inspect([], newOptions)}`;
  }
}
_computedKey2 = Symbol.iterator;
/**
 * Provides a way to manage cookies in a request and response on the server
 * as a single iterable collection.
 *
 * The methods and properties align to {@linkcode Map}. When constructing a
 * {@linkcode Request} or {@linkcode Headers} from the request need to be
 * provided, as well as optionally the {@linkcode Response} or `Headers` for the
 * response can be provided. Alternatively the {@linkcode mergeHeaders}
 * function can be used to generate a final set of headers for sending in the
 * response.
 */ export class CookieMap extends CookieMapBase {
  /** Contains the number of valid cookies in the request headers. */ get size() {
    return [
      ...this
    ].length;
  }
  constructor(request, options = {}){
    super(request, options);
  }
  /** Deletes all the cookies from the {@linkcode Request} in the response. */ clear(options = {}) {
    for (const key of this.keys()){
      this.set(key, null, options);
    }
  }
  /** Set a cookie to be deleted in the response.
   *
   * This is a convenience function for `set(key, null, options?)`.
   */ delete(key, options = {}) {
    this.set(key, null, options);
    return true;
  }
  /** Return the value of a matching key present in the {@linkcode Request}. If
   * the key is not present `undefined` is returned. */ get(key) {
    const headerValue = this[requestHeaders].get("cookie");
    if (!headerValue) {
      return undefined;
    }
    const match = headerValue.match(getPattern(key));
    if (!match) {
      return undefined;
    }
    const [, value] = match;
    return value;
  }
  /** Returns `true` if the matching key is present in the {@linkcode Request},
   * otherwise `false`. */ has(key) {
    const headerValue = this[requestHeaders].get("cookie");
    if (!headerValue) {
      return false;
    }
    return getPattern(key).test(headerValue);
  }
  /** Set a named cookie in the response. The optional
   * {@linkcode CookieMapSetDeleteOptions} are applied to the cookie being set.
   */ set(key, value, options = {}) {
    const resHeaders = this[responseHeaders];
    const values = [];
    for (const [key, value] of resHeaders){
      if (key === "set-cookie") {
        values.push(value);
      }
    }
    const secure = this[isSecure];
    if (!secure && options.secure && !options.ignoreInsecure) {
      throw new TypeError("Cannot send secure cookie over unencrypted connection.");
    }
    const cookie = new Cookie(key, value, options);
    cookie.secure = options.secure ?? secure;
    pushCookie(values, cookie);
    resHeaders.delete("set-cookie");
    for (const value of values){
      resHeaders.append("set-cookie", value);
    }
    return this;
  }
  /** Iterate over the cookie keys and values that are present in the
   * {@linkcode Request}. This is an alias of the `[Symbol.iterator]` method
   * present on the class. */ entries() {
    return this[Symbol.iterator]();
  }
  /** Iterate over the cookie keys that are present in the
   * {@linkcode Request}. */ *keys() {
    for (const [key] of this){
      yield key;
    }
  }
  /** Iterate over the cookie values that are present in the
   * {@linkcode Request}. */ *values() {
    for (const [, value] of this){
      yield value;
    }
  }
  /** Iterate over the cookie keys and values that are present in the
   * {@linkcode Request}. */ *[_computedKey2]() {
    const keys = this[requestKeys]();
    for (const key of keys){
      const value = this.get(key);
      if (value) {
        yield [
          key,
          value
        ];
      }
    }
  }
}
_computedKey3 = Symbol.asyncIterator;
/**
 * Provides an way to manage cookies in a request and response on the server
 * as a single iterable collection, as well as the ability to sign and verify
 * cookies to prevent tampering.
 *
 * The methods and properties align to {@linkcode Map}, but due to the need to
 * support asynchronous cryptographic keys, all the APIs operate async. When
 * constructing a {@linkcode Request} or {@linkcode Headers} from the request
 * need to be provided, as well as optionally the {@linkcode Response} or
 * `Headers` for the response can be provided. Alternatively the
 * {@linkcode mergeHeaders} function can be used to generate a final set
 * of headers for sending in the response.
 *
 * On construction, the optional set of keys implementing the
 * {@linkcode KeyRing} interface. While it is optional, if you don't plan to use
 * keys, you might want to consider using just the {@linkcode CookieMap}.
 */ export class SecureCookieMap extends CookieMapBase {
  #keyRing;
  /** Is set to a promise which resolves with the number of cookies in the
   * {@linkcode Request}. */ get size() {
    return (async ()=>{
      let size = 0;
      for await (const _ of this){
        size++;
      }
      return size;
    })();
  }
  constructor(request, options = {}){
    super(request, options);
    const { keys } = options;
    this.#keyRing = keys;
  }
  /** Sets all cookies in the {@linkcode Request} to be deleted in the
   * response. */ async clear(options) {
    const promises = [];
    for await (const key of this.keys()){
      promises.push(this.set(key, null, options));
    }
    await Promise.all(promises);
  }
  /** Set a cookie to be deleted in the response.
   *
   * This is a convenience function for `set(key, null, options?)`. */ async delete(key, options = {}) {
    await this.set(key, null, options);
    return true;
  }
  /** Get the value of a cookie from the {@linkcode Request}.
   *
   * If the cookie is signed, and the signature is invalid, `undefined` will be
   * returned and the cookie will be set to be deleted in the response. If the
   * cookie is using an "old" key from the keyring, the cookie will be re-signed
   * with the current key and be added to the response to be updated. */ async get(key, options = {}) {
    const signed = options.signed ?? !!this.#keyRing;
    const nameSig = `${key}.sig`;
    const header = this[requestHeaders].get("cookie");
    if (!header) {
      return;
    }
    const match = header.match(getPattern(key));
    if (!match) {
      return;
    }
    const [, value] = match;
    if (!signed) {
      return value;
    }
    const digest = await this.get(nameSig, {
      signed: false
    });
    if (!digest) {
      return;
    }
    const data = `${key}=${value}`;
    if (!this.#keyRing) {
      throw new TypeError("key ring required for signed cookies");
    }
    const index = await this.#keyRing.indexOf(data, digest);
    if (index < 0) {
      await this.delete(nameSig, {
        path: "/",
        signed: false
      });
    } else {
      if (index) {
        await this.set(nameSig, await this.#keyRing.sign(data), {
          signed: false
        });
      }
      return value;
    }
  }
  /** Returns `true` if the key is in the {@linkcode Request}.
   *
   * If the cookie is signed, and the signature is invalid, `false` will be
   * returned and the cookie will be set to be deleted in the response. If the
   * cookie is using an "old" key from the keyring, the cookie will be re-signed
   * with the current key and be added to the response to be updated. */ async has(key, options = {}) {
    const signed = options.signed ?? !!this.#keyRing;
    const nameSig = `${key}.sig`;
    const header = this[requestHeaders].get("cookie");
    if (!header) {
      return false;
    }
    const match = header.match(getPattern(key));
    if (!match) {
      return false;
    }
    if (!signed) {
      return true;
    }
    const digest = await this.get(nameSig, {
      signed: false
    });
    if (!digest) {
      return false;
    }
    const [, value] = match;
    const data = `${key}=${value}`;
    if (!this.#keyRing) {
      throw new TypeError("key ring required for signed cookies");
    }
    const index = await this.#keyRing.indexOf(data, digest);
    if (index < 0) {
      await this.delete(nameSig, {
        path: "/",
        signed: false
      });
      return false;
    } else {
      if (index) {
        await this.set(nameSig, await this.#keyRing.sign(data), {
          signed: false
        });
      }
      return true;
    }
  }
  /** Set a cookie in the response headers.
   *
   * If there was a keyring set, cookies will be automatically signed, unless
   * overridden by the passed options. Cookies can be deleted by setting the
   * value to `null`. */ async set(key, value, options = {}) {
    const resHeaders = this[responseHeaders];
    const headers = [];
    for (const [key, value] of resHeaders.entries()){
      if (key === "set-cookie") {
        headers.push(value);
      }
    }
    const secure = this[isSecure];
    const signed = options.signed ?? !!this.#keyRing;
    if (!secure && options.secure && !options.ignoreInsecure) {
      throw new TypeError("Cannot send secure cookie over unencrypted connection.");
    }
    const cookie = new Cookie(key, value, options);
    cookie.secure = options.secure ?? secure;
    pushCookie(headers, cookie);
    if (signed) {
      if (!this.#keyRing) {
        throw new TypeError("keys required for signed cookies.");
      }
      cookie.value = await this.#keyRing.sign(cookie.toString());
      cookie.name += ".sig";
      pushCookie(headers, cookie);
    }
    resHeaders.delete("set-cookie");
    for (const header of headers){
      resHeaders.append("set-cookie", header);
    }
    return this;
  }
  /** Iterate over the {@linkcode Request} cookies, yielding up a tuple
   * containing the key and value of each cookie.
   *
   * If a key ring was provided, only properly signed cookie keys and values are
   * returned. */ entries() {
    return this[Symbol.asyncIterator]();
  }
  /** Iterate over the request's cookies, yielding up the key of each cookie.
   *
   * If a keyring was provided, only properly signed cookie keys are
   * returned. */ async *keys() {
    for await (const [key] of this){
      yield key;
    }
  }
  /** Iterate over the request's cookies, yielding up the value of each cookie.
   *
   * If a keyring was provided, only properly signed cookie values are
   * returned. */ async *values() {
    for await (const [, value] of this){
      yield value;
    }
  }
  /** Iterate over the {@linkcode Request} cookies, yielding up a tuple
   * containing the key and value of each cookie.
   *
   * If a key ring was provided, only properly signed cookie keys and values are
   * returned. */ async *[_computedKey3]() {
    const keys = this[requestKeys]();
    for (const key of keys){
      const value = await this.get(key);
      if (value) {
        yield [
          key,
          value
        ];
      }
    }
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BvYWsvY29tbW9ucy8xLjAuMS9jb29raWVfbWFwLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjUgdGhlIG9hayBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cblxuLyoqXG4gKiBQcm92aWRlcyBhIGl0ZXJhYmxlIG1hcCBpbnRlcmZhY2VzIGZvciBtYW5hZ2luZyBjb29raWVzIHNlcnZlciBzaWRlLlxuICpcbiAqIEBleGFtcGxlXG4gKiBUbyBhY2Nlc3MgdGhlIGtleXMgaW4gYSByZXF1ZXN0IGFuZCBoYXZlIGFueSBzZXQga2V5cyBhdmFpbGFibGUgZm9yIGNyZWF0aW5nXG4gKiBhIHJlc3BvbnNlOlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBDb29raWVNYXAsIG1lcmdlSGVhZGVycyB9IGZyb20gXCJqc3I6QG9hay9jb21tb25zL2Nvb2tpZV9tYXBcIjtcbiAqXG4gKiBjb25zdCByZXF1ZXN0ID0gbmV3IFJlcXVlc3QoXCJodHRwczovL2xvY2FsaG9zdC9cIiwge1xuICogICBoZWFkZXJzOiB7IFwiY29va2llXCI6IFwiZm9vPWJhcjsgYmFyPWJhejtcIn1cbiAqIH0pO1xuICpcbiAqIGNvbnN0IGNvb2tpZXMgPSBuZXcgQ29va2llTWFwKHJlcXVlc3QsIHsgc2VjdXJlOiB0cnVlIH0pO1xuICogY29uc29sZS5sb2coY29va2llcy5nZXQoXCJmb29cIikpOyAvLyBsb2dzIFwiYmFyXCJcbiAqIGNvb2tpZXMuc2V0KFwic2Vzc2lvblwiLCBcIjEyMzQ1NjdcIiwgeyBzZWN1cmU6IHRydWUgfSk7XG4gKlxuICogY29uc3QgcmVzcG9uc2UgPSBuZXcgUmVzcG9uc2UoXCJoZWxsb1wiLCB7XG4gKiAgIGhlYWRlcnM6IG1lcmdlSGVhZGVycyh7XG4gKiAgICAgXCJjb250ZW50LXR5cGVcIjogXCJ0ZXh0L3BsYWluXCIsXG4gKiAgIH0sIGNvb2tpZXMpLFxuICogfSk7XG4gKiBgYGBcbiAqXG4gKiBAZXhhbXBsZVxuICogVG8gaGF2ZSBhdXRvbWF0aWMgbWFuYWdlbWVudCBvZiBjcnlwdG9ncmFwaGljYWxseSBzaWduZWQgY29va2llcywgeW91IGNhbiB1c2VcbiAqIHRoZSB7QGxpbmtjb2RlIFNlY3VyZUNvb2tpZU1hcH0gaW5zdGVhZCBvZiB7QGxpbmtjb2RlIENvb2tpZU1hcH0uIFRoZSBiaWdnZXN0XG4gKiBkaWZmZXJlbmNlIGlzIHRoYXQgdGhlIG1ldGhvZHMgb3BlcmF0ZSBhc3luYyBpbiBvcmRlciB0byBiZSBhYmxlIHRvIHN1cHBvcnRcbiAqIGFzeW5jIHNpZ25pbmcgYW5kIHZhbGlkYXRpb24gb2YgY29va2llczpcbiAqXG4gKiBgYGB0c1xuICogaW1wb3J0IHtcbiAqICAgU2VjdXJlQ29va2llTWFwLFxuICogICBtZXJnZUhlYWRlcnMsXG4gKiAgIHR5cGUgS2V5UmluZyxcbiAqIH0gZnJvbSBcImpzcjpAb2FrL2NvbW1vbnMvY29va2llX21hcFwiO1xuICpcbiAqIGNvbnN0IHJlcXVlc3QgPSBuZXcgUmVxdWVzdChcImh0dHBzOi8vbG9jYWxob3N0L1wiLCB7XG4gKiAgIGhlYWRlcnM6IHsgXCJjb29raWVcIjogXCJmb289YmFyOyBiYXI9YmF6O1wifVxuICogfSk7XG4gKlxuICogLy8gVGhlIGtleXMgbXVzdCBpbXBsZW1lbnQgdGhlIGBLZXlSaW5nYCBpbnRlcmZhY2UuXG4gKiBkZWNsYXJlIGNvbnN0IGtleXM6IEtleVJpbmc7XG4gKlxuICogY29uc3QgY29va2llcyA9IG5ldyBTZWN1cmVDb29raWVNYXAocmVxdWVzdCwgeyBrZXlzLCBzZWN1cmU6IHRydWUgfSk7XG4gKiBjb25zb2xlLmxvZyhhd2FpdCBjb29raWVzLmdldChcImZvb1wiKSk7IC8vIGxvZ3MgXCJiYXJcIlxuICogLy8gdGhlIGNvb2tpZSB3aWxsIGJlIGF1dG9tYXRpY2FsbHkgc2lnbmVkIHVzaW5nIHRoZSBzdXBwbGllZCBrZXkgcmluZy5cbiAqIGF3YWl0IGNvb2tpZXMuc2V0KFwic2Vzc2lvblwiLCBcIjEyMzQ1NjdcIik7XG4gKlxuICogY29uc3QgcmVzcG9uc2UgPSBuZXcgUmVzcG9uc2UoXCJoZWxsb1wiLCB7XG4gKiAgIGhlYWRlcnM6IG1lcmdlSGVhZGVycyh7XG4gKiAgICAgXCJjb250ZW50LXR5cGVcIjogXCJ0ZXh0L3BsYWluXCIsXG4gKiAgIH0sIGNvb2tpZXMpLFxuICogfSk7XG4gKiBgYGBcbiAqXG4gKiBJbiBhZGRpdGlvbiwgaWYgeW91IGhhdmUgYSB7QGxpbmtjb2RlIFJlc3BvbnNlfSBvciB7QGxpbmtjb2RlIEhlYWRlcnN9IGZvciBhXG4gKiByZXNwb25zZSBhdCBjb25zdHJ1Y3Rpb24gb2YgdGhlIGNvb2tpZXMgb2JqZWN0LCB0aGV5IGNhbiBiZSBwYXNzZWQgYW5kIGFueVxuICogc2V0IGNvb2tpZXMgd2lsbCBiZSBhZGRlZCBkaXJlY3RseSB0byB0aG9zZSBoZWFkZXJzOlxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBDb29raWVNYXAgfSBmcm9tIFwianNyOkBvYWsvY29tbW9ucy9jb29raWVfbWFwXCI7XG4gKlxuICogY29uc3QgcmVxdWVzdCA9IG5ldyBSZXF1ZXN0KFwiaHR0cHM6Ly9sb2NhbGhvc3QvXCIsIHtcbiAqICAgaGVhZGVyczogeyBcImNvb2tpZVwiOiBcImZvbz1iYXI7IGJhcj1iYXo7XCJ9XG4gKiB9KTtcbiAqXG4gKiBjb25zdCByZXNwb25zZSA9IG5ldyBSZXNwb25zZShcImhlbGxvXCIsIHtcbiAqICAgaGVhZGVyczogeyBcImNvbnRlbnQtdHlwZVwiOiBcInRleHQvcGxhaW5cIiB9LFxuICogfSk7XG4gKlxuICogY29uc3QgY29va2llcyA9IG5ldyBDb29raWVNYXAocmVxdWVzdCwgeyByZXNwb25zZSB9KTtcbiAqIGNvbnNvbGUubG9nKGNvb2tpZXMuZ2V0KFwiZm9vXCIpKTsgLy8gbG9ncyBcImJhclwiXG4gKiBjb29raWVzLnNldChcInNlc3Npb25cIiwgXCIxMjM0NTY3XCIpO1xuICogYGBgXG4gKlxuICogQG1vZHVsZVxuICovXG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29va2llTWFwT3B0aW9ucyB7XG4gIC8qKiBUaGUge0BsaW5rY29kZSBSZXNwb25zZX0gb3IgdGhlIGhlYWRlcnMgdGhhdCB3aWxsIGJlIHVzZWQgd2l0aCB0aGVcbiAgICogcmVzcG9uc2UuIFdoZW4gcHJvdmlkZWQsIGBTZXQtQ29va2llYCBoZWFkZXJzIHdpbGwgYmUgc2V0IGluIHRoZSBoZWFkZXJzXG4gICAqIHdoZW4gY29va2llcyBhcmUgc2V0IG9yIGRlbGV0ZWQgaW4gdGhlIG1hcC5cbiAgICpcbiAgICogQW4gYWx0ZXJuYXRpdmUgd2F5IHRvIGV4dHJhY3QgdGhlIGhlYWRlcnMgaXMgdG8gcGFzcyB0aGUgY29va2llIG1hcCB0byB0aGVcbiAgICoge0BsaW5rY29kZSBtZXJnZUhlYWRlcnN9IGZ1bmN0aW9uIHRvIG1lcmdlIHZhcmlvdXMgc291cmNlcyBvZiB0aGVcbiAgICogaGVhZGVycyB0byBiZSBwcm92aWRlZCB3aGVuIGNyZWF0aW5nIG9yIHVwZGF0aW5nIGEgcmVzcG9uc2UuXG4gICAqL1xuICByZXNwb25zZT86IEhlYWRlcmVkIHwgSGVhZGVycztcbiAgLyoqIEEgZmxhZyB0aGF0IGluZGljYXRlcyBpZiB0aGUgcmVxdWVzdCBhbmQgcmVzcG9uc2UgYXJlIGJlaW5nIGhhbmRsZWQgb3ZlclxuICAgKiBhIHNlY3VyZSAoZS5nLiBIVFRQUy9UTFMpIGNvbm5lY3Rpb24uXG4gICAqXG4gICAqIEBkZWZhdWx0IHtmYWxzZX1cbiAgICovXG4gIHNlY3VyZT86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29va2llTWFwU2V0RGVsZXRlT3B0aW9ucyB7XG4gIC8qKiBUaGUgZG9tYWluIHRvIHNjb3BlIHRoZSBjb29raWUgZm9yLiAqL1xuICBkb21haW4/OiBzdHJpbmc7XG4gIC8qKiBXaGVuIHRoZSBjb29raWUgZXhwaXJlcy4gKi9cbiAgZXhwaXJlcz86IERhdGU7XG4gIC8qKiBOdW1iZXIgb2Ygc2Vjb25kcyB1bnRpbCB0aGUgY29va2llIGV4cGlyZXMgKi9cbiAgbWF4QWdlPzogbnVtYmVyO1xuICAvKiogQSBmbGFnIHRoYXQgaW5kaWNhdGVzIGlmIHRoZSBjb29raWUgaXMgdmFsaWQgb3ZlciBIVFRQIG9ubHkuICovXG4gIGh0dHBPbmx5PzogYm9vbGVhbjtcbiAgLyoqIERvIG5vdCBlcnJvciB3aGVuIHNpZ25pbmcgYW5kIHZhbGlkYXRpbmcgY29va2llcyBvdmVyIGFuIGluc2VjdXJlXG4gICAqIGNvbm5lY3Rpb24uICovXG4gIGlnbm9yZUluc2VjdXJlPzogYm9vbGVhbjtcbiAgLyoqIE92ZXJ3cml0ZSBhbiBleGlzdGluZyB2YWx1ZS4gKi9cbiAgb3ZlcndyaXRlPzogYm9vbGVhbjtcbiAgLyoqIFRoZSBwYXRoIHRoZSBjb29raWUgaXMgdmFsaWQgZm9yLiAqL1xuICBwYXRoPzogc3RyaW5nO1xuICAvKiogT3ZlcnJpZGUgdGhlIGZsYWcgdGhhdCB3YXMgc2V0IHdoZW4gdGhlIGluc3RhbmNlIHdhcyBjcmVhdGVkLiAqL1xuICBzZWN1cmU/OiBib29sZWFuO1xuICAvKiogU2V0IHRoZSBzYW1lLXNpdGUgaW5kaWNhdG9yIGZvciBhIGNvb2tpZS4gKi9cbiAgc2FtZVNpdGU/OiBcInN0cmljdFwiIHwgXCJsYXhcIiB8IFwibm9uZVwiIHwgYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBBbiBvYmplY3Qgd2hpY2ggY29udGFpbnMgYSBgaGVhZGVyc2AgcHJvcGVydHkgd2hpY2ggaGFzIGEgdmFsdWUgb2YgYW5cbiAqIGluc3RhbmNlIG9mIHtAbGlua2NvZGUgSGVhZGVyc30sIGxpa2Uge0BsaW5rY29kZSBSZXF1ZXN0fSBhbmRcbiAqIHtAbGlua2NvZGUgUmVzcG9uc2V9LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEhlYWRlcmVkIHtcbiAgaGVhZGVyczogSGVhZGVycztcbn1cblxuLyoqXG4gKiBBbiBvYmplY3Qgd2hpY2ggY29udGFpbnMgYSBzeW1ib2wgd2hpY2ggaW5kaWNhdGVzIHRoYXQgaXQgY2FuIGJlIG1lcmdlZCB3aXRoXG4gKiBvdGhlciBoZWFkZXJzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIE1lcmdlYWJsZSB7XG4gIFtjb29raWVNYXBIZWFkZXJzSW5pdFN5bWJvbF0oKTogW3N0cmluZywgc3RyaW5nXVtdO1xufVxuXG4vKiogT3B0aW9ucyB3aGljaCBjYW4gYmUgc2V0IHdoZW4gaW5pdGlhbGl6aW5nIGEge0BsaW5rY29kZSBTZWN1cmVDb29raWVNYXB9LiAqL1xuZXhwb3J0IGludGVyZmFjZSBTZWN1cmVDb29raWVNYXBPcHRpb25zIHtcbiAgLyoqIEtleXMgd2hpY2ggd2lsbCBiZSB1c2VkIHRvIHZhbGlkYXRlIGFuZCBzaWduIGNvb2tpZXMuIFRoZSBrZXkgcmluZyBzaG91bGRcbiAgICogaW1wbGVtZW50IHRoZSB7QGxpbmtjb2RlIEtleVJpbmd9IGludGVyZmFjZS4gKi9cbiAga2V5cz86IEtleVJpbmc7XG5cbiAgLyoqIFRoZSB7QGxpbmtjb2RlIFJlc3BvbnNlfSBvciB0aGUgaGVhZGVycyB0aGF0IHdpbGwgYmUgdXNlZCB3aXRoIHRoZVxuICAgKiByZXNwb25zZS4gV2hlbiBwcm92aWRlZCwgYFNldC1Db29raWVgIGhlYWRlcnMgd2lsbCBiZSBzZXQgaW4gdGhlIGhlYWRlcnNcbiAgICogd2hlbiBjb29raWVzIGFyZSBzZXQgb3IgZGVsZXRlZCBpbiB0aGUgbWFwLlxuICAgKlxuICAgKiBBbiBhbHRlcm5hdGl2ZSB3YXkgdG8gZXh0cmFjdCB0aGUgaGVhZGVycyBpcyB0byBwYXNzIHRoZSBjb29raWUgbWFwIHRvIHRoZVxuICAgKiB7QGxpbmtjb2RlIG1lcmdlSGVhZGVyc30gZnVuY3Rpb24gdG8gbWVyZ2UgdmFyaW91cyBzb3VyY2VzIG9mIHRoZVxuICAgKiBoZWFkZXJzIHRvIGJlIHByb3ZpZGVkIHdoZW4gY3JlYXRpbmcgb3IgdXBkYXRpbmcgYSByZXNwb25zZS5cbiAgICovXG4gIHJlc3BvbnNlPzogSGVhZGVyZWQgfCBIZWFkZXJzO1xuXG4gIC8qKiBBIGZsYWcgdGhhdCBpbmRpY2F0ZXMgaWYgdGhlIHJlcXVlc3QgYW5kIHJlc3BvbnNlIGFyZSBiZWluZyBoYW5kbGVkIG92ZXJcbiAgICogYSBzZWN1cmUgKGUuZy4gSFRUUFMvVExTKSBjb25uZWN0aW9uLlxuICAgKlxuICAgKiBAZGVmYXVsdCB7ZmFsc2V9XG4gICAqL1xuICBzZWN1cmU/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIE9wdGlvbnMgd2hpY2ggY2FuIGJlIHNldCB3aGVuIGNhbGxpbmcgdGhlIGAuZ2V0KClgIG1ldGhvZCBvbiBhXG4gKiB7QGxpbmtjb2RlIFNlY3VyZUNvb2tpZU1hcH0uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU2VjdXJlQ29va2llTWFwR2V0T3B0aW9ucyB7XG4gIC8qKiBPdmVycmlkZXMgdGhlIGZsYWcgdGhhdCB3YXMgc2V0IHdoZW4gdGhlIGluc3RhbmNlIHdhcyBjcmVhdGVkLiAqL1xuICBzaWduZWQ/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIE9wdGlvbnMgd2hpY2ggY2FuIGJlIHNldCB3aGVuIGNhbGxpbmcgdGhlIGAuc2V0KClgIG9yIGAuZGVsZXRlKClgIG1ldGhvZCBvbiBhXG4gKiB7QGxpbmtjb2RlIFNlY3VyZUNvb2tpZU1hcH0uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU2VjdXJlQ29va2llTWFwU2V0RGVsZXRlT3B0aW9ucyB7XG4gIC8qKiBUaGUgZG9tYWluIHRvIHNjb3BlIHRoZSBjb29raWUgZm9yLiAqL1xuICBkb21haW4/OiBzdHJpbmc7XG4gIC8qKiBXaGVuIHRoZSBjb29raWUgZXhwaXJlcy4gKi9cbiAgZXhwaXJlcz86IERhdGU7XG4gIC8qKiBOdW1iZXIgb2Ygc2Vjb25kcyB1bnRpbCB0aGUgY29va2llIGV4cGlyZXMgKi9cbiAgbWF4QWdlPzogbnVtYmVyO1xuICAvKiogQSBmbGFnIHRoYXQgaW5kaWNhdGVzIGlmIHRoZSBjb29raWUgaXMgdmFsaWQgb3ZlciBIVFRQIG9ubHkuICovXG4gIGh0dHBPbmx5PzogYm9vbGVhbjtcbiAgLyoqIERvIG5vdCBlcnJvciB3aGVuIHNpZ25pbmcgYW5kIHZhbGlkYXRpbmcgY29va2llcyBvdmVyIGFuIGluc2VjdXJlXG4gICAqIGNvbm5lY3Rpb24uICovXG4gIGlnbm9yZUluc2VjdXJlPzogYm9vbGVhbjtcbiAgLyoqIE92ZXJ3cml0ZSBhbiBleGlzdGluZyB2YWx1ZS4gKi9cbiAgb3ZlcndyaXRlPzogYm9vbGVhbjtcbiAgLyoqIFRoZSBwYXRoIHRoZSBjb29raWUgaXMgdmFsaWQgZm9yLiAqL1xuICBwYXRoPzogc3RyaW5nO1xuICAvKiogT3ZlcnJpZGUgdGhlIGZsYWcgdGhhdCB3YXMgc2V0IHdoZW4gdGhlIGluc3RhbmNlIHdhcyBjcmVhdGVkLiAqL1xuICBzZWN1cmU/OiBib29sZWFuO1xuICAvKiogU2V0IHRoZSBzYW1lLXNpdGUgaW5kaWNhdG9yIGZvciBhIGNvb2tpZS4gKi9cbiAgc2FtZVNpdGU/OiBcInN0cmljdFwiIHwgXCJsYXhcIiB8IFwibm9uZVwiIHwgYm9vbGVhbjtcbiAgLyoqIE92ZXJyaWRlIHRoZSBkZWZhdWx0IGJlaGF2aW9yIG9mIHNpZ25pbmcgdGhlIGNvb2tpZS4gKi9cbiAgc2lnbmVkPzogYm9vbGVhbjtcbn1cblxudHlwZSBDb29raWVBdHRyaWJ1dGVzID0gU2VjdXJlQ29va2llTWFwU2V0RGVsZXRlT3B0aW9ucztcblxuLy8gZGVuby1saW50LWlnbm9yZSBuby1jb250cm9sLXJlZ2V4XG5jb25zdCBGSUVMRF9DT05URU5UX1JFR0VYUCA9IC9eW1xcdTAwMDlcXHUwMDIwLVxcdTAwN2VcXHUwMDgwLVxcdTAwZmZdKyQvO1xuY29uc3QgS0VZX1JFR0VYUCA9IC8oPzpefDspICooW149XSopPVteO10qL2c7XG5jb25zdCBTQU1FX1NJVEVfUkVHRVhQID0gL14oPzpsYXh8bm9uZXxzdHJpY3QpJC9pO1xuXG5jb25zdCBtYXRjaENhY2hlOiBSZWNvcmQ8c3RyaW5nLCBSZWdFeHA+ID0ge307XG5mdW5jdGlvbiBnZXRQYXR0ZXJuKG5hbWU6IHN0cmluZyk6IFJlZ0V4cCB7XG4gIGlmIChuYW1lIGluIG1hdGNoQ2FjaGUpIHtcbiAgICByZXR1cm4gbWF0Y2hDYWNoZVtuYW1lXTtcbiAgfVxuXG4gIHJldHVybiBtYXRjaENhY2hlW25hbWVdID0gbmV3IFJlZ0V4cChcbiAgICBgKD86Xnw7KSAqJHtuYW1lLnJlcGxhY2UoL1stW1xcXXt9KCkqKz8uLFxcXFxeJHwjXFxzXS9nLCBcIlxcXFwkJlwiKX09KFteO10qKWAsXG4gICk7XG59XG5cbmZ1bmN0aW9uIHB1c2hDb29raWUodmFsdWVzOiBzdHJpbmdbXSwgY29va2llOiBDb29raWUpIHtcbiAgaWYgKGNvb2tpZS5vdmVyd3JpdGUpIHtcbiAgICBmb3IgKGxldCBpID0gdmFsdWVzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICBpZiAodmFsdWVzW2ldLmluZGV4T2YoYCR7Y29va2llLm5hbWV9PWApID09PSAwKSB7XG4gICAgICAgIHZhbHVlcy5zcGxpY2UoaSwgMSk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHZhbHVlcy5wdXNoKGNvb2tpZS50b0hlYWRlclZhbHVlKCkpO1xufVxuXG5mdW5jdGlvbiB2YWxpZGF0ZUNvb2tpZVByb3BlcnR5KFxuICBrZXk6IHN0cmluZyxcbiAgdmFsdWU6IHN0cmluZyB8IHVuZGVmaW5lZCB8IG51bGwsXG4pIHtcbiAgaWYgKHZhbHVlICYmICFGSUVMRF9DT05URU5UX1JFR0VYUC50ZXN0KHZhbHVlKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFRoZSBcIiR7a2V5fVwiIG9mIHRoZSBjb29raWUgKCR7dmFsdWV9KSBpcyBpbnZhbGlkLmApO1xuICB9XG59XG5cbi8qKiBBbiBpbnRlcm5hbCBhYnN0cmFjdGlvbiB0byBtYW5hZ2UgY29va2llcy4gKi9cbmNsYXNzIENvb2tpZSBpbXBsZW1lbnRzIENvb2tpZUF0dHJpYnV0ZXMge1xuICBkb21haW4/OiBzdHJpbmc7XG4gIGV4cGlyZXM/OiBEYXRlO1xuICBodHRwT25seSA9IHRydWU7XG4gIG1heEFnZT86IG51bWJlcjtcbiAgbmFtZTogc3RyaW5nO1xuICBvdmVyd3JpdGUgPSBmYWxzZTtcbiAgcGF0aCA9IFwiL1wiO1xuICBzYW1lU2l0ZTogXCJzdHJpY3RcIiB8IFwibGF4XCIgfCBcIm5vbmVcIiB8IGJvb2xlYW4gPSBmYWxzZTtcbiAgc2VjdXJlID0gZmFsc2U7XG4gIHNpZ25lZD86IGJvb2xlYW47XG4gIHZhbHVlOiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgbmFtZTogc3RyaW5nLFxuICAgIHZhbHVlOiBzdHJpbmcgfCBudWxsLFxuICAgIGF0dHJpYnV0ZXM6IENvb2tpZUF0dHJpYnV0ZXMsXG4gICkge1xuICAgIHZhbGlkYXRlQ29va2llUHJvcGVydHkoXCJuYW1lXCIsIG5hbWUpO1xuICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgdmFsaWRhdGVDb29raWVQcm9wZXJ0eShcInZhbHVlXCIsIHZhbHVlKTtcbiAgICB0aGlzLnZhbHVlID0gdmFsdWUgPz8gXCJcIjtcbiAgICBPYmplY3QuYXNzaWduKHRoaXMsIGF0dHJpYnV0ZXMpO1xuICAgIGlmICghdGhpcy52YWx1ZSkge1xuICAgICAgdGhpcy5leHBpcmVzID0gbmV3IERhdGUoMCk7XG4gICAgICB0aGlzLm1heEFnZSA9IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICB2YWxpZGF0ZUNvb2tpZVByb3BlcnR5KFwicGF0aFwiLCB0aGlzLnBhdGgpO1xuICAgIHZhbGlkYXRlQ29va2llUHJvcGVydHkoXCJkb21haW5cIiwgdGhpcy5kb21haW4pO1xuICAgIGlmIChcbiAgICAgIHRoaXMuc2FtZVNpdGUgJiYgdHlwZW9mIHRoaXMuc2FtZVNpdGUgPT09IFwic3RyaW5nXCIgJiZcbiAgICAgICFTQU1FX1NJVEVfUkVHRVhQLnRlc3QodGhpcy5zYW1lU2l0ZSlcbiAgICApIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAgIGBUaGUgXCJzYW1lU2l0ZVwiIG9mIHRoZSBjb29raWUgKFwiJHt0aGlzLnNhbWVTaXRlfVwiKSBpcyBpbnZhbGlkLmAsXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIHRvSGVhZGVyVmFsdWUoKTogc3RyaW5nIHtcbiAgICBsZXQgdmFsdWUgPSB0aGlzLnRvU3RyaW5nKCk7XG4gICAgaWYgKHRoaXMubWF4QWdlKSB7XG4gICAgICB0aGlzLmV4cGlyZXMgPSBuZXcgRGF0ZShEYXRlLm5vdygpICsgKHRoaXMubWF4QWdlICogMTAwMCkpO1xuICAgIH1cbiAgICBpZiAodGhpcy5wYXRoKSB7XG4gICAgICB2YWx1ZSArPSBgOyBwYXRoPSR7dGhpcy5wYXRofWA7XG4gICAgfVxuICAgIGlmICh0aGlzLmV4cGlyZXMpIHtcbiAgICAgIHZhbHVlICs9IGA7IGV4cGlyZXM9JHt0aGlzLmV4cGlyZXMudG9VVENTdHJpbmcoKX1gO1xuICAgIH1cbiAgICBpZiAodGhpcy5kb21haW4pIHtcbiAgICAgIHZhbHVlICs9IGA7IGRvbWFpbj0ke3RoaXMuZG9tYWlufWA7XG4gICAgfVxuICAgIGlmICh0aGlzLnNhbWVTaXRlKSB7XG4gICAgICB2YWx1ZSArPSBgOyBzYW1lc2l0ZT0ke1xuICAgICAgICB0aGlzLnNhbWVTaXRlID09PSB0cnVlID8gXCJzdHJpY3RcIiA6IHRoaXMuc2FtZVNpdGUudG9Mb3dlckNhc2UoKVxuICAgICAgfWA7XG4gICAgfVxuICAgIGlmICh0aGlzLnNlY3VyZSkge1xuICAgICAgdmFsdWUgKz0gXCI7IHNlY3VyZVwiO1xuICAgIH1cbiAgICBpZiAodGhpcy5odHRwT25seSkge1xuICAgICAgdmFsdWUgKz0gXCI7IGh0dHBvbmx5XCI7XG4gICAgfVxuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuXG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGAke3RoaXMubmFtZX09JHt0aGlzLnZhbHVlfWA7XG4gIH1cbn1cblxuLyoqXG4gKiBTeW1ib2wgd2hpY2ggaXMgdXNlZCBpbiB7QGxpbmsgbWVyZ2VIZWFkZXJzfSB0byBleHRyYWN0IGFcbiAqIGBbc3RyaW5nIHwgc3RyaW5nXVtdYCBmcm9tIGFuIGluc3RhbmNlIHRvIGdlbmVyYXRlIHRoZSBmaW5hbCBzZXQgb2ZcbiAqIGhlYWRlcnMuXG4gKi9cbmV4cG9ydCBjb25zdCBjb29raWVNYXBIZWFkZXJzSW5pdFN5bWJvbDogdW5pcXVlIHN5bWJvbCA9IFN5bWJvbC5mb3IoXG4gIFwib2FrLmNvbW1vbnMuY29va2llTWFwLmhlYWRlcnNJbml0XCIsXG4pO1xuXG5mdW5jdGlvbiBpc01lcmdlYWJsZSh2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIE1lcmdlYWJsZSB7XG4gIHJldHVybiB2YWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIiAmJlxuICAgIGNvb2tpZU1hcEhlYWRlcnNJbml0U3ltYm9sIGluIHZhbHVlO1xufVxuXG4vKipcbiAqIEFsbG93cyBtZXJnaW5nIG9mIHZhcmlvdXMgc291cmNlcyBvZiBoZWFkZXJzIGludG8gYSBmaW5hbCBzZXQgb2YgaGVhZGVyc1xuICogd2hpY2ggY2FuIGJlIHVzZWQgaW4gYSB7QGxpbmtjb2RlIFJlc3BvbnNlfS5cbiAqXG4gKiBOb3RlLCB0aGF0IHVubGlrZSB3aGVuIHBhc3NpbmcgYSBgUmVzcG9uc2VgIG9yIHtAbGlua2NvZGUgSGVhZGVyc30gdXNlZCBpbiBhXG4gKiByZXNwb25zZSB0byB7QGxpbmtjb2RlIENvb2tpZU1hcH0gb3Ige0BsaW5rY29kZSBTZWN1cmVDb29raWVNYXB9LCBtZXJnaW5nXG4gKiB3aWxsIG5vdCBlbnN1cmUgdGhhdCB0aGVyZSBhcmUgbm8gb3RoZXIgYFNldC1Db29raWVgIGhlYWRlcnMgZnJvbSBvdGhlclxuICogc291cmNlcywgaXQgd2lsbCBzaW1wbHkgYXBwZW5kIHRoZSB2YXJpb3VzIGhlYWRlcnMgdG9nZXRoZXIuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtZXJnZUhlYWRlcnMoXG4gIC4uLnNvdXJjZXM6IChIZWFkZXJlZCB8IEhlYWRlcnNJbml0IHwgTWVyZ2VhYmxlKVtdXG4pOiBIZWFkZXJzIHtcbiAgY29uc3QgaGVhZGVycyA9IG5ldyBIZWFkZXJzKCk7XG4gIGZvciAoY29uc3Qgc291cmNlIG9mIHNvdXJjZXMpIHtcbiAgICBsZXQgZW50cmllczogSXRlcmFibGU8W3N0cmluZywgc3RyaW5nXT47XG4gICAgaWYgKHNvdXJjZSBpbnN0YW5jZW9mIEhlYWRlcnMpIHtcbiAgICAgIGVudHJpZXMgPSBzb3VyY2U7XG4gICAgfSBlbHNlIGlmIChcImhlYWRlcnNcIiBpbiBzb3VyY2UgJiYgc291cmNlLmhlYWRlcnMgaW5zdGFuY2VvZiBIZWFkZXJzKSB7XG4gICAgICBlbnRyaWVzID0gc291cmNlLmhlYWRlcnM7XG4gICAgfSBlbHNlIGlmIChpc01lcmdlYWJsZShzb3VyY2UpKSB7XG4gICAgICBlbnRyaWVzID0gc291cmNlW2Nvb2tpZU1hcEhlYWRlcnNJbml0U3ltYm9sXSgpO1xuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShzb3VyY2UpKSB7XG4gICAgICBlbnRyaWVzID0gc291cmNlIGFzIFtzdHJpbmcsIHN0cmluZ11bXTtcbiAgICB9IGVsc2Uge1xuICAgICAgZW50cmllcyA9IE9iamVjdC5lbnRyaWVzKHNvdXJjZSk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIGVudHJpZXMpIHtcbiAgICAgIGhlYWRlcnMuYXBwZW5kKGtleSwgdmFsdWUpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gaGVhZGVycztcbn1cblxuY29uc3Qga2V5cyA9IFN5bWJvbChcIiNrZXlzXCIpO1xuY29uc3QgcmVxdWVzdEhlYWRlcnMgPSBTeW1ib2woXCIjcmVxdWVzdEhlYWRlcnNcIik7XG5jb25zdCByZXNwb25zZUhlYWRlcnMgPSBTeW1ib2woXCIjcmVzcG9uc2VIZWFkZXJzXCIpO1xuY29uc3QgaXNTZWN1cmUgPSBTeW1ib2woXCIjc2VjdXJlXCIpO1xuY29uc3QgcmVxdWVzdEtleXM6IHVuaXF1ZSBzeW1ib2wgPSBTeW1ib2woXCIjcmVxdWVzdEtleXNcIik7XG5cbi8qKiBBbiBpbnRlcm5hbCBhYnN0cmFjdCBjbGFzcyB3aGljaCBwcm92aWRlcyBjb21tb24gZnVuY3Rpb25hbGl0eSBmb3JcbiAqIHtAbGluayBDb29raWVNYXB9IGFuZCB7QGxpbmsgU2VjdXJlQ29va2llTWFwfS5cbiAqL1xuYWJzdHJhY3QgY2xhc3MgQ29va2llTWFwQmFzZSBpbXBsZW1lbnRzIE1lcmdlYWJsZSB7XG4gIFtrZXlzXT86IHN0cmluZ1tdO1xuICBbcmVxdWVzdEhlYWRlcnNdOiBIZWFkZXJzO1xuICBbcmVzcG9uc2VIZWFkZXJzXTogSGVhZGVycztcbiAgW2lzU2VjdXJlXTogYm9vbGVhbjtcblxuICBbcmVxdWVzdEtleXNdKCk6IHN0cmluZ1tdIHtcbiAgICBpZiAodGhpc1trZXlzXSkge1xuICAgICAgcmV0dXJuIHRoaXNba2V5c107XG4gICAgfVxuICAgIGNvbnN0IHJlc3VsdCA9IHRoaXNba2V5c10gPSBbXSBhcyBzdHJpbmdbXTtcbiAgICBjb25zdCBoZWFkZXIgPSB0aGlzW3JlcXVlc3RIZWFkZXJzXS5nZXQoXCJjb29raWVcIik7XG4gICAgaWYgKCFoZWFkZXIpIHtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICAgIGxldCBtYXRjaGVzOiBSZWdFeHBFeGVjQXJyYXkgfCBudWxsO1xuICAgIHdoaWxlICgobWF0Y2hlcyA9IEtFWV9SRUdFWFAuZXhlYyhoZWFkZXIpKSkge1xuICAgICAgY29uc3QgWywga2V5XSA9IG1hdGNoZXM7XG4gICAgICByZXN1bHQucHVzaChrZXkpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgY29uc3RydWN0b3IocmVxdWVzdDogSGVhZGVycyB8IEhlYWRlcmVkLCBvcHRpb25zOiBDb29raWVNYXBPcHRpb25zKSB7XG4gICAgdGhpc1tyZXF1ZXN0SGVhZGVyc10gPSBcImhlYWRlcnNcIiBpbiByZXF1ZXN0ID8gcmVxdWVzdC5oZWFkZXJzIDogcmVxdWVzdDtcbiAgICBjb25zdCB7IHNlY3VyZSA9IGZhbHNlLCByZXNwb25zZSA9IG5ldyBIZWFkZXJzKCkgfSA9IG9wdGlvbnM7XG4gICAgdGhpc1tyZXNwb25zZUhlYWRlcnNdID0gXCJoZWFkZXJzXCIgaW4gcmVzcG9uc2UgPyByZXNwb25zZS5oZWFkZXJzIDogcmVzcG9uc2U7XG4gICAgdGhpc1tpc1NlY3VyZV0gPSBzZWN1cmU7XG4gIH1cblxuICAvKiogQSBtZXRob2QgdXNlZCBieSB7QGxpbmtjb2RlIG1lcmdlSGVhZGVyc30gdG8gYmUgYWJsZSB0byBtZXJnZVxuICAgKiBoZWFkZXJzIGZyb20gdmFyaW91cyBzb3VyY2VzIHdoZW4gZm9ybWluZyBhIHtAbGlua2NvZGUgUmVzcG9uc2V9LiAqL1xuICBbY29va2llTWFwSGVhZGVyc0luaXRTeW1ib2xdKCk6IFtzdHJpbmcsIHN0cmluZ11bXSB7XG4gICAgY29uc3QgaW5pdDogW3N0cmluZywgc3RyaW5nXVtdID0gW107XG4gICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgdGhpc1tyZXNwb25zZUhlYWRlcnNdKSB7XG4gICAgICBpZiAoa2V5ID09PSBcInNldC1jb29raWVcIikge1xuICAgICAgICBpbml0LnB1c2goW2tleSwgdmFsdWVdKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGluaXQ7XG4gIH1cblxuICBbU3ltYm9sLmZvcihcIkRlbm8uY3VzdG9tSW5zcGVjdFwiKV0oKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYCR7dGhpcy5jb25zdHJ1Y3Rvci5uYW1lfSBbXWA7XG4gIH1cblxuICBbU3ltYm9sLmZvcihcIm5vZGVqcy51dGlsLmluc3BlY3QuY3VzdG9tXCIpXShcbiAgICBkZXB0aDogbnVtYmVyLFxuICAgIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gICAgb3B0aW9uczogYW55LFxuICAgIGluc3BlY3Q6ICh2YWx1ZTogdW5rbm93biwgb3B0aW9ucz86IHVua25vd24pID0+IHN0cmluZyxcbiAgKTogc3RyaW5nIHtcbiAgICBpZiAoZGVwdGggPCAwKSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy5zdHlsaXplKGBbJHt0aGlzLmNvbnN0cnVjdG9yLm5hbWV9XWAsIFwic3BlY2lhbFwiKTtcbiAgICB9XG5cbiAgICBjb25zdCBuZXdPcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucywge1xuICAgICAgZGVwdGg6IG9wdGlvbnMuZGVwdGggPT09IG51bGwgPyBudWxsIDogb3B0aW9ucy5kZXB0aCAtIDEsXG4gICAgfSk7XG4gICAgcmV0dXJuIGAke29wdGlvbnMuc3R5bGl6ZSh0aGlzLmNvbnN0cnVjdG9yLm5hbWUsIFwic3BlY2lhbFwiKX0gJHtcbiAgICAgIGluc3BlY3QoW10sIG5ld09wdGlvbnMpXG4gICAgfWA7XG4gIH1cbn1cblxuLyoqXG4gKiBQcm92aWRlcyBhIHdheSB0byBtYW5hZ2UgY29va2llcyBpbiBhIHJlcXVlc3QgYW5kIHJlc3BvbnNlIG9uIHRoZSBzZXJ2ZXJcbiAqIGFzIGEgc2luZ2xlIGl0ZXJhYmxlIGNvbGxlY3Rpb24uXG4gKlxuICogVGhlIG1ldGhvZHMgYW5kIHByb3BlcnRpZXMgYWxpZ24gdG8ge0BsaW5rY29kZSBNYXB9LiBXaGVuIGNvbnN0cnVjdGluZyBhXG4gKiB7QGxpbmtjb2RlIFJlcXVlc3R9IG9yIHtAbGlua2NvZGUgSGVhZGVyc30gZnJvbSB0aGUgcmVxdWVzdCBuZWVkIHRvIGJlXG4gKiBwcm92aWRlZCwgYXMgd2VsbCBhcyBvcHRpb25hbGx5IHRoZSB7QGxpbmtjb2RlIFJlc3BvbnNlfSBvciBgSGVhZGVyc2AgZm9yIHRoZVxuICogcmVzcG9uc2UgY2FuIGJlIHByb3ZpZGVkLiBBbHRlcm5hdGl2ZWx5IHRoZSB7QGxpbmtjb2RlIG1lcmdlSGVhZGVyc31cbiAqIGZ1bmN0aW9uIGNhbiBiZSB1c2VkIHRvIGdlbmVyYXRlIGEgZmluYWwgc2V0IG9mIGhlYWRlcnMgZm9yIHNlbmRpbmcgaW4gdGhlXG4gKiByZXNwb25zZS5cbiAqL1xuZXhwb3J0IGNsYXNzIENvb2tpZU1hcCBleHRlbmRzIENvb2tpZU1hcEJhc2Uge1xuICAvKiogQ29udGFpbnMgdGhlIG51bWJlciBvZiB2YWxpZCBjb29raWVzIGluIHRoZSByZXF1ZXN0IGhlYWRlcnMuICovXG4gIGdldCBzaXplKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIFsuLi50aGlzXS5sZW5ndGg7XG4gIH1cblxuICBjb25zdHJ1Y3RvcihyZXF1ZXN0OiBIZWFkZXJzIHwgSGVhZGVyZWQsIG9wdGlvbnM6IENvb2tpZU1hcE9wdGlvbnMgPSB7fSkge1xuICAgIHN1cGVyKHJlcXVlc3QsIG9wdGlvbnMpO1xuICB9XG5cbiAgLyoqIERlbGV0ZXMgYWxsIHRoZSBjb29raWVzIGZyb20gdGhlIHtAbGlua2NvZGUgUmVxdWVzdH0gaW4gdGhlIHJlc3BvbnNlLiAqL1xuICBjbGVhcihvcHRpb25zOiBDb29raWVNYXBTZXREZWxldGVPcHRpb25zID0ge30pIHtcbiAgICBmb3IgKGNvbnN0IGtleSBvZiB0aGlzLmtleXMoKSkge1xuICAgICAgdGhpcy5zZXQoa2V5LCBudWxsLCBvcHRpb25zKTtcbiAgICB9XG4gIH1cblxuICAvKiogU2V0IGEgY29va2llIHRvIGJlIGRlbGV0ZWQgaW4gdGhlIHJlc3BvbnNlLlxuICAgKlxuICAgKiBUaGlzIGlzIGEgY29udmVuaWVuY2UgZnVuY3Rpb24gZm9yIGBzZXQoa2V5LCBudWxsLCBvcHRpb25zPylgLlxuICAgKi9cbiAgZGVsZXRlKGtleTogc3RyaW5nLCBvcHRpb25zOiBDb29raWVNYXBTZXREZWxldGVPcHRpb25zID0ge30pOiBib29sZWFuIHtcbiAgICB0aGlzLnNldChrZXksIG51bGwsIG9wdGlvbnMpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLyoqIFJldHVybiB0aGUgdmFsdWUgb2YgYSBtYXRjaGluZyBrZXkgcHJlc2VudCBpbiB0aGUge0BsaW5rY29kZSBSZXF1ZXN0fS4gSWZcbiAgICogdGhlIGtleSBpcyBub3QgcHJlc2VudCBgdW5kZWZpbmVkYCBpcyByZXR1cm5lZC4gKi9cbiAgZ2V0KGtleTogc3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgICBjb25zdCBoZWFkZXJWYWx1ZSA9IHRoaXNbcmVxdWVzdEhlYWRlcnNdLmdldChcImNvb2tpZVwiKTtcbiAgICBpZiAoIWhlYWRlclZhbHVlKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBjb25zdCBtYXRjaCA9IGhlYWRlclZhbHVlLm1hdGNoKGdldFBhdHRlcm4oa2V5KSk7XG4gICAgaWYgKCFtYXRjaCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgY29uc3QgWywgdmFsdWVdID0gbWF0Y2g7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG5cbiAgLyoqIFJldHVybnMgYHRydWVgIGlmIHRoZSBtYXRjaGluZyBrZXkgaXMgcHJlc2VudCBpbiB0aGUge0BsaW5rY29kZSBSZXF1ZXN0fSxcbiAgICogb3RoZXJ3aXNlIGBmYWxzZWAuICovXG4gIGhhcyhrZXk6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGhlYWRlclZhbHVlID0gdGhpc1tyZXF1ZXN0SGVhZGVyc10uZ2V0KFwiY29va2llXCIpO1xuICAgIGlmICghaGVhZGVyVmFsdWUpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIGdldFBhdHRlcm4oa2V5KS50ZXN0KGhlYWRlclZhbHVlKTtcbiAgfVxuXG4gIC8qKiBTZXQgYSBuYW1lZCBjb29raWUgaW4gdGhlIHJlc3BvbnNlLiBUaGUgb3B0aW9uYWxcbiAgICoge0BsaW5rY29kZSBDb29raWVNYXBTZXREZWxldGVPcHRpb25zfSBhcmUgYXBwbGllZCB0byB0aGUgY29va2llIGJlaW5nIHNldC5cbiAgICovXG4gIHNldChcbiAgICBrZXk6IHN0cmluZyxcbiAgICB2YWx1ZTogc3RyaW5nIHwgbnVsbCxcbiAgICBvcHRpb25zOiBDb29raWVNYXBTZXREZWxldGVPcHRpb25zID0ge30sXG4gICk6IHRoaXMge1xuICAgIGNvbnN0IHJlc0hlYWRlcnMgPSB0aGlzW3Jlc3BvbnNlSGVhZGVyc107XG4gICAgY29uc3QgdmFsdWVzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIHJlc0hlYWRlcnMpIHtcbiAgICAgIGlmIChrZXkgPT09IFwic2V0LWNvb2tpZVwiKSB7XG4gICAgICAgIHZhbHVlcy5wdXNoKHZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3Qgc2VjdXJlID0gdGhpc1tpc1NlY3VyZV07XG5cbiAgICBpZiAoIXNlY3VyZSAmJiBvcHRpb25zLnNlY3VyZSAmJiAhb3B0aW9ucy5pZ25vcmVJbnNlY3VyZSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgXCJDYW5ub3Qgc2VuZCBzZWN1cmUgY29va2llIG92ZXIgdW5lbmNyeXB0ZWQgY29ubmVjdGlvbi5cIixcbiAgICAgICk7XG4gICAgfVxuXG4gICAgY29uc3QgY29va2llID0gbmV3IENvb2tpZShrZXksIHZhbHVlLCBvcHRpb25zKTtcbiAgICBjb29raWUuc2VjdXJlID0gb3B0aW9ucy5zZWN1cmUgPz8gc2VjdXJlO1xuICAgIHB1c2hDb29raWUodmFsdWVzLCBjb29raWUpO1xuXG4gICAgcmVzSGVhZGVycy5kZWxldGUoXCJzZXQtY29va2llXCIpO1xuICAgIGZvciAoY29uc3QgdmFsdWUgb2YgdmFsdWVzKSB7XG4gICAgICByZXNIZWFkZXJzLmFwcGVuZChcInNldC1jb29raWVcIiwgdmFsdWUpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKiBJdGVyYXRlIG92ZXIgdGhlIGNvb2tpZSBrZXlzIGFuZCB2YWx1ZXMgdGhhdCBhcmUgcHJlc2VudCBpbiB0aGVcbiAgICoge0BsaW5rY29kZSBSZXF1ZXN0fS4gVGhpcyBpcyBhbiBhbGlhcyBvZiB0aGUgYFtTeW1ib2wuaXRlcmF0b3JdYCBtZXRob2RcbiAgICogcHJlc2VudCBvbiB0aGUgY2xhc3MuICovXG4gIGVudHJpZXMoKTogSXRlcmFibGVJdGVyYXRvcjxbc3RyaW5nLCBzdHJpbmddPiB7XG4gICAgcmV0dXJuIHRoaXNbU3ltYm9sLml0ZXJhdG9yXSgpO1xuICB9XG5cbiAgLyoqIEl0ZXJhdGUgb3ZlciB0aGUgY29va2llIGtleXMgdGhhdCBhcmUgcHJlc2VudCBpbiB0aGVcbiAgICoge0BsaW5rY29kZSBSZXF1ZXN0fS4gKi9cbiAgKmtleXMoKTogSXRlcmFibGVJdGVyYXRvcjxzdHJpbmc+IHtcbiAgICBmb3IgKGNvbnN0IFtrZXldIG9mIHRoaXMpIHtcbiAgICAgIHlpZWxkIGtleTtcbiAgICB9XG4gIH1cblxuICAvKiogSXRlcmF0ZSBvdmVyIHRoZSBjb29raWUgdmFsdWVzIHRoYXQgYXJlIHByZXNlbnQgaW4gdGhlXG4gICAqIHtAbGlua2NvZGUgUmVxdWVzdH0uICovXG4gICp2YWx1ZXMoKTogSXRlcmFibGVJdGVyYXRvcjxzdHJpbmc+IHtcbiAgICBmb3IgKGNvbnN0IFssIHZhbHVlXSBvZiB0aGlzKSB7XG4gICAgICB5aWVsZCB2YWx1ZTtcbiAgICB9XG4gIH1cblxuICAvKiogSXRlcmF0ZSBvdmVyIHRoZSBjb29raWUga2V5cyBhbmQgdmFsdWVzIHRoYXQgYXJlIHByZXNlbnQgaW4gdGhlXG4gICAqIHtAbGlua2NvZGUgUmVxdWVzdH0uICovXG4gICpbU3ltYm9sLml0ZXJhdG9yXSgpOiBJdGVyYWJsZUl0ZXJhdG9yPFtzdHJpbmcsIHN0cmluZ10+IHtcbiAgICBjb25zdCBrZXlzID0gdGhpc1tyZXF1ZXN0S2V5c10oKTtcbiAgICBmb3IgKGNvbnN0IGtleSBvZiBrZXlzKSB7XG4gICAgICBjb25zdCB2YWx1ZSA9IHRoaXMuZ2V0KGtleSk7XG4gICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgeWllbGQgW2tleSwgdmFsdWVdO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFR5cGVzIG9mIGRhdGEgdGhhdCBjYW4gYmUgc2lnbmVkIGNyeXB0b2dyYXBoaWNhbGx5LlxuICovXG5leHBvcnQgdHlwZSBEYXRhID0gc3RyaW5nIHwgbnVtYmVyW10gfCBBcnJheUJ1ZmZlciB8IFVpbnQ4QXJyYXk7XG5cbi8qKlxuICogQW4gaW50ZXJmYWNlIHdoaWNoIGRlc2NyaWJlcyB0aGUgbWV0aG9kcyB0aGF0IHtAbGlua2NvZGUgU2VjdXJlQ29va2llTWFwfVxuICogdXNlcyB0byBzaWduIGFuZCB2ZXJpZnkgY29va2llcy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBLZXlSaW5nIHtcbiAgLyoqIEdpdmVuIGEgc2V0IG9mIGRhdGEgYW5kIGEgZGlnZXN0LCByZXR1cm4gdGhlIGtleSBpbmRleCBvZiB0aGUga2V5IHVzZWRcbiAgICogdG8gc2lnbiB0aGUgZGF0YS4gVGhlIGluZGV4IGlzIDAgYmFzZWQuIEEgbm9uLW5lZ2F0aXZlIG51bWJlciBpbmRpY2VzIHRoZVxuICAgKiBkaWdlc3QgaXMgdmFsaWQgYW5kIGEga2V5IHdhcyBmb3VuZC4gKi9cbiAgaW5kZXhPZihkYXRhOiBEYXRhLCBkaWdlc3Q6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyPiB8IG51bWJlcjtcbiAgLyoqIFNpZ24gdGhlIGRhdGEsIHJldHVybmluZyBhIHN0cmluZyBiYXNlZCBkaWdlc3Qgb2YgdGhlIGRhdGEuICovXG4gIHNpZ24oZGF0YTogRGF0YSk6IFByb21pc2U8c3RyaW5nPiB8IHN0cmluZztcbiAgLyoqIFZlcmlmaWVzIHRoZSBkaWdlc3QgbWF0Y2hlcyB0aGUgcHJvdmlkZWQgZGF0YSwgaW5kaWNhdGluZyB0aGUgZGF0YSB3YXNcbiAgICogc2lnbmVkIGJ5IHRoZSBrZXlyaW5nIGFuZCBoYXMgbm90IGJlZW4gdGFtcGVyZWQgd2l0aC4gKi9cbiAgdmVyaWZ5KGRhdGE6IERhdGEsIGRpZ2VzdDogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB8IGJvb2xlYW47XG59XG5cbi8qKlxuICogUHJvdmlkZXMgYW4gd2F5IHRvIG1hbmFnZSBjb29raWVzIGluIGEgcmVxdWVzdCBhbmQgcmVzcG9uc2Ugb24gdGhlIHNlcnZlclxuICogYXMgYSBzaW5nbGUgaXRlcmFibGUgY29sbGVjdGlvbiwgYXMgd2VsbCBhcyB0aGUgYWJpbGl0eSB0byBzaWduIGFuZCB2ZXJpZnlcbiAqIGNvb2tpZXMgdG8gcHJldmVudCB0YW1wZXJpbmcuXG4gKlxuICogVGhlIG1ldGhvZHMgYW5kIHByb3BlcnRpZXMgYWxpZ24gdG8ge0BsaW5rY29kZSBNYXB9LCBidXQgZHVlIHRvIHRoZSBuZWVkIHRvXG4gKiBzdXBwb3J0IGFzeW5jaHJvbm91cyBjcnlwdG9ncmFwaGljIGtleXMsIGFsbCB0aGUgQVBJcyBvcGVyYXRlIGFzeW5jLiBXaGVuXG4gKiBjb25zdHJ1Y3RpbmcgYSB7QGxpbmtjb2RlIFJlcXVlc3R9IG9yIHtAbGlua2NvZGUgSGVhZGVyc30gZnJvbSB0aGUgcmVxdWVzdFxuICogbmVlZCB0byBiZSBwcm92aWRlZCwgYXMgd2VsbCBhcyBvcHRpb25hbGx5IHRoZSB7QGxpbmtjb2RlIFJlc3BvbnNlfSBvclxuICogYEhlYWRlcnNgIGZvciB0aGUgcmVzcG9uc2UgY2FuIGJlIHByb3ZpZGVkLiBBbHRlcm5hdGl2ZWx5IHRoZVxuICoge0BsaW5rY29kZSBtZXJnZUhlYWRlcnN9IGZ1bmN0aW9uIGNhbiBiZSB1c2VkIHRvIGdlbmVyYXRlIGEgZmluYWwgc2V0XG4gKiBvZiBoZWFkZXJzIGZvciBzZW5kaW5nIGluIHRoZSByZXNwb25zZS5cbiAqXG4gKiBPbiBjb25zdHJ1Y3Rpb24sIHRoZSBvcHRpb25hbCBzZXQgb2Yga2V5cyBpbXBsZW1lbnRpbmcgdGhlXG4gKiB7QGxpbmtjb2RlIEtleVJpbmd9IGludGVyZmFjZS4gV2hpbGUgaXQgaXMgb3B0aW9uYWwsIGlmIHlvdSBkb24ndCBwbGFuIHRvIHVzZVxuICoga2V5cywgeW91IG1pZ2h0IHdhbnQgdG8gY29uc2lkZXIgdXNpbmcganVzdCB0aGUge0BsaW5rY29kZSBDb29raWVNYXB9LlxuICovXG5leHBvcnQgY2xhc3MgU2VjdXJlQ29va2llTWFwIGV4dGVuZHMgQ29va2llTWFwQmFzZSB7XG4gICNrZXlSaW5nPzogS2V5UmluZztcblxuICAvKiogSXMgc2V0IHRvIGEgcHJvbWlzZSB3aGljaCByZXNvbHZlcyB3aXRoIHRoZSBudW1iZXIgb2YgY29va2llcyBpbiB0aGVcbiAgICoge0BsaW5rY29kZSBSZXF1ZXN0fS4gKi9cbiAgZ2V0IHNpemUoKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICByZXR1cm4gKGFzeW5jICgpID0+IHtcbiAgICAgIGxldCBzaXplID0gMDtcbiAgICAgIGZvciBhd2FpdCAoY29uc3QgXyBvZiB0aGlzKSB7XG4gICAgICAgIHNpemUrKztcbiAgICAgIH1cbiAgICAgIHJldHVybiBzaXplO1xuICAgIH0pKCk7XG4gIH1cblxuICBjb25zdHJ1Y3RvcihcbiAgICByZXF1ZXN0OiBIZWFkZXJzIHwgSGVhZGVyZWQsXG4gICAgb3B0aW9uczogU2VjdXJlQ29va2llTWFwT3B0aW9ucyA9IHt9LFxuICApIHtcbiAgICBzdXBlcihyZXF1ZXN0LCBvcHRpb25zKTtcbiAgICBjb25zdCB7IGtleXMgfSA9IG9wdGlvbnM7XG4gICAgdGhpcy4ja2V5UmluZyA9IGtleXM7XG4gIH1cblxuICAvKiogU2V0cyBhbGwgY29va2llcyBpbiB0aGUge0BsaW5rY29kZSBSZXF1ZXN0fSB0byBiZSBkZWxldGVkIGluIHRoZVxuICAgKiByZXNwb25zZS4gKi9cbiAgYXN5bmMgY2xlYXIob3B0aW9uczogU2VjdXJlQ29va2llTWFwU2V0RGVsZXRlT3B0aW9ucykge1xuICAgIGNvbnN0IHByb21pc2VzID0gW107XG4gICAgZm9yIGF3YWl0IChjb25zdCBrZXkgb2YgdGhpcy5rZXlzKCkpIHtcbiAgICAgIHByb21pc2VzLnB1c2godGhpcy5zZXQoa2V5LCBudWxsLCBvcHRpb25zKSk7XG4gICAgfVxuICAgIGF3YWl0IFByb21pc2UuYWxsKHByb21pc2VzKTtcbiAgfVxuXG4gIC8qKiBTZXQgYSBjb29raWUgdG8gYmUgZGVsZXRlZCBpbiB0aGUgcmVzcG9uc2UuXG4gICAqXG4gICAqIFRoaXMgaXMgYSBjb252ZW5pZW5jZSBmdW5jdGlvbiBmb3IgYHNldChrZXksIG51bGwsIG9wdGlvbnM/KWAuICovXG4gIGFzeW5jIGRlbGV0ZShcbiAgICBrZXk6IHN0cmluZyxcbiAgICBvcHRpb25zOiBTZWN1cmVDb29raWVNYXBTZXREZWxldGVPcHRpb25zID0ge30sXG4gICk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGF3YWl0IHRoaXMuc2V0KGtleSwgbnVsbCwgb3B0aW9ucyk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvKiogR2V0IHRoZSB2YWx1ZSBvZiBhIGNvb2tpZSBmcm9tIHRoZSB7QGxpbmtjb2RlIFJlcXVlc3R9LlxuICAgKlxuICAgKiBJZiB0aGUgY29va2llIGlzIHNpZ25lZCwgYW5kIHRoZSBzaWduYXR1cmUgaXMgaW52YWxpZCwgYHVuZGVmaW5lZGAgd2lsbCBiZVxuICAgKiByZXR1cm5lZCBhbmQgdGhlIGNvb2tpZSB3aWxsIGJlIHNldCB0byBiZSBkZWxldGVkIGluIHRoZSByZXNwb25zZS4gSWYgdGhlXG4gICAqIGNvb2tpZSBpcyB1c2luZyBhbiBcIm9sZFwiIGtleSBmcm9tIHRoZSBrZXlyaW5nLCB0aGUgY29va2llIHdpbGwgYmUgcmUtc2lnbmVkXG4gICAqIHdpdGggdGhlIGN1cnJlbnQga2V5IGFuZCBiZSBhZGRlZCB0byB0aGUgcmVzcG9uc2UgdG8gYmUgdXBkYXRlZC4gKi9cbiAgYXN5bmMgZ2V0KFxuICAgIGtleTogc3RyaW5nLFxuICAgIG9wdGlvbnM6IFNlY3VyZUNvb2tpZU1hcEdldE9wdGlvbnMgPSB7fSxcbiAgKTogUHJvbWlzZTxzdHJpbmcgfCB1bmRlZmluZWQ+IHtcbiAgICBjb25zdCBzaWduZWQgPSBvcHRpb25zLnNpZ25lZCA/PyAhIXRoaXMuI2tleVJpbmc7XG4gICAgY29uc3QgbmFtZVNpZyA9IGAke2tleX0uc2lnYDtcblxuICAgIGNvbnN0IGhlYWRlciA9IHRoaXNbcmVxdWVzdEhlYWRlcnNdLmdldChcImNvb2tpZVwiKTtcbiAgICBpZiAoIWhlYWRlcikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBtYXRjaCA9IGhlYWRlci5tYXRjaChnZXRQYXR0ZXJuKGtleSkpO1xuICAgIGlmICghbWF0Y2gpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgWywgdmFsdWVdID0gbWF0Y2g7XG4gICAgaWYgKCFzaWduZWQpIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gICAgY29uc3QgZGlnZXN0ID0gYXdhaXQgdGhpcy5nZXQobmFtZVNpZywgeyBzaWduZWQ6IGZhbHNlIH0pO1xuICAgIGlmICghZGlnZXN0KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGRhdGEgPSBgJHtrZXl9PSR7dmFsdWV9YDtcbiAgICBpZiAoIXRoaXMuI2tleVJpbmcpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJrZXkgcmluZyByZXF1aXJlZCBmb3Igc2lnbmVkIGNvb2tpZXNcIik7XG4gICAgfVxuICAgIGNvbnN0IGluZGV4ID0gYXdhaXQgdGhpcy4ja2V5UmluZy5pbmRleE9mKGRhdGEsIGRpZ2VzdCk7XG5cbiAgICBpZiAoaW5kZXggPCAwKSB7XG4gICAgICBhd2FpdCB0aGlzLmRlbGV0ZShuYW1lU2lnLCB7IHBhdGg6IFwiL1wiLCBzaWduZWQ6IGZhbHNlIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoaW5kZXgpIHtcbiAgICAgICAgYXdhaXQgdGhpcy5zZXQobmFtZVNpZywgYXdhaXQgdGhpcy4ja2V5UmluZy5zaWduKGRhdGEpLCB7XG4gICAgICAgICAgc2lnbmVkOiBmYWxzZSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuICB9XG5cbiAgLyoqIFJldHVybnMgYHRydWVgIGlmIHRoZSBrZXkgaXMgaW4gdGhlIHtAbGlua2NvZGUgUmVxdWVzdH0uXG4gICAqXG4gICAqIElmIHRoZSBjb29raWUgaXMgc2lnbmVkLCBhbmQgdGhlIHNpZ25hdHVyZSBpcyBpbnZhbGlkLCBgZmFsc2VgIHdpbGwgYmVcbiAgICogcmV0dXJuZWQgYW5kIHRoZSBjb29raWUgd2lsbCBiZSBzZXQgdG8gYmUgZGVsZXRlZCBpbiB0aGUgcmVzcG9uc2UuIElmIHRoZVxuICAgKiBjb29raWUgaXMgdXNpbmcgYW4gXCJvbGRcIiBrZXkgZnJvbSB0aGUga2V5cmluZywgdGhlIGNvb2tpZSB3aWxsIGJlIHJlLXNpZ25lZFxuICAgKiB3aXRoIHRoZSBjdXJyZW50IGtleSBhbmQgYmUgYWRkZWQgdG8gdGhlIHJlc3BvbnNlIHRvIGJlIHVwZGF0ZWQuICovXG4gIGFzeW5jIGhhcyhcbiAgICBrZXk6IHN0cmluZyxcbiAgICBvcHRpb25zOiBTZWN1cmVDb29raWVNYXBHZXRPcHRpb25zID0ge30sXG4gICk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGNvbnN0IHNpZ25lZCA9IG9wdGlvbnMuc2lnbmVkID8/ICEhdGhpcy4ja2V5UmluZztcbiAgICBjb25zdCBuYW1lU2lnID0gYCR7a2V5fS5zaWdgO1xuXG4gICAgY29uc3QgaGVhZGVyID0gdGhpc1tyZXF1ZXN0SGVhZGVyc10uZ2V0KFwiY29va2llXCIpO1xuICAgIGlmICghaGVhZGVyKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGNvbnN0IG1hdGNoID0gaGVhZGVyLm1hdGNoKGdldFBhdHRlcm4oa2V5KSk7XG4gICAgaWYgKCFtYXRjaCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAoIXNpZ25lZCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGNvbnN0IGRpZ2VzdCA9IGF3YWl0IHRoaXMuZ2V0KG5hbWVTaWcsIHsgc2lnbmVkOiBmYWxzZSB9KTtcbiAgICBpZiAoIWRpZ2VzdCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBjb25zdCBbLCB2YWx1ZV0gPSBtYXRjaDtcbiAgICBjb25zdCBkYXRhID0gYCR7a2V5fT0ke3ZhbHVlfWA7XG4gICAgaWYgKCF0aGlzLiNrZXlSaW5nKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwia2V5IHJpbmcgcmVxdWlyZWQgZm9yIHNpZ25lZCBjb29raWVzXCIpO1xuICAgIH1cbiAgICBjb25zdCBpbmRleCA9IGF3YWl0IHRoaXMuI2tleVJpbmcuaW5kZXhPZihkYXRhLCBkaWdlc3QpO1xuXG4gICAgaWYgKGluZGV4IDwgMCkge1xuICAgICAgYXdhaXQgdGhpcy5kZWxldGUobmFtZVNpZywgeyBwYXRoOiBcIi9cIiwgc2lnbmVkOiBmYWxzZSB9KTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGluZGV4KSB7XG4gICAgICAgIGF3YWl0IHRoaXMuc2V0KG5hbWVTaWcsIGF3YWl0IHRoaXMuI2tleVJpbmcuc2lnbihkYXRhKSwge1xuICAgICAgICAgIHNpZ25lZDogZmFsc2UsXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG5cbiAgLyoqIFNldCBhIGNvb2tpZSBpbiB0aGUgcmVzcG9uc2UgaGVhZGVycy5cbiAgICpcbiAgICogSWYgdGhlcmUgd2FzIGEga2V5cmluZyBzZXQsIGNvb2tpZXMgd2lsbCBiZSBhdXRvbWF0aWNhbGx5IHNpZ25lZCwgdW5sZXNzXG4gICAqIG92ZXJyaWRkZW4gYnkgdGhlIHBhc3NlZCBvcHRpb25zLiBDb29raWVzIGNhbiBiZSBkZWxldGVkIGJ5IHNldHRpbmcgdGhlXG4gICAqIHZhbHVlIHRvIGBudWxsYC4gKi9cbiAgYXN5bmMgc2V0KFxuICAgIGtleTogc3RyaW5nLFxuICAgIHZhbHVlOiBzdHJpbmcgfCBudWxsLFxuICAgIG9wdGlvbnM6IFNlY3VyZUNvb2tpZU1hcFNldERlbGV0ZU9wdGlvbnMgPSB7fSxcbiAgKTogUHJvbWlzZTx0aGlzPiB7XG4gICAgY29uc3QgcmVzSGVhZGVycyA9IHRoaXNbcmVzcG9uc2VIZWFkZXJzXTtcbiAgICBjb25zdCBoZWFkZXJzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIHJlc0hlYWRlcnMuZW50cmllcygpKSB7XG4gICAgICBpZiAoa2V5ID09PSBcInNldC1jb29raWVcIikge1xuICAgICAgICBoZWFkZXJzLnB1c2godmFsdWUpO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBzZWN1cmUgPSB0aGlzW2lzU2VjdXJlXTtcbiAgICBjb25zdCBzaWduZWQgPSBvcHRpb25zLnNpZ25lZCA/PyAhIXRoaXMuI2tleVJpbmc7XG5cbiAgICBpZiAoIXNlY3VyZSAmJiBvcHRpb25zLnNlY3VyZSAmJiAhb3B0aW9ucy5pZ25vcmVJbnNlY3VyZSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgXCJDYW5ub3Qgc2VuZCBzZWN1cmUgY29va2llIG92ZXIgdW5lbmNyeXB0ZWQgY29ubmVjdGlvbi5cIixcbiAgICAgICk7XG4gICAgfVxuXG4gICAgY29uc3QgY29va2llID0gbmV3IENvb2tpZShrZXksIHZhbHVlLCBvcHRpb25zKTtcbiAgICBjb29raWUuc2VjdXJlID0gb3B0aW9ucy5zZWN1cmUgPz8gc2VjdXJlO1xuICAgIHB1c2hDb29raWUoaGVhZGVycywgY29va2llKTtcblxuICAgIGlmIChzaWduZWQpIHtcbiAgICAgIGlmICghdGhpcy4ja2V5UmluZykge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwia2V5cyByZXF1aXJlZCBmb3Igc2lnbmVkIGNvb2tpZXMuXCIpO1xuICAgICAgfVxuICAgICAgY29va2llLnZhbHVlID0gYXdhaXQgdGhpcy4ja2V5UmluZy5zaWduKGNvb2tpZS50b1N0cmluZygpKTtcbiAgICAgIGNvb2tpZS5uYW1lICs9IFwiLnNpZ1wiO1xuICAgICAgcHVzaENvb2tpZShoZWFkZXJzLCBjb29raWUpO1xuICAgIH1cblxuICAgIHJlc0hlYWRlcnMuZGVsZXRlKFwic2V0LWNvb2tpZVwiKTtcbiAgICBmb3IgKGNvbnN0IGhlYWRlciBvZiBoZWFkZXJzKSB7XG4gICAgICByZXNIZWFkZXJzLmFwcGVuZChcInNldC1jb29raWVcIiwgaGVhZGVyKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKiogSXRlcmF0ZSBvdmVyIHRoZSB7QGxpbmtjb2RlIFJlcXVlc3R9IGNvb2tpZXMsIHlpZWxkaW5nIHVwIGEgdHVwbGVcbiAgICogY29udGFpbmluZyB0aGUga2V5IGFuZCB2YWx1ZSBvZiBlYWNoIGNvb2tpZS5cbiAgICpcbiAgICogSWYgYSBrZXkgcmluZyB3YXMgcHJvdmlkZWQsIG9ubHkgcHJvcGVybHkgc2lnbmVkIGNvb2tpZSBrZXlzIGFuZCB2YWx1ZXMgYXJlXG4gICAqIHJldHVybmVkLiAqL1xuICBlbnRyaWVzKCk6IEFzeW5jSXRlcmFibGVJdGVyYXRvcjxbc3RyaW5nLCBzdHJpbmddPiB7XG4gICAgcmV0dXJuIHRoaXNbU3ltYm9sLmFzeW5jSXRlcmF0b3JdKCk7XG4gIH1cblxuICAvKiogSXRlcmF0ZSBvdmVyIHRoZSByZXF1ZXN0J3MgY29va2llcywgeWllbGRpbmcgdXAgdGhlIGtleSBvZiBlYWNoIGNvb2tpZS5cbiAgICpcbiAgICogSWYgYSBrZXlyaW5nIHdhcyBwcm92aWRlZCwgb25seSBwcm9wZXJseSBzaWduZWQgY29va2llIGtleXMgYXJlXG4gICAqIHJldHVybmVkLiAqL1xuICBhc3luYyAqa2V5cygpOiBBc3luY0l0ZXJhYmxlSXRlcmF0b3I8c3RyaW5nPiB7XG4gICAgZm9yIGF3YWl0IChjb25zdCBba2V5XSBvZiB0aGlzKSB7XG4gICAgICB5aWVsZCBrZXk7XG4gICAgfVxuICB9XG5cbiAgLyoqIEl0ZXJhdGUgb3ZlciB0aGUgcmVxdWVzdCdzIGNvb2tpZXMsIHlpZWxkaW5nIHVwIHRoZSB2YWx1ZSBvZiBlYWNoIGNvb2tpZS5cbiAgICpcbiAgICogSWYgYSBrZXlyaW5nIHdhcyBwcm92aWRlZCwgb25seSBwcm9wZXJseSBzaWduZWQgY29va2llIHZhbHVlcyBhcmVcbiAgICogcmV0dXJuZWQuICovXG4gIGFzeW5jICp2YWx1ZXMoKTogQXN5bmNJdGVyYWJsZUl0ZXJhdG9yPHN0cmluZz4ge1xuICAgIGZvciBhd2FpdCAoY29uc3QgWywgdmFsdWVdIG9mIHRoaXMpIHtcbiAgICAgIHlpZWxkIHZhbHVlO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBJdGVyYXRlIG92ZXIgdGhlIHtAbGlua2NvZGUgUmVxdWVzdH0gY29va2llcywgeWllbGRpbmcgdXAgYSB0dXBsZVxuICAgKiBjb250YWluaW5nIHRoZSBrZXkgYW5kIHZhbHVlIG9mIGVhY2ggY29va2llLlxuICAgKlxuICAgKiBJZiBhIGtleSByaW5nIHdhcyBwcm92aWRlZCwgb25seSBwcm9wZXJseSBzaWduZWQgY29va2llIGtleXMgYW5kIHZhbHVlcyBhcmVcbiAgICogcmV0dXJuZWQuICovXG4gIGFzeW5jICpbU3ltYm9sLmFzeW5jSXRlcmF0b3JdKCk6IEFzeW5jSXRlcmFibGVJdGVyYXRvcjxbc3RyaW5nLCBzdHJpbmddPiB7XG4gICAgY29uc3Qga2V5cyA9IHRoaXNbcmVxdWVzdEtleXNdKCk7XG4gICAgZm9yIChjb25zdCBrZXkgb2Yga2V5cykge1xuICAgICAgY29uc3QgdmFsdWUgPSBhd2FpdCB0aGlzLmdldChrZXkpO1xuICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgIHlpZWxkIFtrZXksIHZhbHVlXTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSx5RUFBeUU7QUFFekU7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztDQThFQztBQTBIRCxvQ0FBb0M7QUFDcEMsTUFBTSx1QkFBdUI7QUFDN0IsTUFBTSxhQUFhO0FBQ25CLE1BQU0sbUJBQW1CO0FBRXpCLE1BQU0sYUFBcUMsQ0FBQztBQUM1QyxTQUFTLFdBQVcsSUFBWTtFQUM5QixJQUFJLFFBQVEsWUFBWTtJQUN0QixPQUFPLFVBQVUsQ0FBQyxLQUFLO0VBQ3pCO0VBRUEsT0FBTyxVQUFVLENBQUMsS0FBSyxHQUFHLElBQUksT0FD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
// denoCacheMetadata=17357551846011639081,18080235598958970615