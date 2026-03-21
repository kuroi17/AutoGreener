import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import githubAPI from "../services/github";
import workflowAPI from "../services/workflow";
import { scheduleAPI } from "../services/api";
import {
  CalendarClock,
  CheckCircle2,
  Flame,
  GitBranch,
  Github,
  Leaf,
  Loader2,
  Pause,
  Play,
  Search,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";

const INITIAL_FORM = {
  branch: "",
  pushDate: "",
  pushTime: "09:00",
  commitMessage: "Automated push by AutoGreener",
  streakMode: false,
  streakEndDate: "",
  streakTemplate: "daily",
  pushPlanMode: "interval",
  intervalHours: 6,
  customTimes: ["09:00"],
};

const MAX_STREAK_DAYS = 120;
const MAX_PUSHES_PER_DAY = 24;

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

  useEffect(() => {
    void Promise.all([fetchSchedules(), fetchRepositories()]);
  }, []);

  const fetchSchedules = async () => {
    try {
      setLoadingSchedules(true);
      const response = await scheduleAPI.getAll();
      if (response.success) {
        setSchedules(response.data || []);
      }
    } catch (error) {
      console.error("Error fetching schedules:", error);
      setBanner("error", "Failed to load schedules");
    } finally {
      setLoadingSchedules(false);
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
      pushCount: offsets.length * dailyTimes.length,
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
  ]);

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

  const getDailyPushTimes = () => {
    if (form.pushPlanMode === "custom") {
      const uniqueSorted = [...new Set(form.customTimes)]
        .filter((time) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(time))
        .sort();

      if (uniqueSorted.length === 0) {
        return { error: "Add at least one valid custom time", times: [] };
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
      total < 24 * 60 && times.length < MAX_PUSHES_PER_DAY;
      total += stepMinutes
    ) {
      const hours = String(Math.floor(total / 60)).padStart(2, "0");
      const minutes = String(total % 60).padStart(2, "0");
      times.push(`${hours}:${minutes}`);
    }

    if (times.length === 0) {
      return {
        error: "Interval generated no valid times for the selected day",
        times: [],
      };
    }

    return { error: "", times };
  };

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

        for (const dayOffset of offsets) {
          for (const pushTime of dailyTimes) {
            try {
              const payload = createSchedulePayload(
                form.pushDate,
                pushTime,
                dayOffset,
              );
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

        if (failedCount === 0) {
          setBanner(
            "success",
            `Streak Builder (${selectedTemplate.name}) created ${successCount} schedules successfully`,
          );
        } else {
          setBanner(
            "warning",
            `Created ${successCount} schedules with ${selectedTemplate.name}, ${failedCount} failed`,
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

  const handleToggle = async (id) => {
    try {
      setRowActionId(id);
      const response = await scheduleAPI.toggleStatus(id);
      if (response.success) {
        setBanner("success", "Schedule status updated");
        await fetchSchedules();
      }
    } catch (error) {
      console.error("Error toggling schedule:", error);
      setBanner("error", "Failed to toggle schedule status");
    } finally {
      setRowActionId("");
    }
  };

  const handleWorkflowToggle = async (schedule) => {
    try {
      setRowActionId(schedule.id);
      const response = schedule.workflow_deployed
        ? await workflowAPI.remove(schedule.id)
        : await workflowAPI.deploy(schedule.id);

      if (response.success) {
        const verb = schedule.workflow_deployed ? "removed" : "deployed";
        setBanner("success", `Workflow ${verb} successfully`);
        await fetchSchedules();
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-lime-50 to-white">
      <Navbar />

      <div className="container mx-auto px-4 py-6 sm:px-6">
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
            <div className="grid grid-cols-3 gap-3">
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
          <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-emerald-950">
              Create schedule
            </h2>
            <p className="mt-1 text-sm text-emerald-700">
              Everything in one panel, no extra page.
            </p>

            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-emerald-900">
                  Repository
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-emerald-400" />
                  <input
                    value={repoQuery}
                    onChange={(event) => onRepoQueryChange(event.target.value)}
                    placeholder={
                      loadingRepos
                        ? "Loading repositories..."
                        : "Search repositories"
                    }
                    className="w-full rounded-lg border border-emerald-200 px-9 py-2.5 text-sm text-emerald-950 outline-none transition-colors focus:border-emerald-500"
                  />
                </div>
                {!selectedRepo && repoQuery && filteredRepos.length > 0 && (
                  <div className="mt-2 max-h-52 overflow-auto rounded-lg border border-emerald-100 bg-white">
                    {filteredRepos.map((repo) => (
                      <button
                        key={repo.id}
                        type="button"
                        onClick={() => pickRepo(repo)}
                        className="flex w-full items-start justify-between border-b border-emerald-50 px-3 py-2 text-left last:border-b-0 hover:bg-emerald-50"
                      >
                        <span>
                          <span className="block text-sm font-semibold text-emerald-950">
                            {repo.full_name}
                          </span>
                          {repo.description && (
                            <span className="line-clamp-1 block text-xs text-emerald-700">
                              {repo.description}
                            </span>
                          )}
                        </span>
                        <Github className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      </button>
                    ))}
                  </div>
                )}
                {selectedRepo && (
                  <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                    Selected: {selectedRepo.full_name}
                  </div>
                )}
              </div>

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
                  <label className="mb-1 block text-sm font-medium text-emerald-900">
                    Date
                  </label>
                  <input
                    type="date"
                    value={form.pushDate}
                    onChange={(event) =>
                      updateForm("pushDate", event.target.value)
                    }
                    max={form.streakEndDate || undefined}
                    className="w-full rounded-lg border border-emerald-200 px-3 py-2.5 text-sm text-emerald-950 outline-none transition-colors focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-emerald-900">
                    Time
                  </label>
                  <input
                    type="time"
                    value={form.pushTime}
                    onChange={(event) =>
                      updateForm("pushTime", event.target.value)
                    }
                    className="w-full rounded-lg border border-emerald-200 px-3 py-2.5 text-sm text-emerald-950 outline-none transition-colors focus:border-emerald-500"
                  />
                </div>
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
                        min={form.pushDate || undefined}
                        value={form.streakEndDate}
                        onChange={(event) =>
                          updateForm("streakEndDate", event.target.value)
                        }
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
                              onChange={(event) =>
                                updateForm("intervalHours", event.target.value)
                              }
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
                        <p className="mb-1 text-xs font-medium text-lime-900">
                          Contribution pattern template
                        </p>
                        <div className="max-h-40 space-y-1.5 overflow-auto rounded-lg border border-lime-200 bg-white p-2">
                          {STREAK_TEMPLATES.map((template) => {
                            const active = form.streakTemplate === template.id;
                            return (
                              <button
                                key={template.id}
                                type="button"
                                onClick={() =>
                                  updateForm("streakTemplate", template.id)
                                }
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
              <h2 className="text-lg font-bold text-emerald-950">
                Scheduled pushes
              </h2>
              <button
                onClick={fetchSchedules}
                className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-50"
              >
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
              <div className="space-y-3">
                {schedules.map((schedule) => {
                  const displayRepo =
                    schedule.repo_owner && schedule.repo_name
                      ? `${schedule.repo_owner}/${schedule.repo_name}`
                      : schedule.repo_path || "Unknown repository";

                  return (
                    <article
                      key={schedule.id}
                      className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <a
                            href={schedule.github_repo_url || "#"}
                            target={
                              schedule.github_repo_url ? "_blank" : undefined
                            }
                            rel="noreferrer"
                            className="font-semibold text-emerald-950 hover:text-emerald-700"
                          >
                            {displayRepo}
                          </a>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-emerald-800">
                            <span className="flex items-center gap-1">
                              <GitBranch className="h-4 w-4" />
                              {schedule.branch}
                            </span>
                            <span className="flex items-center gap-1">
                              <CalendarClock className="h-4 w-4" />
                              {formatDateTime(schedule.push_time)}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getStatusClassName(schedule.status)}`}
                        >
                          {schedule.status}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          onClick={() => handleWorkflowToggle(schedule)}
                          disabled={rowActionId === schedule.id}
                          className="rounded-lg border border-emerald-200 px-3 py-1.5 text-sm text-emerald-800 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {schedule.workflow_deployed
                            ? "Remove workflow"
                            : "Deploy workflow"}
                        </button>
                        <button
                          onClick={() => handleToggle(schedule.id)}
                          disabled={rowActionId === schedule.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-lime-200 px-3 py-1.5 text-sm text-lime-800 transition-colors hover:bg-lime-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {schedule.status === "paused" ? (
                            <>
                              <Play className="h-4 w-4" /> Resume
                            </>
                          ) : (
                            <>
                              <Pause className="h-4 w-4" /> Pause
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(schedule.id)}
                          disabled={rowActionId === schedule.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
