import type { ComponentId } from '@/content/jvm/ids';
import type { LeveledText } from '@/lib/levels';
import type { Citation, CodeListing, QuizQuestion, RichText } from './content';
import type { LessonTerm, Prediction } from './lesson';

/**
 * A station of a laboratory: one experience that answers one question,
 * built on the teaching cycle question → prediction → exploration →
 * observation → explanation → technical insight → knowledge check.
 */
export interface LabStation<Id extends string = string> {
  id: Id;
  title: string;
  /** The observational scale, from the whole system down to one state. */
  scale: string;
  /** The question the station answers, in the learner's words. */
  question: string;
  /** One line for the station switch. */
  summary: string;
  /** Asked before the exhibit opens; stations that ask per experiment leave it out. */
  prediction?: Prediction;
  /** What to try in the exhibit. */
  tryIt: RichText;
  explanation: LeveledText;
  term: LessonTerm;
  check: QuizQuestion;
  /** The component this station opens on the JVM map. */
  component: ComponentId;
  /** Real output and listings shown under "Technical insight". */
  listings: CodeListing[];
  accuracyNote: RichText;
  references: Citation[];
}

/** An advanced investigation: one question, answered with verified output and sources. */
export interface Investigation {
  id: string;
  group: string;
  title: string;
  question: string;
  body: LeveledText;
  listings: CodeListing[];
  references: Citation[];
}

/** A guided experiment: a preset the learner predicts, runs and then reads about. */
export interface ExperimentPrediction {
  prompt: RichText;
  options: { id: string; text: RichText; correct: boolean; feedback: RichText }[];
}
