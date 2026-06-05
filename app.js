// ── Chart setup ──────────────────────────────────────────────
const labels = [];
const gasFlowData = [];
const corrFlowData = [];
const pressureData = [];

const ctx = document.getElementById("flowChart");
const flowChart = new Chart(ctx, {
  type: "line",
  data: {
    labels,
    datasets: [
      { label: "Gas Flow",        data: gasFlowData,  borderWidth: 2, borderColor: "#00d4ff", backgroundColor: "rgba(0,212,255,.08)", tension: .4 },
      { label: "Correction Flow", data: corrFlowData, borderWidth: 2, borderColor: "#00ff9f", backgroundColor: "rgba(0,255,159,.08)", tension: .4 },
      { label: "Pressure Inlet",  data: pressureData, borderWidth: 2, borderColor: "#ff9f00", backgroundColor: "rgba(255,159,0,.08)", tension: .4, yAxisID: "y1" }
    ]
  },
  options: {
    responsive: true,
    animation: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { labels: { color: "#6a8fa8", font: { family: "'Exo 2'" } } }
    },
    scales: {
      x:  { ticks: { color: "#6a8fa8" }, grid: { color: "rgba(30,58,82,.5)" } },
      y:  { beginAtZero: true, ticks: { color: "#6a8fa8" }, grid: { color: "rgba(30,58,82,.5)" } },
      y1: { position: "right", ticks: { color: "#6a8fa8" }, grid: { drawOnChartArea: false } }
    }
  }
});

// ── Config ───────────────────────────────────────────────────
const API = "https://smart-prs-api.enrikofzm.workers.dev";

let lastEVC       = null;
let lastHourLog   = null;   // jam terakhir pencatatan per jam (0–23)
let lastDailyLog  = null;   // tanggal terakhir pencatatan harian (string YYYY-MM-DD)

// ── Storage helpers ──────────────────────────────────────────
function getRecords(key) {
  try { return JSON.parse(localStorage.getItem(key) || "[]"); }
  catch { return []; }
}
function saveRecords(key, arr) {
  localStorage.setItem(key, JSON.stringify(arr));
}

function addRecord(key, row) {
  const arr = getRecords(key);
  arr.unshift(row);           // terbaru di atas
  if (arr.length > 500) arr.length = 500;
  saveRecords(key, arr);
}

// ── Render tables ────────────────────────────────────────────
function renderTable(tbodyId, key) {
  const tbody = document.getElementById(tbodyId);
  const arr   = getRecords(key);
  if (!arr.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty">Belum ada data pencatatan.</td></tr>`;
    return;
  }
  tbody.innerHTML = arr.map(r => `
    <tr>
      <td>${r.time}</td>
      <td>${r.inlet}</td>
      <td>${r.outlet}</td>
      <td>${r.temp}</td>
      <td>${r.gasflow}</td>
      <td>${r.corrflow}</td>
      <td>${r.turbin}</td>
      <td>${r.evc}</td>
      <td>${r.today}</td>
    </tr>`).join("");
}

