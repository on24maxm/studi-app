// /backend/src/services/learningSessionService.ts

import type { Card, RelearnCard } from "../models/card.ts";
import pool from "../db/database.ts";

// HINWEIS: Stellen Sie sicher, dass RelearnCard in /models/card.ts definiert ist
// export interface RelearnCard { card: Card; relearnAt: number; }

class LearningSession {
    public reviewQueue: Card[] = [];
    public relearnQueue: RelearnCard[] = [];

    constructor(cards: Card[]) {
        this.reviewQueue = this.shuffle(cards);
    }

    // Dies ist die finale, absturzsichere Version
    getNextCard(): Card | null {
        const now = Date.now();
        if (this.relearnQueue.length > 0 && this.relearnQueue[0].relearnAt <= now) return this.relearnQueue[0].card;
        if (this.reviewQueue.length > 0) return this.reviewQueue[0];
        if (this.relearnQueue.length > 0) return this.relearnQueue[0].card;
        return null;
    }

    private shuffle(array: Card[]): Card[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}

export class LearningSessionService {
    private activeSessions = new Map<number, LearningSession>();

    async start(deckId: number, userId: number): Promise<Card | null> {
        const [rows] = await pool.execute(`SELECT c.* FROM cards c JOIN decks d ON c.deck_id = d.id WHERE c.deck_id = ? AND d.user_id = ? AND c.dueDate <= NOW()`, [deckId, userId]);
        const dueCards = rows as unknown as Card[];
        
        if (dueCards.length === 0) {
            this.activeSessions.delete(userId);
            return null;
        }

        const session = new LearningSession(dueCards);
        this.activeSessions.set(userId, session);
        return session.getNextCard();
    }

    async rateCard(userId: number, cardId: number, rating: "nochmal" | "mittel" | "gut"): Promise<Card | null> {
        const session = this.activeSessions.get(userId);
        if (!session) throw new Error("Keine aktiven Sessions vorhanden");

        let card = session.reviewQueue.find(c => c.id === cardId) || session.relearnQueue.find(e => e.card.id === cardId)?.card;
        if (!card) throw new Error("Karte nicht in der aktuellen Sitzung gefunden!");

        const wasInRelearn = !session.reviewQueue.some(c => c.id === cardId);
        session.reviewQueue = session.reviewQueue.filter(c => c.id !== cardId);
        session.relearnQueue = session.relearnQueue.filter(e => e.card.id !== cardId);

        const now = Date.now();
        switch(rating) {
            case "gut": {
                let newInterval = (wasInRelearn || card.repetitions === 0) ? 1 : Math.round(card.currentInterval * card.easeFactor);
                const newDueDate = new Date(now + newInterval * 24 * 60 * 60 * 1000);
                await pool.execute(`UPDATE cards SET repetitions = ?, currentInterval = ?, dueDate = ? WHERE id = ?`, [card.repetitions + 1, newInterval, newDueDate, cardId]);
                break;
            }
            case "mittel":
                session.relearnQueue.push({card, relearnAt: now + 6 * 60 * 1000});
                break;
            case "nochmal":
                session.relearnQueue.push({card, relearnAt: now + 60 * 1000});
                break;
        }
        session.relearnQueue.sort((a, b) => a.relearnAt - b.relearnAt);
        return session.getNextCard();
    }
}