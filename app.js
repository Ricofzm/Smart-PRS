let lastHourInlet = null;
let lastHourStored = null;
document.addEventListener("DOMContentLoaded", () => {

  // ── STATE ─────────────────────────────
  const state = {
    labels: [],
    gasFlow: [],
    corrFlow: [],
    pressure: []
  };

  let lastEVC = null;
  let lastHourLog = null;

  const API = "https://smart-prs-api.enrikofzm.workers.dev";

  // ── CHART ─────────────────────────────
  const ctx = document.getElementById("flowChart");

  if (!ctx) {
    console.error("Chart canvas not found");
    return;
  }

  const flowChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: state.labels,
      datasets: [
        {
          label: "Gas Flow",
          data: state.gasFlow,
          borderWidth: 3,
          borderColor: "#0A84FF",
          backgroundColor: "rgba(10,132,255,.15)",
          fill: true,
          pointRadius: 0,
          tension: 0.5
        },
        {
          label: "Correction Flow",
          data: state.corrFlow,
          borderWidth: 3,
          borderColor: "#30D158",
          backgroundColor: "rgba(48,209,88,.15)",
          fill: true,
          pointRadius: 0,
          tension: 0.5
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,

      animation: {
        duration: 600,
        easing: "easeOutQuart"
      },

      interaction: {
        mode: "index",
        intersect: false
      },

      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(20,25,35,.95)",
          borderColor: "rgba(255,255,255,.08)",
          borderWidth: 1,
          padding: 10,
          cornerRadius: 10
        }
      },

      scales: {
        x: {
          ticks: { color: "#94a3b8" },
          grid: { display: false }
        },
        y: {
          beginAtZero: true,
          ticks: { color: "#94a3b8" },
          grid: { color: "rgba(255,255,255,.05)" }
        }
      }
    }
  });

  // ── FETCH ─────────────────────────────
  async function loadData() {
    try {

      document.querySelectorAll(".card")
        .forEach(c => c.classList.add("loading"));

      const res = await fetch(API);
      if (!res.ok) throw new Error("API error");

      const json = await res.json();
      if (!Array.isArray(json) || !json.length) return;

      const d = json[0];
      const now = new Date();

      const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val ?? "-";
      };

      set("update", d.ReceiveDateTime || now.toLocaleTimeString("id-ID"));
      set("inlet", d.PressureInlet);
      set("outlet", d.Pressure);
      set("temp", d.Temperature);
      set("gasflow", d.GasFlow);
      set("corrflow", d.CorrectionFlow);
      set("turbin", d.TurbinMeter);
      set("evc", d.CorrectionMeter);
      set("today", d.TodayVolume);

      const stok = Number(d.PressureInlet) / 10;
      set("stok", stok.toFixed(1));

      document.querySelectorAll(".card")
        .forEach(c => c.classList.remove("loading"));

      // ── ALARM ──
      updateAlarm(
        Number(d.PressureInlet),
        Number(d.Pressure),
        Number(d.Temperature),
        Number(d.GasFlow),
        Number(d.CorrectionFlow),
        stok
      );

      const hourKey = now.getHours();
      const inletNow = Number(d.PressureInlet || 0);
      
      // init pertama
      if (lastHourStored === null) {
        lastHourStored = hourKey;
        lastHourInlet = inletNow;
      
        set("consumption", "-");
      } else {
      
        // kalau jam berubah → hitung DIF INLET
        if (hourKey !== lastHourStored) {
      
          const diff = inletNow - lastHourInlet;
      
          lastHourStored = hourKey;
          lastHourInlet = inletNow;
      
          set("consumption", diff.toFixed(2));
      
        } else {
      
          // tetap tampil nilai jam ini (stabil)
          const diffLive = inletNow - lastHourInlet;
          set("consumption", diffLive.toFixed(2));
        }
      }

      // ── CHART UPDATE ──
      state.labels.push(now.toLocaleTimeString("id-ID"));
      state.gasFlow.push(Number(d.GasFlow));
      state.corrFlow.push(Number(d.CorrectionFlow));
      state.pressure.push(Number(d.PressureInlet));

      if (state.labels.length > 50) {
        state.labels.shift();
        state.gasFlow.shift();
        state.corrFlow.shift();
        state.pressure.shift();
      }

      flowChart.update();

      // ── HOURLY LOG ──
      const hour = now.getHours();
      const minute = now.getMinutes();

      if (minute <= 1 && lastHourLog !== hour) {
        lastHourLog = hour;
        addRecord("prs_hourly", d, now);
        renderTable("hourlyBody", "prs_hourly");
      }

      // ── DAILY LOG ──
      const daily = getRecords("prs_daily");

      const already =
        daily.length &&
        daily[0].time === now.toLocaleDateString("id-ID");

      if (hour === 6 && minute === 1 && !already) {
        addRecord("prs_daily", d, now, true);
        renderTable("dailyBody", "prs_daily");
      }

    } catch (err) {
      console.error(err);
      const el = document.getElementById("update");
      if (el) el.innerText = "ERROR";

      document.querySelectorAll(".card")
        .forEach(c => c.classList.remove("loading"));
    }
  }

  loadData();
  setInterval(loadData, 5000);

});


