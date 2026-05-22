/** Shared badge/chip color classes with dark-mode support. */

export const difficultyColors: Record<string, string> = {
  easy: 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  hard: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400',
};

export const statusColors: Record<string, string> = {
  open: 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400',
  'in-progress': 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
  completed: 'bg-muted text-muted-foreground',
};

export const skillCategoryColors: Record<string, string> = {
  technical: 'bg-blue-100 text-blue-700 border-blue-200/60 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
  soft: 'bg-green-100 text-green-700 border-green-200/60 dark:bg-green-950/60 dark:text-green-300 dark:border-green-800',
  language: 'bg-purple-100 text-purple-700 border-purple-200/60 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
  domain: 'bg-amber-100 text-amber-700 border-amber-200/60 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
};

export const skillLevelColors: Record<string, string> = {
  beginner: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
  intermediate: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
  advanced: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/60 dark:text-green-300 dark:border-green-800',
};
