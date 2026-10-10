export type Word = {
  id: number | string;
  word: string;
  v2: string;
  v3: string;
  meaning: string;
  part_of_speech: string;
  example: string;
  example_id: string;
  level: string;
};
export type Progress = { wordId: string; learnedAt: string };
