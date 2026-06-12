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
let lastCons = null;

/* =========================
   INIT
========================= */
document.addEventListener("DOMContentLoaded", () => {

  const today =
  new Date().toISOString().split("T")[0];
  document.getElementById(
  "historyDate"
  ).value = today;

  const month =
  new Date().toISOString().slice(0,7);

  document.getElementById("historyDate").value =
  today;

  document.getElementById("historyMonth").value =
  month;

  loadData();

  loadHistory();

  setInterval(loadData,10000);

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
    
    const dateStr =
    now.toLocaleDateString(
    "id-ID",
    {
      day:"2-digit",
      month:"2-digit",
      year:"numeric"
    });

    set("dateNow", dateStr);
    

    /* =========================
       CONSUMPTION
    ========================= */
    const latestHourly = Array.isArray(hourly) && hourly.length
      ? hourly[0] // ⚠️ karena query kamu DESC
      : null;
    
    const consRaw = latestHourly?.difInlet;
    
    const cons = Number.isFinite(Number(consRaw))
      ? Number(consRaw)
      : 0;
    
    set("consumption", cons.toFixed(2));
    push(state.consumption, cons);
    if (!d || Object.keys(d).length === 0) {
      set("update", "NO DATA");
      return;
    }
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

    const avgCons = getAvgConsumption(state);

    const engine = calculateStockHours(
      d.PressureInlet,
      avgCons
    );
    
    const trend = getConsumptionTrend(state);
    const risk = getStockRisk(engine.hoursLeft, trend);
    
    console.log("TREND:", trend);
    console.log("RISK:", risk);
    
    try {
      updateAlarm(
        Number(d.PressureInlet),
        Number(d.Pressure),
        Number(d.Temperature),
        Number(d.GasFlow),
        Number(d.CorrectionFlow),
        risk
      );
    } catch (e) {
      console.error("updateAlarm crash:", e);
    }

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
    
    applyRiskUI(risk, engine.hoursLeft, trend);

    
  } catch (err) {
    console.error(err);
    const el = document.getElementById("update");
    if (el) el.innerText = "ERROR";
  } finally {
    setLoading(false);
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
    
    while (state.labels.length > 100) {
      state.labels.shift();
    }

  });

}

function setLoading(isLoading) {
  document.querySelectorAll(".card").forEach(c =>
    c.classList.toggle("loading", isLoading)
  );
}

function getAvgConsumption(state) {
  const data = state.consumption.slice(-10);

  if (!data.length) return 0;

  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i];
  }

  return sum / data.length;
}

function setCard(id, level) {
  const el = document.getElementById(id);

  if (!el) {
    console.warn("Missing card element:", id);
    return;
  }

  const levels = ["normal", "warning", "alarm"];

  el.classList.remove(...levels);

  if (!levels.includes(level)) {
    level = "normal";
  }

  el.classList.add(level);
}

/* =========================
   ALARM
========================= */
function updateAlarm(inlet, outlet, temp, gasflow, corrflow, risk) {

  setCard("card-inlet", getLevel(inlet, 5, 250));
  setCard("card-outlet", getLevel(outlet, 2, 4));
  setCard("card-temp", getLevel(temp, 25, 40));
  setCard("card-gasflow", getLevel(gasflow, 5, 250));
  setCard("card-corrflow", getLevel(corrflow, 275, 500));

  setCard("card-stok", riskToLevel(risk));
}

function getLevel(value, min, max) {

  if (value < min || value > max) {
    return "alarm";
  }

  const range = max - min;

  const lowWarn = min + range * 0.2;
  const highWarn = max - range * 0.2;

  if (value < lowWarn || value > highWarn) {
    return "warning";
  }

  return "normal";
}

function riskToLevel(risk) {
  if (risk === "CRITICAL") return "alarm";
  if (risk === "WARNING") return "warning";
  if (risk === "CAUTION") return "warning";
  return "normal";
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

  sparkCharts[id].update();
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

  if (!detailChart || !document.getElementById("chartPanel")?.classList.contains("show")) {
    return;
  }

  const key =
  document.getElementById("chartPanel")
  ?.dataset.key;

  if(!key) return;

  let labels = [];
  let values = [];

  if(key === "today"){

    labels =
    state.dailyData
    .slice()
    .reverse()
    .map(r => r.time);

    values =
    state.dailyData
    .slice()
    .reverse()
    .map(r => Number(r.dailyVolume));

  }else{

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

    labels = state.hourlyData
    .slice()
    .reverse()
    .map(r => (r.time ? r.time.substring(11,16) : "--"));

    values =
    state.hourlyData
    .slice()
    .reverse()
    .map(r =>
      Number(r[map[key]] || 0)
    );

  }

  detailChart.data.labels = labels;
  detailChart.data.datasets[0].data = values;

  detailChart.update("none");
  
  const safeValues = values.length ? values : [0];

  const min = Math.min(...safeValues);
  const max = Math.max(...safeValues);
  
  const avg = safeValues.reduce((a,b)=>a+b,0) / safeValues.length;
  
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
  
  const last =
  values[values.length - 1] || 0;
  
  const prev =
  values[values.length - 2] || last;
  
  const diff =
  last - prev;
  
  const percent =
  prev !== 0
  ? (diff / prev) * 100
  : 0;
  
  let trendText = "";
  let trendClass = "";
  
  if(percent > 0){
  
    trendClass = "trend-up";
    trendText =
    `▲ +${percent.toFixed(1)}% dari data sebelumnya`;
  
  }else if(percent < 0){
  
    trendClass = "trend-down";
    trendText =
    `▼ ${Math.abs(percent).toFixed(1)}% dari data sebelumnya`;
  
  }else{
  
    trendClass = "trend-flat";
    trendText =
    "▬ Tidak ada perubahan";
  
  }
  
  document.getElementById(
  "chartTrend"
  ).innerHTML =
  `<span class="${trendClass}">
  ${trendText}
  </span>`;
  
}
function showPage(pageName, el){

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

  if(pageName === "history"){
    loadHistory();
  }

}

