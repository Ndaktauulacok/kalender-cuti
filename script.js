/* =========================================================
   1. DATA
   -----------------------------------------------------------
   Untuk kemas kini tarikh cuti pada masa depan, cuma ubah
   START_DATE / END_DATE dan senarai SPECIAL_DAYS di bawah.
   Semua tarikh antara START_DATE dan END_DATE akan dianggap
   "Cuti" secara automatik, kecuali ditanda type:'sekolah'.
   ========================================================= */

const START_DATE = "2026-08-28"; // Jumaat, 28 Ogos 2026
const END_DATE   = "2026-10-05"; // Isnin, 5 Oktober 2026 (Masuk Balik)

// Tarikh istimewa: key = "YYYY-MM-DD"
const SPECIAL_DAYS = {
  "2026-08-31": { event: "Hari Kebangsaan", national: true },
  "2026-09-16": { event: "Hari Malaysia", national: true },
  "2026-10-05": { event: "Masuk Balik Persekolahan", type: "sekolah" },
};

const DAY_NAMES_MS = ["Ahad", "Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu"];
const MONTH_NAMES_MS = [
  "Januari", "Februari", "Mac", "April", "Mei", "Jun",
  "Julai", "Ogos", "September", "Oktober", "November", "Disember",
];

function toISO(d) {
  return d.toISOString().slice(0, 10);
}

function buildDays() {
  const days = [];
  let cursor = new Date(START_DATE + "T00:00:00");
  const end = new Date(END_DATE + "T00:00:00");

  while (cursor <= end) {
    const iso = toISO(cursor);
    const special = SPECIAL_DAYS[iso] || {};
    const type = special.type || "cuti";
    days.push({
      iso,
      date: new Date(cursor),
      dayName: DAY_NAMES_MS[cursor.getDay()],
      dayNum: cursor.getDate(),
      monthName: MONTH_NAMES_MS[cursor.getMonth()],
      year: cursor.getFullYear(),
      isWeekend: cursor.getDay() === 0 || cursor.getDay() === 6,
      type,
      national: !!special.national,
      event: special.event || null,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function groupByWeek(days) {
  // Minggu bermula Isnin. Hari sebelum Isnin pertama dikumpul bersama minggu pertama.
  const weeks = [];
  let current = null;
  let weekIndex = 0;

  days.forEach((day) => {
    const isMonday = day.date.getDay() === 1;
    if (!current || (isMonday && current.days.length > 0)) {
      weekIndex += 1;
      current = { label: `Minggu ${weekIndex}`, days: [] };
      weeks.push(current);
    }
    current.days.push(day);
  });
  return weeks;
}

/* =========================================================
   2. RENDER
   ========================================================= */

function badgeFor(day) {
  if (day.type === "sekolah") {
    return `<span class="badge sekolah">🏫 Masuk Balik</span>`;
  }
  if (day.national) {
    return `<span class="badge negara">🇲🇾 ${day.event}</span>`;
  }
  return `<span class="badge cuti">🏖️ Cuti</span>`;
}

function dayEventLine(day) {
  if (day.type === "sekolah") return "Sekolah dibuka semula";
  if (day.event) return day.event;
  return "Cuti sekolah";
}

function renderCalendar(days) {
  const root = document.getElementById("calendar");
  const weeks = groupByWeek(days);
  const todayISO = toISO(new Date());

  root.innerHTML = weeks
    .map((week) => {
      const first = week.days[0];
      const last = week.days[week.days.length - 1];
      const rangeLabel =
        first.monthName === last.monthName
          ? `${first.dayNum}–${last.dayNum} ${first.monthName}`
          : `${first.dayNum} ${first.monthName} – ${last.dayNum} ${last.monthName}`;

      const cards = week.days
        .map((day) => {
          const classes = ["day"];
          if (day.isWeekend) classes.push("weekend");
          if (day.national) classes.push("flagged");
          if (day.type === "sekolah") classes.push("schoolday");
          if (day.iso === todayISO) classes.push("today");

          return `
          <article class="${classes.join(" ")}">
            <div class="day-date">
              <span class="num">${day.dayNum}</span>
              <span class="mon">${day.monthName.slice(0, 3)}</span>
            </div>
            <div class="day-divider"></div>
            <div class="day-body">
              <p class="day-name">${day.dayName}</p>
              <p class="day-event">${dayEventLine(day)}</p>
              ${badgeFor(day)}
            </div>
          </article>`;
        })
        .join("");

      return `
        <section class="week-block">
          <h2 class="week-heading">${week.label} &middot; ${rangeLabel}</h2>
          <div class="week-grid">${cards}</div>
        </section>`;
    })
    .join("");
}

/* =========================================================
   3. COUNTDOWN
   ========================================================= */

function renderCountdown(days) {
  const labelEl = document.getElementById("countdownLabel");
  const numEl = document.getElementById("countdownNumber");
  const suffixEl = document.getElementById("countdownSuffix");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const schoolDay = days.find((d) => d.type === "sekolah");
  const start = days[0].date;
  const end = schoolDay.date;

  const msPerDay = 1000 * 60 * 60 * 24;

  if (today < start) {
    const diff = Math.round((start - today) / msPerDay);
    labelEl.textContent = "Cuti bermula dalam";
    numEl.textContent = diff;
    suffixEl.textContent = diff === 1 ? "hari lagi" : "hari lagi";
  } else if (today >= start && today < end) {
    const diff = Math.round((end - today) / msPerDay);
    labelEl.textContent = "Masuk balik dalam";
    numEl.textContent = diff;
    suffixEl.textContent = diff === 1 ? "hari lagi" : "hari lagi";
  } else {
    labelEl.textContent = "Status";
    numEl.textContent = "🏫";
    suffixEl.textContent = "Sekolah sudah dibuka";
  }
}

/* =========================================================
   4. INIT
   ========================================================= */

const DAYS = buildDays();
renderCalendar(DAYS);
renderCountdown(DAYS);

// scroll hari ini ke pandangan, jika ada
window.addEventListener("DOMContentLoaded", () => {
  const todayCard = document.querySelector(".day.today");
  if (todayCard) {
    todayCard.scrollIntoView({ block: "center", behavior: "instant" });
  }
});
