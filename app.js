document.addEventListener("DOMContentLoaded", () => {

  // ── STATE ─────────────────────────────────────────────
  const state = {
    labels: [],
    gasFlow: [],
    corrFlow: [],
    pressure: []
  };

  let lastEVC = null;
  let lastHourLog = null;
  let lastDailyLog = null;

  const API = "https://smart-prs-api.enrikofzm.workers.dev";

  // ── CHART INIT (SAFE) ────────────────────────────────
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
          borderWidth: 2,
          borderColor: "#00d4ff",
          backgroundColor: "rgba(0,212,255,.08)",
          tension: .4
        },
        {
          label: "Correction Flow",
          data: state.corrFlow,
          borderWidth: 2,
          borderColor: "#00ff9f",
          backgroundColor: "rgba(0,255,159,.08)",
          tension: .4
        },
        {
          label: "Pressure Inlet",
          data: state.pressure,
          borderWidth: 2,
          borderColor: "#ff9f00",
          backgroundColor: "rgba(255,159,0,.08)",
          tension: .4,
          yAxisID: "y1"
        }
      ]
    },
    options: {
      responsive: true,
      animation: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { labels: { color: "#6a8fa8" } }
      },
      scales: {
        x: { ticks: { color: "#6a8fa8" }, grid: { color: "rgba(30,58,82,.5)" } },
        y: { beginAtZero: true, ticks: { color: "#6a8fa8" }, grid: { color: "rgba(30,58,82,.5)" } },
        y1: { position: "right", ticks: { color: "#6a8fa8" }, grid: { drawOnChartArea: false } }
      }
    }
  });

  // ── SAFE FETCH ───────────────────────────────────────
  async function loadData() {
    try {
      const res = await fetch(API);
      if (!res.ok) throw new Error("API error");

      const json = await res.json();
      if (!Array.isArray(json) || json.length === 0) return;

      const d = json[0];
      const now = new Date();

      // UI update helper
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

      set("stok", (Number(d.PressureInlet) / 10).toFixed(1));

      // consumption
      let konsumsi = "-";
      if (lastEVC !== null) {
        konsumsi = (Number(d.CorrectionMeter) - lastEVC).toFixed(2);
      }
      lastEVC = Number(d.CorrectionMeter);
      set("consumption", konsumsi);

      // ── chart push ──
      state.labels.push(now.toLocaleTimeString("id-ID"));
      state.gasFlow.push(Number(d.GasFlow));
      state.corrFlow.push(Number(d.CorrectionFlow));
      state.pressure.push(Number(d.PressureInlet));

      if (state.labels.length > 20) {
        state.labels.shift();
        state.gasFlow.shift();
        state.corrFlow.shift();
        state.pressure.shift();
      }

      flowChart.update();

      // ── hourly log ──
      const hour = now.getHours();
      if (lastHourLog !== hour) {
        lastHourLog = hour;
        addRecord("prs_hourly", d, now);
      }

      // ── daily log ──
      const dateStr = now.toISOString().slice(0, 10);
      if (hour === 6 && lastDailyLog !== dateStr) {
        lastDailyLog = dateStr;
        addRecord("prs_daily", d, now, true);
      }

    } catch (err) {
      const el = document.getElementById("update");
      if (el) el.innerText = "Error";
      console.error(err);
    }
  }

  // ── STORAGE ──────────────────────────────────────────
  function getRecords(key) {
    try { return JSON.parse(localStorage.getItem(key) || "[]"); }
    catch { return []; }
  }

  function saveRecords(key, arr) {
    localStorage.setItem(key, JSON.stringify(arr));
  }

  function addRecord(key, d, now, daily = false) {
    const arr = getRecords(key);

    arr.unshift({
      time: daily
        ? now.toLocaleDateString("id-ID")
        : now.toLocaleString("id-ID"),
      inlet: d.PressureInlet,
      outlet: d.Pressure,
      temp: d.Temperature,
      gasflow: d.GasFlow,
      corrflow: d.CorrectionFlow,
      turbin: d.TurbinMeter,
      evc: d.CorrectionMeter,
      today: d.TodayVolume
    });

    if (arr.length > 500) arr.length = 500;
    saveRecords(key, arr);
  }

  // ── START LOOP ───────────────────────────────────────
  loadData();
  setInterval(loadData, 60000);

});

function toggleMenu() {
  const btn = document.getElementById("menuBtn");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("overlay");

  const isOpen = sidebar.classList.contains("open");

  if (isOpen) {
    sidebar.classList.remove("open");
    overlay.classList.remove("show");
    btn.classList.remove("open");
  } else {
    sidebar.classList.add("open");
    overlay.classList.add("show");
    btn.classList.add("open");
  }
}