async function loadHistory(){
  
  tbody.innerHTML = `
  <tr>
  <td colspan="10" class="empty">
  Loading...
  </td>
  </tr>
  `;

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
  document.getElementById(
  "historyInfo"
  ).innerText =
  `${data.length} record ditemukan`;
  
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
      
      panel.animate(
      [
        {
          transform:"scale(.85)",
          opacity:0
        },
        {
          transform:"scale(1)",
          opacity:1
        }
      ],
      {
        duration:400,
        easing:"ease-out"
      }
      );
      
      panel.dataset.key = key;
      
      setTimeout(()=>{

        const y =
        panel.getBoundingClientRect().top +
        window.pageYOffset -
        90;
      
        window.scrollTo({
          top:y,
          behavior:"smooth"
        });
      
      },150);
    
      document.getElementById(
        "chartTitle"
      ).innerText = title;
    
      const ctx =
      document.getElementById("detailChart");
    
      if (detailChart) {
        detailChart.data.labels = [];
        detailChart.data.datasets[0].data = [];
        detailChart.destroy();
        detailChart = null;
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
      
      const last =
      values[values.length - 1] || 0;
      
      const prev =
      values[values.length - 2] || last;
      
      const diff =
      last - prev;
      
      const percent =
      prev !== 0
      ? (diff / prev) * 100
      : 0;
      
      let trendText = "";
      let trendClass = "";
      
      if(percent > 0){
      
        trendClass = "trend-up";
        trendText =
        `▲ +${percent.toFixed(1)}% dari data sebelumnya`;
      
      }else if(percent < 0){
      
        trendClass = "trend-down";
        trendText =
        `▼ ${percent.toFixed(1)}% dari data sebelumnya`;
      
      }else{
      
        trendClass = "trend-flat";
        trendText =
        "▬ Tidak ada perubahan";
      
      }
      
      document.getElementById(
      "chartTrend"
      ).innerHTML =
      `<span class="${trendClass}">
      ${trendText}
      </span>`;
      
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
          animation:{
            duration:700
          },

          interaction:{
            intersect:false,
            mode:"index"
          },
        
          plugins:{
            legend:{
              display:false
            },
            tooltip:{
              enabled:true
            }
          },
        
          scales:{
            x:{
              ticks:{
                color:"#aaa"
              }
            },
            y:{
              ticks:{
                color:"#aaa"
              }
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
  loadHistory();
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

function calculateStockHours(pressureInlet, avgConsumption) {

  const stock = Math.max(Number(pressureInlet || 0), 1) / 10;

  const safeConsumption = avgConsumption > 0
    ? avgConsumption
    : 1; // anti division by zero

  const hoursLeft = stock / safeConsumption;

  return {
    stock: Number(stock.toFixed(2)),
    hoursLeft: Number(hoursLeft.toFixed(2))
  };
}

function getConsumptionTrend(state) {
  const data = state.consumption.slice(-20);

  if (data.length < 5) return "stable";

  let ema1 = 0;
  let ema2 = 0;

  const k = 2 / (data.length + 1);

  const half = Math.floor(data.length / 2);

  for (let i = 0; i < half; i++) {
    ema1 = data[i] * k + ema1 * (1 - k);
  }

  for (let i = half; i < data.length; i++) {
    ema2 = data[i] * k + ema2 * (1 - k);
  }

  const diff = ema1 !== 0 ? ((ema2 - ema1) / ema1) * 100 : 0;

  if (diff > 5) return "rising";
  if (diff < -5) return "dropping";
  return "stable";
}

function getStockRisk(hoursLeft, trend) {

  if (hoursLeft <= 3) {
    return "CRITICAL";
  }

  if (hoursLeft <= 6 && trend === "rising") {
    return "WARNING";
  }

  if (hoursLeft <= 12) {
    return "CAUTION";
  }

  return "SAFE";
}

function applyRiskUI(risk, hoursLeft, trend) {

  const el = document.getElementById("card-stok");
  if (!el) return;

  el.classList.remove("normal", "warning", "alarm");

  if (risk === "CRITICAL") {
    el.classList.add("alarm");
  } else if (risk === "WARNING") {
    el.classList.add("warning");
  } else {
    el.classList.add("normal");
  }

  // OPTIONAL TEXT FEEDBACK
  const stokEl = document.getElementById("stok");

  if (stokEl) {
  
    const statusClass =
      risk === "CRITICAL"
        ? "status-red"
        : risk === "WARNING" || risk === "CAUTION"
        ? "status-yellow"
        : "status-green";
  
    stokEl.innerHTML = `
      <div class="stok-value">
        ${hoursLeft.toFixed(1)}
      </div>
  
      <div class="stok-unit">
        Jam
      </div>
  
      <div class="stok-status ${statusClass}">
        ${risk} • ${trend}
      </div>
    `;
  }
}

function exportHistory(){

  if(historyMode === "hourly"){

    const date =
    document.getElementById(
    "historyDate"
    ).value;

    window.open(
      API +
      "/export-hourly?date=" +
      date
    );

  }else{

    const month =
    document.getElementById(
    "historyMonth"
    ).value;

    window.open(
      API +
      "/export?month=" +
      month
    );

  }

}