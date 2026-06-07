const API =
"https://smart-prs-api.enrikofzm.workers.dev";

const state = {

labels:[],

inlet:[],
outlet:[],
temp:[],
gasFlow:[],
corrFlow:[],
turbin:[],
evc:[],
today:[],
consumption:[]

};

let detailChart = null;
let historyMode = "hourly";
  
document.addEventListener("DOMContentLoaded", () => {

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
        const cons =
        Number(latestHourly?.difInlet || 0);
        
        set(
          "consumption",
          cons.toFixed(2)
        );
        
        state.consumption.push(cons);
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
      set("today",Number(d.TodayVolumeCustom ?? 0).toFixed(3));

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
      
      state.turbin.push(
      Number(d.TurbinMeter)
      );
      
      state.evc.push(
      Number(d.CorrectionMeter)
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
      
      refreshChart();

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

function toggleChart(title,key){

  const panel = document.getElementById("chartPanel");
  
  if(panel.classList.contains("show") && panel.dataset.key === key){
  panel.classList.remove("show");
  return;
  }
  
  panel.classList.add("show");
  panel.scrollIntoView({
    behavior:"smooth",block:"nearest"
  });
  panel.dataset.key = key;
  
  document.getElementById("chartTitle").innerText = title;
  
  const ctx = document.getElementById("detailChart");
  
  if(detailChart){
    detailChart.destroy();}
  
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
  
  detailChart = new Chart(ctx,{
    type:"line", data:{
      labels:state.labels,
      datasets:[{
        label:title,
        data:state[key],
        borderColor:
        colorMap[key],
        backgroundColor:
        colorMap[key] + "33",
        fill:true,
        borderWidth:3,
        tension:.4,
        pointRadius:0
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
      },
      scales:{
        x:{
          ticks:{
            color:"#9aa4b2"
          }
        },
        y:{
          ticks:{
          color:"#9aa4b2"
          }
        }
        
      }
    }
  });
}

function refreshChart(){
  if(!detailChart){
    return;
  }
  const key = document.getElementById("chartPanel").dataset.key;

  detailChart.data.labels = [...state.labels];
  detailChart.data.datasets[0].data = [...state[key]];
  detailChart.update("none");
}