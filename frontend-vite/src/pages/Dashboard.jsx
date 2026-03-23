import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import RepoSelector from "../components/dashboard/RepoSelector";
import ScheduleCard from "../components/dashboard/ScheduleCard";
import githubAPI from "../services/github";
import workflowAPI from "../services/workflow";
import { scheduleAPI } from "../services/api";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Flame,
  Leaf,
  Loader2,
  Sparkles,
  Upload,
  XCircle,
} from "lucide-react";

const INITIAL_FORM = {
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

const MAX_STREAK_DAYS = 120;
const MAX_PUSHES_PER_DAY = 24;
const CARDS_PER_PAGE = 4;
const MIN_SCHEDULE_LEAD_MINUTES = 10;

const STREAK_TEMPLATES = [
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

const formatDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const isSameDate = (left, right) => {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
};

const formatTimeInput = (date) => {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const timeTextToMinutes = (timeText) => {
  if (!timeText || !timeText.includes(":")) return -1;
  const [hourText, minuteText] = timeText.split(":");
  const hours = Number(hourText);
  const minutes = Number(minuteText);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return -1;
  return hours * 60 + minutes;
};

const clampIntegerString = (value, minimum, maximum) => {
  const digitsOnly = String(value || "").replace(/\D/g, "");
  if (!digitsOnly) {
    return String(minimum);
  }

  const bounded = Math.min(
    Math.max(Number(digitsOnly) || minimum, minimum),
    maximum,
  );

  return String(bounded);
};

const Dashboard = () => {
  const [schedules, setSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rowActionId, setRowActionId] = useState("");
  const [repositories, setRepositories] = useState([]);
  const [branches, setBranches] = useState([]);
  const [repoQuery, setRepoQuery] = useState("");
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [feedback, setFeedback] = useState({
    show: false,
    type: "",
    message: "",
  });
  const [hasLoadedSchedules, setHasLoadedSchedules] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [schedulePage, setSchedulePage] = useState(0);
  const [clockNow, setClockNow] = useState(() => new Date());
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(true);
  const [workflowStatusById, setWorkflowStatusById] = useState({});

  useEffect(() => {
    void Promise.all([fetchSchedules(), fetchRepositories()]);
  }, []);

  useEffect(() => {
    const timerId = setInterval(() => {
      setClockNow(new Date());
    }, 30000);

    return () => clearInterval(timerId);
  }, []);

  const fetchSchedules = async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setLoadingSchedules(true);
      } else {
        setIsRefreshing(true);
      }

      const response = await scheduleAPI.getAll();
      if (response.success) {
        const nextSchedules = response.data || [];
        setSchedules(nextSchedules);

        const schedulesNeedingStatusProbe = nextSchedules.filter((schedule) => {
          return (
            typeof schedule.workflow_deployed !== "boolean" &&
            schedule.repo_owner &&
            schedule.repo_name &&
            workflowStatusById[schedule.id] === undefined
          );
        });

        if (schedulesNeedingStatusProbe.length > 0) {
          void (async () => {
            const results = await Promise.all(
              schedulesNeedingStatusProbe.map(async (schedule) => {
                try {
                  const status = await workflowAPI.checkStatus(schedule.id);
                  return [schedule.id, Boolean(status?.workflowDeployed)];
                } catch (_error) {
                  return null;
                }
              }),
            );

            const resolvedStatuses = Object.fromEntries(
              results.filter(Boolean),
            );

            if (Object.keys(resolvedStatuses).length > 0) {
              setWorkflowStatusById((previous) => ({
                ...previous,
                ...resolvedStatuses,
              }));
            }
          })();
        }
      }
    } catch (error) {
      console.error("Error fetching schedules:", error);
      if (!silent) {
        setBanner("error", "Failed to load schedules");
      }
    } finally {
      if (!silent) {
        setLoadingSchedules(false);
      }
      setIsRefreshing(false);
      setHasLoadedSchedules(true);
    }
  };

  const fetchRepositories = async () => {
    try {
      setLoadingRepos(true);
      const repos = await githubAPI.getUserRepositories();
      setRepositories(repos);
    } catch (error) {
      console.error("Error fetching repositories:", error);
      setBanner("error", "Failed to load repositories");
    } finally {
      setLoadingRepos(false);
    }
  };

  useEffect(() => {
    const loadBranches = async () => {
      if (!selectedRepo) {
        setBranches([]);
        setForm((previous) => ({ ...previous, branch: "" }));
        return;
      }

      try {
        setLoadingBranches(true);
        const nextBranches = await githubAPI.getBranches(
          selectedRepo.owner,
          selectedRepo.name,
        );
        setBranches(nextBranches);

        setForm((previous) => {
          const preferredBranch =
            selectedRepo.default_branch || nextBranches[0]?.name || "";
          return {
            ...previous,
            branch: previous.branch || preferredBranch,
          };
        });
      } catch (error) {
        console.error("Error fetching branches:", error);
        setBanner("error", "Failed to load branches for selected repository");
      } finally {
        setLoadingBranches(false);
      }
    };

    void loadBranches();
  }, [selectedRepo]);

  // Auto-refresh schedules when there are active schedules (so UI reflects workflow completions)
  useEffect(() => {
    let intervalId = null;
    const shouldPoll = schedules.some((item) =>
      ["active", "scheduled", "in-progress"].includes(item.status),
    );

    if (shouldPoll) {
      // Poll every 15 seconds
      intervalId = setInterval(() => {
        void (async () => {
          try {
            await scheduleAPI.syncStatus();
          } catch (_error) {
            // Ignore sync failures during background refresh and keep list refresh resilient.
          }

          await fetchSchedules({ silent: true });
        })();
      }, 15000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [schedules]);

  useEffect(() => {
    setSchedulePage(0);
  }, [repoQuery]);

  const setBanner = (type, message) => {
    setFeedback({ show: true, type, message });
  };

  const closeBanner = () => {
    setFeedback({ show: false, type: "", message: "" });
  };

  const filteredRepos = useMemo(() => {
    const normalized = repoQuery.trim().toLowerCase();
    if (!normalized) {
      return repositories.slice(0, 8);
    }
    return repositories
      .filter((repo) => {
        return (
          repo.full_name.toLowerCase().includes(normalized) ||
          repo.description?.toLowerCase().includes(normalized)
        );
      })
      .slice(0, 8);
  }, [repositories, repoQuery]);

  const stats = useMemo(() => {
    const activeCount = schedules.filter((item) => {
      return ["active", "scheduled", "in-progress"].includes(item.status);
    }).length;

    const completedCount = schedules.filter(
      (item) => item.status === "completed",
    ).length;

    return {
      total: schedules.length,
      active: activeCount,
      completed: completedCount,
    };
  }, [schedules]);

  const minDateText = useMemo(() => formatDateInput(clockNow), [clockNow]);

  const minTimeText = useMemo(() => {
    const minSchedulableTime = new Date(
      clockNow.getTime() + MIN_SCHEDULE_LEAD_MINUTES * 60 * 1000,
    );
    return formatTimeInput(minSchedulableTime);
  }, [clockNow]);

  const isTodaySelected = useMemo(() => {
    if (!form.pushDate) return false;
    const selectedDate = new Date(`${form.pushDate}T00:00:00`);
    return isSameDate(selectedDate, clockNow);
  }, [form.pushDate, clockNow]);

  const pushesPerSlot = useMemo(() => {
    const parsed = Number(form.pushCount);
    if (Number.isNaN(parsed)) return 1;
    return Math.min(Math.max(parsed, 1), 20);
  }, [form.pushCount]);

  const totalSchedulePages = Math.max(
    1,
    Math.ceil(schedules.length / CARDS_PER_PAGE),
  );

  const visibleSchedules = useMemo(() => {
    const start = schedulePage * CARDS_PER_PAGE;
    return schedules.slice(start, start + CARDS_PER_PAGE);
  }, [schedules, schedulePage]);

  useEffect(() => {
    setSchedulePage((previous) => {
      const maxIndex = Math.max(totalSchedulePages - 1, 0);
      return Math.min(previous, maxIndex);
    });
  }, [totalSchedulePages]);

  useEffect(() => {
    if (!form.pushDate) {
      updateForm("pushDate", minDateText);
      return;
    }

    const selected = new Date(`${form.pushDate}T00:00:00`);
    const minDate = new Date(`${minDateText}T00:00:00`);
    if (selected < minDate) {
      updateForm("pushDate", minDateText);
    }
  }, [form.pushDate, minDateText]);

  useEffect(() => {
    if (!isTodaySelected) {
      return;
    }

    if (timeTextToMinutes(form.pushTime) < timeTextToMinutes(minTimeText)) {
      updateForm("pushTime", minTimeText);
    }
  }, [form.pushTime, isTodaySelected, minTimeText]);

  const resolveTotalDays = () => {
    if (!form.pushDate || !form.streakEndDate) {
      return {
        error: "Start date and end date are required for streak mode",
        totalDays: 0,
      };
    }

    let totalDays = 0;

    const startDate = new Date(`${form.pushDate}T00:00:00`);
    const endDate = new Date(`${form.streakEndDate}T00:00:00`);

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
    totalDays = Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;

    if (totalDays > MAX_STREAK_DAYS) {
      return {
        error: `Date range is too large. Maximum is ${MAX_STREAK_DAYS} days per streak.`,
        totalDays: 0,
      };
    }

    return { error: "", totalDays };
  };

  const getPatternOffsets = (startDateText, totalDays, templateId) => {
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

  const selectedTemplate =
    STREAK_TEMPLATES.find((template) => template.id === form.streakTemplate) ||
    STREAK_TEMPLATES[0];

  const hasValidTemplateRange = useMemo(() => {
    if (!form.pushDate || !form.streakEndDate) {
      return false;
    }

    const startDate = new Date(`${form.pushDate}T00:00:00`);
    const endDate = new Date(`${form.streakEndDate}T00:00:00`);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return false;
    }

    return endDate >= startDate;
  }, [form.pushDate, form.streakEndDate]);

  const getStatusClassName = (status) => {
    const classes = {
      active: "bg-emerald-100 text-emerald-800 border border-emerald-200",
      scheduled: "bg-lime-100 text-lime-800 border border-lime-200",
      "in-progress": "bg-amber-100 text-amber-900 border border-amber-200",
      paused: "bg-zinc-100 text-zinc-700 border border-zinc-200",
      completed: "bg-teal-100 text-teal-800 border border-teal-200",
      error: "bg-red-100 text-red-800 border border-red-200",
      cancelled: "bg-slate-100 text-slate-700 border border-slate-200",
    };
    return classes[status] || classes.scheduled;
  };

  const formatDateTime = (value) => {
    if (!value) return "No schedule time";
    const parsed = new Date(value);
    return parsed.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const onRepoQueryChange = (value) => {
    setRepoQuery(value);
    if (selectedRepo && value !== selectedRepo.full_name) {
      setSelectedRepo(null);
      setForm((previous) => ({ ...previous, branch: "" }));
    }
  };

  const pickRepo = (repo) => {
    setSelectedRepo(repo);
    setRepoQuery(repo.full_name);
  };

  const updateForm = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const updateCustomTime = (index, value) => {
    setForm((previous) => {
      const nextCustomTimes = [...previous.customTimes];
      nextCustomTimes[index] = value;
      return { ...previous, customTimes: nextCustomTimes };
    });
  };

  const addCustomTime = () => {
    setForm((previous) => {
      if (previous.customTimes.length >= MAX_PUSHES_PER_DAY) {
        return previous;
      }

      return {
        ...previous,
        customTimes: [...previous.customTimes, previous.pushTime || "09:00"],
      };
    });
  };

  const removeCustomTime = (index) => {
    setForm((previous) => {
      if (previous.customTimes.length <= 1) {
        return previous;
      }

      return {
        ...previous,
        customTimes: previous.customTimes.filter((_, item) => item !== index),
      };
    });
  };

  function getDailyPushTimes() {
    const selectedDate = new Date(`${form.pushDate}T00:00:00`);
    const isToday = isSameDate(selectedDate, new Date());
    const now = new Date();
    const minLeadDate = new Date(
      now.getTime() + MIN_SCHEDULE_LEAD_MINUTES * 60 * 1000,
    );
    const minLeadMinutes =
      minLeadDate.getHours() * 60 + minLeadDate.getMinutes();

    if (form.pushPlanMode === "custom") {
      const uniqueSorted = [...new Set(form.customTimes)]
        .filter((time) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(time))
        .sort();

      const futureOnly = isToday
        ? uniqueSorted.filter((time) => {
            const [hours, minutes] = time.split(":").map(Number);
            return hours * 60 + minutes >= minLeadMinutes;
          })
        : uniqueSorted;

      if (futureOnly.length === 0) {
        return {
          error: "Add at least one valid custom time that is not in the past",
          times: [],
        };
      }

      return { error: "", times: futureOnly };
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
      total < 24 * 60 && times.length < MAX_PUSHES_PER_DAY;
      total += stepMinutes
    ) {
      const hours = String(Math.floor(total / 60)).padStart(2, "0");
      const minutes = String(total % 60).padStart(2, "0");
      times.push(`${hours}:${minutes}`);
    }

    const futureOnly = isToday
      ? times.filter((time) => {
          const [hours, minutes] = time.split(":").map(Number);
          return hours * 60 + minutes >= minLeadMinutes;
        })
      : times;

    if (futureOnly.length === 0) {
      return {
        error: "Interval generated no valid future times for the selected day",
        times: [],
      };
    }

    return { error: "", times: futureOnly };
  }

  const streakPreview = useMemo(() => {
    if (!form.streakMode || !form.pushDate) {
      return null;
    }

    const { error, totalDays } = resolveTotalDays();
    if (error) {
      return { error, pushCount: 0 };
    }

    const { error: dailyTimeError, times: dailyTimes } = getDailyPushTimes();
    if (dailyTimeError) {
      return { error: dailyTimeError, pushCount: 0 };
    }

    const offsets = getPatternOffsets(
      form.pushDate,
      totalDays,
      form.streakTemplate,
    );

    return {
      error: "",
      pushCount: offsets.length * dailyTimes.length * pushesPerSlot,
    };
  }, [
    form.streakMode,
    form.pushDate,
    form.streakEndDate,
    form.streakTemplate,
    form.pushTime,
    form.pushPlanMode,
    form.intervalHours,
    form.customTimes,
    pushesPerSlot,
  ]);

  const createSchedulePayload = (pushDate, pushTime, dayOffset = 0) => {
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

  const handleCreate = async (event) => {
    event.preventDefault();

    if (!selectedRepo) {
      setBanner("error", "Select a repository first");
      return;
    }

    if (!form.branch || !form.pushDate || !form.pushTime) {
      setBanner("error", "Branch, date, and time are required");
      return;
    }

    const firstScheduledDate = new Date(`${form.pushDate}T${form.pushTime}:00`);
    const minSchedulableDate = new Date(
      Date.now() + MIN_SCHEDULE_LEAD_MINUTES * 60 * 1000,
    );

    if (firstScheduledDate < minSchedulableDate) {
      setBanner(
        "error",
        `Please select a date and time at least ${MIN_SCHEDULE_LEAD_MINUTES} minutes ahead`,
      );
      return;
    }

    setSubmitting(true);
    closeBanner();

    try {
      if (form.streakMode) {
        const { error, totalDays } = resolveTotalDays();
        if (error) {
          setBanner("error", error);
          setSubmitting(false);
          return;
        }

        const offsets = getPatternOffsets(
          form.pushDate,
          totalDays,
          form.streakTemplate,
        );
        const { error: dailyTimeError, times: dailyTimes } =
          getDailyPushTimes();
        if (dailyTimeError) {
          setBanner("error", dailyTimeError);
          setSubmitting(false);
          return;
        }

        if (offsets.length === 0) {
          setBanner(
            "warning",
            "Selected template produces zero pushes in this date range",
          );
          setSubmitting(false);
          return;
        }

        let successCount = 0;
        let failedCount = 0;
        let skippedPastCount = 0;

        for (const dayOffset of offsets) {
          for (const pushTime of dailyTimes) {
            try {
              const payload = createSchedulePayload(
                form.pushDate,
                pushTime,
                dayOffset,
              );

              if (new Date(payload.push_time) < minSchedulableDate) {
                skippedPastCount += 1;
                continue;
              }

              const response = await scheduleAPI.create(payload);
              if (response.success) {
                successCount += 1;
              } else {
                failedCount += 1;
              }
            } catch (error) {
              failedCount += 1;
            }
          }
        }

        if (failedCount === 0 && skippedPastCount === 0) {
          setBanner(
            "success",
            `Streak Builder (${selectedTemplate.name}) created ${successCount} schedules successfully`,
          );
        } else {
          setBanner(
            "warning",
            `Created ${successCount} schedules with ${selectedTemplate.name}, ${failedCount} failed, ${skippedPastCount} skipped (past times)`,
          );
        }
      } else {
        const payload = createSchedulePayload(form.pushDate, form.pushTime);
        const response = await scheduleAPI.create(payload);
        if (!response.success) {
          throw new Error("Failed to create schedule");
        }
        setBanner("success", "Schedule created successfully");
      }

      await fetchSchedules();
    } catch (error) {
      console.error("Error creating schedule:", error);
      setBanner("error", "Failed to create schedule");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWorkflowToggle = async (schedule) => {
    try {
      setRowActionId(schedule.id);
      const isWorkflowDeployed =
        typeof schedule.workflow_deployed === "boolean"
          ? schedule.workflow_deployed
          : Boolean(workflowStatusById[schedule.id]);

      const response = isWorkflowDeployed
        ? await workflowAPI.remove(schedule.id)
        : await workflowAPI.deploy(schedule.id);

      if (response.success) {
        const nextWorkflowState = !isWorkflowDeployed;
        const verb = nextWorkflowState ? "deployed" : "removed";

        setWorkflowStatusById((previous) => ({
          ...previous,
          [schedule.id]: nextWorkflowState,
        }));

        setSchedules((previous) =>
          previous.map((item) =>
            item.id === schedule.id
              ? { ...item, workflow_deployed: nextWorkflowState }
              : item,
          ),
        );

        setBanner("success", `Workflow ${verb} successfully`);
        await fetchSchedules({ silent: true });
      }
    } catch (error) {
      console.error("Error toggling workflow:", error);
      setBanner("error", "Failed to update workflow file");
    } finally {
      setRowActionId("");
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm("Delete this schedule?");
    if (!confirmed) return;

    try {
      setRowActionId(id);
      const response = await scheduleAPI.delete(id);
      if (response.success) {
        setBanner("success", "Schedule deleted successfully");
        await fetchSchedules();
      }
    } catch (error) {
      console.error("Error deleting schedule:", error);
      setBanner("error", "Failed to delete schedule");
    } finally {
      setRowActionId("");
    }
  };

  if (loadingSchedules && !hasLoadedSchedules) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-lime-100 via-emerald-50 to-white px-4">
        <div className="w-full max-w-md rounded-3xl border border-emerald-200/70 bg-white/80 p-8 text-center shadow-lg backdrop-blur">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <Leaf className="h-7 w-7 animate-pulse" />
          </div>
          <h2 className="text-xl font-extrabold text-emerald-950">
            Warming up AutoGreener
          </h2>
          <p className="mt-2 text-sm text-emerald-700">
            Initial load can take a moment if the backend is waking up.
          </p>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-emerald-100">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-emerald-500" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-lime-50 to-white">
      <Navbar />

      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <section className="mb-6 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                <Leaf className="h-3.5 w-3.5" />
                Lightweight mode
              </p>
              <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-emerald-950">
                Contribution Scheduler
              </h1>
              <p className="mt-1 text-sm text-emerald-800">
                Pick a repo, set a time, and automate your green graph without
                extra noise.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:min-w-[320px]">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-center">
                <p className="text-xs font-medium text-emerald-700">Total</p>
                <p className="text-xl font-bold text-emerald-950">
                  {stats.total}
                </p>
              </div>
              <div className="rounded-xl border border-lime-100 bg-lime-50 px-4 py-3 text-center">
                <p className="text-xs font-medium text-lime-700">Active</p>
                <p className="text-xl font-bold text-lime-900">
                  {stats.active}
                </p>
              </div>
              <div className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-center">
                <p className="text-xs font-medium text-teal-700">Done</p>
                <p className="text-xl font-bold text-teal-900">
                  {stats.completed}
                </p>
              </div>
            </div>
          </div>
        </section>

        {feedback.show && (
          <div
            className={`mb-5 flex items-start justify-between rounded-xl border px-4 py-3 text-sm ${
              feedback.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : feedback.type === "warning"
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            <p className="flex items-center gap-2 font-medium">
              {feedback.type === "success" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              {feedback.message}
            </p>
            <button
              onClick={closeBanner}
              className="text-current/70 hover:text-current"
            >
              Close
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[400px_minmax(0,1fr)] xl:grid-cols-[440px_minmax(0,1fr)]">
          <section className="h-fit rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm lg:sticky lg:top-6">
            <h2 className="text-lg font-bold text-emerald-950">
              Create schedule
            </h2>
            <p className="mt-1 text-sm text-emerald-700">
              Everything in one panel, no extra page.
            </p>

            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <RepoSelector
                loadingRepos={loadingRepos}
                repoQuery={repoQuery}
                onRepoQueryChange={onRepoQueryChange}
                selectedRepo={selectedRepo}
                filteredRepos={filteredRepos}
                onPickRepo={pickRepo}
              />

              <div>
                <label className="mb-1 block text-sm font-medium text-emerald-900">
                  Branch
                </label>
                {loadingBranches ? (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading branches...
                  </div>
                ) : branches.length > 0 ? (
                  <select
                    value={form.branch}
                    onChange={(event) =>
                      updateForm("branch", event.target.value)
                    }
                    className="w-full rounded-lg border border-emerald-200 px-3 py-2.5 text-sm text-emerald-950 outline-none transition-colors focus:border-emerald-500"
                  >
                    {branches.map((branch) => (
                      <option key={branch.name} value={branch.name}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={form.branch}
                    onChange={(event) =>
                      updateForm("branch", event.target.value)
                    }
                    placeholder="main"
                    className="w-full rounded-lg border border-emerald-200 px-3 py-2.5 text-sm text-emerald-950 outline-none transition-colors focus:border-emerald-500"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 flex items-center gap-1 text-sm font-medium text-emerald-900">
                    <CalendarDays className="h-4 w-4 text-emerald-600" />
                    Date
                  </label>
                  <input
                    type="date"
                    value={form.pushDate}
                    onChange={(event) =>
                      updateForm("pushDate", event.target.value)
                    }
                    min={minDateText}
                    className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm text-emerald-950 outline-none transition-colors focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-1 text-sm font-medium text-emerald-900">
                    <Clock3 className="h-4 w-4 text-emerald-600" />
                    Time
                  </label>
                  <input
                    type="time"
                    value={form.pushTime}
                    onChange={(event) =>
                      updateForm("pushTime", event.target.value)
                    }
                    min={isTodaySelected ? minTimeText : undefined}
                    step="60"
                    className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm text-emerald-950 outline-none transition-colors focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-emerald-900">
                  Pushes at selected schedule time
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={form.pushCount}
                  onChange={(event) => {
                    const incoming = event.target.value;
                    if (/^\d*$/.test(incoming)) {
                      updateForm("pushCount", incoming);
                    }
                  }}
                  onBlur={() => {
                    updateForm(
                      "pushCount",
                      clampIntegerString(form.pushCount, 1, 20),
                    );
                  }}
                  className="w-full rounded-lg border border-emerald-200 px-3 py-2.5 text-sm text-emerald-950 outline-none transition-colors focus:border-emerald-500"
                />
                <p className="mt-1 text-xs text-emerald-700">
                  This applies to normal schedule and each streak schedule slot.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-emerald-900">
                  Commit message (optional)
                </label>
                <input
                  value={form.commitMessage}
                  onChange={(event) =>
                    updateForm("commitMessage", event.target.value)
                  }
                  placeholder="Automated push by AutoGreener"
                  className="w-full rounded-lg border border-emerald-200 px-3 py-2.5 text-sm text-emerald-950 outline-none transition-colors focus:border-emerald-500"
                />
              </div>

              <div className="rounded-xl border border-lime-200 bg-lime-50 p-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-lime-900">
                  <Flame className="h-4 w-4" />
                  Killer feature: Streak Builder
                </p>
                <p className="mt-1 text-xs text-lime-800">
                  Create multiple day-by-day schedules in one click.
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-lime-900">
                    <input
                      type="checkbox"
                      checked={form.streakMode}
                      onChange={(event) =>
                        updateForm("streakMode", event.target.checked)
                      }
                      className="h-4 w-4 accent-emerald-600"
                    />
                    Enable streak mode
                  </label>
                </div>
                {form.streakMode && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <label className="mb-1 block text-xs font-medium text-lime-900">
                        End date
                      </label>
                      <input
                        type="date"
                        value={form.streakEndDate}
                        onChange={(event) =>
                          updateForm("streakEndDate", event.target.value)
                        }
                        min={form.pushDate || minDateText}
                        className="w-full rounded-lg border border-lime-300 bg-white px-2 py-1.5 text-sm text-lime-900 outline-none"
                      />
                    </div>
                    <p className="col-span-2 text-[11px] text-lime-800">
                      End date is required and must be on or after start date.
                    </p>

                    <div className="col-span-2 rounded-lg border border-lime-200 bg-white p-2.5">
                      <p className="mb-2 text-xs font-medium text-lime-900">
                        Pushes per day
                      </p>
                      <div className="mb-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => updateForm("pushPlanMode", "interval")}
                          className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                            form.pushPlanMode === "interval"
                              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                              : "border-lime-200 bg-white text-lime-900"
                          }`}
                        >
                          Interval
                        </button>
                        <button
                          type="button"
                          onClick={() => updateForm("pushPlanMode", "custom")}
                          className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                            form.pushPlanMode === "custom"
                              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                              : "border-lime-200 bg-white text-lime-900"
                          }`}
                        >
                          Custom time set
                        </button>
                      </div>

                      {form.pushPlanMode === "interval" ? (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="mb-1 block text-[11px] font-medium text-lime-900">
                              Base time
                            </label>
                            <input
                              type="time"
                              value={form.pushTime}
                              onChange={(event) =>
                                updateForm("pushTime", event.target.value)
                              }
                              min={isTodaySelected ? minTimeText : undefined}
                              step="60"
                              className="w-full rounded-lg border border-lime-300 px-2 py-1.5 text-sm text-lime-900 outline-none"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] font-medium text-lime-900">
                              Every X hours
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="23"
                              value={form.intervalHours}
                              onChange={(event) => {
                                const incoming = event.target.value;
                                if (/^\d*$/.test(incoming)) {
                                  updateForm("intervalHours", incoming);
                                }
                              }}
                              onBlur={() => {
                                updateForm(
                                  "intervalHours",
                                  clampIntegerString(form.intervalHours, 1, 23),
                                );
                              }}
                              className="w-full rounded-lg border border-lime-300 px-2 py-1.5 text-sm text-lime-900 outline-none"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {form.customTimes.map((time, index) => (
                            <div
                              key={`${index}-${time}`}
                              className="flex gap-2"
                            >
                              <input
                                type="time"
                                value={time}
                                onChange={(event) =>
                                  updateCustomTime(index, event.target.value)
                                }
                                min={isTodaySelected ? minTimeText : undefined}
                                step="60"
                                className="w-full rounded-lg border border-lime-300 px-2 py-1.5 text-sm text-lime-900 outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => removeCustomTime(index)}
                                disabled={form.customTimes.length <= 1}
                                className="rounded-lg border border-lime-200 px-2 text-xs text-lime-900 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Remove
                              </button>
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={addCustomTime}
                            disabled={
                              form.customTimes.length >= MAX_PUSHES_PER_DAY
                            }
                            className="rounded-lg border border-lime-300 bg-lime-50 px-2.5 py-1 text-xs font-medium text-lime-900 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Add time
                          </button>
                        </div>
                      )}
                    </div>

                    {hasValidTemplateRange ? (
                      <div className="col-span-2">
                        <button
                          type="button"
                          onClick={() =>
                            setIsTemplatePickerOpen((previous) => !previous)
                          }
                          className="mb-1 flex w-full items-center justify-between rounded-lg border border-lime-200 bg-white px-2.5 py-2 text-xs font-medium text-lime-900"
                        >
                          <span>Contribution pattern template</span>
                          <span>
                            {
                              STREAK_TEMPLATES.find(
                                (template) =>
                                  template.id === form.streakTemplate,
                              )?.name
                            }
                          </span>
                        </button>
                        {isTemplatePickerOpen && (
                          <div className="max-h-40 space-y-1.5 overflow-auto rounded-lg border border-lime-200 bg-white p-2">
                            {STREAK_TEMPLATES.map((template) => {
                              const active =
                                form.streakTemplate === template.id;
                              return (
                                <button
                                  key={template.id}
                                  type="button"
                                  onClick={() => {
                                    updateForm("streakTemplate", template.id);
                                    setIsTemplatePickerOpen(false);
                                  }}
                                  className={`w-full rounded-lg border px-2.5 py-2 text-left transition-colors ${
                                    active
                                      ? "border-emerald-300 bg-emerald-50"
                                      : "border-lime-200 bg-white hover:bg-lime-50"
                                  }`}
                                >
                                  <p className="text-xs font-semibold text-emerald-950">
                                    {template.name}
                                  </p>
                                  <p className="mt-0.5 text-[11px] text-emerald-700">
                                    {template.description}
                                  </p>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="col-span-2 text-[11px] text-lime-800">
                        Pick both start date and end date to unlock pattern
                        templates.
                      </p>
                    )}

                    <div className="col-span-2 rounded-lg border border-lime-200 bg-lime-100/60 px-2.5 py-2 text-[11px] text-lime-900">
                      {streakPreview?.error ? (
                        <span>{streakPreview.error}</span>
                      ) : (
                        <span>
                          Preview: {selectedTemplate.name} will create about{" "}
                          <strong>{streakPreview?.pushCount || 0}</strong>{" "}
                          scheduled pushes.
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    {form.streakMode ? "Create streak" : "Create schedule"}
                  </>
                )}
              </button>
            </form>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-emerald-950">
                  Scheduled pushes
                </h2>
                <p className="text-xs text-emerald-700">
                  Showing up to {CARDS_PER_PAGE} cards per page
                </p>
              </div>
              <button
                onClick={() => fetchSchedules()}
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-50"
              >
                {isRefreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Refresh
              </button>
            </div>

            {loadingSchedules ? (
              <div className="rounded-2xl border border-emerald-100 bg-white p-8 text-center">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-600" />
                <p className="mt-2 text-sm text-emerald-700">
                  Loading schedules...
                </p>
              </div>
            ) : schedules.length === 0 ? (
              <div className="rounded-2xl border border-emerald-100 bg-white p-8 text-center">
                <Leaf className="mx-auto h-8 w-8 text-emerald-500" />
                <p className="mt-2 font-semibold text-emerald-900">
                  No schedules yet
                </p>
                <p className="text-sm text-emerald-700">
                  Create your first schedule from the left panel.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {visibleSchedules.map((schedule) => {
                    const isWorkflowDeployed =
                      typeof schedule.workflow_deployed === "boolean"
                        ? schedule.workflow_deployed
                        : Boolean(workflowStatusById[schedule.id]);

                    return (
                      <ScheduleCard
                        key={schedule.id}
                        schedule={schedule}
                        rowActionId={rowActionId}
                        isWorkflowDeployed={isWorkflowDeployed}
                        formatDateTime={formatDateTime}
                        getStatusClassName={getStatusClassName}
                        onWorkflowToggle={handleWorkflowToggle}
                        onDelete={handleDelete}
                      />
                    );
                  })}
                </div>

                {schedules.length > CARDS_PER_PAGE && (
                  <div className="mt-4 flex items-center justify-between rounded-2xl border border-emerald-100 bg-white px-3 py-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSchedulePage((previous) => Math.max(previous - 1, 0))
                      }
                      disabled={schedulePage <= 0}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2.5 py-1 text-sm text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4" /> Prev
                    </button>

                    <div className="flex items-center gap-1.5">
                      {Array.from(
                        { length: totalSchedulePages },
                        (_, index) => (
                          <button
                            key={`schedule-page-${index + 1}`}
                            type="button"
                            onClick={() => setSchedulePage(index)}
                            className={`h-2.5 w-2.5 rounded-full transition-all ${
                              index === schedulePage
                                ? "bg-emerald-600"
                                : "bg-emerald-200 hover:bg-emerald-300"
                            }`}
                            aria-label={`Go to page ${index + 1}`}
                          />
                        ),
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setSchedulePage((previous) =>
                          Math.min(previous + 1, totalSchedulePages - 1),
                        )
                      }
                      disabled={schedulePage >= totalSchedulePages - 1}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2.5 py-1 text-sm text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
