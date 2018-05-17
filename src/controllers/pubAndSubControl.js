import WISECore from "../lib/WISECore";

var vcapServices = JSON.parse(process.env.VCAP_SERVICES);
var iothubAcc = vcapServices["p-rabbitmq"][0].credentials.protocols.mqtt.username;
var iothubPw = vcapServices["p-rabbitmq"][0].credentials.protocols.mqtt.password;
var iothubUrl = vcapServices["p-rabbitmq"][0].credentials.protocols.mqtt.uri;
var iothubHost = vcapServices["p-rabbitmq"][0].credentials.protocols.mqtt.host;
var iothubPort = vcapServices["p-rabbitmq"][0].credentials.protocols.mqtt.port;
//console.log("----------------------------");
//console.log(vcapServices["p-rabbitmq"][0].credentials.protocols.mqtt);
//console.log("----------------------------");

// data format reference at
// https://portal-technical.wise-paas.com/doc/document-portal.html#PaasAgent-2
var strCustomId = "0d0e0m0o0app";
var strClientId = "00000005-0000-NB07-0410-" + strCustomId;
var strHostName = "demo-app-js";
var strProductTag = "demoAppJs";

var clientInstance;
var iHeartbeat = 60; // 60 sec.
var pHeartbeatHandle = 0; //the Handle to clear heartbeat interval.
var pReportHandle = 0; //the Handle to clear report data interval.

