import { DeckService } from "../services/deckService.ts";
import { Router } from "../../deps.ts";
import { authMiddleware } from "../middleware/authMiddleware.ts";
import { Context } from "https://deno.land/x/oak@v17.1.6/mod.ts";

const deckRouter = new Router();
const deckService = new DeckService();

deckRouter.use(authMiddleware);

deckRouter.get("/api/decks", async (ctx) => {
    const user_id = ctx.state.userId;
    const decks = await deckService.getDecksForUser(user_id);
    ctx.response.body = decks;
});

deckRouter.post("/api/decks", async (ctx) => {
    const { name } = await ctx.request.body.json();
    const user_id = ctx.state.userId;
    
    if(!name) {
        ctx.response.status = 400;
        ctx.response.body = {error: "Name ist benötigt!"};
        return;
    }

    const newDeck = await deckService.createDeck(name, user_id);
    ctx.response.status = 201;
    ctx.response.body = newDeck;
})

deckRouter.patch("/api/decks/:id", async (ctx) => {
    const { name } = await ctx.request.body.json();
    const user_id = ctx.state.userId;
    const deckId = Number(ctx.params.id);
    if(!name) {
        ctx.response.body = {error: "Neuer Name ist benötigt!"}
        ctx.response.status = 400;
    }

    const updatedDeck = await deckService.updateDeck(user_id, deckId, name);

    if(!updatedDeck) {
        ctx.response.status = 404;
        ctx.response.body = {error: "Deck konnte nicht aktualisiert werden!"};
        return;
    }
    
    ctx.response.status = 200;
    ctx.response.body = "Deck wurde aktualisiert!";

})

deckRouter.delete("/api/decks/:id", async (ctx) => {
    const deckId = Number(ctx.params.id);
    const user_id = ctx.state.userId;

    const deleted = await deckService.deleteDeck(user_id, deckId);
    if(!deleted) {
        ctx.response.status = 400;
        ctx.response.body = {error: "Deck konnte nicht gelöscht werden!"};
        return;
    }

    ctx.response.status = 200;
    ctx.response.body = "Deck wurde gelöscht!";
    
})

deckRouter.get("/api/decks/:id", async (ctx) => {
    const deckId = Number(ctx.params.id);
    const user_id = ctx.state.userId;

    const deck = await deckService.getDeckById(user_id, deckId);
    if(!deck) {
        ctx.response.status = 404;
        ctx.response.body = {error: "Deck konnte nicht gefunden werden!"};
        return;
    }

    ctx.response.status = 200;
    ctx.response.body = deck;
})

export default deckRouter;