export interface Card {
  id: number;
  deck_id: number;
  front: string;
  back: string;
  dueDate: string;
  currentInterval: number;
  easeFactor: number;
  repetitions: number;
  createdAt: string;
  lastChanged: string;
}

export interface RelearnCard {
  card: Card;
  relearnAt: number;
}