// ── Export CSV ───────────────────────────────────────────────
function exportCSV(type) {
  const key  = type === "hourly" ? "prs_hourly" : "prs_daily";
  const arr  = getRecords(key);
  if (!arr.length) { alert("Belum ada data."); return; }

  const header = ["Waktu","Inlet","Outlet","Temp","Gas Flow","Corr Flow","Turbin","EVC","Volume Hari Ini"];
  const rows   = arr.map(r =>
    [r.time, r.inlet, r.outlet, r.temp, r.gasflow, r.corrflow, r.turbin, r.evc, r.today].join(",")
  );
  const csv  = [header.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `smart-prs-${type}-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Nav helpers ──────────────────────────────────────────────
function toggleMenu() {
  const btn     = document.getElementById("menuBtn");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("overlay");
  btn.classList.toggle("open");
  sidebar.classList.toggle("open");
  overlay.classList.toggle("show");
}

function showPage(name, el) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".menu-item").forEach(m => m.classList.remove("active"));
  document.getElementById("page-" + name).classList.add("active");
  el.classList.add("active");
  if (name === "hourly") renderTable("hourlyBody", "prs_hourly");
  if (name === "daily")  renderTable("dailyBody",  "prs_daily");
  toggleMenu();
}

// ── Main fetch ───────────────────────────────────────────────
async function loadData() {
  try {
    const res  = await fetch(API);
    const json = await res.json();
    if (!json || !json.length) return;

    const d   = json[0];
    const now = new Date();

    // Update timestamp di navbar
    document.getElementById("update").innerText =
      d.ReceiveDateTime || now.toLocaleTimeString("id-ID");

    // Consumption
    let konsumsi = "-";
    if (lastEVC !== null) {
      konsumsi = (Number(d.CorrectionMeter) - lastEVC).toFixed(2);
    }
    lastEVC = Number(d.CorrectionMeter);

    document.getElementById("consumption").innerText = konsumsi;
    document.getElementById("inlet").innerText       = d.PressureInlet   || "-";
    document.getElementById("outlet").innerText      = d.Pressure        || "-";
    document.getElementById("temp").innerText        = d.Temperature     || "-";
    document.getElementById("gasflow").innerText     = d.GasFlow         || "-";
    document.getElementById("corrflow").innerText    = d.CorrectionFlow  || "-";
    document.getElementById("turbin").innerText      = d.TurbinMeter     || "-";
    document.getElementById("evc").innerText         = d.CorrectionMeter || "-";
    document.getElementById("today").innerText       = d.TodayVolume     || "-";
    document.getElementById("stok").innerText        =
      ((Number(d.PressureInlet) / 10).toFixed(1));

    // Chart
    labels.push(now.toLocaleTimeString("id-ID"));
    gasFlowData.push(Number(d.GasFlow));
    corrFlowData.push(Number(d.CorrectionFlow));
    pressureData.push(Number(d.PressureInlet));
    if (labels.length > 20) {
      labels.shift(); gasFlowData.shift(); corrFlowData.shift(); pressureData.shift();
    }
    flowChart.update();

    // ── Pencatatan per jam ──────────────────────────────────
    const currentHour = now.getHours();
    if (lastHourLog !== currentHour) {
      lastHourLog = currentHour;
      const row = {
        time:     now.toLocaleString("id-ID"),
        inlet:    d.PressureInlet   || "-",
        outlet:   d.Pressure        || "-",
        temp:     d.Temperature     || "-",
        gasflow:  d.GasFlow         || "-",
        corrflow: d.CorrectionFlow  || "-",
        turbin:   d.TurbinMeter     || "-",
        evc:      d.CorrectionMeter || "-",
        today:    d.TodayVolume     || "-"
      };
      addRecord("prs_hourly", row);
    }

    // ── Pencatatan harian jam 06:00 ─────────────────────────
    const dateStr = now.toISOString().slice(0, 10);
    if (currentHour === 6 && lastDailyLog !== dateStr) {
      lastDailyLog = dateStr;
      const row = {
        time:     now.toLocaleDateString("id-ID", { weekday:"long", year:"numeric", month:"long", day:"numeric" }),
        inlet:    d.PressureInlet   || "-",
        outlet:   d.Pressure        || "-",
        temp:     d.Temperature     || "-",
        gasflow:  d.GasFlow         || "-",
        corrflow: d.CorrectionFlow  || "-",
        turbin:   d.TurbinMeter     || "-",
        evc:      d.CorrectionMeter || "-",
        today:    d.TodayVolume     || "-"
      };
      addRecord("prs_daily", row);
    }

  } catch (err) {
    document.getElementById("update").innerText = "Error: " + err.message;
    console.error(err);
  }
}

loadData();
setInterval(loadData, 60000);