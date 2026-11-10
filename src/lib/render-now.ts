// Draws the home page from a NowModel. Runs twice: once when the site is
// built (so the page reads correctly with JavaScript off) and again in the
// browser with today's date.

import { addDays, daysBetween, formatFull, formatLong, formatMonthDay, formatRange, formatShort, type IsoDate } from "./dates";
import { aiMarker, citation, dueLabel, dueTime, esc, kindLabel, readingLength, roleLabel } from "./html";
import type { NowModel } from "./now";
import type { DueItem, Session } from "./schedule";

export interface RenderContext {
  /** Site base path, ending in a slash. */
  base: string;
  /** Canvas course home, or "" when not yet supplied. */
  canvasUrl: string;
  courseName: string;
  termName: string;
}

function relativeDay(today: IsoDate, date: IsoDate): string {
  const days = daysBetween(today, date);
  if (days === 0) return `Today · ${formatLong(date)}`;
  if (days === 1) return `Tomorrow · ${formatLong(date)}`;
  return formatLong(date);
}

function joinDates(dates: IsoDate[], word: string): string {
  const names = dates.map(formatLong);
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} ${word} ${names[names.length - 1]}`;
}

function sessionCard(model: NowModel, s: Session, heading: string): string {
  const notes: string[] = [];
  if (s.ticket) notes.push("A reading ticket is taken at the start.");
  if (model.nextLab && s.lab === model.nextLab.number && model.today < model.nextLab.revealOn) {
    notes.push("No preparation needed.");
  }
  if (s.bring) notes.push(`Bring: ${esc(s.bring)}`);

  return `
<section class="now-block" aria-labelledby="next-heading">
  <h2 id="next-heading">${esc(heading)}</h2>
  <div class="session-card">
    <p class="when">${esc(relativeDay(model.today, s.date))}</p>
    <h3 class="session-title">${esc(s.title)}</h3>
    <p class="session-meta">Session ${s.number} · ${esc(kindLabel(s.kind))} ${aiMarker(s.ai)}</p>
    ${notes.map((n) => `<p class="session-note">${n}</p>`).join("\n    ")}
    ${s.html ? `<div class="session-body">${s.html}</div>` : ""}
  </div>
</section>`;
}

function openQuestionBlock(model: NowModel): string {
  const q = model.openQuestion;
  if (!q) return "";
  const labName = q.lab ? `Lab ${q.lab.number}, ${q.lab.title}` : q.labSession.title;
  return `
<section class="now-block" aria-labelledby="open-heading">
  <h2 id="open-heading">Left open by ${esc(formatLong(q.labSession.date).split(",")[0]!)}’s lab</h2>
  <p class="question">${esc(q.cycle.question)}</p>
  <p class="fine">${esc(labName)}. The seminar takes it up on ${esc(formatLong(q.seminar.date))}.</p>
</section>`;
}

function readingBlock(model: NowModel): string {
  if (model.phase === "before") return "";
  const r = model.reading;
  if (!r) {
    return `
<section class="now-block" aria-labelledby="read-heading">
  <h2 id="read-heading">Reading</h2>
  <p>No reading is due in the next two weeks.</p>
</section>`;
  }
  const items = r.readings
    .map((reading) => {
      const length = readingLength(reading);
      return `<li>
      <span class="role">${esc(roleLabel(reading.role))}</span>
      <span class="citation">${citation(reading)}</span>
      <span class="fine">${length ? `${esc(length)} · ` : ""}${reading.hasGuide ? "Reading guide available" : "Guide coming"}</span>
    </li>`;
    })
    .join("\n    ");
  const why = r.cycle
    ? `<p class="fine">For the seminar on the question: ${esc(r.cycle.question)}</p>`
    : `<p class="fine">For: ${esc(r.session.title)}</p>`;
  return `
<section class="now-block" aria-labelledby="read-heading">
  <h2 id="read-heading">Read before ${esc(formatLong(r.session.date))}</h2>
  ${why}
  <ul class="reading-list">
    ${items}
  </ul>
</section>`;
}

function dueItem(d: DueItem, withDate: boolean): string {
  const when = withDate ? ` <span class="due-when">${esc(formatLong(d.date))}${esc(dueTime(d))}</span>` : "";
  const note = d.note ? ` <span class="fine">${esc(d.note)}</span>` : "";
  return `<li><span class="due-label">${esc(dueLabel(d))}</span>${when}${note}</li>`;
}

function dueBlock(model: NowModel, ctx: RenderContext): string {
  if (model.phase === "before") return "";
  if (model.due.length === 0) {
    return `
<section class="now-block" aria-labelledby="due-heading">
  <h2 id="due-heading">Due</h2>
  <p>Nothing more is due outside class.</p>
