"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Task = {
  id: number;
  title: string;
  completed: boolean;
  created_at?: string;
};

type TaskFilter = "all" | "pending" | "completed";

function formatDate(value?: string): string {
  if (!value) return "Date unavailable";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/tasks/", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Unable to load tasks (HTTP ${response.status}).`);
      }

      const data: unknown = await response.json();




if (
  typeof data !== "object" ||
  data === null ||
  !("tasks" in data) ||
  !Array.isArray(data.tasks)
) {
  throw new Error("The task API returned an unexpected response.");
}

setTasks(data.tasks as Task[]);



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
    void loadTasks();
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

  async function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle || saving) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/tasks/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmedTitle }),
      });

      if (!response.ok) {
        const details = await response.text();
        throw new Error(
          `Unable to create task (HTTP ${response.status}). ${details.slice(0, 160)}`,
        );
      }

      const createdTask: unknown = await response.json();

      if (
        typeof createdTask !== "object" ||
        createdTask === null ||
        !("id" in createdTask) ||
        !("title" in createdTask) ||
        !("completed" in createdTask)
      ) {
        throw new Error("The API created a response in an unexpected format.");
      }

      setTasks((current) => [
        createdTask as Task,
        ...current.filter((task) => task.id !== (createdTask as Task).id),
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

  return (
    <main className="dashboard">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="Taskflow home">
          <span className="brand-mark">T</span>
          <span>
            <strong>Taskflow</strong>
            <small>WORKSPACE</small>
          </span>
        </a>

        <div className="sidebar-section-label">WORKSPACE</div>

        <nav className="sidebar-nav" aria-label="Task navigation">
          <a className="nav-item active" href="#tasks">
            <span className="nav-icon" aria-hidden="true">▤</span>
            <span>My tasks</span>
            <span className="nav-count">{counts.all}</span>
          </a>
          <button
            className="nav-item"
            type="button"
            onClick={() => setFilter("pending")}
          >
            <span className="nav-icon" aria-hidden="true">◷</span>
            <span>Pending</span>
          </button>
          <button
            className="nav-item"
            type="button"
            onClick={() => setFilter("completed")}
          >
            <span className="nav-icon" aria-hidden="true">✓</span>
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
          <p className="sidebar-footer">Built with Next.js & Kubernetes</p>
        </div>
      </aside>

      <section className="workspace" id="tasks">
        <header className="topbar">
          <div className="breadcrumb">Workspace <span>/</span> My tasks</div>
          <div className="profile">
            <div className="profile-avatar">D</div>
            <div className="profile-copy">
              <strong>Developer</strong>
              <span>Personal workspace</span>
            </div>
          </div>
        </header>

        <div className="content">
          <section className="page-heading">
            <div>
              <p className="eyebrow">YOUR WORKSPACE</p>
              <h1>My tasks<span className="heading-period">.</span></h1>
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

          <section className="stats-grid" aria-label="Task statistics">
            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-label">All tasks</span>
                <span className="stat-icon stat-icon-purple">▤</span>
              </div>
              <strong className="stat-value">{counts.all}</strong>
              <span className="stat-note">Tasks in your workspace</span>
            </article>

            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Pending</span>
                <span className="stat-icon stat-icon-orange">◷</span>
              </div>
              <strong className="stat-value">{counts.pending}</strong>
              <span className="stat-note">Still to be completed</span>
            </article>

            <article className="stat-card">
              <div className="stat-top">
                <span className="stat-label">Completed</span>
                <span className="stat-icon stat-icon-green">✓</span>
              </div>
              <strong className="stat-value">{counts.completed}</strong>
              <span className="stat-note">Successfully finished</span>
            </article>
          </section>

          <section className="task-panel">
            <div className="panel-heading">
              <div>
                <h2>Task list</h2>
                <p>Your tasks, fetched from the backend.</p>
              </div>
              <span className="task-total">
                {visibleTasks.length} {visibleTasks.length === 1 ? "task" : "tasks"}
              </span>
            </div>

            <form className="create-form" onSubmit={handleCreateTask}>
              <label className="visually-hidden" htmlFor="task-title">
                New task title
              </label>
              <span className="input-plus" aria-hidden="true">+</span>
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
              <button type="submit" disabled={saving || !title.trim()}>
                {saving ? "Adding..." : "Add task"}
              </button>
            </form>

            {error && (
              <div className="message message-error" role="alert">
                <strong>Something went wrong.</strong>
                <span>{error}</span>
                <button type="button" onClick={() => void loadTasks()}>
                  Try again
                </button>
              </div>
            )}

            {success && (
              <div className="message message-success" role="status">
                {success}
              </div>
            )}

            <div className="filter-row" aria-label="Filter tasks">
              {(["all", "pending", "completed"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`filter-button ${filter === item ? "selected" : ""}`}
                  onClick={() => setFilter(item)}
                  aria-pressed={filter === item}
                >
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                  <span>{counts[item]}</span>
                </button>
              ))}
            </div>

            {loading ? (
              <div className="empty-state">
                <div className="loading-spinner" />
                <h3>Loading your tasks</h3>
                <p>Connecting to the task API...</p>
              </div>
            ) : visibleTasks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon" aria-hidden="true">✓</div>
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
                      className={`task-indicator ${task.completed ? "is-complete" : ""}`}
                      aria-label={task.completed ? "Completed" : "Pending"}
                    >
                      {task.completed ? "✓" : ""}
                    </span>
                    <div className="task-details">
                      <span className={task.completed ? "task-title done" : "task-title"}>
                        {task.title}
                      </span>
                      <span className="task-date">
                        Task #{task.id} · Created {formatDate(task.created_at)}
                      </span>
                    </div>
                    <span className={`task-status ${task.completed ? "status-completed" : "status-pending"}`}>
                      {task.completed ? "Completed" : "Pending"}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <footer className="panel-footer">
              <span>Changes are stored by your Django API.</span>
              <span className="footer-live"><span /> API-connected</span>
            </footer>
          </section>

          <footer className="page-footer">
            Taskflow <span>·</span> A Kubernetes production platform project
          </footer>
        </div>
      </section>
    </main>
  );
}
