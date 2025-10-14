import { CardService } from "../services/cardService.ts";
import { Router } from "../../deps.ts";
import { authMiddleware } from "../middleware/authMiddleware.ts";
import { cloneState } from "https://deno.land/x/oak@v17.1.6/utils/clone_state.ts";

const cardRouter = new Router();
const cardService = new CardService();

cardRouter.use(authMiddleware);

cardRouter.get("/api/decks/:deckId/cards", async (ctx) => {
    const deckId = Number(ctx.params.deckId);
    const userId = ctx.state.userId;

    const cards = await cardService.getCardsForDeck(deckId, userId);
    ctx.response.body = cards;
});

cardRouter.post("/api/decks/:deckId/cards", async (ctx) => {
    const deckId = Number(ctx.params.deckId);
    const { front, back } = await ctx.request.body.json();
    const userId = ctx.state.userId;

    if(!front || !back) {
        ctx.response.status = 400;
        ctx.response.body = {error: "Vorderseite und Rückseite sind benötigt!"};
        return;
    }

    const newCard = await cardService.createCard(deckId, front, back, userId);

    if(!newCard) {
        ctx.response.status = 400;
        ctx.response.body = {error: "Karte konnte nicht erstellt werden!"};
        return;
    }

    ctx.response.status = 201;
    ctx.response.body = newCard;

})

cardRouter.patch("/api/decks/:deckId/cards/:id", async (ctx) => {
    const deckId = Number(ctx.params.deckId);
    const cardId = Number(ctx.params.id);
    const userId = ctx.state.userId;
    const { front, back } = await ctx.request.body.json();

    if(!front || !back) {
        ctx.response.status = 400;
        ctx.response.body = { error: "Vorder- und Rückseite muss angegeben sein!"}
        return;
    }

    const updatedCard = await cardService.updateCard(deckId, userId, cardId, front, back);
    if(!updatedCard) {
        ctx.response.status = 400;
        ctx.response.body = {error: "Karte konnte nicht aktualisiert werden!"};
        return;
    }
    ctx.response.body = updatedCard;
})

cardRouter.delete("/api/decks/:deckId/cards/:id", async (ctx) => {
    const deckId = Number(ctx.params.deckId);
    const cardId = Number(ctx.params.id);
    const userId = ctx.state.userId;

    const deleted = await cardService.deleteCard(deckId, userId, cardId);
    
    if(!deleted) {
        ctx.response.status = 400;
        ctx.response.body = {error: "Karte konnte nicht gelöscht werden!"};
        return;
    }
    ctx.response.status = 200;
    ctx.response.body = "Karte wurde gelöscht!";
})

export default cardRouter;