</section>`;
  }
  const first = model.due[0]!;
  const sameDay = model.due.every((d) => d.date === first.date && d.time === first.time);
  const days = daysBetween(model.today, first.date);
  let heading: string;
  if (!sameDay) heading = "Due in the next seven days";
  else if (days === 0) heading = `Due today${dueTime(first)}`;
  else if (days === 1) heading = `Due tomorrow, ${formatLong(first.date)}${dueTime(first)}`;
  else heading = `Due ${formatLong(first.date)}${dueTime(first)}`;

  const canvas = ctx.canvasUrl
    ? `<p class="fine"><a href="${esc(ctx.canvasUrl)}">Hand it in on Canvas</a></p>`
    : `<p class="fine">Hand it in on Canvas. Link coming.</p>`;
  const lead = model.dueIsLater ? `<p class="fine">Nothing is due in the next seven days. Next:</p>` : "";

  return `
<section class="now-block" aria-labelledby="due-heading">
  <h2 id="due-heading">${esc(heading)}</h2>
  ${lead}
  <ul class="due-list">
    ${model.due.map((d) => dueItem(d, !sameDay)).join("\n    ")}
  </ul>
  ${canvas}
</section>`;
}

function aheadBlock(model: NowModel, ctx: RenderContext): string {
  if (model.ahead.length === 0) return "";
  const rows = model.ahead
    .map((day) => {
      const lines = [
        ...day.sessions.map(
          (s) => `<li><span class="kind">${esc(kindLabel(s.kind))}</span> ${esc(s.title)} ${aiMarker(s.ai)}</li>`,
        ),
        ...day.due.map((d) => `<li><span class="kind">Due</span> ${esc(dueLabel(d))}${esc(dueTime(d))}</li>`),
        ...day.keyDates.map((k) => `<li><span class="kind">Note</span> ${esc(k.label)}${k.end !== k.start ? `, ${esc(formatRange(k.start, k.end))}` : ""}</li>`),
      ];
      return `<div class="ahead-day">
      <dt>${esc(formatShort(day.date))}</dt>
      <dd><ul>${lines.join("")}</ul></dd>
    </div>`;
    })
    .join("\n    ");
  return `
<section class="now-block" aria-labelledby="ahead-heading">
  <h2 id="ahead-heading">The next two weeks</h2>
  <dl class="ahead">
    ${rows}
  </dl>
  <p><a href="${esc(ctx.base)}schedule/">The whole semester</a></p>
</section>`;
}

function scheduleLink(ctx: RenderContext): string {
  return `<p><a href="${esc(ctx.base)}schedule/">The whole semester</a></p>`;
}

export function renderNow(model: NowModel, ctx: RenderContext): string {
  const { phase } = model;

  if (phase === "after") {
    return `
<h1>The course has ended</h1>
<p class="lede">${esc(ctx.courseName)}, ${esc(ctx.termName)}, is over.</p>
${scheduleLink(ctx)}`;
  }

  if (phase === "finals") {
    const f = model.finals;
    return `
<h1>Classes have ended</h1>
${f ? `<p class="lede">${esc(formatRange(f.start, f.end))}: ${esc(f.label)}.</p>` : ""}
${scheduleLink(ctx)}`;
  }

  const next = model.next!;

  if (phase === "before") {
    const rows = model.firstWeek
      .map(
        (s) => `<div class="ahead-day">
      <dt>${esc(formatShort(s.date))}</dt>
      <dd><ul><li><span class="kind">${esc(kindLabel(s.kind))}</span> ${esc(s.title)} ${aiMarker(s.ai)}</li></ul></dd>
    </div>`,
      )
      .join("\n    ");
    return `
<h1>Starts ${esc(formatMonthDay(next.date))}</h1>
<p class="lede">The first session is on ${esc(formatFull(next.date))}.</p>
<section class="now-block" aria-labelledby="first-heading">
  <h2 id="first-heading">The first week</h2>
  <dl class="ahead">
    ${rows}
  </dl>
  ${scheduleLink(ctx)}
</section>`;
  }

  let heading: string;
  let lede: string;
  let nextHeading = daysBetween(model.today, next.date) === 0 ? "Today’s session" : "Next session";

  if (phase === "break") {
    const b = model.activeBreak!;
    heading = b.label;
    lede = `${formatRange(b.start, b.end)}. Class meets again on ${formatLong(next.date)}.`;
    nextHeading = "First session back";
  } else if (phase === "conference") {
    heading = "Conference week";
    const dates = model.conferences.map((s) => s.date);
    lede = `No class meeting on ${joinDates(dates, "or")}. Conferences are held instead.`;
    nextHeading = daysBetween(model.today, next.date) === 0 ? "Today" : "Next";
  } else {
    const week = model.week;
    heading = week?.number ? `Week ${week.number}` : ctx.termName;
    lede = week ? formatRange(week.start, addDays(week.start, 4)) : ""; // Monday to Friday
    if (model.breakAhead) {
      const b = model.breakAhead;
      lede += `. ${b.label}: ${formatRange(b.start, b.end)}.`;
    }
  }

  return `
<h1>${esc(heading)}</h1>
<p class="lede">${esc(lede)}</p>
${sessionCard(model, next, nextHeading)}
${openQuestionBlock(model)}
${readingBlock(model)}
${dueBlock(model, ctx)}
${aheadBlock(model, ctx)}`;
}
