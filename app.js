const labels = [];

const gasFlowData = [];
const corrFlowData = [];
const pressureData = [];
const calcFlowData = [];

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
{
label:"Smart PRS Flow",
data:calcFlowData,
borderWidth:2
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

let lastEVC = null;
let lastTime = null;

const API =
"https://smart-prs-api.enrikofzm.workers.dev";

async function loadData() {

  try {

    const res = await fetch(API);
    const json = await res.json();

    console.log(json);

    const d = json[0];
    let calculatedFlow = null;
    let konsumsi = "-";
    
    const nowTime = Date.now();

    let calculatedFlow = null;
    let konsumsi = "-";
    
    if(lastEVC !== null){

    const deltaV =
      Number(d.CorrectionMeter) -
      lastEVC;
  
    konsumsi =
      deltaV.toFixed(2);
  
    if(lastTime !== null){

    const deltaT =
      (nowTime - lastTime) / 1000;

    calculatedFlow =
      ((deltaV / deltaT) * 3600)
      .toFixed(2);

    }
  
  }
  
    lastEVC =
      Number(d.CorrectionMeter);
    
    lastTime =
      nowTime;
    
    calcFlowData.push(
    calculatedFlow ?? 0
    );
    
    document.getElementById(
    "consumption"
    ).innerText =
    konsumsi;
    
    document.getElementById(
      "smartflow"
    ).innerText =
    calculatedFlow ?? "-";

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
    calcFlowData.shift();
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
    
  } catch (err) {

    document.getElementById("update").innerText =
      err.message;

    console.error(err);

  }

}

loadData();

setInterval(loadData, 30000);