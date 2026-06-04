const API = "https://smart-prs-api.enrikofzm.workers.dev";

async function loadData() {
  const res = await fetch(API + "/data");
  const json = await res.json();

  document.getElementById("data").innerText =
    JSON.stringify(json.data, null, 2);
}

async function sendTest() {
  await fetch(API + "/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pressure: Math.random() * 100,
      flow: Math.random() * 50,
      status: "NORMAL"
    })
  });

  loadData();
}

loadData();
setInterval(loadData, 3000);