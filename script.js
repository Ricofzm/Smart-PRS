const API_URL = "https://smart-prs-api.enrikofzm.workers.dev";

// cek status API
async function checkStatus() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();

    document.getElementById("status").innerText =
      "🟢 Online - " + data.message;

  } catch (err) {
    document.getElementById("status").innerText =
      "🔴 Offline / Error";
  }
}

// tombol test API
async function testAPI() {
  document.getElementById("response").innerText = "Loading...";

  try {
    const res = await fetch(API_URL);
    const data = await res.json();

    document.getElementById("response").innerText =
      JSON.stringify(data, null, 2);

  } catch (err) {
    document.getElementById("response").innerText =
      "Error connect API";
  }
}

// simulasi realtime data
function loadFakeData() {
  const sample = {
    pressure: (Math.random() * 100).toFixed(2),
    flow: (Math.random() * 50).toFixed(2),
    status: "NORMAL",
    time: new Date().toLocaleTimeString()
  };

  document.getElementById("data").innerText =
    JSON.stringify(sample, null, 2);
}

// init
checkStatus();
loadFakeData();
setInterval(loadFakeData, 3000);
setInterval(checkStatus, 5000);