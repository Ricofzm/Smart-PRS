const API =
"https://smart-prs-api.enrikofzm.workers.dev";

async function loadData(){

try{

const res = await fetch(API);

console.log("STATUS", res.status);

const json = await res.json();

console.log("DATA", json);

const d = json[0];

document.getElementById("inlet").innerText = d.PressureInlet;

}catch(err){

console.error(err);

document.getElementById("update").innerText =
"ERROR : " + err.message;

}

}

loadData();