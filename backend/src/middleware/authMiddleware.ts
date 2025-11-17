import { jwtVerify, RouterContext } from "../../deps.ts";

const JWT_SECRET_KEY = Deno.env.get("JWT_SECRET_KEY");
const jwtSecret = new TextEncoder().encode(JWT_SECRET_KEY);

export const authMiddleware = async (ctx: RouterContext<string>, next: () => Promise<unknown>) => {
    const header = ctx.request.headers.get("Authorization");
    if(!header || !header.startsWith("Bearer ")) {
        ctx.response.status = 401;
        ctx.response.body = {error: "Autorisierung hat nicht geklappt!"}
        return;
    }

    const token = header.substring(7);

    try {
        const payload = await jwtVerify(token, jwtSecret);
        ctx.state.userId = payload.payload.id;
        await next();
    } catch (error) {
        let errorMessage = "Unbekannter Autorisiierungsfehler";

        if (error instanceof Error) {
            errorMessage = error.message;
        } 
        else if (typeof error === 'string') {
            errorMessage = error;
        }

        ctx.response.status = 401;
        ctx.response.body = {
            error: "Autorisierung fehlgeschlagen",
            details: errorMessage
        };
        return;
    }
}