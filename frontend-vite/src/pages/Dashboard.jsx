import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import githubAPI from "../services/github";
import workflowAPI from "../services/workflow";
import { scheduleAPI } from "../services/api";
import { Leaf } from "lucide-react";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import FeedbackBanner from "../components/dashboard/FeedbackBanner";
import CreateSchedulePanel from "../components/dashboard/CreateSchedulePanel";
import SchedulesSection from "../components/dashboard/SchedulesSection";
import {
  INITIAL_FORM,
  MAX_STREAK_DAYS,
  MAX_PUSHES_PER_DAY,
  CARDS_PER_PAGE,
  MIN_SCHEDULE_LEAD_MINUTES,
  STREAK_TEMPLATES,
} from "../components/dashboard/config";
import {
  formatDateInput,
  formatTimeInput,
  clampIntegerString,
} from "../components/dashboard/utils";
import {
  resolveTotalDays,
  getPatternOffsets,
  getDailyPushTimes,
  hasMinimumLeadTime,
  createSchedulePayload,
  hasValidTemplateRange as validateTemplateRange,
} from "../components/dashboard/scheduleLogic";

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

  const setBanner = (type, message) => {
    setFeedback({ show: true, type, message });
  };

  const closeBanner = () => {
    setFeedback({ show: false, type: "", message: "" });
  };

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

            const resolvedStatuses = Object.fromEntries(results.filter(Boolean));
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
    void Promise.all([fetchSchedules(), fetchRepositories()]);
  }, []);

  useEffect(() => {
    const timerId = setInterval(() => {
      setClockNow(new Date());
    }, 30000);

    return () => clearInterval(timerId);
  }, []);

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

  useEffect(() => {
    let intervalId = null;
    const shouldPoll = schedules.some((item) =>
      ["active", "scheduled", "in-progress"].includes(item.status),
    );

    if (shouldPoll) {
      intervalId = setInterval(() => {
        void (async () => {
          try {
            await scheduleAPI.syncStatus();
          } catch (_error) {
            // Keep background refresh resilient.
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

  const earliestAllowedDateTime = useMemo(() => {
    return new Date(clockNow.getTime() + MIN_SCHEDULE_LEAD_MINUTES * 60 * 1000);
  }, [clockNow]);

  const minDateText = useMemo(
    () => formatDateInput(earliestAllowedDateTime),
    [earliestAllowedDateTime],
  );

  const minTimeTextForSelectedDate = useMemo(() => {
    if (!form.pushDate) return "00:00";
    return form.pushDate === formatDateInput(earliestAllowedDateTime)
      ? formatTimeInput(earliestAllowedDateTime)
      : "00:00";
  }, [form.pushDate, earliestAllowedDateTime]);

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

  const updateForm = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  useEffect(() => {
    if (!form.pushDate) {
      updateForm("pushDate", minDateText);
    }
  }, [form.pushDate, minDateText]);

  useEffect(() => {
    if (!form.pushDate || !form.pushTime) {
      return;
    }

    if (
      form.pushDate === formatDateInput(earliestAllowedDateTime) &&
      form.pushTime < minTimeTextForSelectedDate
    ) {
      updateForm("pushTime", minTimeTextForSelectedDate);
    }
  }, [
    form.pushDate,
    form.pushTime,
    earliestAllowedDateTime,
    minTimeTextForSelectedDate,
  ]);

  const selectedTemplate =
    STREAK_TEMPLATES.find((template) => template.id === form.streakTemplate) ||
    STREAK_TEMPLATES[0];

  const hasValidTemplateRange = useMemo(() => {
    return validateTemplateRange({
      pushDate: form.pushDate,
      streakEndDate: form.streakEndDate,
    });
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

  const getTimesForCurrentForm = () =>
    getDailyPushTimes({ form, maxPushesPerDay: MAX_PUSHES_PER_DAY });

  const streakPreview = useMemo(() => {
    if (!form.streakMode || !form.pushDate) {
      return null;
    }

    const { error, totalDays } = resolveTotalDays({
      pushDate: form.pushDate,
      streakEndDate: form.streakEndDate,
      maxStreakDays: MAX_STREAK_DAYS,
    });
    if (error) {
      return { error, pushCount: 0 };
    }

    const { error: dailyTimeError, times: dailyTimes } = getTimesForCurrentForm();
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

  const hasLeadTime = (pushDate, pushTime, dayOffset = 0) =>
    hasMinimumLeadTime({
      pushDate,
      pushTime,
      minLeadMinutes: MIN_SCHEDULE_LEAD_MINUTES,
      dayOffset,
    });

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

    if (!hasLeadTime(form.pushDate, form.pushTime)) {
      setBanner(
        "error",
        `Pick a time at least ${MIN_SCHEDULE_LEAD_MINUTES} minutes from now`,
      );
      return;
    }

    setSubmitting(true);
    closeBanner();

    try {
      if (form.streakMode) {
        const { error, totalDays } = resolveTotalDays({
          pushDate: form.pushDate,
          streakEndDate: form.streakEndDate,
          maxStreakDays: MAX_STREAK_DAYS,
        });
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
          getTimesForCurrentForm();
        if (dailyTimeError) {
          setBanner("error", dailyTimeError);
          setSubmitting(false);
          return;
        }

        if (
          offsets.includes(0) &&
          dailyTimes.some((pushTime) => !hasLeadTime(form.pushDate, pushTime))
        ) {
          setBanner(
            "error",
            `Today's streak times must be at least ${MIN_SCHEDULE_LEAD_MINUTES} minutes ahead`,
          );
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
              const payload = createSchedulePayload({
                selectedRepo,
                form,
                pushesPerSlot,
                pushDate: form.pushDate,
                pushTime,
                dayOffset,
              });

              const response = await scheduleAPI.create(payload);
              if (response.success) {
                successCount += 1;
              } else {
                failedCount += 1;
              }
            } catch (_error) {
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
        const payload = createSchedulePayload({
          selectedRepo,
          form,
          pushesPerSlot,
          pushDate: form.pushDate,
          pushTime: form.pushTime,
        });

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
        <DashboardHeader stats={stats} />
        <FeedbackBanner feedback={feedback} onClose={closeBanner} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[400px_minmax(0,1fr)] xl:grid-cols-[440px_minmax(0,1fr)]">
          <CreateSchedulePanel
            handleCreate={handleCreate}
            loadingRepos={loadingRepos}
            repoQuery={repoQuery}
            onRepoQueryChange={onRepoQueryChange}
            selectedRepo={selectedRepo}
            filteredRepos={filteredRepos}
            onPickRepo={pickRepo}
            loadingBranches={loadingBranches}
            branches={branches}
            form={form}
            updateForm={updateForm}
            earliestAllowedDateTime={earliestAllowedDateTime}
            minDateText={minDateText}
            minTimeTextForSelectedDate={minTimeTextForSelectedDate}
            hasMinimumLeadTime={hasLeadTime}
            MIN_SCHEDULE_LEAD_MINUTES={MIN_SCHEDULE_LEAD_MINUTES}
            clampIntegerString={clampIntegerString}
            updateCustomTime={updateCustomTime}
            removeCustomTime={removeCustomTime}
            addCustomTime={addCustomTime}
            MAX_PUSHES_PER_DAY={MAX_PUSHES_PER_DAY}
            STREAK_TEMPLATES={STREAK_TEMPLATES}
            hasValidTemplateRange={hasValidTemplateRange}
            isTemplatePickerOpen={isTemplatePickerOpen}
            setIsTemplatePickerOpen={setIsTemplatePickerOpen}
            selectedTemplate={selectedTemplate}
            streakPreview={streakPreview}
            submitting={submitting}
          />

          <SchedulesSection
            fetchSchedules={fetchSchedules}
            isRefreshing={isRefreshing}
            loadingSchedules={loadingSchedules}
            schedules={schedules}
            visibleSchedules={visibleSchedules}
            workflowStatusById={workflowStatusById}
            rowActionId={rowActionId}
            formatDateTime={formatDateTime}
            getStatusClassName={getStatusClassName}
            onWorkflowToggle={handleWorkflowToggle}
            onDelete={handleDelete}
            CARDS_PER_PAGE={CARDS_PER_PAGE}
            totalSchedulePages={totalSchedulePages}
            schedulePage={schedulePage}
            setSchedulePage={setSchedulePage}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
