const API = "https://smart-prs-api.enrikofzm.workers.dev";

/* =========================
   STATE
========================= */
const state = {
  labels: [],
  inlet: [],
  outlet: [],
  temp: [],
  gasFlow: [],
  corrFlow: [],
  turbin: [],
  evc: [],
  today: [],
  consumption: [],
  hourlyData: [],
  dailyData: []
};

const sparkCharts = {};
let detailChart = null;
let historyMode = "hourly";

/* =========================
   INIT
========================= */
document.addEventListener("DOMContentLoaded", () => {
  loadData();
  setInterval(loadData, 10000);
});

/* =========================
   MAIN FETCH
========================= */
async function loadData() {
  try {
    setLoading(true);

    const res = await fetch(API);
    if (!res.ok) throw new Error("API ERROR");

    const json = await res.json();
    const d = json.realtime || {};
    const hourly = json.hourly || [];
    const daily = json.daily || [];
    
    state.hourlyData = hourly;
    state.dailyData = daily;

    renderHourly(hourly);
    renderDaily(daily);

    const now = new Date();

    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.innerText = val ?? "-";
    };

    /* =========================
       CONSUMPTION
    ========================= */
    const latestHourly = hourly[0];
    if (latestHourly) {
      const cons = Number(latestHourly.difInlet || 0);
      set("consumption", cons.toFixed(2));
      push(state.consumption, cons);
    }

    if (!d || Object.keys(d).length === 0) return;

    /* =========================
       UI UPDATE
    ========================= */
    set("update", d.ReceiveDateTime || now.toLocaleTimeString("id-ID"));
    set("inlet", d.PressureInlet);
    set("outlet", d.Pressure);
    set("temp", d.Temperature);
    set("gasflow", d.GasFlow);
    set("corrflow", d.CorrectionFlow);
    set("turbin", d.TurbinMeter);
    set("evc", d.CorrectionMeter);
    set("today",
    Number(daily?.[0]?.dailyVolume ?? 0).toFixed(3)
    );

    const stok = Number(d.PressureInlet) / 10;
    set("stok", stok.toFixed(1));

    setLoading(false);

    updateAlarm(
      Number(d.PressureInlet),
      Number(d.Pressure),
      Number(d.Temperature),
      Number(d.GasFlow),
      Number(d.CorrectionFlow),
      stok
    );

    /* =========================
       STATE UPDATE (SAFE)
    ========================= */
    state.labels.push(now.toLocaleTimeString("id-ID"));

    push(state.inlet, d.PressureInlet);
    push(state.outlet, d.Pressure);
    push(state.temp, d.Temperature);
    push(state.gasFlow, d.GasFlow);
    push(state.corrFlow, d.CorrectionFlow);
    push(state.turbin, d.TurbinMeter);
    push(state.evc, d.CorrectionMeter);
    push(
      state.today,
      Number(daily?.[0]?.dailyVolume ?? 0)
    );

    syncStateLength();

    /* =========================
       RENDER
    ========================= */
    refreshChart();
    
    updateAllSparklines();
    

  } catch (err) {
    console.error(err);
    setLoading(false);
    const el = document.getElementById("update");
    if (el) el.innerText = "ERROR";
  }
}

/* =========================
   HELPERS
========================= */
function push(arr, val) {
  arr.push(Number(val ?? 0));
  if (arr.length > 100) arr.shift();
}

function syncStateLength() {

  const len = state.labels.length;

  [
    state.inlet,
    state.outlet,
    state.temp,
    state.gasFlow,
    state.corrFlow,
    state.turbin,
    state.evc,
    state.today,
    state.consumption
  ].forEach(arr => {

    while(arr.length > len){
      arr.shift();
    }

  });

}

function setLoading(isLoading) {
  document.querySelectorAll(".card").forEach(c =>
    c.classList.toggle("loading", isLoading)
  );
}

