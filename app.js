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
data:gasFlowData
},
{
label:"Correction Flow",
data:corrFlowData
},
{
label:"Pressure Inlet",
data:pressureData
}
]
},
options:{
responsive:true,
animation:false
}
});

const API =
"https://smart-prs-api.enrikofzm.workers.dev";

async function loadData() {

  try {

    const res = await fetch(API);
    const json = await res.json();

    console.log(json);

    const d = json[0];
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
    
    let konsumsi = "-";

    if(lastEVC !== null){
    
    konsumsi =
    (
    Number(d.CorrectionMeter)
    -
    lastEVC
    ).toFixed(2);
    
    }
    
    lastEVC =
    Number(d.CorrectionMeter);
    
    document.getElementById(
    "consumption"
    ).innerText =
    konsumsi;
    
  } catch (err) {

    document.getElementById("update").innerText =
      err.message;

    console.error(err);

  }

}

loadData();

setInterval(loadData, 30000);