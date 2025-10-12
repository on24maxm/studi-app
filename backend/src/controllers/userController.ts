import { Router } from "../../deps.ts"
import { UserService } from "../services/userService.ts"
import { authMiddleware } from "../middleware/authMiddleware.ts"

const userRouter = new Router();
const userService = new UserService();

userRouter.post("/api/users/register", async (ctx) => {
    const { name, password } = await ctx.request.body.json();

    if(!name || !password) {
        ctx.response.status = 400;
        ctx.response.body = "Name oder Passwort sind benötigt!";
        return;
    }

    const newUser = await userService.create(name, password);

    ctx.response.status = 201;
    ctx.response.body = newUser;
})

userRouter.post("/api/users/login", async (ctx) => {
    const { name, password } = await ctx.request.body.json();

    if(!name || !password) {
        ctx.response.status = 400;
        ctx.response.body = {error: "Name und Passwort sind benötigt!"}
        return;
    }

    const token = await userService.login(name, password);

    if(!token) {
        ctx.response.status = 401;
        ctx.response.body = {error: "Name oder Passwort stimmen nicht überein!"};
    }

    ctx.response.status = 200;
    ctx.response.body = {token: token};
})

export default userRouter;