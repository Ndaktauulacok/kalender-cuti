/* =========================================================
   1. DATA
   -----------------------------------------------------------
   Untuk kemas kini tarikh cuti pada masa depan, cuma ubah
   START_DATE / END_DATE, tempoh PAD_START/PAD_END, dan
   senarai SPECIAL_DAYS di bawah.
   ========================================================= */

const START_DATE = "2026-08-28"; // Jumaat, 28 Ogos 2026 (cuti bermula — semua pelajar)
const END_DATE   = "2026-10-05"; // Isnin, 5 Oktober 2026 (Masuk Balik — pelajar TIADA PAD)

// Tempoh PAD: pelajar berkenaan masuk balik lebih awal (pada PAD_START),
// bukan tunggu sampai END_DATE macam pelajar lain.
const PAD_START = "2026-09-28"; // pelajar PAD masuk balik / program PAD bermula
const PAD_END   = "2026-10-02"; // program PAD tamat

// Pelajar ASRAMA balik SEHARI LEBIH AWAL daripada tarikh masuk balik rasmi
// (sama ada tarikh rasmi tu 5 Okt atau 28 Sept ikut kumpulan PAD/tiada PAD).
// Pelajar HARIAN kekal ikut tarikh rasmi — tiada perubahan.
const ASRAMA_OFFSET_DAYS = 1;

// Tarikh istimewa: key = "YYYY-MM-DD"
const SPECIAL_DAYS = {
  "2026-08-31": { event: "Hari Kebangsaan", national: true },
  "2026-09-16": { event: "Hari Malaysia", national: true },

  // sehari sebelum PAD masuk balik — asrama dah balik, harian masih cuti
  "2026-09-27": { event: "Cuti Sekolah", asramaBalik: true },
  "2026-09-28": { event: "Pelajar PAD Masuk Balik", type: "pad", padMasuk: true },
  "2026-09-29": { event: "Program PAD", type: "pad" },
  "2026-09-30": { event: "Program PAD", type: "pad" },
  "2026-10-01": { event: "Program PAD", type: "pad" },
  "2026-10-02": { event: "Program PAD", type: "pad" },

  // sehari sebelum masuk balik rasmi — asrama dah balik, harian masih cuti
  "2026-10-04": { event: "Cuti Sekolah", asramaBalik: true },
  "2026-10-05": { event: "Masuk Balik Persekolahan", type: "sekolah" },
};

const DAY_NAMES_MS = ["Ahad", "Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu"];
const MONTH_NAMES_MS = [
  "Januari", "Februari", "Mac", "April", "Mei", "Jun",
  "Julai", "Ogos", "September", "Oktober", "November", "Disember",
];

function toISO(d) {
  // NOTA: guna komponen tarikh TEMPATAN sahaja (bukan toISOString/UTC).
  // toISOString() tukar ke UTC dan sebab Malaysia GMT+8, ia sorong
  // tarikh mundur 1 hari secara senyap.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(iso, delta) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + delta);
  return toISO(d);
}

