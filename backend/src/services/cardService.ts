import type { Card } from "../models/card.ts";
import pool from "../db/database.ts";

export class CardService {
    async getCardsForDeck(deckId: number, userId: number): Promise<Card[]> {
        const [rows] = await pool.execute(`
            SELECT c.* from cards c 
            JOIN decks d on c.deck_id = d.id
            WHERE d.user_id = ? and c.deck_id = ?`, [userId, deckId]);
            return rows as unknown as Card[];
    }
    async createCard(deckId: number, front: string, back: string, userId: number): Promise<Card[]> {
        const [rows] = await pool.execute(`SELECT * FROM decks WHERE user_id = ? and id = ?`, [userId, deckId])
        if ((rows as unknown as any[]).length === 0) {
            return [];
        }

        const [result] = await pool.execute(`INSERT INTO cards (deck_id, front, back) VALUES (?, ?, ?)`, [deckId, front, back]);
        const insertResult = result as unknown as { insertId: number }
        const resultCard = await pool.execute(`SELECT * FROM cards WHERE id = ?`, [insertResult.insertId]);
        const createdCard = resultCard as unknown as Card[];
        return createdCard[0] as unknown as Card[];
    }

    async updateCard(deckId: number, userId: number, cardId: number, front: string, back: string) {
        const [rows] = await pool.execute(`
            SELECT c.* from cards c 
            JOIN decks d on c.deck_id = d.id
            WHERE d.user_id = ? and c.deck_id = ?`, [userId, deckId]);
        if((rows as unknown as any[]).length === 0) {
            return [];
        }

        await pool.execute(`UPDATE cards SET front = ?, back = ?, lastChanged = NOW() WHERE id = ?`, [front, back, cardId]);

        const updatedCard = await pool.execute(`SELECT * FROM cards WHERE id = ?`, [cardId]);
        const cards = updatedCard as unknown as Card[];
        return cards[0];
    }

    async deleteCard(deckId: number, userId: number, cardId: number): Promise<boolean> {
        const [result] = await pool.execute(
            `DELETE FROM cards WHERE id = ? AND deck_id IN (SELECT id FROM decks WHERE user_id = ?)`,
            [cardId, userId]
        );
        const affectedRows = result as unknown as { affectedRows: number };
        return affectedRows.affectedRows > 0;
    }
}