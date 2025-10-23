import { Application, oakCors } from "./deps.ts"
import healthRouter from "./src/controllers/healthController.ts";
import userRouter from "./src/controllers/userController.ts";
import deckRouter from "./src/controllers/deckController.ts";
import cardRouter from "./src/controllers/cardController.ts";
import learningSessionRouter from "./src/controllers/learningController.ts";

const app = new Application();

app.use(
  oakCors({
    origin: "http://localhost:5173",
    optionsSuccessStatus: 200,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  }),
);


app.use(userRouter.routes());
app.use(healthRouter.routes());
app.use(userRouter.allowedMethods());
app.use(healthRouter.allowedMethods());
app.use(deckRouter.routes());
app.use(deckRouter.allowedMethods());
app.use(cardRouter.routes());
app.use(cardRouter.allowedMethods());
app.use(learningSessionRouter.routes());
app.use(learningSessionRouter.allowedMethods());

console.log("😈 Server is running on http://localhost:8000")
await app.listen({ port: 8000});