function formatDateMS(iso) {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} ${MONTH_NAMES_MS[d.getMonth()]}`;
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
      padMasuk: !!special.padMasuk,
      asramaBalik: !!special.asramaBalik,
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
   2. RENDER KALENDAR
   ========================================================= */

function badgeFor(day) {
  const badges = [];

  if (day.type === "sekolah") {
    badges.push(`<span class="badge sekolah">🏫 Masuk Balik</span>`);
  } else if (day.type === "pad") {
    badges.push(
      day.padMasuk
        ? `<span class="badge pad">🧩 PAD &middot; Masuk Balik</span>`
        : `<span class="badge pad">🧩 PAD</span>`
    );
  } else if (day.national) {
    badges.push(`<span class="badge negara">🇲🇾 ${day.event}</span>`);
  } else {
    badges.push(`<span class="badge cuti">🏖️ Cuti</span>`);
  }

  // nota tambahan — tidak gantikan badge utama, sebab ia berkaitan
  // sekumpulan pelajar (asrama) sahaja, bukan status hari itu untuk semua.
  if (day.asramaBalik) {
    badges.push(`<span class="badge asrama">🎒 Asrama Balik</span>`);
  }

  return badges.join("");
}

function dayEventLine(day) {
  if (day.type === "sekolah") return "Sekolah dibuka semula (semua pelajar)";
  if (day.type === "pad" && day.padMasuk) return "Pelajar berdaftar PAD masuk balik sekolah";
  if (day.type === "pad") return "Program PAD diteruskan";
  if (day.asramaBalik) return "Cuti sekolah — pelajar asrama masuk balik hari ini";
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
          if (day.type === "pad") classes.push("padday");
          if (day.iso === todayISO) classes.push("today");
          if (day.iso < todayISO) classes.push("past");

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
   3. COUNTDOWN — dua jam hidup berasingan
      (Tiada PAD -> 5 Okt, Ada PAD -> 28 Sept)
      Setiap satu ambil kira Asrama (sehari awal) vs Harian (tarikh sebenar).
   ========================================================= */

function pad2(n) {
  return String(n).padStart(2, "0");
}

function makeCountdown({ elIds, holidayStartISO, returnISO, asramaReturnISO, openHour = 7, openMin = 30 }) {
  const cardEl = document.getElementById(elIds.card);
  const labelEl = document.getElementById(elIds.label);
  const suffixEl = document.getElementById(elIds.suffix);
  const noteEl = document.getElementById(elIds.note);
  const dEl = document.getElementById(elIds.days);
  const hEl = document.getElementById(elIds.hours);
  const mEl = document.getElementById(elIds.mins);
  const sEl = document.getElementById(elIds.secs);

  const holidayStart = new Date(holidayStartISO + "T00:00:00");
  const returnOpen = new Date(returnISO + "T00:00:00");
  returnOpen.setHours(openHour, openMin, 0, 0);

  if (noteEl) {
    noteEl.textContent =
      `🎓 Harian: ${formatDateMS(returnISO)}  ·  🎒 Asrama: ${formatDateMS(asramaReturnISO)}`;
  }

  let intervalId;

  function tick() {
    const now = new Date();
    let target;

    if (now < holidayStart) {
      labelEl.textContent = "Cuti sekolah bermula dalam";
      suffixEl.textContent = "sebelum cuti bermula";
      target = holidayStart;
    } else if (now < returnOpen) {
      labelEl.textContent = "Masuk balik dalam";
      suffixEl.textContent = "sebelum pelajar harian masuk balik";
      target = returnOpen;
    } else {
      cardEl.classList.add("finished");
      labelEl.textContent = "Status";
      suffixEl.textContent = "🏫 Sudah masuk balik";
      clearInterval(intervalId);
      return;
    }

    const diffMs = target - now;
    const totalSecs = Math.max(0, Math.floor(diffMs / 1000));
    const d = Math.floor(totalSecs / 86400);
    const h = Math.floor((totalSecs % 86400) / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;

    dEl.textContent = pad2(d);
    hEl.textContent = pad2(h);
    mEl.textContent = pad2(m);
    sEl.textContent = pad2(s);
  }

  tick();
  intervalId = setInterval(tick, 1000);
}

/* =========================================================
   4. INIT
   ========================================================= */

const DAYS = buildDays();
renderCalendar(DAYS);

const ASRAMA_RETURN_NORMAL = addDays(END_DATE, -ASRAMA_OFFSET_DAYS);  // 2026-10-04
const ASRAMA_RETURN_PAD    = addDays(PAD_START, -ASRAMA_OFFSET_DAYS); // 2026-09-27

// Timer 1 — pelajar TIADA PAD (balik ikut tarikh rasmi 5 Okt)
makeCountdown({
  elIds: {
    card: "clockNormalCard",
    label: "clockNormalLabel",
    suffix: "clockNormalSuffix",
    note: "clockNormalNote",
    days: "normalDays",
    hours: "normalHours",
    mins: "normalMins",
    secs: "normalSecs",
  },
  holidayStartISO: START_DATE,
  returnISO: END_DATE,
  asramaReturnISO: ASRAMA_RETURN_NORMAL,
});

// Timer 2 — pelajar ADA PAD (balik lebih awal, 28 Sept)
makeCountdown({
  elIds: {
    card: "clockPadCard",
    label: "clockPadLabel",
    suffix: "clockPadSuffix",
    note: "clockPadNote",
    days: "padDays",
    hours: "padHours",
    mins: "padMins",
    secs: "padSecs",
  },
  holidayStartISO: START_DATE,
  returnISO: PAD_START,
  asramaReturnISO: ASRAMA_RETURN_PAD,
});

// scroll hari ini ke pandangan, jika ada
window.addEventListener("DOMContentLoaded", () => {
  const todayCard = document.querySelector(".day.today");
  if (todayCard) {
    todayCard.scrollIntoView({ block: "center", behavior: "instant" });
  }
});
