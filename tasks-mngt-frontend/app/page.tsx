
import Link from "next/link";

const features = [
  {
    number: "01",
    title: "Stay organized",
    description:
      "Keep your tasks in one place, prioritize what matters, and spend less time figuring out what to do next.",
    icon: "◫",
  },
  {
    number: "02",
    title: "Track your progress",
    description:
      "See what you have completed and what still needs attention. Turn your daily effort into visible progress.",
    icon: "↗",
  },
  {
    number: "03",
    title: "Your tasks, your space",
    description:
      "Sign in to manage your personal task list. Your account keeps your work separate from everyone else's.",
    icon: "◇",
  },
];

const steps = [
  {
    number: "01",
    title: "Create your account",
    description: "Get started with your own secure Taskflow account.",
  },
  {
    number: "02",
    title: "Add your tasks",
    description: "Write down what needs to get done and build your task list.",
  },
  {
    number: "03",
    title: "Make progress",
    description: "Work through your list and keep track of your progress.",
  },
];

export default function LandingPage() {
  return (
    <main className="landing">
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <Link href="/" className="landing-brand">
            Taskflow<span>.</span>
          </Link>

          <nav className="landing-links" aria-label="Main navigation">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="#about">About</a>
          </nav>

          <div className="landing-nav-actions">
            <Link href="/login" className="landing-signin">
              Sign in
            </Link>
            <Link href="/register" className="landing-nav-cta">
              Get started <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-content">
          <div className="landing-eyebrow">
            <span className="landing-status-dot" />
            A simpler way to get things done
          </div>

          <h1>
            Your work,
            <br />
            <span>under control.</span>
          </h1>

          <p className="landing-hero-description">
            Bring your tasks together, focus on what matters, and make
            meaningful progress every day. Less clutter, more doing.
          </p>

          <div className="landing-hero-actions">
            <Link href="/register" className="landing-primary-button">
              Get started for free <span aria-hidden="true">→</span>
            </Link>
            <Link href="/login" className="landing-secondary-button">
              I already have an account
            </Link>
          </div>

          <div className="landing-trust-note">
            <span aria-hidden="true">✓</span>
            Simple to use. Built for everyday productivity.
          </div>
        </div>

        <div className="landing-preview" aria-label="Taskflow dashboard preview">
          <div className="preview-window">
            <div className="preview-topbar">
              <div className="preview-brand">
                <span className="preview-brand-mark">T</span>
                Taskflow
              </div>
              <div className="preview-window-dots">
                <span />
                <span />
                <span />
              </div>
            </div>

            <div className="preview-body">
              <aside className="preview-sidebar">
                <p className="preview-sidebar-label">WORKSPACE</p>
                <div className="preview-menu-item preview-menu-active">
                  <span>▦</span> Overview
                </div>
                <div className="preview-menu-item">
                  <span>☷</span> My tasks
                </div>
                <div className="preview-menu-item">
                  <span>✓</span> Completed
                </div>

                <div className="preview-sidebar-bottom">
                  <span className="preview-avatar">A</span>
                  <div>
                    <strong>Alex Morgan</strong>
                    <small>Personal workspace</small>
                  </div>
                </div>
              </aside>

              <div className="preview-main">
                <div className="preview-greeting">
                  <div>
                    <p>YOUR WORKSPACE</p>
                    <h2>Good morning, Alex.</h2>
                    <span>Here&apos;s your progress at a glance.</span>
                  </div>
                  <div className="preview-date">Today</div>
                </div>

                <div className="preview-stats">
                  <div className="preview-stat">
                    <span>Total tasks</span>
                    <strong>12</strong>
                    <small>Across your list</small>
                  </div>
                  <div className="preview-stat">
                    <span>Completed</span>
                    <strong>8</strong>
                    <small className="preview-positive">Making progress</small>
                  </div>
                </div>

                <div className="preview-task-heading">
                  <strong>Today&apos;s priorities</strong>
                  <span>3 tasks</span>
                </div>

                <div className="preview-task preview-task-done">
                  <span className="preview-checkbox">✓</span>
                  <span>Finalize project proposal</span>
                  <span className="preview-task-tag">Done</span>
                </div>

                <div className="preview-task">
                  <span className="preview-checkbox" />
                  <span>Review sprint priorities</span>
                  <span className="preview-task-tag preview-tag-progress">
                    Next
                  </span>
                </div>

                <div className="preview-task">
                  <span className="preview-checkbox" />
                  <span>Prepare weekly update</span>
                  <span className="preview-task-tag preview-tag-later">
                    Later
                  </span>
                </div>

                <div className="preview-progress">
                  <div>
                    <span>Daily progress</span>
                    <strong>67%</strong>
                  </div>
                  <div className="preview-progress-track">
                    <div className="preview-progress-fill" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="preview-floating-card">
            <span className="preview-floating-icon">✓</span>
            <div>
              <strong>One step at a time.</strong>
              <p>Every completed task counts.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-features" id="features">
        <div className="landing-section-heading">
          <p className="landing-section-label">BUILT FOR YOUR DAY</p>
          <h2>Productivity without the noise.</h2>
          <p>
            Everything you need to keep moving forward, without the
            unnecessary complexity.
          </p>
        </div>

        <div className="landing-feature-grid">
          {features.map((feature) => (
            <article className="landing-feature-card" key={feature.number}>
              <div className="landing-feature-icon">{feature.icon}</div>
              <span className="landing-feature-number">{feature.number}</span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-workflow" id="how-it-works">
        <div className="landing-section-heading">
          <p className="landing-section-label">GET STARTED IN MINUTES</p>
          <h2>A better workflow starts here.</h2>
          <p>Three simple steps to a more organized day.</p>
        </div>

        <div className="landing-steps">
          {steps.map((step) => (
            <article className="landing-step" key={step.number}>
              <span className="landing-step-number">{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-cta" id="about">
        <div>
          <p className="landing-section-label">YOUR NEXT CHAPTER</p>
          <h2>Make room for what matters.</h2>
          <p>
            Start organizing your tasks today and build momentum one
            completed task at a time.
          </p>
        </div>
        <Link href="/register" className="landing-primary-button">
          Create your account <span aria-hidden="true">→</span>
        </Link>
      </section>

      <footer className="landing-footer">
        <Link href="/" className="landing-brand">
          Taskflow<span>.</span>
        </Link>
        <p>Less clutter. More progress.</p>
        <div>
          <Link href="/login">Sign in</Link>
          <Link href="/register">Create account</Link>
        </div>
        <small>© {new Date().getFullYear()} Taskflow</small>
      </footer>
    </main>
  );
}
