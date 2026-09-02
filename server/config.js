export const DEFAULT_CONFIG = {
  budget: 500,
  slots: { P: 3, D: 8, C: 8, A: 6 },
  teamsCount: 10,
  timerSeconds: 20,
  softCloseSeconds: 5,
  minIncrement: 1,
};

export const TOTAL_SLOTS = Object.values(DEFAULT_CONFIG.slots).reduce((a, b) => a + b, 0);

export const ROLES = ['P', 'D', 'C', 'A'];
