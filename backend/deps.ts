import { Application } from "https://deno.land/x/oak@v17.1.6/mod.ts";
import { JWTPayload, jwtVerify, SignJWT } from "npm:jose@5.9.6";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.0/mod.ts";