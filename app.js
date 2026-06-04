const API =
"https://smart-prs-api.enrikofzm.workers.dev";

async function loadData() {

  try {

    const res = await fetch(API);
    const json = await res.json();

    console.log(json);

    const d = json[0];

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