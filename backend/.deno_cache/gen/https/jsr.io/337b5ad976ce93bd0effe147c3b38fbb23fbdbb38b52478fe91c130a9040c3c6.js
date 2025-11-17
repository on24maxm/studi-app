// Copyright 2018-2025 the Deno authors. MIT license.
/*!
 * Adapted directly from negotiator at https://github.com/jshttp/negotiator/
 * which is licensed as follows:
 *
 * (The MIT License)
 *
 * Copyright (c) 2012-2014 Federico Romero
 * Copyright (c) 2012-2014 Isaac Z. Schlueter
 * Copyright (c) 2014-2015 Douglas Christopher Wilson
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * 'Software'), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */ import { compareSpecs, isQuality } from "./common.ts";
const simpleEncodingRegExp = /^\s*([^\s;]+)\s*(?:;(.*))?$/;
function parseEncoding(str, i) {
  const match = simpleEncodingRegExp.exec(str);
  if (!match) {
    return undefined;
  }
  const encoding = match[1];
  let q = 1;
  if (match[2]) {
    const params = match[2].split(";");
    for (const param of params){
      const p = param.trim().split("=");
      if (p[0] === "q" && p[1]) {
        q = parseFloat(p[1]);
        break;
      }
    }
  }
  return {
    encoding,
    o: undefined,
    q,
    i,
    s: undefined
  };
}
function specify(encoding, spec, i = -1) {
  if (!spec.encoding) {
    return;
  }
  let s = 0;
  if (spec.encoding.toLowerCase() === encoding.toLowerCase()) {
    s = 1;
  } else if (spec.encoding !== "*") {
    return;
  }
  return {
    i,
    o: spec.i,
    q: spec.q,
    s
  };
}
function parseAcceptEncoding(accept) {
  const accepts = accept.split(",");
  const parsedAccepts = [];
  let hasIdentity = false;
  let minQuality = 1;
  for (const [i, accept] of accepts.entries()){
    const encoding = parseEncoding(accept.trim(), i);
    if (encoding) {
      parsedAccepts.push(encoding);
      hasIdentity = hasIdentity || !!specify("identity", encoding);
      minQuality = Math.min(minQuality, encoding.q || 1);
    }
  }
  if (!hasIdentity) {
    parsedAccepts.push({
      encoding: "identity",
      o: undefined,
      q: minQuality,
      i: accepts.length - 1,
      s: undefined
    });
  }
  return parsedAccepts;
}
function getEncodingPriority(encoding, accepted, index) {
  let priority = {
    o: -1,
    q: 0,
    s: 0,
    i: 0
  };
  for (const s of accepted){
    const spec = specify(encoding, s, index);
    if (spec && (priority.s - spec.s || priority.q - spec.q || priority.o - spec.o) < 0) {
      priority = spec;
    }
  }
  return priority;
}
/** Given an `Accept-Encoding` string, parse out the encoding returning a
 * negotiated encoding based on the `provided` encodings otherwise just a
 * prioritized array of encodings. */ export function preferredEncodings(accept, provided) {
  const accepts = parseAcceptEncoding(accept);
  if (!provided) {
    return accepts.filter(isQuality).sort(compareSpecs).map((spec)=>spec.encoding);
  }
  const priorities = provided.map((type, index)=>getEncodingPriority(type, accepts, index));
  return priorities.filter(isQuality).sort(compareSpecs).map((priority)=>provided[priorities.indexOf(priority)]);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vanNyLmlvL0BzdGQvaHR0cC8xLjAuMjAvX25lZ290aWF0aW9uL2VuY29kaW5nLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjUgdGhlIERlbm8gYXV0aG9ycy4gTUlUIGxpY2Vuc2UuXG4vKiFcbiAqIEFkYXB0ZWQgZGlyZWN0bHkgZnJvbSBuZWdvdGlhdG9yIGF0IGh0dHBzOi8vZ2l0aHViLmNvbS9qc2h0dHAvbmVnb3RpYXRvci9cbiAqIHdoaWNoIGlzIGxpY2Vuc2VkIGFzIGZvbGxvd3M6XG4gKlxuICogKFRoZSBNSVQgTGljZW5zZSlcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTItMjAxNCBGZWRlcmljbyBSb21lcm9cbiAqIENvcHlyaWdodCAoYykgMjAxMi0yMDE0IElzYWFjIFouIFNjaGx1ZXRlclxuICogQ29weXJpZ2h0IChjKSAyMDE0LTIwMTUgRG91Z2xhcyBDaHJpc3RvcGhlciBXaWxzb25cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmdcbiAqIGEgY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuICogJ1NvZnR3YXJlJyksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuICogd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuICogZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvXG4gKiBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG9cbiAqIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZVxuICogaW5jbHVkZWQgaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEICdBUyBJUycsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsXG4gKiBFWFBSRVNTIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0ZcbiAqIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC5cbiAqIElOIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZXG4gKiBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULFxuICogVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEVcbiAqIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuICovXG5cbmltcG9ydCB7IGNvbXBhcmVTcGVjcywgaXNRdWFsaXR5LCB0eXBlIFNwZWNpZmljaXR5IH0gZnJvbSBcIi4vY29tbW9uLnRzXCI7XG5cbmludGVyZmFjZSBFbmNvZGluZ1NwZWNpZmljaXR5IGV4dGVuZHMgU3BlY2lmaWNpdHkge1xuICBlbmNvZGluZz86IHN0cmluZztcbn1cblxuY29uc3Qgc2ltcGxlRW5jb2RpbmdSZWdFeHAgPSAvXlxccyooW15cXHM7XSspXFxzKig/OjsoLiopKT8kLztcblxuZnVuY3Rpb24gcGFyc2VFbmNvZGluZyhcbiAgc3RyOiBzdHJpbmcsXG4gIGk6IG51bWJlcixcbik6IEVuY29kaW5nU3BlY2lmaWNpdHkgfCB1bmRlZmluZWQge1xuICBjb25zdCBtYXRjaCA9IHNpbXBsZUVuY29kaW5nUmVnRXhwLmV4ZWMoc3RyKTtcbiAgaWYgKCFtYXRjaCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICBjb25zdCBlbmNvZGluZyA9IG1hdGNoWzFdITtcbiAgbGV0IHEgPSAxO1xuICBpZiAobWF0Y2hbMl0pIHtcbiAgICBjb25zdCBwYXJhbXMgPSBtYXRjaFsyXS5zcGxpdChcIjtcIik7XG4gICAgZm9yIChjb25zdCBwYXJhbSBvZiBwYXJhbXMpIHtcbiAgICAgIGNvbnN0IHAgPSBwYXJhbS50cmltKCkuc3BsaXQoXCI9XCIpO1xuICAgICAgaWYgKHBbMF0gPT09IFwicVwiICYmIHBbMV0pIHtcbiAgICAgICAgcSA9IHBhcnNlRmxvYXQocFsxXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7IGVuY29kaW5nLCBvOiB1bmRlZmluZWQsIHEsIGksIHM6IHVuZGVmaW5lZCB9O1xufVxuXG5mdW5jdGlvbiBzcGVjaWZ5KFxuICBlbmNvZGluZzogc3RyaW5nLFxuICBzcGVjOiBFbmNvZGluZ1NwZWNpZmljaXR5LFxuICBpID0gLTEsXG4pOiBTcGVjaWZpY2l0eSB8IHVuZGVmaW5lZCB7XG4gIGlmICghc3BlYy5lbmNvZGluZykge1xuICAgIHJldHVybjtcbiAgfVxuICBsZXQgcyA9IDA7XG4gIGlmIChzcGVjLmVuY29kaW5nLnRvTG93ZXJDYXNlKCkgPT09IGVuY29kaW5nLnRvTG93ZXJDYXNlKCkpIHtcbiAgICBzID0gMTtcbiAgfSBlbHNlIGlmIChzcGVjLmVuY29kaW5nICE9PSBcIipcIikge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgaSxcbiAgICBvOiBzcGVjLmksXG4gICAgcTogc3BlYy5xLFxuICAgIHMsXG4gIH07XG59XG5cbmZ1bmN0aW9uIHBhcnNlQWNjZXB0RW5jb2RpbmcoYWNjZXB0OiBzdHJpbmcpOiBFbmNvZGluZ1NwZWNpZmljaXR5W10ge1xuICBjb25zdCBhY2NlcHRzID0gYWNjZXB0LnNwbGl0KFwiLFwiKTtcbiAgY29uc3QgcGFyc2VkQWNjZXB0czogRW5jb2RpbmdTcGVjaWZpY2l0eVtdID0gW107XG4gIGxldCBoYXNJZGVudGl0eSA9IGZhbHNlO1xuICBsZXQgbWluUXVhbGl0eSA9IDE7XG5cbiAgZm9yIChjb25zdCBbaSwgYWNjZXB0XSBvZiBhY2NlcHRzLmVudHJpZXMoKSkge1xuICAgIGNvbnN0IGVuY29kaW5nID0gcGFyc2VFbmNvZGluZyhhY2NlcHQudHJpbSgpLCBpKTtcblxuICAgIGlmIChlbmNvZGluZykge1xuICAgICAgcGFyc2VkQWNjZXB0cy5wdXNoKGVuY29kaW5nKTtcbiAgICAgIGhhc0lkZW50aXR5ID0gaGFzSWRlbnRpdHkgfHwgISFzcGVjaWZ5KFwiaWRlbnRpdHlcIiwgZW5jb2RpbmcpO1xuICAgICAgbWluUXVhbGl0eSA9IE1hdGgubWluKG1pblF1YWxpdHksIGVuY29kaW5nLnEgfHwgMSk7XG4gICAgfVxuICB9XG5cbiAgaWYgKCFoYXNJZGVudGl0eSkge1xuICAgIHBhcnNlZEFjY2VwdHMucHVzaCh7XG4gICAgICBlbmNvZGluZzogXCJpZGVudGl0eVwiLFxuICAgICAgbzogdW5kZWZpbmVkLFxuICAgICAgcTogbWluUXVhbGl0eSxcbiAgICAgIGk6IGFjY2VwdHMubGVuZ3RoIC0gMSxcbiAgICAgIHM6IHVuZGVmaW5lZCxcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBwYXJzZWRBY2NlcHRzO1xufVxuXG5mdW5jdGlvbiBnZXRFbmNvZGluZ1ByaW9yaXR5KFxuICBlbmNvZGluZzogc3RyaW5nLFxuICBhY2NlcHRlZDogU3BlY2lmaWNpdHlbXSxcbiAgaW5kZXg6IG51bWJlcixcbik6IFNwZWNpZmljaXR5IHtcbiAgbGV0IHByaW9yaXR5OiBTcGVjaWZpY2l0eSA9IHsgbzogLTEsIHE6IDAsIHM6IDAsIGk6IDAgfTtcblxuICBmb3IgKGNvbnN0IHMgb2YgYWNjZXB0ZWQpIHtcbiAgICBjb25zdCBzcGVjID0gc3BlY2lmeShlbmNvZGluZywgcywgaW5kZXgpO1xuXG4gICAgaWYgKFxuICAgICAgc3BlYyAmJlxuICAgICAgKHByaW9yaXR5LnMhIC0gc3BlYy5zISB8fCBwcmlvcml0eS5xIC0gc3BlYy5xIHx8XG4gICAgICAgICAgcHJpb3JpdHkubyEgLSBzcGVjLm8hKSA8XG4gICAgICAgIDBcbiAgICApIHtcbiAgICAgIHByaW9yaXR5ID0gc3BlYztcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcHJpb3JpdHk7XG59XG5cbi8qKiBHaXZlbiBhbiBgQWNjZXB0LUVuY29kaW5nYCBzdHJpbmcsIHBhcnNlIG91dCB0aGUgZW5jb2RpbmcgcmV0dXJuaW5nIGFcbiAqIG5lZ290aWF0ZWQgZW5jb2RpbmcgYmFzZWQgb24gdGhlIGBwcm92aWRlZGAgZW5jb2RpbmdzIG90aGVyd2lzZSBqdXN0IGFcbiAqIHByaW9yaXRpemVkIGFycmF5IG9mIGVuY29kaW5ncy4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwcmVmZXJyZWRFbmNvZGluZ3MoXG4gIGFjY2VwdDogc3RyaW5nLFxuICBwcm92aWRlZD86IHN0cmluZ1tdLFxuKTogc3RyaW5nW10ge1xuICBjb25zdCBhY2NlcHRzID0gcGFyc2VBY2NlcHRFbmNvZGluZyhhY2NlcHQpO1xuXG4gIGlmICghcHJvdmlkZWQpIHtcbiAgICByZXR1cm4gYWNjZXB0c1xuICAgICAgLmZpbHRlcihpc1F1YWxpdHkpXG4gICAgICAuc29ydChjb21wYXJlU3BlY3MpXG4gICAgICAubWFwKChzcGVjKSA9PiBzcGVjLmVuY29kaW5nISk7XG4gIH1cblxuICBjb25zdCBwcmlvcml0aWVzID0gcHJvdmlkZWQubWFwKCh0eXBlLCBpbmRleCkgPT5cbiAgICBnZXRFbmNvZGluZ1ByaW9yaXR5KHR5cGUsIGFjY2VwdHMsIGluZGV4KVxuICApO1xuXG4gIHJldHVybiBwcmlvcml0aWVzXG4gICAgLmZpbHRlcihpc1F1YWxpdHkpXG4gICAgLnNvcnQoY29tcGFyZVNwZWNzKVxuICAgIC5tYXAoKHByaW9yaXR5KSA9PiBwcm92aWRlZFtwcmlvcml0aWVzLmluZGV4T2YocHJpb3JpdHkpXSEpO1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLHFEQUFxRDtBQUNyRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztDQTRCQyxHQUVELFNBQVMsWUFBWSxFQUFFLFNBQVMsUUFBMEIsY0FBYztBQU14RSxNQUFNLHVCQUF1QjtBQUU3QixTQUFTLGNBQ1AsR0FBVyxFQUNYLENBQVM7RUFFVCxNQUFNLFFBQVEscUJBQXFCLElBQUksQ0FBQztFQUN4QyxJQUFJLENBQUMsT0FBTztJQUNWLE9BQU87RUFDVDtFQUVBLE1BQU0sV0FBVyxLQUFLLENBQUMsRUFBRTtFQUN6QixJQUFJLElBQUk7RUFDUixJQUFJLEtBQUssQ0FBQyxFQUFFLEVBQUU7SUFDWixNQUFNLFNBQVMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUM7SUFDOUIsS0FBSyxNQUFNLFNBQVMsT0FBUTtNQUMxQixNQUFNLElBQUksTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDO01BQzdCLElBQUksQ0FBQyxDQUFDLEVBQUUsS0FBSyxPQUFPLENBQUMsQ0FBQyxFQUFFLEVBQUU7UUFDeEIsSUFBSSxXQUFXLENBQUMsQ0FBQyxFQUFFO1FBQ25CO01BQ0Y7SUFDRjtFQUNGO0VBRUEsT0FBTztJQUFFO0lBQVUsR0FBRztJQUFXO0lBQUc7SUFBRyxHQUFHO0VBQVU7QUFDdEQ7QUFFQSxTQUFTLFFBQ1AsUUFBZ0IsRUFDaEIsSUFBeUIsRUFDekIsSUFBSSxDQUFDLENBQUM7RUFFTixJQUFJLENBQUMsS0FBSyxRQUFRLEVBQUU7SUFDbEI7RUFDRjtFQUNBLElBQUksSUFBSTtFQUNSLElBQUksS0FBSyxRQUFRLENBQUMsV0FBVyxPQUFPLFNBQVMsV0FBVyxJQUFJO0lBQzFELElBQUk7RUFDTixPQUFPLElBQUksS0FBSyxRQUFRLEtBQUssS0FBSztJQUNoQztFQUNGO0VBRUEsT0FBTztJQUNMO0lBQ0EsR0FBRyxLQUFLLENBQUM7SUFDVCxHQUFHLEtBQUssQ0FBQztJQUNUO0VBQ0Y7QUFDRjtBQUVBLFNBQVMsb0JBQW9CLE1BQWM7RUFDekMsTUFBTSxVQUFVLE9BQU8sS0FBSyxDQUFDO0VBQzdCLE1BQU0sZ0JBQXVDLEVBQUU7RUFDL0MsSUFBSSxjQUFjO0VBQ2xCLElBQUksYUFBYTtFQUVqQixLQUFLLE1BQU0sQ0FBQyxHQUFHLE9BQU8sSUFBSSxRQUFRLE9BQU8sR0FBSTtJQUMzQyxNQUFNLFdBQVcsY0FBYyxPQUFPLElBQUksSUFBSTtJQUU5QyxJQUFJLFVBQVU7TUFDWixjQUFjLElBQUksQ0FBQztNQUNuQixjQUFjLGVBQWUsQ0FBQyxDQUFDLFFBQVEsWUFBWTtNQUNuRCxhQUFhLEtBQUssR0FBRyxDQUFDLFlBQVksU0FBUyxDQUFDLElBQUk7SUFDbEQ7RUFDRjtFQUVBLElBQUksQ0FBQyxhQUFhO0lBQ2hCLGNBQWMsSUFBSSxDQUFDO01BQ2pCLFVBQVU7TUFDVixHQUFHO01BQ0gsR0FBRztNQUNILEdBQUcsUUFBUSxNQUFNLEdBQUc7TUFDcEIsR0FBRztJQUNMO0VBQ0Y7RUFFQSxPQUFPO0FBQ1Q7QUFFQSxTQUFTLG9CQUNQLFFBQWdCLEVBQ2hCLFFBQXVCLEVBQ3ZCLEtBQWE7RUFFYixJQUFJLFdBQXdCO0lBQUUsR0FBRyxDQUFDO0lBQUcsR0FBRztJQUFHLEdBQUc7SUFBRyxHQUFHO0VBQUU7RUFFdEQsS0FBSyxNQUFNLEtBQUssU0FBVTtJQUN4QixNQUFNLE9BQU8sUUFBUSxVQUFVLEdBQUc7SUFFbEMsSUFDRSxRQUNBLENBQUMsU0FBUyxDQUFDLEdBQUksS0FBSyxDQUFDLElBQUssU0FBUyxDQUFDLEdBQUcsS0FBSyxDQUFDLElBQ3pDLFNBQVMsQ0FBQyxHQUFJLEtBQUssQ0FBQyxBQUFDLElBQ3ZCLEdBQ0Y7TUFDQSxXQUFXO0lBQ2I7RUFDRjtFQUVBLE9BQU87QUFDVDtBQUVBOzttQ0FFbUMsR0FDbkMsT0FBTyxTQUFTLG1CQUNkLE1BQWMsRUFDZCxRQUFtQjtFQUVuQixNQUFNLFVBQVUsb0JBQW9CO0VBRXBDLElBQUksQ0FBQyxVQUFVO0lBQ2IsT0FBTyxRQUNKLE1BQU0sQ0FBQyxXQUNQLElBQUksQ0FBQyxjQUNMLEdBQUcsQ0FBQyxDQUFDLE9BQVMsS0FBSyxRQUFRO0VBQ2hDO0VBRUEsTUFBTSxhQUFhLFNBQVMsR0FBRyxDQUFDLENBQUMsTUFBTSxRQUNyQyxvQkFBb0IsTUFBTSxTQUFTO0VBR3JDLE9BQU8sV0FDSixNQUFNLENBQUMsV0FDUCxJQUFJLENBQUMsY0FDTCxHQUFHLENBQUMsQ0FBQyxXQUFhLFFBQVEsQ0FBQyxXQUFXLE9BQU8sQ0FBQyxVQUFVO0FBQzdEIn0=
// denoCacheMetadata=10720190359591888189,13439985579581283100