// ── STORAGE ─────────────────────────────
function getRecords(key) {
  try { return JSON.parse(localStorage.getItem(key) || "[]"); }
  catch { return []; }
}

function saveRecords(key, arr) {
  localStorage.setItem(key, JSON.stringify(arr));
}

function addRecord(key, d, now, daily = false) {

  const arr = getRecords(key);

  if (daily) {

    const prev = arr[0];

    let dailyVolume = "-";
    if (prev?.evc) {
      dailyVolume = (
        Number(d.CorrectionMeter) - Number(prev.evc)
      ).toFixed(3);
    }

    arr.unshift({
      time: now.toLocaleDateString("id-ID"),
      evc: d.CorrectionMeter,
      dailyVolume
    });

  } else {

    arr.unshift({
      time: `${String(now.getDate()).padStart(2,"0")}/${
        String(now.getMonth()+1).padStart(2,"0")}/${
        now.getFullYear()} ${
        String(now.getHours()).padStart(2,"0")}:00`,

      inlet: d.PressureInlet,
      outlet: d.Pressure,
      temp: d.Temperature,
      gasflow: d.GasFlow,
      corrflow: d.CorrectionFlow,
      turbin: d.TurbinMeter,
      evc: d.CorrectionMeter,
      today: d.TodayVolume
    });

  }

  if (arr.length > 500) arr.length = 500;

  saveRecords(key, arr);
}

function renderTable(id, key) {

  const tbody = document.getElementById(id);
  const data = getRecords(key);

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty">No data</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(r => `
    <tr>
      <td>${r.time}</td>
      <td>${r.inlet || "-"}</td>
      <td>${r.outlet || "-"}</td>
      <td>${r.temp || "-"}</td>
      <td>${r.gasflow || "-"}</td>
      <td>${r.corrflow || "-"}</td>
      <td>${r.turbin || "-"}</td>
      <td>${r.evc || "-"}</td>
      <td>${r.dailyVolume || "-"}</td>
    </tr>
  `).join("");
}


// ── ALARM SYSTEM (FIXED) ─────────────────────────────
function updateAlarm(inlet, outlet, temp, gasflow, corrflow, stok) {

  setCard("card-inlet", inlet < 5 || inlet > 250);
  setCard("card-outlet", outlet < 2 || outlet > 4);
  setCard("card-temp", temp < 25 || temp > 40);

  setCard("card-gasflow", gasflow < 5 || gasflow > 250);
  setCard("card-corrflow", corrflow < 275 || corrflow > 500);
  setCard("card-stok", stok < 5);

}

function setCard(id, alarm) {

  const card = document.getElementById(id);
  if (!card) return;

  card.classList.remove("normal", "warning", "alarm");
  card.classList.add(alarm ? "alarm" : "normal");
}

function showPage(pageName, el) {

  document.querySelectorAll(".page")
    .forEach(page =>
      page.classList.remove("active")
    );

  document.querySelectorAll(".tab-btn")
    .forEach(btn =>
      btn.classList.remove("active")
    );

  document
    .getElementById("page-" + pageName)
    .classList.add("active");

  if(el){
  el.classList.add("active");
  }

  if (pageName === "hourly") {
    renderTable(
      "hourlyBody",
      "prs_hourly"
    );
  }

  if (pageName === "daily") {
    renderTable(
      "dailyBody",
      "prs_daily"
    );
  }
}