export interface Card {
    id: number;
    deck_id: number;
    front: string;
    back: string;
    dueDate: Date;
    currentInterval: number;
    easeFactor: number;
    repetitions: number;
    createdAt: Date;
    lastChanged: Date;
}

export interface RelearnCard {
    card: Card;
    relearnAt: number;
}