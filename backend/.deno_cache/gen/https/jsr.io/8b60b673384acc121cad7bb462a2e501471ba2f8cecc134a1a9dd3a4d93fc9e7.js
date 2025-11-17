/*!
 * Adapted directly from forwarded-parse at https://github.com/lpinca/forwarded-parse
 * which is licensed as follows:
 *
 * Copyright(c) 2015 Luigi Pinca
 * Copyright(c) 2023 the oak authors
 * MIT Licensed
 */ /**
 * Provides utilities for parsing and validating the `Forwarded` header.
 *
 * @module
 */ import { assert } from "jsr:@std/assert@^1.0/assert";
/**
 * Unescape a string.
 *
 * @param str The string to unescape.
 * @returns A new unescaped string.
 */ function decode(value) {
  return value.replace(/\\(.)/g, "$1");
}
/**
 * Check if a character is a delimiter as defined in section 3.2.6 of RFC 7230.
 *
 * @param code The code of the character to check.
 * @returns `true` if the character is a delimiter, else `false`.
 */ function isDelimiter(code) {
  return code === 0x22 || // '"'
  code === 0x28 || // '('
  code === 0x29 || // ')'
  code === 0x2C || // ','
  code === 0x2F || // '/'
  code >= 0x3A && code <= 0x40 || // ':', ';', '<', '=', '>', '?' '@'
  code >= 0x5B && code <= 0x5D || // '[', '\', ']'
  code === 0x7B || // '{'
  code === 0x7D; // '}'
}
/**
 * Check if a character is an extended ASCII character.
 *
 * @param code The code of the character to check.
 * @returns `true` if `code` is in the %x80-FF range, else `false`.
 */ function isExtended(code) {
  return code >= 0x80 && code <= 0xFF;
}
/**
 * Check if a character is a printable ASCII character.
 *
 * @param code The code of the character to check.
 * @returns `true` if `code` is in the %x20-7E range, else `false`.
 */ function isPrint(code) {
  return code >= 0x20 && code <= 0x7E;
}
/**
 * Check if a character is allowed in a token as defined in section 3.2.6
 * of RFC 7230.
 *
 * @param code The code of the character to check.
 * @returns `true` if the character is allowed, else `false`.
 */ function isTokenChar(code) {
  return code === 0x21 || // '!'
  code >= 0x23 && code <= 0x27 || // '#', '$', '%', '&', '''
  code === 0x2A || // '*'
  code === 0x2B || // '+'
  code === 0x2D || // '-'
  code === 0x2E || // '.'
  code >= 0x30 && code <= 0x39 || // 0-9
  code >= 0x41 && code <= 0x5A || // A-Z
  code >= 0x5E && code <= 0x7A || // '^', '_', '`', a-z
  code === 0x7C || // '|'
  code === 0x7E; // '~'
}
/**
 * Parse the `Forwarded` header field value into an array of objects. If the
 * value is not parsable, `undefined` is returned.
 *
 * @param value The header field value.
 */ export function parse(value) {
  let parameter;
  let start = -1;
  let end = -1;
  let isEscaping = false;
  let inQuotes = false;
  let mustUnescape = false;
  let code;
  let forwarded = {};
  const output = [];
  let i;
  for(i = 0; i < value.length; i++){
    code = value.charCodeAt(i);
    if (parameter === undefined) {
      if (i !== 0 && start === -1 && (code === 0x20 || code === 0x09)) {
        continue;
      }
      if (isTokenChar(code)) {
        if (start === -1) {
          start = i;
        }
      } else if (code === 0x3D && start !== -1) {
        parameter = value.slice(start, i).toLowerCase();
        start = -1;
      } else {
        return undefined;
      }
    } else {
      if (isEscaping && (code === 0x09 || isPrint(code) || isExtended(code))) {
        isEscaping = false;
      } else if (isTokenChar(code)) {
        if (end !== -1) {
          return undefined;
        }
        if (start === -1) {
          start = i;
        }
      } else if (isDelimiter(code) || isExtended(code)) {
        if (inQuotes) {
          if (code === 0x22) {
            inQuotes = false;
            end = i;
          } else if (code === 0x5C) {
            if (start === -1) {
              start = i;
            }
            isEscaping = mustUnescape = true;
          } else if (start === -1) {
            start = i;
          }
        } else if (code === 0x22 && value.charCodeAt(i - 1) === 0x3D) {
          inQuotes = true;
        } else if ((code === 0x2C || code === 0x3B) && (start !== -1 || end !== -1)) {
          assert(parameter, "Variable 'parameter' not defined.");
          if (start !== -1) {
            if (end === -1) {
              end = i;
            }
            forwarded[parameter] = mustUnescape ? decode(value.slice(start, end)) : value.slice(start, end);
          } else {
            forwarded[parameter] = "";
          }
          if (code === 0x2C) {
            output.push(forwarded);
            forwarded = {};
          }
          parameter = undefined;
          start = end = -1;
        } else {
          return undefined;
        }
      } else if (code === 0x20 || code === 0x09) {
        if (end !== -1) {
          continue;
        }
        if (inQuotes) {
          if (start === -1) {
            start = i;
          }
        } else if (start !== -1) {
          end = i;
        } else {
          return undefined;
        }
      } else {
        return undefined;
      }
    }
  }
  if (parameter === undefined || inQuotes || start === -1 && end === -1 || code === 0x20 || code === 0x09) {
    return undefined;
  }
  if (start !== -1) {
    if (end === -1) {
      end = i;
    }
    forwarded[parameter] = mustUnescape ? decode(value.slice(start, end)) : value.slice(start, end);
  } else {
    forwarded[parameter] = "";
  }
  output.push(forwarded);
  return output;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BvYWsvY29tbW9ucy8xLjAuMS9mb3J3YXJkZWQudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyohXG4gKiBBZGFwdGVkIGRpcmVjdGx5IGZyb20gZm9yd2FyZGVkLXBhcnNlIGF0IGh0dHBzOi8vZ2l0aHViLmNvbS9scGluY2EvZm9yd2FyZGVkLXBhcnNlXG4gKiB3aGljaCBpcyBsaWNlbnNlZCBhcyBmb2xsb3dzOlxuICpcbiAqIENvcHlyaWdodChjKSAyMDE1IEx1aWdpIFBpbmNhXG4gKiBDb3B5cmlnaHQoYykgMjAyMyB0aGUgb2FrIGF1dGhvcnNcbiAqIE1JVCBMaWNlbnNlZFxuICovXG5cbi8qKlxuICogUHJvdmlkZXMgdXRpbGl0aWVzIGZvciBwYXJzaW5nIGFuZCB2YWxpZGF0aW5nIHRoZSBgRm9yd2FyZGVkYCBoZWFkZXIuXG4gKlxuICogQG1vZHVsZVxuICovXG5cbmltcG9ydCB7IGFzc2VydCB9IGZyb20gXCJqc3I6QHN0ZC9hc3NlcnRAXjEuMC9hc3NlcnRcIjtcblxuLyoqXG4gKiBVbmVzY2FwZSBhIHN0cmluZy5cbiAqXG4gKiBAcGFyYW0gc3RyIFRoZSBzdHJpbmcgdG8gdW5lc2NhcGUuXG4gKiBAcmV0dXJucyBBIG5ldyB1bmVzY2FwZWQgc3RyaW5nLlxuICovXG5mdW5jdGlvbiBkZWNvZGUodmFsdWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiB2YWx1ZS5yZXBsYWNlKC9cXFxcKC4pL2csIFwiJDFcIik7XG59XG5cbi8qKlxuICogQ2hlY2sgaWYgYSBjaGFyYWN0ZXIgaXMgYSBkZWxpbWl0ZXIgYXMgZGVmaW5lZCBpbiBzZWN0aW9uIDMuMi42IG9mIFJGQyA3MjMwLlxuICpcbiAqIEBwYXJhbSBjb2RlIFRoZSBjb2RlIG9mIHRoZSBjaGFyYWN0ZXIgdG8gY2hlY2suXG4gKiBAcmV0dXJucyBgdHJ1ZWAgaWYgdGhlIGNoYXJhY3RlciBpcyBhIGRlbGltaXRlciwgZWxzZSBgZmFsc2VgLlxuICovXG5mdW5jdGlvbiBpc0RlbGltaXRlcihjb2RlOiBudW1iZXIpOiBib29sZWFuIHtcbiAgcmV0dXJuIGNvZGUgPT09IDB4MjIgfHwgLy8gJ1wiJ1xuICAgIGNvZGUgPT09IDB4MjggfHwgLy8gJygnXG4gICAgY29kZSA9PT0gMHgyOSB8fCAvLyAnKSdcbiAgICBjb2RlID09PSAweDJDIHx8IC8vICcsJ1xuICAgIGNvZGUgPT09IDB4MkYgfHwgLy8gJy8nXG4gICAgY29kZSA+PSAweDNBICYmIGNvZGUgPD0gMHg0MCB8fCAvLyAnOicsICc7JywgJzwnLCAnPScsICc+JywgJz8nICdAJ1xuICAgIGNvZGUgPj0gMHg1QiAmJiBjb2RlIDw9IDB4NUQgfHwgLy8gJ1snLCAnXFwnLCAnXSdcbiAgICBjb2RlID09PSAweDdCIHx8IC8vICd7J1xuICAgIGNvZGUgPT09IDB4N0Q7IC8vICd9J1xufVxuXG4vKipcbiAqIENoZWNrIGlmIGEgY2hhcmFjdGVyIGlzIGFuIGV4dGVuZGVkIEFTQ0lJIGNoYXJhY3Rlci5cbiAqXG4gKiBAcGFyYW0gY29kZSBUaGUgY29kZSBvZiB0aGUgY2hhcmFjdGVyIHRvIGNoZWNrLlxuICogQHJldHVybnMgYHRydWVgIGlmIGBjb2RlYCBpcyBpbiB0aGUgJXg4MC1GRiByYW5nZSwgZWxzZSBgZmFsc2VgLlxuICovXG5mdW5jdGlvbiBpc0V4dGVuZGVkKGNvZGU6IG51bWJlcik6IGJvb2xlYW4ge1xuICByZXR1cm4gY29kZSA+PSAweDgwICYmIGNvZGUgPD0gMHhGRjtcbn1cblxuLyoqXG4gKiBDaGVjayBpZiBhIGNoYXJhY3RlciBpcyBhIHByaW50YWJsZSBBU0NJSSBjaGFyYWN0ZXIuXG4gKlxuICogQHBhcmFtIGNvZGUgVGhlIGNvZGUgb2YgdGhlIGNoYXJhY3RlciB0byBjaGVjay5cbiAqIEByZXR1cm5zIGB0cnVlYCBpZiBgY29kZWAgaXMgaW4gdGhlICV4MjAtN0UgcmFuZ2UsIGVsc2UgYGZhbHNlYC5cbiAqL1xuZnVuY3Rpb24gaXNQcmludChjb2RlOiBudW1iZXIpOiBib29sZWFuIHtcbiAgcmV0dXJuIGNvZGUgPj0gMHgyMCAmJiBjb2RlIDw9IDB4N0U7XG59XG5cbi8qKlxuICogQ2hlY2sgaWYgYSBjaGFyYWN0ZXIgaXMgYWxsb3dlZCBpbiBhIHRva2VuIGFzIGRlZmluZWQgaW4gc2VjdGlvbiAzLjIuNlxuICogb2YgUkZDIDcyMzAuXG4gKlxuICogQHBhcmFtIGNvZGUgVGhlIGNvZGUgb2YgdGhlIGNoYXJhY3RlciB0byBjaGVjay5cbiAqIEByZXR1cm5zIGB0cnVlYCBpZiB0aGUgY2hhcmFjdGVyIGlzIGFsbG93ZWQsIGVsc2UgYGZhbHNlYC5cbiAqL1xuZnVuY3Rpb24gaXNUb2tlbkNoYXIoY29kZTogbnVtYmVyKTogYm9vbGVhbiB7XG4gIHJldHVybiBjb2RlID09PSAweDIxIHx8IC8vICchJ1xuICAgIGNvZGUgPj0gMHgyMyAmJiBjb2RlIDw9IDB4MjcgfHwgLy8gJyMnLCAnJCcsICclJywgJyYnLCAnJydcbiAgICBjb2RlID09PSAweDJBIHx8IC8vICcqJ1xuICAgIGNvZGUgPT09IDB4MkIgfHwgLy8gJysnXG4gICAgY29kZSA9PT0gMHgyRCB8fCAvLyAnLSdcbiAgICBjb2RlID09PSAweDJFIHx8IC8vICcuJ1xuICAgIGNvZGUgPj0gMHgzMCAmJiBjb2RlIDw9IDB4MzkgfHwgLy8gMC05XG4gICAgY29kZSA+PSAweDQxICYmIGNvZGUgPD0gMHg1QSB8fCAvLyBBLVpcbiAgICBjb2RlID49IDB4NUUgJiYgY29kZSA8PSAweDdBIHx8IC8vICdeJywgJ18nLCAnYCcsIGEtelxuICAgIGNvZGUgPT09IDB4N0MgfHwgLy8gJ3wnXG4gICAgY29kZSA9PT0gMHg3RTsgLy8gJ34nXG59XG5cbi8qKlxuICogUGFyc2UgdGhlIGBGb3J3YXJkZWRgIGhlYWRlciBmaWVsZCB2YWx1ZSBpbnRvIGFuIGFycmF5IG9mIG9iamVjdHMuIElmIHRoZVxuICogdmFsdWUgaXMgbm90IHBhcnNhYmxlLCBgdW5kZWZpbmVkYCBpcyByZXR1cm5lZC5cbiAqXG4gKiBAcGFyYW0gdmFsdWUgVGhlIGhlYWRlciBmaWVsZCB2YWx1ZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlKHZhbHVlOiBzdHJpbmcpOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+W10gfCB1bmRlZmluZWQge1xuICBsZXQgcGFyYW1ldGVyOiB1bmRlZmluZWQgfCBzdHJpbmc7XG4gIGxldCBzdGFydCA9IC0xO1xuICBsZXQgZW5kID0gLTE7XG4gIGxldCBpc0VzY2FwaW5nID0gZmFsc2U7XG4gIGxldCBpblF1b3RlcyA9IGZhbHNlO1xuICBsZXQgbXVzdFVuZXNjYXBlID0gZmFsc2U7XG5cbiAgbGV0IGNvZGU7XG4gIGxldCBmb3J3YXJkZWQ6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcbiAgY29uc3Qgb3V0cHV0OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+W10gPSBbXTtcbiAgbGV0IGk7XG5cbiAgZm9yIChpID0gMDsgaSA8IHZhbHVlLmxlbmd0aDsgaSsrKSB7XG4gICAgY29kZSA9IHZhbHVlLmNoYXJDb2RlQXQoaSk7XG5cbiAgICBpZiAocGFyYW1ldGVyID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGlmIChpICE9PSAwICYmIHN0YXJ0ID09PSAtMSAmJiAoY29kZSA9PT0gMHgyMCB8fCBjb2RlID09PSAweDA5KSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKGlzVG9rZW5DaGFyKGNvZGUpKSB7XG4gICAgICAgIGlmIChzdGFydCA9PT0gLTEpIHtcbiAgICAgICAgICBzdGFydCA9IGk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoY29kZSA9PT0gMHgzRCAmJiBzdGFydCAhPT0gLTEpIHtcbiAgICAgICAgcGFyYW1ldGVyID0gdmFsdWUuc2xpY2Uoc3RhcnQsIGkpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIHN0YXJ0ID0gLTE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoXG4gICAgICAgIGlzRXNjYXBpbmcgJiYgKGNvZGUgPT09IDB4MDkgfHwgaXNQcmludChjb2RlKSB8fCBpc0V4dGVuZGVkKGNvZGUpKVxuICAgICAgKSB7XG4gICAgICAgIGlzRXNjYXBpbmcgPSBmYWxzZTtcbiAgICAgIH0gZWxzZSBpZiAoaXNUb2tlbkNoYXIoY29kZSkpIHtcbiAgICAgICAgaWYgKGVuZCAhPT0gLTEpIHtcbiAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdGFydCA9PT0gLTEpIHtcbiAgICAgICAgICBzdGFydCA9IGk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoaXNEZWxpbWl0ZXIoY29kZSkgfHwgaXNFeHRlbmRlZChjb2RlKSkge1xuICAgICAgICBpZiAoaW5RdW90ZXMpIHtcbiAgICAgICAgICBpZiAoY29kZSA9PT0gMHgyMikge1xuICAgICAgICAgICAgaW5RdW90ZXMgPSBmYWxzZTtcbiAgICAgICAgICAgIGVuZCA9IGk7XG4gICAgICAgICAgfSBlbHNlIGlmIChjb2RlID09PSAweDVDKSB7XG4gICAgICAgICAgICBpZiAoc3RhcnQgPT09IC0xKSB7XG4gICAgICAgICAgICAgIHN0YXJ0ID0gaTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlzRXNjYXBpbmcgPSBtdXN0VW5lc2NhcGUgPSB0cnVlO1xuICAgICAgICAgIH0gZWxzZSBpZiAoc3RhcnQgPT09IC0xKSB7XG4gICAgICAgICAgICBzdGFydCA9IGk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGNvZGUgPT09IDB4MjIgJiYgdmFsdWUuY2hhckNvZGVBdChpIC0gMSkgPT09IDB4M0QpIHtcbiAgICAgICAgICBpblF1b3RlcyA9IHRydWU7XG4gICAgICAgIH0gZWxzZSBpZiAoXG4gICAgICAgICAgKGNvZGUgPT09IDB4MkMgfHwgY29kZSA9PT0gMHgzQikgJiYgKHN0YXJ0ICE9PSAtMSB8fCBlbmQgIT09IC0xKVxuICAgICAgICApIHtcbiAgICAgICAgICBhc3NlcnQocGFyYW1ldGVyLCBcIlZhcmlhYmxlICdwYXJhbWV0ZXInIG5vdCBkZWZpbmVkLlwiKTtcbiAgICAgICAgICBpZiAoc3RhcnQgIT09IC0xKSB7XG4gICAgICAgICAgICBpZiAoZW5kID09PSAtMSkge1xuICAgICAgICAgICAgICBlbmQgPSBpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmb3J3YXJkZWRbcGFyYW1ldGVyXSA9IG11c3RVbmVzY2FwZVxuICAgICAgICAgICAgICA/IGRlY29kZSh2YWx1ZS5zbGljZShzdGFydCwgZW5kKSlcbiAgICAgICAgICAgICAgOiB2YWx1ZS5zbGljZShzdGFydCwgZW5kKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yd2FyZGVkW3BhcmFtZXRlcl0gPSBcIlwiO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChjb2RlID09PSAweDJDKSB7XG4gICAgICAgICAgICBvdXRwdXQucHVzaChmb3J3YXJkZWQpO1xuICAgICAgICAgICAgZm9yd2FyZGVkID0ge307XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcGFyYW1ldGVyID0gdW5kZWZpbmVkO1xuICAgICAgICAgIHN0YXJ0ID0gZW5kID0gLTE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChjb2RlID09PSAweDIwIHx8IGNvZGUgPT09IDB4MDkpIHtcbiAgICAgICAgaWYgKGVuZCAhPT0gLTEpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpblF1b3Rlcykge1xuICAgICAgICAgIGlmIChzdGFydCA9PT0gLTEpIHtcbiAgICAgICAgICAgIHN0YXJ0ID0gaTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoc3RhcnQgIT09IC0xKSB7XG4gICAgICAgICAgZW5kID0gaTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlmIChcbiAgICBwYXJhbWV0ZXIgPT09IHVuZGVmaW5lZCB8fCBpblF1b3RlcyB8fCAoc3RhcnQgPT09IC0xICYmIGVuZCA9PT0gLTEpIHx8XG4gICAgY29kZSA9PT0gMHgyMCB8fCBjb2RlID09PSAweDA5XG4gICkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICBpZiAoc3RhcnQgIT09IC0xKSB7XG4gICAgaWYgKGVuZCA9PT0gLTEpIHtcbiAgICAgIGVuZCA9IGk7XG4gICAgfVxuICAgIGZvcndhcmRlZFtwYXJhbWV0ZXJdID0gbXVzdFVuZXNjYXBlXG4gICAgICA/IGRlY29kZSh2YWx1ZS5zbGljZShzdGFydCwgZW5kKSlcbiAgICAgIDogdmFsdWUuc2xpY2Uoc3RhcnQsIGVuZCk7XG4gIH0gZWxzZSB7XG4gICAgZm9yd2FyZGVkW3BhcmFtZXRlcl0gPSBcIlwiO1xuICB9XG5cbiAgb3V0cHV0LnB1c2goZm9yd2FyZGVkKTtcbiAgcmV0dXJuIG91dHB1dDtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7OztDQU9DLEdBRUQ7Ozs7Q0FJQyxHQUVELFNBQVMsTUFBTSxRQUFRLDhCQUE4QjtBQUVyRDs7Ozs7Q0FLQyxHQUNELFNBQVMsT0FBTyxLQUFhO0VBQzNCLE9BQU8sTUFBTSxPQUFPLENBQUMsVUFBVTtBQUNqQztBQUVBOzs7OztDQUtDLEdBQ0QsU0FBUyxZQUFZLElBQVk7RUFDL0IsT0FBTyxTQUFTLFFBQVEsTUFBTTtFQUM1QixTQUFTLFFBQVEsTUFBTTtFQUN2QixTQUFTLFFBQVEsTUFBTTtFQUN2QixTQUFTLFFBQVEsTUFBTTtFQUN2QixTQUFTLFFBQVEsTUFBTTtFQUN2QixRQUFRLFFBQVEsUUFBUSxRQUFRLG1DQUFtQztFQUNuRSxRQUFRLFFBQVEsUUFBUSxR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
// denoCacheMetadata=5725674979507438287,12632773856082420464