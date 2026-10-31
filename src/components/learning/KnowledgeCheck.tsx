import { CircleCheck, CircleX, RotateCcw } from 'lucide-react';
import { useId } from 'react';
import { CodeBlock } from '@/components/code/CodeBlock';
import { progressActions, useProgress } from '@/hooks/useLearningState';
import { cn } from '@/lib/cn';
import type { Quiz, QuizQuestion } from '@/types/content';
import { RichText } from './RichText';
import { SourceList } from './SourceReference';

const KIND_LABEL: Record<QuizQuestion['kind'], string> = {
  concept: 'Concept',
  'predict-output': 'Predict the output',
  'memory-state': 'Memory state',
  ordering: 'Order of events',
};

/**
 * Multiple-choice knowledge check. Each answer locks in and reveals an
 * explanation for the chosen option and for the correct one. Results are
 * kept in this browser.
 */
export function KnowledgeCheck({ quiz, compact = false }: { quiz: Quiz; compact?: boolean }) {
  const progress = useProgress();
  const saved = progress.quizzes[quiz.id];
  const answers = saved?.answers ?? {};
  const answeredCount = Object.keys(answers).length;
  const correctCount = quiz.questions.filter(
    (q) => q.options.find((o) => o.id === answers[q.id])?.correct,
  ).length;

  const answer = (question: QuizQuestion, optionId: string) => {
    if (answers[question.id]) return;
    const next = { ...answers, [question.id]: optionId };
    const correct = quiz.questions.filter(
      (q) => q.options.find((o) => o.id === next[q.id])?.correct,
    ).length;
    progressActions.saveQuiz(quiz.id, { answers: next, correct, total: quiz.questions.length });
  };

  const reset = () =>
    progressActions.saveQuiz(quiz.id, { answers: {}, correct: 0, total: quiz.questions.length });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {compact ? (
          <span />
        ) : (
          <p className="text-[14px] text-fg-muted" aria-live="polite">
            {answeredCount === 0
              ? `${quiz.questions.length} ${quiz.questions.length === 1 ? 'question' : 'questions'}. Answers are explained, right or wrong.`
              : `${correctCount} correct of ${answeredCount} answered (${quiz.questions.length} in total).`}
          </p>
        )}
        {answeredCount > 0 && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-md border border-ink-500 px-2.5 py-1 text-[13px] text-fg-muted hover:text-fg"
          >
            <RotateCcw size={13} aria-hidden /> {compact ? 'Try again' : 'Start again'}
          </button>
        )}
      </div>
      <ol className={cn('space-y-4', compact ? 'mt-1' : 'mt-4')}>
        {quiz.questions.map((question, index) => (
          <li key={question.id}>
            <Question
              question={question}
              compact={compact}
              number={index + 1}
              chosen={answers[question.id]}
              onAnswer={(id) => answer(question, id)}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}

function Question({
  question,
  compact,
  number,
  chosen,
  onAnswer,
}: {
  question: QuizQuestion;
  compact: boolean;
  number: number;
  chosen: string | undefined;
  onAnswer: (optionId: string) => void;
}) {
  const name = useId();
  const answered = chosen !== undefined;
  const chosenOption = question.options.find((o) => o.id === chosen);
  const correctOption = question.options.find((o) => o.correct)!;

  return (
    <fieldset className="rounded-lg border border-ink-600 bg-ink-900/60 p-4">
      <legend className="sr-only">Question {number}</legend>
      {!compact && (
        <p className="text-[12.5px] text-fg-subtle">
          Question {number} · {KIND_LABEL[question.kind]}
        </p>
      )}
      <RichText
        className={cn('prose-ij text-[15px] text-fg', !compact && 'mt-1')}
        text={question.prompt}
      />
      {question.code && (
        <CodeBlock
          className="mt-3"
          code={question.code.code}
          language={question.code.language}
          title={question.code.title}
        />
      )}
      <div className="mt-3 grid gap-2">
        {question.options.map((option) => {
          const isChosen = option.id === chosen;
          const showCorrect = answered && option.correct;
          const showWrong = answered && isChosen && !option.correct;
          return (
            <label
              key={option.id}
              className={cn(
                'flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2 text-[14px] transition-colors',
                !answered && 'border-ink-600 hover:border-ink-400 hover:bg-ink-800',
                answered && !showCorrect && !showWrong && 'border-ink-700 opacity-70',
                showCorrect && 'border-ok-500/60 bg-ok-900/40',
                showWrong && 'border-warn-500/60 bg-warn-900/40',
                answered && 'cursor-default',
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.id}
                checked={isChosen}
                disabled={answered && !isChosen}
                onChange={() => onAnswer(option.id)}
                className="mt-1 accent-[var(--color-exec-500)]"
              />
              <span className="min-w-0 flex-1">
                <RichText className="prose-ij text-[14px] text-fg" text={option.text} />
              </span>
              {showCorrect && (
                <CircleCheck
                  size={17}
                  className="mt-0.5 shrink-0 text-ok-400"
                  aria-label="Correct answer"
                />
              )}
              {showWrong && (
                <CircleX
                  size={17}
                  className="mt-0.5 shrink-0 text-warn-400"
                  aria-label="Your answer, incorrect"
                />
              )}
            </label>
          );
        })}
      </div>
      {answered && chosenOption && (
        <div className="mt-3 space-y-2" aria-live="polite">
          <div
            className={cn(
              'rounded-md p-3',
              chosenOption.correct ? 'bg-ok-900/40' : 'bg-warn-900/30',
            )}
          >
            <p
              className={cn(
                'text-[13px] font-medium',
                chosenOption.correct ? 'text-ok-300' : 'text-warn-300',
              )}
            >
              {chosenOption.correct ? 'Correct' : 'Not quite'}
            </p>
            <RichText className="prose-ij mt-1 text-[14px]" text={chosenOption.explanation} />
          </div>
          {!chosenOption.correct && (
            <div className="rounded-md bg-ok-900/30 p-3">
              <p className="text-[13px] font-medium text-ok-300">The correct answer</p>
              <RichText className="prose-ij mt-1 text-[14px]" text={correctOption.explanation} />
            </div>
          )}
          {question.references && (
            <details className="text-[13px]">
              <summary className="cursor-pointer text-fg-subtle hover:text-fg">Sources</summary>
              <div className="mt-2">
                <SourceList citations={question.references} />
              </div>
            </details>
          )}
        </div>
      )}
    </fieldset>
  );
}
