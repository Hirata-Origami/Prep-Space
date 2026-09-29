export interface SM2State {
  interval: number;
  repetition: number;
  easeFactor: number;
}

export type ReviewRating = 1 | 2 | 3 | 4; // 1 = Again, 2 = Hard, 3 = Good, 4 = Easy

/**
 * Calculates new interval, repetition, and ease factor using SM-2 algorithm.
 */
export function calculateSM2(
  currentState: SM2State,
  rating: ReviewRating
): { interval: number; repetition: number; easeFactor: number; nextDueDate: string } {
  let { interval, repetition, easeFactor } = currentState;

  if (rating === 1) {
    // Again: reset repetition and set 1-day interval
    repetition = 0;
    interval = 1;
    easeFactor = Math.max(1.3, easeFactor - 0.2);
  } else if (rating === 2) {
    // Hard: small interval increase, slightly lower ease
    repetition = Math.max(1, repetition);
    interval = Math.max(1, Math.round(interval * 1.2));
    easeFactor = Math.max(1.3, easeFactor - 0.15);
  } else if (rating === 3) {
    // Good: standard progression
    if (repetition === 0) {
      interval = 1;
    } else if (repetition === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetition += 1;
  } else if (rating === 4) {
    // Easy: accelerated interval, increase ease
    if (repetition === 0) {
      interval = 3;
    } else if (repetition === 1) {
      interval = 8;
    } else {
      interval = Math.round(interval * easeFactor * 1.3);
    }
    repetition += 1;
    easeFactor = Math.min(3.0, easeFactor + 0.15);
  }

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + interval);
  const nextDueDate = nextDate.toISOString().split('T')[0];

  return { interval, repetition, easeFactor, nextDueDate };
}
