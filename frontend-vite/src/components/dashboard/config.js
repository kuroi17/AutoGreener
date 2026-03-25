export const INITIAL_FORM = {
  branch: "",
  pushDate: "",
  pushTime: "09:00",
  commitMessage: "Automated push by AutoGreener",
  pushCount: "1",
  streakMode: false,
  streakEndDate: "",
  streakTemplate: "daily",
  pushPlanMode: "interval",
  intervalHours: "6",
  customTimes: ["09:00"],
};

export const MAX_STREAK_DAYS = 120;
export const MAX_PUSHES_PER_DAY = 24;
export const CARDS_PER_PAGE = 4;
export const MIN_SCHEDULE_LEAD_MINUTES = 35;

export const STREAK_TEMPLATES = [
  {
    id: "daily",
    name: "Daily",
    description: "Push every day in the selected range.",
  },
  {
    id: "weekdays",
    name: "Weekdays",
    description: "Push Monday to Friday only.",
  },
  {
    id: "alternating",
    name: "Alternate Days",
    description: "Push every other day for a natural rhythm.",
  },
  {
    id: "mwf",
    name: "Mon-Wed-Fri",
    description: "Push three times weekly on M/W/F.",
  },
  {
    id: "weekend",
    name: "Weekend",
    description: "Push only on Saturday and Sunday.",
  },
];
