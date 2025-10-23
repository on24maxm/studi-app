import pool from "../db/database.ts";
import type { Deck } from "../models/deck.ts";

export class DeckService {
    async getDecksForUser(userId: number): Promise<Deck[]> {
        const [rows] = await pool.execute(`SELECT * FROM decks WHERE user_id = ?`, [userId]);
        return rows as unknown as Deck[];
    }

    async createDeck(name: string, userId: number): Promise<Deck> {
        const [result] = await pool.execute(`INSERT INTO decks (name, user_id) VALUES (?, ?)`, [name, userId]);
        const insertResult = result as unknown as ({ insertId: number })

        const resultDeck = await pool.execute(`SELECT * FROM DECKS WHERE ID = ?`, [insertResult.insertId]);
        return resultDeck[0] as unknown as Deck;
    }
    
    async updateDeck(userId: number, deckId: number, name: string): Promise<Deck> {
        const [result] = await pool.execute(`UPDATE decks SET name = ? WHERE user_id = ? and id = ?`, [name, userId, deckId]);
        const affectedRow = await pool.execute(`SELECT * FROM decks WHERE user_id = ? and id = ?`, [userId, deckId]);

        return affectedRow[0] as unknown as Deck;
    }

    async deleteDeck(userId: number, deckId: number): Promise<boolean> {
        const [result] = await pool.execute(`DELETE FROM decks WHERE user_id = ? and id = ?`, [userId, deckId]);
        const affectedRow = result as unknown as ({ affectedRows: number});

        return affectedRow.affectedRows > 0
    }

    async getDeckById(userId: number, deckId: number): Promise<Deck | null> {
        const [rows] = await pool.execute(
        'SELECT id, user_id, name, createdAt, lastChanged FROM decks WHERE user_id = ? AND id = ?',
        [userId, deckId]
        );

        const decks = rows as unknown as Deck[];

        if (decks.length > 0) {
            return decks[0];
        } else {
            return null;
        }
    }
}