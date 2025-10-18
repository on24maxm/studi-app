import { Router } from "../../deps.ts";
import { LearningSessionService } from "../services/learningSessionService.ts";
import { authMiddleware } from "../middleware/authMiddleware.ts";

const learningSessionRouter = new Router();
const learningSessionService = new LearningSessionService();

learningSessionRouter.use(authMiddleware);

learningSessionRouter.post("/api/decks/:deckId/learning-session/start", async (ctx) => {
    const userId = ctx.state.userId;
    const deckId = Number(ctx.params.deckId);

    if(!deckId) {
        ctx.response.status = 400;
        ctx.response.body = {error: "DeckId benötigt!"};
        return;
    }

    const firstCard = await learningSessionService.start(deckId, userId);

    if(!firstCard) {
        ctx.response.status = 400;
        ctx.response.body = {error: "Keine Karten vorhanden!"};
        return;
    }
    ctx.response.body = firstCard;


})

learningSessionRouter.post("/api/learning-session/rate", async (ctx) => {
        const userId = ctx.state.userId;
        const body = await ctx.request.body.json();

        const cardId = Number(body.cardId);
        const rating = body.rating;


        if (!cardId || !rating) {
            ctx.response.status = 400;
            ctx.response.body = { error: "Karte und Bewertung sind benötigt!" };
            return;
        }

        const nextCard = await learningSessionService.rateCard(userId, cardId, rating);
        ctx.response.body = { nextCard: nextCard };
});

export default learningSessionRouter;