function getCurrTime() {
  return new Date().getTime();
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

// function to handle connect event
function On_Connect() {
  clientInstance.core_device_register();
  clientInstance.core_heartbeat_send();

  if(pHeartbeatHandle != 0) {
    clearInterval(pHeartbeatHandle);
    pHeartbeatHandle = 0;
  }
  pHeartbeatHandle = setInterval(function () {
    clientInstance.core_heartbeat_send();
  }, iHeartbeat*1000);

  pubSubTest();
  console.log("----------------------------");
  console.log("Connected to IoT hub!");
  console.log("----------------------------");
}

// function to demonstrate how to use publish and subscribe.
function pubSubTest() {
  clientInstance.core_subscribe("/wisepaas/test/", 0);

  setTimeout(() => {
    console.log("Sending test message...");
    clientInstance.core_publish("/wisepaas/test/", "{\"Test\":{\"test1\":246,\"test2\":true}}");
  }, 5000);
}

// function to handle lostconnect event
function On_Lostconnect() {
  console.log("Lost connection...");
  clearInterval(pHeartbeatHandle);
  pHeartbeatHandle = 0;
}

// function to handle disconnect event
function On_Disconnect() {
  console.log("Disconnecting...");
  clearInterval(pHeartbeatHandle);
  pHeartbeatHandle = 0;
}

// function to handle Received message
function On_MsgRecv(strTopic, strMsg, packet) {
  console.log([strTopic, strMsg].join(": "));
}

// function to handle Update event
function On_Update(strUserName, strPwd, iPort, strPath, strMD5, iReplyID, strSessionID, strClientID, userdata) {
  console.log("Got update from: ftp://" + strUserName + ":" + strPwd + "@" + iothubHost + "/" + strPath + " with md5: " + strMD5);
  clientInstance.core_action_response(iReplyID, strSessionID, true, strClientID);
}

// function to handle Rename event
function On_Rename(strName, iReplyID, strSessionID, strClientID, userdata) {
  strHostName = strName;
  console.log("Rename to" + strHostName);
  clientInstance.core_action_response(iReplyID, strSessionID, true, strClientID);
}

// function to handle Server Reconnect event
function On_Server_Reconnect(strClientID, userdata) {
  console.log("Reconnecting to IoT hub...");
  clientInstance.core_disconnect(false);
  setTimeout(() => {
    clientInstance.core_connect(iothubHost, iothubPort, iothubAcc, iothubPw);
  }, 5000);
}

// function to handle GetCapability event
function On_GetCapability(strMessage, strClientID, userdata) {
  let ts = getCurrTime();
  return sendCapability(ts);
}

// function to handle StartReport event
function On_StartReport(strMessage, strClientID, userdata) {
  let root = JSON.parse(strMessage);
  let interval = root["content"]["autoUploadIntervalSec"];
  if (pReportHandle != 0) {
    clearInterval(pReportHandle);
    pReportHandle = 0;
  }
  let ts = getCurrTime();
  sendSensorData(ts);
  pReportHandle = setInterval(function () {
    let ts = getCurrTime();
    sendSensorData(ts);
  }, interval * 1000);
}

// function to handle StopReport event
function On_StopReport(strMessage, strClientID, userdata) {
  clearInterval(pReportHandle);
  pReportHandle = 0;
}

// send capability to describe supported sensor data
function sendCapability(ts) {
  let data1 = getRandomInt(5, 10);
  let data2 = getRandomInt(5, 10);
  let data3 = getRandomInt(5, 10);

  let root = { "agentID": strClientId, "commCmd": 2055, "handlerName": "general", "content": { "opTS": { "$date": ts }, "MySensor": { "SensorGroup": { "bn": "SensorGroup", "e": [{ "n": "data1", "v": data1 }, { "n": "data2", "v": data2 }, { "n": "data3", "v": data3 }] } } }, "sendTS": { "$date": ts } };
  let msg = JSON.stringify(root);
  let topic = "/wisepaas/" + strProductTag + "/" + strClientId + "/agentactionack";
  clientInstance.core_publish(topic, msg);
}

// send report data
function sendSensorData(ts) {
  let data1 = getRandomInt(5, 10);
  let data2 = getRandomInt(5, 10);
  let data3 = getRandomInt(5, 10);

  let root = { "agentID": strClientId, "commCmd": 2055, "handlerName": "general", "content": { "opTS": { "$date": ts }, "MySensor": { "SensorGroup": { "bn": "SensorGroup", "e": [{ "n": "data1", "v": data1 }, { "n": "data2", "v": data2 }, { "n": "data3", "v": data3 }] } } }, "sendTS": { "$date": ts } };
  let msg = JSON.stringify(root);
  let topic = "/wisepaas/device/" + strClientId + "/devinfoack";
  clientInstance.core_publish(topic, msg);
}

function On_Query_HeartbeatRate(strSessionID, strClientID, userdata) {
  return clientInstance.core_heartbeatratequery_response(iHeartbeat, strSessionID, strClientID);
}

function On_Update_HeartbeatRate(iRate, strSessionID, strClientID, userdata) {
  iHeartbeat = iRate;
  if(pHeartbeatHandle != 0) {
    clearInterval(pHeartbeatHandle);
    pHeartbeatHandle = 0;
  }
  pHeartbeatHandle = setInterval(function () {
    clientInstance.core_heartbeat_send();
  }, iHeartbeat*1000);
  return clientInstance.core_action_response(130, strSessionID, true, strClientID);
}

export function GetAgent() {
  if (typeof(clientInstance) === "undefined") {
    let client = new WISECore();
    client.core_initialize(strClientId, strHostName, strCustomId, null);
    client.core_tag_set(strProductTag);
    client.core_product_info_set(strCustomId, null /*no parent*/, "0.1.0", "App", "demo-app-js", "Advantech");
    client.core_time_tick_callback_set(getCurrTime);
    client.core_connection_callback_set(On_Connect, On_Lostconnect, On_Disconnect, On_MsgRecv);
    client.core_action_callback_set(On_Rename, On_Update);
    client.core_server_reconnect_callback_set(On_Server_Reconnect);
    client.core_iot_callback_set(On_GetCapability, On_StartReport, On_StopReport);
    client.core_heartbeat_callback_set(On_Query_HeartbeatRate, On_Update_HeartbeatRate);
    if (client.core_connect(iothubHost, iothubPort, iothubAcc, iothubPw)) {
      clientInstance = client;
    }
    else {
      console.log("----------------------------");
      console.log("Cannot connect to IoT hub!");
      console.log("----------------------------");
    }
  }
}