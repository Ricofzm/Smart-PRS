const API = "https://smart-prs-api.enrikofzm.workers.dev";
document.addEventListener("DOMContentLoaded", () => {

  // ── STATE CHART ─────────────────────────────
  const state = {

  labels: [],
  
  inlet: [],
  outlet: [],
  temp: [],
  gasFlow: [],
  corrFlow: [],
  evc: [],
  turbin: [],
  today: []
  
  };

  // ── CHART ─────────────────────────────
  const ctx = document.getElementById("flowChart");

  if (!ctx) return;

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
        x: { ticks: { color: "#94a3b8" }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { color: "#94a3b8" }, grid: { color: "rgba(255,255,255,.05)" } }
      }
    }
  });

  // ── FETCH DATA FROM WORKER ─────────────────────────────
  async function loadData() {
    try {

      document.querySelectorAll(".card")
        .forEach(c => c.classList.add("loading"));

      const res = await fetch(API);
      if (!res.ok) throw new Error("API error");

      const json = await res.json();
      const d = json.realtime;
      const hourly = json.hourly || [];
      const daily = json.daily || [];
      renderHourly(hourly);
      renderDaily(daily);
      
      const now = new Date();

      const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val ?? "-";
      };
      
      const latestHourly = hourly[0];

      if (latestHourly) {
        set(
          "consumption",
          Number(latestHourly.difInlet || 0).toFixed(2)
        );
      }

      if (!d) return;

      // ── MAIN VALUES ──
      set("update", d.ReceiveDateTime || now.toLocaleTimeString("id-ID"));
      set("inlet", d.PressureInlet);
      set("outlet", d.Pressure);
      set("temp", d.Temperature);
      set("gasflow", d.GasFlow);
      set("corrflow", d.CorrectionFlow);
      set("turbin", d.TurbinMeter);
      set("evc", d.CorrectionMeter);
      set(
        "today",
        Number(
          d.TodayVolumeCustom ?? 0
        ).toFixed(3)
      );

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

      // ── CHART UPDATE ──
      state.labels.push(
      now.toLocaleTimeString("id-ID")
      );
      
      state.inlet.push(
      Number(d.PressureInlet)
      );
      
      state.outlet.push(
      Number(d.Pressure)
      );
      
      state.temp.push(
      Number(d.Temperature)
      );
      
      state.gasFlow.push(
      Number(d.GasFlow)
      );
      
      state.corrFlow.push(
      Number(d.CorrectionFlow)
      );
      
      state.evc.push(
      Number(d.CorrectionMeter)
      );
      
      state.turbin.push(
      Number(d.TurbinMeter)
      );
      
      state.today.push(
      Number(
      d.TodayVolumeCustom || 0
      )
      );

      if(state.labels.length > 100){

      Object.keys(state).forEach(key=>{
      
      if(Array.isArray(state[key])){
      state[key].shift();
      }
      
      });
      
      }

      flowChart.update();

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


// ── ALARM SYSTEM ─────────────────────────────
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
}
function renderHourly(data) {

  const tbody =
    document.getElementById("hourlyBody");

  if (!tbody) return;

  tbody.innerHTML = data.map(r => `
    <tr>
      <td>${r.time ?? "-"}</td>
      <td>${r.inlet ?? "-"}</td>
      <td>${r.outlet ?? "-"}</td>
      <td>${r.temp ?? "-"}</td>
      <td>${r.gasflow ?? "-"}</td>
      <td>${r.corrflow ?? "-"}</td>
      <td>${r.turbin ?? "-"}</td>
      <td>${r.evc ?? "-"}</td>
      <td>${r.today ?? "-"}</td>
    </tr>
  `).join("");
}
function renderDaily(data) {

  const tbody =
    document.getElementById("dailyBody");

  if (!tbody) return;

  tbody.innerHTML = data.map(r => `
    <tr>
      <td>${r.time ?? "-"}</td>
      <td>${r.evc ?? "-"}</td>
      <td>${r.dailyVolume ?? "-"}</td>
    </tr>
  `).join("");
}

async function loadHistory(){

  const date =
  document.getElementById(
    "historyDate"
  ).value;

  if(!date) return;

  const res =
  await fetch(
    API +
    "/history/" +
    historyMode +
    "?date=" +
    date
  );

  const data =
  await res.json();

  if(historyMode === "hourly"){
    renderHistoryHourly(data);
  }else{
    renderHistoryDaily(data);
  }

}

let historyMode = "hourly";
function switchHistory(mode, el){

  historyMode = mode;

  document
    .querySelectorAll(".history-btn")
    .forEach(btn =>
      btn.classList.remove("active")
    );

  el.classList.add("active");

}

function renderHistoryHourly(data){

  document.getElementById(
    "historyHead"
  ).innerHTML = `
  <tr>
    <th>Jam</th>
    <th>Inlet</th>
    <th>Outlet</th>
    <th>Temp</th>
    <th>Gas Flow</th>
    <th>Corr Flow</th>
  </tr>
  `;

  document.getElementById(
    "historyBody"
  ).innerHTML =
  data.map(r=>`
  <tr>
    <td>${r.time}</td>
    <td>${r.inlet}</td>
    <td>${r.outlet}</td>
    <td>${r.temp}</td>
    <td>${r.gasflow}</td>
    <td>${r.corrflow}</td>
  </tr>
  `).join("");

}

function renderHistoryDaily(data){

  document.getElementById(
    "historyHead"
  ).innerHTML = `
  <tr>
    <th>Tanggal</th>
    <th>EVC</th>
    <th>Daily Volume</th>
  </tr>
  `;

  document.getElementById(
    "historyBody"
  ).innerHTML =
  data.map(r=>`
  <tr>
    <td>${r.time}</td>
    <td>${r.evc}</td>
    <td>${r.dailyVolume}</td>
  </tr>
  `).join("");

}