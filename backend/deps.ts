// Routing w/OAK
export { Application, Router } from "https://deno.land/x/oak@v17.1.6/mod.ts";
export type { RouterContext } from "https://deno.land/x/oak@v17.1.6/mod.ts";

// JWT-Tokens Library
export { jwtVerify, SignJWT } from "npm:jose@5.9.6";
export type { JWTPayload } from "npm:jose@5.9.6";

// Hash Password Library
export { compare, hash } from "https://deno.land/x/bcrypt@v0.4.0/mod.ts";

// mysql Library
import mysql from "npm:mysql2@^2.3.3/promise";
export { mysql };

export { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";