const API = "https://smart-prs-api.enrikofzm.workers.dev";

async function loadData() {

  const res = await fetch(API + "/data");
  const json = await res.json();

  const latest = json.data[0];

  if(latest){

    document.getElementById("pressure").textContent =
      latest.pressure;

    document.getElementById("flow").textContent =
      latest.flow;

    document.getElementById("status").textContent =
      latest.status;
  }

  document.getElementById("data").textContent =
    JSON.stringify(json.data, null, 2);
}

async function sendTest(){

  await fetch(API + "/test");

  loadData();
}

loadData();

setInterval(loadData,5000);