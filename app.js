const labels = [];

const gasFlowData = [];
const corrFlowData = [];
const pressureData = [];

const ctx =
document.getElementById("flowChart");

const flowChart =
new Chart(ctx,{
type:"line",
data:{
labels,
datasets:[
{
label:"Gas Flow",
data:gasFlowData,
borderWidth:2
},
{
label:"Correction Flow",
data:corrFlowData,
borderWidth:2
},
{
label:"Pressure Inlet",
data:pressureData,
borderWidth:2,
yAxisID:"y1"
},
]
},
options:{
responsive:true,
animation:false,
interaction:{
mode:"index",
intersect:false
},
scales:{
y:{
beginAtZero:true
},
y1:{
position:"right"
}
}
}
});

flowChart.options.plugins = {
  legend: {
    labels: {
      color: "white"
    }
  }
};

flowChart.options.scales = {
  x: {
    ticks: {
      color: "white"
    }
  },
  y: {
    ticks: {
      color: "white"
    },
    beginAtZero: true
  },
  y1: {
    position: "right",
    ticks: {
      color: "white"
    }
  }
};

flowChart.update();

function getPressureStatus(p) {
  p = Number(p);

  if (p >= 90) return "critical";
  if (p >= 75) return "warning";
  if (p >= 60) return "normal";
  return "warning"; // terlalu rendah juga bahaya
}
function updateAlarm(inlet, outlet) {
  const inletStatus = getPressureStatus(inlet);
  const outletStatus = getPressureStatus(outlet);

  const alarmBar = document.getElementById("alarmBar");

  const finalStatus =
    (inletStatus === "critical" || outletStatus === "critical")
      ? "critical"
      : (inletStatus === "warning" || outletStatus === "warning")
        ? "warning"
        : "normal";

  alarmBar.className = "alarm-bar " + finalStatus;

  if (finalStatus === "critical") {
    alarmBar.innerText = "CRITICAL PRESSURE ALERT";
  } else if (finalStatus === "warning") {
    alarmBar.innerText = "WARNING: Pressure unstable";
  } else {
    alarmBar.innerText = "SYSTEM NORMAL";
  }

  // highlight card
  const inletCard = document.getElementById("inlet").parentElement;
  const outletCard = document.getElementById("outlet").parentElement;

  inletCard.className = "card " + inletStatus;
  outletCard.className = "card " + outletStatus;
}

const API =
"https://smart-prs-api.enrikofzm.workers.dev";

let lastEVC = null;

async function loadData() {

  try {

    const res = await fetch(API);
    const json = await res.json();
    if(!json || !json.length){
      return;
    }
    console.log(json);

    const d = json[0];

    let konsumsi = "-";
    if(lastEVC !== null){
    
      konsumsi = (
        Number(d.CorrectionMeter) -
        lastEVC
      ).toFixed(2);
    
    }
    
    lastEVC =
      Number(d.CorrectionMeter);
    
    document.getElementById(
    "consumption"
    ).innerText =
    konsumsi;
    
    const now =
    new Date().toLocaleTimeString();
    
    labels.push(now);
    
    gasFlowData.push(
    Number(d.GasFlow)
    );
    
    corrFlowData.push(
    Number(d.CorrectionFlow)
    );
    
    pressureData.push(
    Number(d.PressureInlet)
    );
    
    if(labels.length > 20){
    labels.shift();
    gasFlowData.shift();
    corrFlowData.shift();
    pressureData.shift();
    }
    
    flowChart.update();

    document.getElementById("inlet").innerText =
      d.PressureInlet || "-";

    document.getElementById("outlet").innerText =
      d.Pressure || "-";

    document.getElementById("temp").innerText =
      d.Temperature || "-";

    document.getElementById("gasflow").innerText =
      d.GasFlow || "-";

    document.getElementById("corrflow").innerText =
      d.CorrectionFlow || "-";

    document.getElementById("turbin").innerText =
      d.TurbinMeter || "-";

    document.getElementById("evc").innerText =
      d.CorrectionMeter || "-";

    document.getElementById("today").innerText =
      d.TodayVolume || "-";

    document.getElementById("update").innerText =
      d.ReceiveDateTime || new Date().toLocaleTimeString();
    
    const stokAman =
    (Number(d.PressureInlet)/10)
    .toFixed(1);
    
    document.getElementById("stok")
    .innerText =
    stokAman + " Jam";
    
    updateAlarm(
    d.PressureInlet,
    d.Pressure
    );
  } catch (err) {

    document.getElementById("update").innerText =
      err.message;

    console.error(err);

  }
  
}

loadData();

setInterval(loadData, 60000);