/* =========================
   ALARM
========================= */
function updateAlarm(inlet, outlet, temp, gasflow, corrflow, stok) {
  setCard("card-inlet", inlet < 5 || inlet > 250);
  setCard("card-outlet", outlet < 2 || outlet > 4);
  setCard("card-temp", temp < 25 || temp > 40);
  setCard("card-gasflow", gasflow < 5 || gasflow > 250);
  setCard("card-corrflow", corrflow < 275 || corrflow > 500);
  setCard("card-stok", stok < 5);
}

function setCard(id, alarm) {
  const el = document.getElementById(id);
  if (!el) return;

  el.classList.remove("normal", "warning", "alarm");
  el.classList.add(alarm ? "alarm" : "normal");
}

/* =========================
   TABLE RENDER
========================= */
function renderHourly(data) {
  const tbody = document.getElementById("hourlyBody");
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
  const tbody = document.getElementById("dailyBody");
  if (!tbody) return;

  tbody.innerHTML = data.map(r => `
    <tr>
      <td>${r.time ?? "-"}</td>
      <td>${r.evc ?? "-"}</td>
      <td>${r.dailyVolume ?? "-"}</td>
    </tr>
  `).join("");
}

/* =========================
   SPARKLINE (STABLE)
========================= */
function updateSparkline(id, data, color) {

  const canvas = document.getElementById(id);
  if (!canvas) return;

  if (!data.length) data = [0];

  if (!sparkCharts[id]) {

    sparkCharts[id] = new Chart(canvas,{
      type:"line",
      data:{
        labels:data.map((_,i)=>i),
        datasets:[{
          data,
          borderColor:color,
          backgroundColor:"transparent",
          borderWidth:2,
          pointRadius:0,
          tension:.4
        }]
      },
      options:{
        responsive:true,
        maintainAspectRatio:false,
        animation:false,
        plugins:{
          legend:{display:false},
          tooltip:{enabled:false}
        },
        scales:{
          x:{display:false},
          y:{display:false}
        }
      }
    });

    return;
  }

  sparkCharts[id].data.labels =
  data.map((_,i)=>i);

  sparkCharts[id].data.datasets[0].data =
  data;

  sparkCharts[id].update("none");
}

function updateAllSparklines() {
  updateSparkline("spark-inlet", state.inlet, "#0A84FF");
  updateSparkline("spark-outlet", state.outlet, "#30D158");
  updateSparkline("spark-temp", state.temp, "#FF9F0A");
  updateSparkline("spark-gasflow", state.gasFlow, "#64D2FF");
  updateSparkline("spark-corrflow", state.corrFlow, "#32D74B");
  updateSparkline("spark-turbin", state.turbin, "#FFD60A");
  updateSparkline("spark-evc", state.evc, "#BF5AF2");
  updateSparkline("spark-today", state.today, "#FF375F");
  updateSparkline("spark-consumption", state.consumption, "#FF453A");
}

