import { Router } from "../../deps.ts";

const healthRouter = new Router();

healthRouter.get("/api/health", (ctx) => {
    ctx.response.body = {status: "ok", timestamp: new Date() };
})

export default healthRouter;