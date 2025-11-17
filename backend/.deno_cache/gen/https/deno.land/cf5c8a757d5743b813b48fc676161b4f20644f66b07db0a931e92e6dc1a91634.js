// Copyright 2018-2025 the oak authors. All rights reserved. MIT license.
class ErrorEvent extends Event {
  #message;
  #filename;
  #lineno;
  #colno;
  // deno-lint-ignore no-explicit-any
  #error;
  get message() {
    return this.#message;
  }
  get filename() {
    return this.#filename;
  }
  get lineno() {
    return this.#lineno;
  }
  get colno() {
    return this.#colno;
  }
  // deno-lint-ignore no-explicit-any
  get error() {
    return this.#error;
  }
  constructor(type, eventInitDict = {}){
    super(type, eventInitDict);
    const { message = "error", filename = "", lineno = 0, colno = 0, error } = eventInitDict;
    this.#message = message;
    this.#filename = filename;
    this.#lineno = lineno;
    this.#colno = colno;
    this.#error = error;
  }
}
if (!("ErrorEvent" in globalThis)) {
  Object.defineProperty(globalThis, "ErrorEvent", {
    value: ErrorEvent,
    writable: true,
    enumerable: false,
    configurable: true
  });
}
if (!("ReadableStream" in globalThis) || !("TransformStream" in globalThis)) {
  (async ()=>{
    const { ReadableStream, TransformStream } = await import("node:stream/web");
    Object.defineProperties(globalThis, {
      "ReadableStream": {
        value: ReadableStream,
        writable: true,
        enumerable: false,
        configurable: true
      },
      "TransformStream": {
        value: TransformStream,
        writable: true,
        enumerable: false,
        configurable: true
      }
    });
  })();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvb2FrQHYxNy4xLjYvbm9kZV9zaGltcy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDI1IHRoZSBvYWsgYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIGxpY2Vuc2UuXG5cbmNsYXNzIEVycm9yRXZlbnQgZXh0ZW5kcyBFdmVudCB7XG4gICNtZXNzYWdlOiBzdHJpbmc7XG4gICNmaWxlbmFtZTogc3RyaW5nO1xuICAjbGluZW5vOiBudW1iZXI7XG4gICNjb2xubzogbnVtYmVyO1xuICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICAjZXJyb3I6IGFueTtcblxuICBnZXQgbWVzc2FnZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLiNtZXNzYWdlO1xuICB9XG4gIGdldCBmaWxlbmFtZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLiNmaWxlbmFtZTtcbiAgfVxuICBnZXQgbGluZW5vKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuI2xpbmVubztcbiAgfVxuICBnZXQgY29sbm8oKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy4jY29sbm87XG4gIH1cbiAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgZ2V0IGVycm9yKCk6IGFueSB7XG4gICAgcmV0dXJuIHRoaXMuI2Vycm9yO1xuICB9XG5cbiAgY29uc3RydWN0b3IodHlwZTogc3RyaW5nLCBldmVudEluaXREaWN0OiBFcnJvckV2ZW50SW5pdCA9IHt9KSB7XG4gICAgc3VwZXIodHlwZSwgZXZlbnRJbml0RGljdCk7XG4gICAgY29uc3QgeyBtZXNzYWdlID0gXCJlcnJvclwiLCBmaWxlbmFtZSA9IFwiXCIsIGxpbmVubyA9IDAsIGNvbG5vID0gMCwgZXJyb3IgfSA9XG4gICAgICBldmVudEluaXREaWN0O1xuICAgIHRoaXMuI21lc3NhZ2UgPSBtZXNzYWdlO1xuICAgIHRoaXMuI2ZpbGVuYW1lID0gZmlsZW5hbWU7XG4gICAgdGhpcy4jbGluZW5vID0gbGluZW5vO1xuICAgIHRoaXMuI2NvbG5vID0gY29sbm87XG4gICAgdGhpcy4jZXJyb3IgPSBlcnJvcjtcbiAgfVxufVxuXG5pZiAoIShcIkVycm9yRXZlbnRcIiBpbiBnbG9iYWxUaGlzKSkge1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZ2xvYmFsVGhpcywgXCJFcnJvckV2ZW50XCIsIHtcbiAgICB2YWx1ZTogRXJyb3JFdmVudCxcbiAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICBjb25maWd1cmFibGU6IHRydWUsXG4gIH0pO1xufVxuXG5pZiAoIShcIlJlYWRhYmxlU3RyZWFtXCIgaW4gZ2xvYmFsVGhpcykgfHwgIShcIlRyYW5zZm9ybVN0cmVhbVwiIGluIGdsb2JhbFRoaXMpKSB7XG4gIChhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgeyBSZWFkYWJsZVN0cmVhbSwgVHJhbnNmb3JtU3RyZWFtIH0gPSBhd2FpdCBpbXBvcnQoXCJub2RlOnN0cmVhbS93ZWJcIik7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoZ2xvYmFsVGhpcywge1xuICAgICAgXCJSZWFkYWJsZVN0cmVhbVwiOiB7XG4gICAgICAgIHZhbHVlOiBSZWFkYWJsZVN0cmVhbSxcbiAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICB9LFxuICAgICAgXCJUcmFuc2Zvcm1TdHJlYW1cIjoge1xuICAgICAgICB2YWx1ZTogVHJhbnNmb3JtU3RyZWFtLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgIH0sXG4gICAgfSk7XG4gIH0pKCk7XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEseUVBQXlFO0FBRXpFLE1BQU0sbUJBQW1CO0VBQ3ZCLENBQUEsT0FBUSxDQUFTO0VBQ2pCLENBQUEsUUFBUyxDQUFTO0VBQ2xCLENBQUEsTUFBTyxDQUFTO0VBQ2hCLENBQUEsS0FBTSxDQUFTO0VBQ2YsbUNBQW1DO0VBQ25DLENBQUEsS0FBTSxDQUFNO0VBRVosSUFBSSxVQUFrQjtJQUNwQixPQUFPLElBQUksQ0FBQyxDQUFBLE9BQVE7RUFDdEI7RUFDQSxJQUFJLFdBQW1CO0lBQ3JCLE9BQU8sSUFBSSxDQUFDLENBQUEsUUFBUztFQUN2QjtFQUNBLElBQUksU0FBaUI7SUFDbkIsT0FBTyxJQUFJLENBQUMsQ0FBQSxNQUFPO0VBQ3JCO0VBQ0EsSUFBSSxRQUFnQjtJQUNsQixPQUFPLElBQUksQ0FBQyxDQUFBLEtBQU07RUFDcEI7RUFDQSxtQ0FBbUM7RUFDbkMsSUFBSSxRQUFhO0lBQ2YsT0FBTyxJQUFJLENBQUMsQ0FBQSxLQUFNO0VBQ3BCO0VBRUEsWUFBWSxJQUFZLEVBQUUsZ0JBQWdDLENBQUMsQ0FBQyxDQUFFO0lBQzVELEtBQUssQ0FBQyxNQUFNO0lBQ1osTUFBTSxFQUFFLFVBQVUsT0FBTyxFQUFFLFdBQVcsRUFBRSxFQUFFLFNBQVMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxFQUFFLEtBQUssRUFBRSxHQUN0RTtJQUNGLElBQUksQ0FBQyxDQUFBLE9BQVEsR0FBRztJQUNoQixJQUFJLENBQUMsQ0FBQSxRQUFTLEdBQUc7SUFDakIsSUFBSSxDQUFDLENBQUEsTUFBTyxHQUFHO0lBQ2YsSUFBSSxDQUFDLENBQUEsS0FBTSxHQUFHO0lBQ2QsSUFBSSxDQUFDLENBQUEsS0FBTSxHQUFHO0VBQ2hCO0FBQ0Y7QUFFQSxJQUFJLENBQUMsQ0FBQyxnQkFBZ0IsVUFBVSxHQUFHO0VBQ2pDLE9BQU8sY0FBYyxDQUFDLFlBQVksY0FBYztJQUM5QyxPQUFPO0lBQ1AsVUFBVTtJQUNWLFlBQVk7SUFDWixjQUFjO0VBQ2hCO0FBQ0Y7QUFFQSxJQUFJLENBQUMsQ0FBQyxvQkFBb0IsVUFBVSxLQUFLLENBQUMsQ0FBQyxxQkFBcUIsVUFBVSxHQUFHO0VBQzNFLENBQUM7SUFDQyxNQUFNLEVBQUUsY0FBYyxFQUFFLGVBQWUsRUFBRSxHQUFHLE1BQU0sTUFBTSxDQUFDO0lBQ3pELE9BQU8sZ0JBQWdCLENBQUMsWUFBWTtNQUNsQyxrQkFBa0I7UUFDaEIsT0FBTztRQUNQLFVBQVU7UUFDVixZQUFZO1FBQ1osY0FBYztNQUNoQjtNQUNBLG1CQUFtQjtRQUNqQixPQUFPO1FBQ1AsVUFBVTtRQUNWLFlBQVk7UUFDWixjQUFjO01BQ2hCO0lBQ0Y7RUFDRixDQUFDO0FBQ0gifQ==
// denoCacheMetadata=12740217231218467319,12238200791548212714