/* =========================
   DETAIL CHART
========================= */
function refreshChart() {
  if (!detailChart) return;

  const key = document.getElementById("chartPanel")?.dataset.key;
  if (!key) return;

  detailChart.data.labels = [...state.labels];
  detailChart.data.datasets[0].data = [...(state[key] || [])];
  detailChart.update("none");
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

async function loadHistory(){

  let url;

  if(historyMode === "hourly"){

    const date =
    document.getElementById(
      "historyDate"
    ).value;

    if(!date) return;

    url =
    API +
    "/history?type=hourly&date=" +
    date;

  }else{

    const month =
    document.getElementById(
      "historyMonth"
    ).value;

    if(!month) return;

    url =
    API +
    "/history?type=daily&month=" +
    month;
  }

  const res = await fetch(url);
  const data = await res.json();

  const tbody =
  document.getElementById(
    "historyBody"
  );

  if(historyMode === "hourly"){

    tbody.innerHTML =
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

  }else{

    tbody.innerHTML =
    data.map(r=>`
    <tr>
      <td>${r.time}</td>
      <td>${Number(r.dailyVolume)
        .toFixed(3)}</td>
      <td>${Number(r.evc)
        .toFixed(3)}</td>
    </tr>
    `).join("");
  }
}

function toggleChart(title, key) {

      let labels = [];
      let values = [];
      
      if(key === "today"){
      
        labels =
        state.dailyData
        .slice()
        .reverse()
        .map(r=>r.time);
      
        values =
        state.dailyData
        .slice()
        .reverse()
        .map(r=>Number(r.dailyVolume));
      
      }else{
      
        labels =
        state.hourlyData
        .slice()
        .reverse()
        .map(r=>r.time.substring(11,16));
      
        const map = {
          inlet:"inlet",
          outlet:"outlet",
          temp:"temp",
          gasFlow:"gasflow",
          corrFlow:"corrflow",
          turbin:"turbin",
          evc:"evc",
          consumption:"difInlet"
        };
      
        values =
        state.hourlyData
        .slice()
        .reverse()
        .map(r=>
          Number(
            r[map[key]] || 0
          )
        );
      }
      
      const panel =
      document.getElementById("chartPanel");
      
      if (
        panel.classList.contains("show") &&
        panel.dataset.key === key
      ){
        panel.classList.remove("show");
        return;
      }
      
      panel.classList.add("show");
      panel.dataset.key = key;
    
      document.getElementById(
        "chartTitle"
      ).innerText = title;
    
      const ctx =
      document.getElementById("detailChart");
    
      if(detailChart){
        detailChart.destroy();
      }
    
      const colorMap = {
        inlet:"#0A84FF",
        outlet:"#30D158",
        temp:"#FF9F0A",
        gasFlow:"#64D2FF",
        corrFlow:"#32D74B",
        turbin:"#FFD60A",
        evc:"#BF5AF2",
        today:"#FF375F",
        consumption:"#FF453A"
      };
      
      if(!values.length){
        values = [0];
      }
    
      const min =
      Math.min(...values);
      
      const max =
      Math.max(...values);
      
      const avg =
      values.reduce(
      (a,b)=>a+b,0
      ) / values.length;
      
      document.getElementById(
      "chartStats"
      ).innerHTML =
      `
      Min ${min.toFixed(2)}
      |
      Max ${max.toFixed(2)}
      |
      Avg ${avg.toFixed(2)}
      `;
      
      detailChart =
      new Chart(ctx,{
        type:"line",
        data:{
          labels,
          datasets:[{
            label:title,
            data:values,
            borderColor:colorMap[key],
            backgroundColor:
              colorMap[key] + "33",
            fill:true,
            borderWidth:3,
            pointRadius:0,
            tension:.4
          }]
        },
        options:{
          responsive:true,
          maintainAspectRatio:false,
          animation:false,
          plugins:{
            legend:{
              display:false
            }
          }
        }
      });
}

function switchHistory(mode, el){

  historyMode = mode;

  document
  .querySelectorAll(".history-btn")
  .forEach(btn =>
    btn.classList.remove("active")
  );

  el.classList.add("active");

  document.getElementById(
    "historyDate"
  ).style.display =
  mode === "hourly"
  ? "block"
  : "none";

  document.getElementById(
    "historyMonth"
  ).style.display =
  mode === "daily"
  ? "block"
  : "none";

  const head =
  document.getElementById("historyHead");

  if(mode === "hourly"){

    head.innerHTML = `
    <tr>
      <th>Jam</th>
      <th>Inlet</th>
      <th>Outlet</th>
      <th>Temp</th>
      <th>Gas Flow</th>
      <th>Corr Flow</th>
    </tr>
    `;

  }else{

    head.innerHTML = `
    <tr>
      <th>Tanggal</th>
      <th>Daily Volume</th>
      <th>EVC</th>
    </tr>
    `;

  }
}

function exportCSV(type){

  if(type === "hourly"){

    const today =
    new Date()
    .toISOString()
    .split("T")[0];

    window.open(
      API +
      "/export-hourly?date=" +
      today
    );

  }

  if(type === "daily"){

    const month =
    new Date()
    .toISOString()
    .slice(0,7);

    window.open(
      API +
      "/export?month=" +
      month
    );

  }

}