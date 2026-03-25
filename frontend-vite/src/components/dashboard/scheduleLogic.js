export const resolveTotalDays = ({
  pushDate,
  streakEndDate,
  maxStreakDays,
}) => {
  if (!pushDate || !streakEndDate) {
    return {
      error: "Start date and end date are required for streak mode",
      totalDays: 0,
    };
  }

  const startDate = new Date(`${pushDate}T00:00:00`);
  const endDate = new Date(`${streakEndDate}T00:00:00`);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return { error: "Invalid date range selected", totalDays: 0 };
  }

  if (endDate < startDate) {
    return {
      error: "End date must be on or after start date",
      totalDays: 0,
    };
  }

  const diffMs = endDate.getTime() - startDate.getTime();
  const totalDays = Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;

  if (totalDays > maxStreakDays) {
    return {
      error: `Date range is too large. Maximum is ${maxStreakDays} days per streak.`,
      totalDays: 0,
    };
  }

  return { error: "", totalDays };
};

export const getPatternOffsets = (startDateText, totalDays, templateId) => {
  const baseDate = new Date(`${startDateText}T00:00:00`);
  const offsets = [];

  for (let dayIndex = 0; dayIndex < totalDays; dayIndex += 1) {
    const candidateDate = new Date(baseDate);
    candidateDate.setDate(baseDate.getDate() + dayIndex);
    const weekday = candidateDate.getDay();

    let includeDay = true;
    if (templateId === "weekdays") {
      includeDay = weekday >= 1 && weekday <= 5;
    } else if (templateId === "alternating") {
      includeDay = dayIndex % 2 === 0;
    } else if (templateId === "mwf") {
      includeDay = [1, 3, 5].includes(weekday);
    } else if (templateId === "weekend") {
      includeDay = [0, 6].includes(weekday);
    }

    if (includeDay) {
      offsets.push(dayIndex);
    }
  }

  return offsets;
};

export const getDailyPushTimes = ({ form, maxPushesPerDay }) => {
  if (form.pushPlanMode === "custom") {
    const uniqueSorted = [...new Set(form.customTimes)]
      .filter((time) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(time))
      .sort();

    if (uniqueSorted.length === 0) {
      return {
        error: "Add at least one valid custom time (HH:MM format)",
        times: [],
      };
    }

    return { error: "", times: uniqueSorted };
  }

  const intervalHours = Math.min(
    Math.max(Number(form.intervalHours) || 1, 1),
    23,
  );
  const [hourText, minuteText] = form.pushTime.split(":");
  const baseHour = Number(hourText);
  const baseMinute = Number(minuteText);

  if (
    Number.isNaN(baseHour) ||
    Number.isNaN(baseMinute) ||
    baseHour < 0 ||
    baseHour > 23 ||
    baseMinute < 0 ||
    baseMinute > 59
  ) {
    return { error: "Invalid base time", times: [] };
  }

  const baseMinutes = baseHour * 60 + baseMinute;
  const stepMinutes = intervalHours * 60;
  const times = [];

  for (
    let total = baseMinutes;
    total < 24 * 60 && times.length < maxPushesPerDay;
    total += stepMinutes
  ) {
    const hours = String(Math.floor(total / 60)).padStart(2, "0");
    const minutes = String(total % 60).padStart(2, "0");
    times.push(`${hours}:${minutes}`);
  }

  if (times.length === 0) {
    return {
      error: "Interval generated no times for the selected day",
      times: [],
    };
  }

  return { error: "", times };
};

export const hasMinimumLeadTime = ({
  pushDate,
  pushTime,
  minLeadMinutes,
  dayOffset = 0,
}) => {
  const scheduledDate = new Date(`${pushDate}T${pushTime}:00`);

  if (Number.isNaN(scheduledDate.getTime())) {
    return false;
  }

  scheduledDate.setDate(scheduledDate.getDate() + dayOffset);
  const minimumAllowed = Date.now() + minLeadMinutes * 60 * 1000;

  return scheduledDate.getTime() >= minimumAllowed;
};

export const createSchedulePayload = ({
  selectedRepo,
  form,
  pushesPerSlot,
  pushDate,
  pushTime,
  dayOffset = 0,
}) => {
  const baseDate = new Date(`${pushDate}T${pushTime}:00`);
  baseDate.setDate(baseDate.getDate() + dayOffset);

  return {
    github_repo_url: selectedRepo.html_url,
    repo_owner: selectedRepo.owner,
    repo_name: selectedRepo.name,
    branch: form.branch,
    push_time: baseDate.toISOString(),
    commit_message: form.commitMessage,
    push_count: pushesPerSlot,
  };
};

export const hasValidTemplateRange = ({ pushDate, streakEndDate }) => {
  if (!pushDate || !streakEndDate) {
    return false;
  }

  const startDate = new Date(`${pushDate}T00:00:00`);
  const endDate = new Date(`${streakEndDate}T00:00:00`);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return false;
  }

  return endDate >= startDate;
};
