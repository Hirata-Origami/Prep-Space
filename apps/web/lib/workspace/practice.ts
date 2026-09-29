import type { LanguageId } from './types';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface PracticeTrack {
  id: string;
  name: string;
  category: 'dsa' | 'sql';
  description: string;
  recommendedLanguages: LanguageId[];
  topics: string[];
}

export const DIFFICULTY_CONFIG: Record<
  DifficultyLevel,
  { label: string; xp: number; badgeColor: string; description: string }
> = {
  easy: {
    label: 'Easy',
    xp: 50,
    badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    description: 'Fundamental patterns, clean syntax, edge case basics',
  },
  medium: {
    label: 'Medium',
    xp: 100,
    badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    description: 'Core interview questions, optimal O(N) or O(log N) trade-offs',
  },
  hard: {
    label: 'Hard',
    xp: 150,
    badgeColor: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    description: 'Staff-level bar, advanced DP, tricky graph algorithms or complex SQL',
  },
};

export const PRACTICE_TRACKS: PracticeTrack[] = [
  // DSA Tracks
  {
    id: 'arrays-strings',
    name: 'Arrays & Strings',
    category: 'dsa',
    description: 'Two pointers, sliding window, prefix sums, and hash lookups.',
    recommendedLanguages: ['python', 'javascript', 'typescript', 'go', 'java', 'cpp'],
    topics: ['Sliding Window', 'Two Pointers', 'Prefix Sums', 'Hash Maps'],
  },
  {
    id: 'two-pointers-intervals',
    name: 'Intervals & Sorting',
    category: 'dsa',
    description: 'Overlapping intervals, merge patterns, and greedy range scheduling.',
    recommendedLanguages: ['python', 'javascript', 'typescript', 'go', 'java', 'cpp'],
    topics: ['Merge Intervals', 'Insert Interval', 'Non-overlapping Intervals', 'Meeting Rooms'],
  },
  {
    id: 'linked-lists',
    name: 'Linked Lists',
    category: 'dsa',
    description: 'Reversals, fast & slow pointers, cycle detection, and merging.',
    recommendedLanguages: ['python', 'javascript', 'typescript', 'go', 'java', 'cpp'],
    topics: ['Cycle Detection', 'Fast/Slow Pointers', 'List Reversal', 'Merge K Lists'],
  },
  {
    id: 'trees-graphs',
    name: 'Trees & Graphs',
    category: 'dsa',
    description: 'BFS, DFS, binary search trees, topological sort, and cycle checks.',
    recommendedLanguages: ['python', 'javascript', 'typescript', 'go', 'java', 'cpp'],
    topics: ['Binary Trees', 'BFS / DFS', 'Lowest Common Ancestor', 'Topological Sort'],
  },
  {
    id: 'dynamic-programming',
    name: 'Dynamic Programming',
    category: 'dsa',
    description: 'Memoization, state machines, knapsack variations, and grid paths.',
    recommendedLanguages: ['python', 'javascript', 'typescript', 'go', 'java', 'cpp'],
    topics: ['1D DP', '2D Grid DP', 'Knapsack', 'Subsequences'],
  },
  {
    id: 'heaps-stacks',
    name: 'Stacks & Priority Queues',
    category: 'dsa',
    description: 'Monotonic stacks, top-K frequent elements, and priority streaming.',
    recommendedLanguages: ['python', 'javascript', 'typescript', 'go', 'java', 'cpp'],
    topics: ['Monotonic Stack', 'Top-K Elements', 'Median Finder', 'Valid Parentheses'],
  },

  // SQL Tracks
  {
    id: 'sql-aggregations',
    name: 'Aggregations & Grouping',
    category: 'sql',
    description: 'GROUP BY, HAVING, conditional COUNT/SUM, and filter pipelines.',
    recommendedLanguages: ['sql'],
    topics: ['GROUP BY', 'HAVING', 'Conditional Aggregates', 'Date Truncation'],
  },
  {
    id: 'sql-joins',
    name: 'Joins & Subqueries',
    category: 'sql',
    description: 'Self-joins, anti-joins (NOT EXISTS/LEFT JOIN null), non-equi joins.',
    recommendedLanguages: ['sql'],
    topics: ['Inner/Outer Joins', 'Anti-Joins', 'Self Joins', 'Correlated Subqueries'],
  },
  {
    id: 'sql-window',
    name: 'Window Functions',
    category: 'sql',
    description: 'ROW_NUMBER, RANK, DENSE_RANK, LEAD, LAG, and running sums.',
    recommendedLanguages: ['sql'],
    topics: ['ROW_NUMBER()', 'RANK & DENSE_RANK', 'LEAD / LAG', 'Running Sums (PARTITION BY)'],
  },
  {
    id: 'sql-analytics',
    name: 'CTEs & Cohort Analytics',
    category: 'sql',
    description: 'Recursive CTEs, user retention cohorts, funnel drops, and sessionization.',
    recommendedLanguages: ['sql'],
    topics: ['WITH (CTEs)', 'Recursive CTEs', 'Retention Cohorts', 'Session Timeouts'],
  },
];

export interface TestResultItem {
  id: number;
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  note?: string;
}

export interface JudgeVerdict {
  status: 'passed' | 'failed' | 'partial';
  score: number; // 0-100
  timeComplexity: string;
  spaceComplexity: string;
  optimalComplexity: string;
  testResults: TestResultItem[];
  feedback: string;
  xpAwarded: number;
  /** True when the verdict was based on real output from running the code. */
  usedExecution?: boolean;
  submissionId?: string;
}
