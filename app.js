const labels = [];
const flowData = [];

const ctx =
document.getElementById("flowChart");

const flowChart =
new Chart(ctx,{
type:"line",
data:{
labels:labels,
datasets:[
{
label:"Gas Flow",
data:flowData
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
    
    flowData.push(
    Number(d.GasFlow)
    );
    
    if(labels.length > 20){
    labels.shift();
    flowData.shift();
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

  } catch (err) {

    document.getElementById("update").innerText =
      err.message;

    console.error(err);

  }

}

loadData();

setInterval(loadData, 30000);