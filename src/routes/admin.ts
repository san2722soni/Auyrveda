import { FastifyInstance } from "fastify";

const dashboardHtml = String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Vishwavrinda Ayurveda Appointments</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #202124;
      --muted: #5f6368;
      --line: #d8ddd7;
      --surface: #ffffff;
      --band: #f5f7f2;
      --brand: #206a4b;
      --brand-dark: #164d36;
      --accent: #b86b2a;
      --complete: #426b9c;
      --danger: #9a3412;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: var(--band);
      color: var(--ink);
    }

    button,
    input,
    select {
      font: inherit;
    }

    .topbar {
      background: var(--surface);
      border-bottom: 1px solid var(--line);
    }

    .topbar-inner,
    main {
      width: min(1180px, calc(100% - 32px));
      margin: 0 auto;
    }

    .topbar-inner {
      min-height: 72px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .brand {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .brand strong {
      font-size: 20px;
      line-height: 1.2;
    }

    .brand span {
      color: var(--muted);
      font-size: 13px;
    }

    .toolbar {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .toolbar button,
    .row-action {
      border: 1px solid var(--brand);
      background: var(--brand);
      color: #ffffff;
      min-height: 38px;
      border-radius: 6px;
      padding: 0 14px;
      cursor: pointer;
    }

    .toolbar button:hover,
    .row-action:hover {
      background: var(--brand-dark);
    }

    .toolbar select {
      min-height: 38px;
      border-radius: 6px;
      border: 1px solid var(--line);
      background: var(--surface);
      padding: 0 12px;
      color: var(--ink);
    }

    main {
      padding: 24px 0 48px;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 18px;
    }

    .stat {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 14px 16px;
    }

    .stat span {
      color: var(--muted);
      display: block;
      font-size: 13px;
      margin-bottom: 6px;
    }

    .stat strong {
      font-size: 26px;
      line-height: 1;
    }

    .table-wrap {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 8px;
      overflow: hidden;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    th,
    td {
      text-align: left;
      padding: 14px 12px;
      border-bottom: 1px solid var(--line);
      vertical-align: top;
      overflow-wrap: anywhere;
    }

    th {
      background: #eef3eb;
      color: #344239;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0;
    }

    tr:last-child td {
      border-bottom: 0;
    }

    .status {
      display: inline-flex;
      align-items: center;
      min-height: 26px;
      border-radius: 999px;
      padding: 0 9px;
      font-size: 12px;
      font-weight: 700;
      background: #ecf7f0;
      color: var(--brand-dark);
    }

    .status.complete {
      background: #eef4ff;
      color: var(--complete);
    }

    .meta {
      color: var(--muted);
      font-size: 13px;
      margin-top: 4px;
    }

    .row-action.secondary {
      background: #ffffff;
      color: var(--danger);
      border-color: #f0c7b4;
    }

    .empty,
    .error {
      padding: 28px;
      color: var(--muted);
      text-align: center;
    }

    .error {
      color: var(--danger);
    }

    @media (max-width: 820px) {
      .topbar-inner {
        align-items: flex-start;
        flex-direction: column;
        padding: 16px 0;
      }

      .stats {
        grid-template-columns: 1fr;
      }

      table,
      thead,
      tbody,
      tr,
      th,
      td {
        display: block;
      }

      thead {
        display: none;
      }

      tr {
        border-bottom: 1px solid var(--line);
        padding: 12px;
      }

      tr:last-child {
        border-bottom: 0;
      }

      td {
        border: 0;
        padding: 6px 0;
      }

      td::before {
        content: attr(data-label);
        display: block;
        color: var(--muted);
        font-size: 12px;
        text-transform: uppercase;
        margin-bottom: 3px;
      }
    }
  </style>
</head>
<body>
  <header class="topbar">
    <div class="topbar-inner">
      <div class="brand">
        <strong>Vishwavrinda Ayurveda</strong>
        <span>Appointment requests</span>
      </div>
      <div class="toolbar">
        <select id="status-filter" aria-label="Status filter">
          <option value="open">Open</option>
          <option value="all">All</option>
          <option value="completed">Completed</option>
        </select>
        <button id="refresh-button" type="button">Refresh</button>
      </div>
    </div>
  </header>
  <main>
    <section class="stats" aria-label="Appointment summary">
      <div class="stat"><span>Open</span><strong id="open-count">0</strong></div>
      <div class="stat"><span>Completed</span><strong id="completed-count">0</strong></div>
      <div class="stat"><span>Total</span><strong id="total-count">0</strong></div>
    </section>
    <section class="table-wrap" aria-live="polite">
      <table>
        <thead>
          <tr>
            <th style="width: 17%">Patient</th>
            <th style="width: 15%">Phone</th>
            <th style="width: 16%">Preferred slot</th>
            <th style="width: 18%">Contact</th>
            <th>Reason</th>
            <th style="width: 13%">Status</th>
            <th style="width: 12%">Action</th>
          </tr>
        </thead>
        <tbody id="appointments-body"></tbody>
      </table>
      <div id="empty-state" class="empty" hidden>No appointments to show.</div>
      <div id="error-state" class="error" hidden></div>
    </section>
  </main>
  <script>
    const body = document.querySelector("#appointments-body");
    const emptyState = document.querySelector("#empty-state");
    const errorState = document.querySelector("#error-state");
    const filter = document.querySelector("#status-filter");
    const refreshButton = document.querySelector("#refresh-button");
    const openCount = document.querySelector("#open-count");
    const completedCount = document.querySelector("#completed-count");
    const totalCount = document.querySelector("#total-count");

    let appointments = [];

    function formatDate(value) {
      if (!value) return "";
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value));
    }

    function escapeHtml(value) {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    function getVisibleAppointments() {
      if (filter.value === "open") {
        return appointments.filter((appointment) => !appointment.isCompleted);
      }

      if (filter.value === "completed") {
        return appointments.filter((appointment) => appointment.isCompleted);
      }

      return appointments;
    }

    function render() {
      const visibleAppointments = getVisibleAppointments();
      const completed = appointments.filter((appointment) => appointment.isCompleted).length;

      openCount.textContent = String(appointments.length - completed);
      completedCount.textContent = String(completed);
      totalCount.textContent = String(appointments.length);
      body.innerHTML = "";
      errorState.hidden = true;
      emptyState.hidden = visibleAppointments.length > 0;

      for (const appointment of visibleAppointments) {
        const row = document.createElement("tr");
        const statusClass = appointment.isCompleted ? "complete" : "";
        const statusText = appointment.isCompleted ? "Completed" : "Open";
        const actionText = appointment.isCompleted ? "Reopen" : "Complete";
        const actionClass = appointment.isCompleted ? "row-action secondary" : "row-action";

        row.innerHTML = \`
          <td data-label="Patient">
            <strong>\${escapeHtml(appointment.patientName)}</strong>
            <div class="meta">\${escapeHtml(formatDate(appointment.createdAt))}</div>
          </td>
          <td data-label="Phone">\${escapeHtml(appointment.phoneNumber)}</td>
          <td data-label="Preferred slot">
            \${escapeHtml(appointment.preferredDate || "Not specified")}
            <div class="meta">\${escapeHtml(appointment.preferredTime || "")}</div>
          </td>
          <td data-label="Contact">\${escapeHtml(appointment.preferredContactMethod)}</td>
          <td data-label="Reason">\${escapeHtml(appointment.reason || "Not specified")}</td>
          <td data-label="Status"><span class="status \${statusClass}">\${statusText}</span></td>
          <td data-label="Action">
            <button class="\${actionClass}" type="button" data-id="\${appointment.id}" data-completed="\${String(!appointment.isCompleted)}">\${actionText}</button>
          </td>
        \`;

        body.appendChild(row);
      }
    }

    async function loadAppointments() {
      refreshButton.disabled = true;

      try {
        const response = await fetch("/api/appointments");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || data.error || "Unable to load appointments");
        }

        appointments = data.appointments || [];
        render();
      } catch (error) {
        appointments = [];
        render();
        errorState.textContent = error instanceof Error ? error.message : "Unable to load appointments";
        errorState.hidden = false;
      } finally {
        refreshButton.disabled = false;
      }
    }

    async function updateAppointment(id, isCompleted) {
      const response = await fetch(\`/api/appointments/\${id}\`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Unable to update appointment");
      }

      appointments = appointments.map((appointment) =>
        appointment.id === id ? data.appointment : appointment
      );
      render();
    }

    body.addEventListener("click", async (event) => {
      const target = event.target;

      if (!(target instanceof HTMLButtonElement)) {
        return;
      }

      target.disabled = true;

      try {
        await updateAppointment(
          target.dataset.id,
          target.dataset.completed === "true"
        );
      } catch (error) {
        errorState.textContent = error instanceof Error ? error.message : "Unable to update appointment";
        errorState.hidden = false;
      } finally {
        target.disabled = false;
      }
    });

    filter.addEventListener("change", render);
    refreshButton.addEventListener("click", loadAppointments);
    loadAppointments();
  </script>
</body>
</html>`;

export async function adminRoutes(app: FastifyInstance) {
  app.get("/admin", async (_request, reply) => {
    return reply.type("text/html").send(dashboardHtml);
  });
}
