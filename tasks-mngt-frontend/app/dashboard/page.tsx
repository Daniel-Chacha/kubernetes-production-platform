
"use client";

import Link from "next/link";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type Task = {
  id: number;
  title: string;
  completed: boolean;
  created_at?: string;
};

type UserProfile = {
  id: number;
  username: string;
  email: string;
};

type TaskFilter = "all" | "pending" | "completed";

function formatDate(value?: string): string {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function isUserProfile(data: unknown): data is UserProfile {
  return (
    typeof data === "object" &&
    data !== null &&
    "id" in data &&
    typeof data.id === "number" &&
    "username" in data &&
    typeof data.username === "string" &&
    "email" in data &&
    typeof data.email === "string"
  );
}

function isTaskArray(data: unknown): data is Task[] {
  return (
    Array.isArray(data) &&
    data.every(
      (item: unknown) =>
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        typeof item.id === "number" &&
        "title" in item &&
        typeof item.title === "string" &&
        "completed" in item &&
        typeof item.completed === "boolean",
    )
  );
}

function isTaskResponse(data: unknown): data is { tasks: Task[] } {
  return (
    typeof data === "object" &&
    data !== null &&
    "tasks" in data &&
    isTaskArray(data.tasks)
  );
}

function isCreatedTask(data: unknown): data is Task {
  return (
    typeof data === "object" &&
    data !== null &&
    "id" in data &&
    typeof data.id === "number" &&
    "title" in data &&
    typeof data.title === "string" &&
    "completed" in data &&
    typeof data.completed === "boolean"
  );
}

export default function Home() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [filter, setFilter] = useState<TaskFilter>("all");

  const [authenticating, setAuthenticating] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/tasks/", {
        cache: "no-store",
      });

      if (response.status === 401) {
        window.location.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          `Unable to load tasks (HTTP ${response.status}).`,
        );
      }

      const data: unknown = await response.json();

      if (!isTaskResponse(data)) {
        throw new Error(
          "The task API returned an unexpected response.",
        );
      }

      setTasks(data.tasks);
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "An unexpected error occurred while loading tasks.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function verifySession() {
      setAuthenticating(true);

      try {
        const response = await fetch("/api/auth/me/", {
          cache: "no-store",
        });

        if (response.status === 401) {
          window.location.replace("/login");
          return;
        }

        if (!response.ok) {
          throw new Error(
            `Unable to verify your session (HTTP ${response.status}).`,
          );
        }

        const data: unknown = await response.json();

        if (!isUserProfile(data)) {
          throw new Error(
            "The authentication API returned an invalid profile.",
          );
        }

        if (!active) return;

        setUser(data);

        // Load tasks only after verifying the user's session.
        await loadTasks();
      } catch (cause: unknown) {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to verify your session.",
          );
        }
      } finally {
        if (active) {
          setAuthenticating(false);
        }
      }
    }

    void verifySession();

    return () => {
      active = false;
    };
  }, [loadTasks]);

  const counts = useMemo(
    () => ({
      all: tasks.length,
      pending: tasks.filter((task) => !task.completed).length,
      completed: tasks.filter((task) => task.completed).length,
    }),
    [tasks],
  );

  const visibleTasks = useMemo(
    () =>
      tasks.filter((task) => {
        if (filter === "pending") return !task.completed;
        if (filter === "completed") return task.completed;
        return true;
      }),
    [tasks, filter],
  );

  async function handleCreateTask(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const trimmedTitle = title.trim();

    if (!trimmedTitle || saving) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/tasks/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: trimmedTitle }),
      });

      if (response.status === 401) {
        window.location.replace("/login");
        return;
      }

      if (!response.ok) {
        const details = await response.text();

        throw new Error(
          `Unable to create task (HTTP ${response.status}). ${details.slice(0, 160)}`,
        );
      }

      const data: unknown = await response.json();

      if (!isCreatedTask(data)) {
        throw new Error(
          "The API returned a task in an unexpected format.",
        );
      }

      setTasks((current) => [
        data,
        ...current.filter((task) => task.id !== data.id),
      ]);

      setTitle("");
      setFilter("all");
      setSuccess("Task created successfully.");
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "An unexpected error occurred while creating the task.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setError("");

    try {
      const response = await fetch("/api/auth/logout/", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(
          "Unable to log out. Please try again.",
        );
      }

      window.location.replace("/login");
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "An unexpected error occurred while logging out.",
      );

      setLoggingOut(false);
    }
  }

  if (authenticating) {
    return (
      <main className="empty-state">
        <div className="loading-spinner" />
        <h3>Verifying your session</h3>
        <p>Loading your workspace...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="empty-state">
        <h3>Unable to load your workspace</h3>
        <p>{error || "Your session could not be verified."}</p>
        <button
          className="refresh-button"
          type="button"
          onClick={() => window.location.replace("/login")}
        >
          Go to login
        </button>
      </main>
    );
  }

  return (
    <main className="dashboard">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="Taskflow home">
          <span className="brand-mark">T</span>
          <span>
            <strong>Taskflow</strong>
            <small>WORKSPACE</small>
          </span>
        </Link>

        <div className="sidebar-section-label">WORKSPACE</div>

        <nav className="sidebar-nav" aria-label="Task navigation">
          <a className="nav-item active" href="#tasks">
            <span className="nav-icon" aria-hidden="true">
              ▤
            </span>
            <span>My tasks</span>
            <span className="nav-count">{counts.all}</span>
          </a>

          <button
            className="nav-item"
            type="button"
            onClick={() => setFilter("pending")}
          >
            <span className="nav-icon" aria-hidden="true">
              ◷
            </span>
            <span>Pending</span>
          </button>

          <button
            className="nav-item"
            type="button"
            onClick={() => setFilter("completed")}
          >
            <span className="nav-icon" aria-hidden="true">
              ✓
            </span>
            <span>Completed</span>
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="api-status">
            <span className="status-dot" />
            <span>
              <strong>Task workspace</strong>
              <small>Django REST API</small>
            </span>
          </div>

          <p className="sidebar-footer">
            Built with Next.js &amp; Kubernetes
          </p>
        </div>
      </aside>

      <section className="workspace" id="tasks">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> My tasks
          </div>

          <div className="profile">
            <div className="profile-avatar" aria-hidden="true">
              {user.username.charAt(0).toUpperCase()}
            </div>

            <div className="profile-copy">
              <strong>{user.username}</strong>
              <span>{user.email || "Personal workspace"}</span>
            </div>

            <button
              className="refresh-button"
              type="button"
              onClick={() => void handleLogout()}
              disabled={loggingOut}
            >
              {loggingOut ? "Signing out..." : "Log out"}
            </button>
          </div>
        </header>

        <div className="content">
          <section className="page-heading">
            <div>
              <p className="eyebrow">YOUR WORKSPACE</p>
              <h1>
                My tasks<span className="heading-period">.</span>
              </h1>
              <p className="page-description">
                Keep track of your work, one task at a time.
              </p>
            </div>

            <button
              className="refresh-button"
              type="button"
              onClick={() => void loadTasks()}
              disabled={loading}
            >
              <span aria-hidden="true">↻</span> Refresh
            </button>
          </section>

          <section
            className="stats-grid"
            aria-label="Task statistics"
          >
            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-label">All tasks</span>
                <span className="stat-icon stat-icon-purple">
                  ▤
                </span>
              </div>
              <strong className="stat-value">{counts.all}</strong>
              <span className="stat-note">
                Tasks in your workspace
              </span>
            </article>

            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Pending</span>
                <span className="stat-icon stat-icon-orange">
                  ◷
                </span>
              </div>
              <strong className="stat-value">
                {counts.pending}
              </strong>
              <span className="stat-note">
                Still to be completed
              </span>
            </article>

            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Completed</span>
                <span className="stat-icon stat-icon-green">
                  ✓
                </span>
              </div>
              <strong className="stat-value">
                {counts.completed}
              </strong>
              <span className="stat-note">
                Successfully finished
              </span>
            </article>
          </section>

          <section className="task-panel">
            <div className="panel-heading">
              <div>
                <h2>Task list</h2>
                <p>Your tasks, fetched from the backend.</p>
              </div>

              <span className="task-total">
                {visibleTasks.length}{" "}
                {visibleTasks.length === 1 ? "task" : "tasks"}
              </span>
            </div>

            <form
              className="create-form"
              onSubmit={handleCreateTask}
            >
              <label
                className="visually-hidden"
                htmlFor="task-title"
              >
                New task title
              </label>

              <span className="input-plus" aria-hidden="true">
                +
              </span>

              <input
                id="task-title"
                name="title"
                type="text"
                placeholder="What needs to get done?"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setSuccess("");
                }}
                maxLength={200}
                required
              />

              <button
                type="submit"
                disabled={saving || !title.trim()}
              >
                {saving ? "Adding..." : "Add task"}
              </button>
            </form>

            {error && (
              <div
                className="message message-error"
                role="alert"
              >
                <strong>Something went wrong.</strong>
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => void loadTasks()}
                  disabled={loading}
                >
                  Try again
                </button>
              </div>
            )}

            {success && (
              <div
                className="message message-success"
                role="status"
              >
                {success}
              </div>
            )}

            <div className="filter-row" aria-label="Filter tasks">
              {(["all", "pending", "completed"] as const).map(
                (item) => (
                  <button
                    key={item}
                    type="button"
                    className={`filter-button ${
                      filter === item ? "selected" : ""
                    }`}
                    onClick={() => setFilter(item)}
                    aria-pressed={filter === item}
                  >
                    {item.charAt(0).toUpperCase() + item.slice(1)}
                    <span>{counts[item]}</span>
                  </button>
                ),
              )}
            </div>

            {loading ? (
              <div className="empty-state">
                <div className="loading-spinner" />
                <h3>Loading your tasks</h3>
                <p>Connecting to the task API...</p>
              </div>
            ) : visibleTasks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon" aria-hidden="true">
                  ✓
                </div>
                <h3>
                  {filter === "completed"
                    ? "No completed tasks yet"
                    : filter === "pending"
                      ? "You're all caught up"
                      : "Your task list is empty"}
                </h3>
                <p>
                  {filter === "all"
                    ? "Add your first task using the form above."
                    : "Try another filter or add a new task."}
                </p>
              </div>
            ) : (
              <ul className="task-list">
                {visibleTasks.map((task) => (
                  <li className="task-row" key={task.id}>
                    <span
                      className={`task-indicator ${
                        task.completed ? "is-complete" : ""
                      }`}
                      aria-label={
                        task.completed ? "Completed" : "Pending"
                      }
                    >
                      {task.completed ? "✓" : ""}
                    </span>

                    <div className="task-details">
                      <span
                        className={
                          task.completed
                            ? "task-title done"
                            : "task-title"
                        }
                      >
                        {task.title}
                      </span>

                      <span className="task-date">
                        Task #{task.id} · Created{" "}
                        {formatDate(task.created_at)}
                      </span>
                    </div>

                    <span
                      className={`task-status ${
                        task.completed
                          ? "status-completed"
                          : "status-pending"
                      }`}
                    >
                      {task.completed ? "Completed" : "Pending"}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <footer className="panel-footer">
              <span>
                Changes are stored by your Django API.
              </span>
              <span className="footer-live">
                <span /> API-connected
              </span>
            </footer>
          </section>

          <footer className="page-footer">
            Taskflow <span>·</span> A Kubernetes production platform
            project
          </footer>
        </div>
      </section>
    </main>
  );
}
