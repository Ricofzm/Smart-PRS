const API = "https://smart-prs-api.enrikofzm.workers.dev";

async function loadData() {
  const res = await fetch(API + "/data");
  const json = await res.json();

  document.getElementById("data").textContent =
    JSON.stringify(json.data, null, 2);
}

async function sendTest() {
  await fetch(API + "/test");
  loadData();
}

loadData();