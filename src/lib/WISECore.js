import { connect } from "mqtt";

var mqtt_ssl_t = {
  tlstype: 0, //0:none, 1: cert, 2: pre-sharekey
  /*TLS*/
  strCaFile: null,
  strCaPath: null,
  strCertFile: null,
  strKeyFile: null,
  strCerPasswd: null,

  /*pre-shared-key*/
  strPsk: null,
  strIdentity: null,
  strCiphers: null,
};

var core_contex_t = {
  /*clinet info, user must define*/
  strClientID: null,
  strHostName: null,
  strMAC: null,
  mqtt_ssl: {},

  /*product info*/
  strSerialNum: null,
  strVersion: null,
  strType: null,
  strProduct: null,
  strManufacture: null,
  strTag: null,
  strParentID: null,

  /*account bind*/
  strLoginID: null,
  strLoginPW: null,

  /*client status*/
  Client: null,
  iStatus: 0,

  bInited: false,
  iErrorCode: 0,
  tick: 0,
  userdata: null,

  /*Callback function*/
  on_connect: null,
  on_lostconnect: null,
  on_disconnect: null,
  on_msg_recv: null,
  on_rename: null,
  on_update: null,
  on_server_reconnect: null,
  on_get_capability: null,
  on_start_report: null,
  on_stop_report: null,
  on_get_timetick: null,
  on_query_heartbeatrate: null,
  on_update_heartbeatrate: null,
};

var CommCmd = {
  wise_unknown_cmd: 0,
  wise_agentinfo_cmd: 21,
  //--------------------------Global command define(101--130)--------------------------------
  wise_update_cagent_req: 111,
  wise_update_cagent_rep: 112,
  wise_cagent_rename_req: 113,
  wise_cagent_rename_rep: 114,
  wise_cagent_osinfo_rep: 116,

  wise_server_control_req: 125,
  wise_server_control_rep: 126,

  wise_heartbeatrate_query_req: 127,
  wise_heartbeatrate_query_rep: 128,
  wise_heartbeatrate_update_req: 129,
  wise_heartbeatrate_update_rep: 130,

  wise_get_sensor_data_req: 523,
  wise_get_sensor_data_rep: 524,
  wise_set_sensor_data_req: 525,
  wise_set_sensor_data_rep: 526,

  wise_error_rep: 600,

  wise_get_capability_req: 2051,
  wise_get_capability_rep: 2052,
  wise_start_report_req: 2053,
  wise_start_report_rep: 2054,
  wise_report_data_rep: 2055,
  wise_stop_report_req: 2056,
  wise_stop_report_rep: 2057,
};

var strWillTopic = "/wisepaas/device/<clientid>/willmessage";	/*publish*/
var strInfoAckTopic = "/wisepaas/device/<clientid>/agentinfoack";	/*publish*/
var strDataReportTopic = "/wisepaas/device/<clientid>/devinfoack";	/*publish*/

var strActionAckTopic = "/wisepaas/<tag>/<clientid>/agentactionack";	/*publish '/wisepaas/<custom>/<devId>/agentactionack'*/
var strEventNotifyTopic = "/wisepaas/<tag>/<clientid>/eventnotifyack";	/*publish '/wisepaas/<custom>/<devId>/eventnotifyack'*/
var strActionReqTopic = "/wisepaas/<tag>/<clientid>/agentactionreq";	/*Subscribe '/wisepaas/<custom>/<devId>/agentactionreq'e*/
var strAgentCtrlTopic = "/wisepaas/device/+/agentctrlreq";	/*Subscribe*/
var strHeartbeatTopic = "/wisepaas/device/<clientid>/notifyack";	/*publish*/

var strAgentInfo = "{\"content\":{\"parentID\":\"<parentid>\",\"hostname\":\"<hostname>\",\"sn\":\"<sn>\",\"mac\":\"<mac>\",\"version\":\"<version>\",\"type\":\"<type>\",\"product\":\"<product>\",\"manufacture\":\"<manufacture>\",\"account\":\"<account>\",\"passwd\":\"<passwd>\",\"status\":<status>,\"tag\":\"<tag>\"},\"commCmd\":1,\"agentID\":\"<clientid>\",\"handlerName\":\"general\",\"sendTS\":{\"$date\":<ts>}}";
var strGeneralResponse_Session = "{\"agentID\":\"<clientid>\",\"commCmd\":<cmd>,\"handlerName\":\"general\",\"content\":{\"result\":\"<result>\"},\"sessionID\":\"<session>\",\"sendTS\":{\"$date\":<ts>}}";
var strGeneralResponse = "{\"agentID\":\"<clientid>\",\"commCmd\":<cmd>,\"handlerName\":\"general\",\"content\":{\"result\":\"<result>\"},\"sendTS\":{\"$date\":<ts>}}";
var strReportData = "{\"agentID\":\"<clientid>\",\"commCmd\":2055,\"handlerName\":\"general\",\"content\":<content>,\"sendTS\":{\"$date\":<ts>}}";
var strActResponse = "{\"agentID\":\"<clientid>\",\"commCmd\":<cmd>,\"handlerName\":\"<handler>\",\"content\":<content>,\"sendTS\":{\"$date\":<ts>}}";
var strHeartbeat = "{\"hb\":{\"devID\":\"<clientid>\"}}";
var strHeartbeatResponse_Session = "{\"agentID\":\"<clientid>\",\"commCmd\":128,\"handlerName\":\"general\",\"content\":{\"heartbeatrate\":<heartbeatrate>},\"sessionID\":\"<session>\",\"sendTS\":{\"$date\":<ts>}}";
var strHeartbeatResponse = "{\"agentID\":\"<clientid>\",\"commCmd\":128,\"handlerName\":\"general\",\"content\":{\"heartbeatrate\":<heartbeatrate>},\"sendTS\":{\"$date\":<ts>}}";

class WISECore {
  constructor() {
    this.core_contex = {};
    for (let k in core_contex_t) {
      this.core_contex[k] = core_contex_t[k];
    }
    for (let k in mqtt_ssl_t) {
      this.core_contex.mqtt_ssl[k] = mqtt_ssl_t[k];
    }
  }

  /**
     * core_initialize - initialize the WISECore.
     *
     * @param {String} strClientID - String
     * @param {String} strHostName - String
     * @param {String} strMAC - String
     * @param {Object} [userdata] - user defined data
     * @returns {Boolean} result
     * @api public
     * @example client.core_initialize('00000001-0000-0000-0000-000123456789', 'mysample', '000123456789');
     * @example client.core_initialize('00000001-0000-0000-0000-000123456789', 'mysample', '000123456789', '{"OS":"Windows","Arch":"x86"}');
     */
  core_initialize(strClientID, strHostName, strMAC, userdata) {
    console.log("");
    this.core_contex.strClientID = strClientID;
    this.core_contex.strHostName = strHostName;
    this.core_contex.strMAC = strMAC;
    this.core_contex.userdata = userdata;
    this.core_contex.bInited = true;
    return true;
  }

  /**
     * core_uninitialize - uninitialize the WISECore.
     *
     * @api public
     * @example client.core_uninitialize();
     */
  core_uninitialize() {
    if (this.core_contex.Client != null) {
      this.core_contex.Client.end();
      this.core_contex.Client = null;
    }
    for (let k in core_contex_t) {
      this.core_contex[k] = core_contex_t[k];
    }
    for (let k in mqtt_ssl_t) {
      this.core_contex.mqtt_ssl[k] = mqtt_ssl_t[k];
    }
  }

  /**
     * core_tag_set - Setup the product tag for server identification.
     *
     * @param {String} strTag - the product tag of cloud service.
     * @returns {Boolean} result
     * @api public
     * @example client.core_tag_set('RMM');
     */
  core_tag_set(strTag) {
    if (!this.core_contex.bInited) {
      return false;
    }
    this.core_contex.strTag = strTag;
    return true;
  }

  /**
     * core_product_info_set - Setup product information.
     *
     * @param {String} strSerialNum - serial number of the product
     * @param {String} strParentID - the ID of parent device (Gateway or Router)
     * @param {String} strVersion - the software version of the client
     * @param {String} strType - the type of the device
     * @param {String} strProduct - the product name
     * @param {String} strManufacture - the manufacturer name
     * @returns {Boolean} result
     * @api public
     * @example client.core_product_info_set('000123456789', null, '1.0.0', 'ipc', 'my_product', 'my_brand');
     */
  core_product_info_set(strSerialNum, strParentID, strVersion, strType, strProduct, strManufacture) {
    if (!this.core_contex.bInited) {
      return false;
    }
    this.core_contex.strSerialNum = strSerialNum;
    this.core_contex.strParentID = strParentID;
    this.core_contex.strVersion = strVersion;
    this.core_contex.strType = strType;
    this.core_contex.strProduct = strProduct;
    this.core_contex.strManufacture = strManufacture;
    return true;
  }

  /**
     * core_account_bind - Bind the client to an exist account on remote management service.
     *
     * @param {String} strLoginID - account ID of remote service
     * @param {String} strLoginPW - password of remote service
     * @returns {Boolean} result
     * @api public
     * @example client.core_account_bind('admin', 'admin');
     */
  core_account_bind(strLoginID, strLoginPW) {
    if (!this.core_contex.bInited) {
      return false;
    }
    this.core_contex.strLoginID = strLoginID;
    this.core_contex.strLoginPW = strLoginPW;
    return true;
  }

  /**
     * core_connection_callback_set - setup callback function to handle connection callback and received message
     *
     * @param {Function} [on_connect] - function(){}
     *    called when connected
     * @param {Function} [on_lostconnect] - function(){}
     *    called when lost connection.
     * @param {Function} [on_disconnect] - function(){}
     *    called when disconnect.
     * @param {Function} [on_msg_recv] - function(strTopic, strMessage, packet){}
     *    called when message received.
     *    {String} strTopic - the received packet topic
     *    {String} strMessage - the received packet message
     *    {Object} packet - the received packet.
     * @returns {Boolean} result
     * @api public
     * @example client.core_action_response(on_connect, on_lostconnect, on_disconnect, on_msg_recv);
     *    function on_connect() {};
     *    function on_lostconnect() {};
     *    function on_disconnect() {};
     *    function on_msg_recv(strTopic, strMessage, packet) {};
     */
  core_connection_callback_set(on_connect, on_lostconnect, on_disconnect, on_msg_recv) {
    if (!this.core_contex.bInited) {
      return false;
    }
    this.core_contex.on_connect = on_connect;
    this.core_contex.on_lostconnect = on_lostconnect;
    this.core_contex.on_disconnect = on_disconnect;
    this.core_contex.on_msg_recv = on_msg_recv;
    return true;
  }

  /**
     * core_action_callback_set - setup callback function to handle update or rename function.
     * @param {Function} [on_rename] - function(strName, iReplyID, strSessionID, strClientID, userdata){}
     *    called when received the rename action command
     *    {String} strName - new host name.
     *    {Number} iReplyID - the ID to reply the message
     *    {String} strSessionID - the session ID of query packet
     *    {String} strClientID - the Client ID to response the action.
     *    {Object} userdata - the user data attached in the WISECore.
     * @param {Function} [on_update] - function(strUserName, strPwd, iPort, strPath, strMD5, iReplyID, strSessionID, strClientID, userdata){}
     *    called when received the update action command
     *    {String} strUserName - the login name of remote file transfer server.
     *    {String} strPwd - the login password of remote file transfer server.
     *    {Number} iPort - the file transfer server listen port.
     *    {String} strPath - the related file path to download
     *    {String} strMD5 - md5 to check download file.
     *    {Number} iReplyID - the ID to reply the message
     *    {String} strSessionID - the session ID of query packet
     *    {String} strClientID - the Client ID to response the action.
     *    {Object} userdata - the user data attached in the WISECore.
     * @returns {Boolean} result
     * @api public
     * @example client.core_action_callback_set(on_rename, on_update);
     *    function on_rename(strName, iReplyID, strSessionID, strClientID, userdata){};
     *    function on_update(strUserName, strPwd, iPort, strPath, strMD5, iReplyID, strSessionID, strClientID, userdata){};
     */
  core_action_callback_set(on_rename, on_update) {
    if (!this.core_contex.bInited) {
      return false;
    }
    this.core_contex.on_rename = on_rename;
    this.core_contex.on_update = on_update;
    return true;
  }

  /**
     * core_server_reconnect_callback_set - setup callback function to handle server reconnect request from server.
     * @param {Function} [on_server_reconnect] - function(strClientID, userdata){}
     *    called when received the reconnect command
     *    {String} strClientID - the Client ID to response the action.
     *    {Object} userdata - the user data attached in the WISECore.
     * @returns {Boolean} result
     * @api public
     * @example client.core_server_reconnect_callback_set(on_server_reconnect);
     *    function on_server_reconnect(strClientID, userdata){}
     */
  core_server_reconnect_callback_set(on_server_reconnect) {
    if (!this.core_contex.bInited) {
      return false;
    }
    this.core_contex.on_server_reconnect = on_server_reconnect;
    return true;
  }

  /**
     * core_iot_callback_set - setup callback function to handle IoT Command.
     * @param {Function} [on_get_capability] - function(strMessage, strClientID, userdata){}
     *    called when received the Get IoT Capability command
     *    {String} strMessage - the received packet message
     *    {String} strClientID - the Client ID to response the action.
     *    {Object} userdata - the user data attached in the WISECore.
     * @param {Function} [on_start_report] - function(strMessage, strClientID, userdata){}
     *    called when received the start IoT report  command
     *    {String} strMessage - the received packet message
     *    {String} strClientID - the Client ID to response the action.
     *    {Object} userdata - the user data attached in the WISECore.
     * @param {Function} [on_stop_report] - function(strMessage, strClientID, userdata){}
     *    called when received the Stop IoT Report command
     *    {String} strMessage - the received packet message
     *    {String} strClientID - the Client ID to response the action.
     *    {Object} userdata - the user data attached in the WISECore.
     * @returns {Boolean} result
     * @api public
     * @example client.core_iot_callback_set(on_get_capability, on_start_report, on_stop_report);
     *    function on_get_capability(strMessage, strClientID, userdata){};
     *    function on_start_report(strMessage, strClientID, userdata){};
     *    function on_stop_report(strMessage, strClientID, userdata){};
     */
  core_iot_callback_set(on_get_capability, on_start_report, on_stop_report) {
    if (!this.core_contex.bInited) {
      return false;
    }
    this.core_contex.on_get_capability = on_get_capability;
    this.core_contex.on_start_report = on_start_report;
    this.core_contex.on_stop_report = on_stop_report;
    return true;
  }

  /**
     * core_time_tick_callback_set - setup callback function to retrieve current time stamp.
     * @param {Function} [on_get_timetick] - function(userdata){}
     *    called when need to retrieve current time stamp
     *    {Object} userdata - the user data attached in the WISECore.
     * @returns {Boolean} result
     * @api public
     * @example client.core_time_tick_callback_set(on_get_timetick);
     *    function on_get_timetick(userdata){ return new Date().getTime();}
     */
  core_time_tick_callback_set(on_get_timetick) {
    if (!this.core_contex.bInited) {
      return false;
    }
    this.core_contex.on_get_timetick = on_get_timetick;
    return true;
  }

  /**
     * core_heartbeat_callback_set - setup callback function to handle heartbeat command
     *
     * @param {Function} [on_query_heartbeatrate] - function(strSessionID, strClientID, userdata){}
     *    called when receive the heartbeat query
     *    {String} strSessionID - the session ID of query packet
     *    {String} strClientID - the Client ID to response the action.
     *    {Object} userdata - the user data attached in the WISECore.
     * @param {Function} [on_update_heartbeatrate] - function(iRate, strSessionID, strClientID, userdata){}
     *    called when receive the heartbeat update command
     *    {Number} iRate - new heartbeat rate
     *    {String} strSessionID - the session ID of query packet
     *    {String} strClientID - the Client ID to response the action.
     *    {Object} userdata - the user data attached in the WISECore.
     * @returns {Boolean} result
     * @api public
     * @example client.core_heartbeat_callback_set(on_query_heartbeatrate, on_update_heartbeatrate);
     *    function on_query_heartbeatrate(strSessionID, strClientID, userdata){ return client.core_heartbeatratequery_response(60, strSessionID, strClientID);}
     *    function on_update_heartbeatrate(iRate, strSessionID, strClientID, userdata){ return client.core_action_response(130, strSessionID, true, strClientID);}
     */
  core_heartbeat_callback_set(on_query_heartbeatrate, on_update_heartbeatrate) {
    if (!this.core_contex.bInited) {
      return false;
    }
    this.core_contex.on_query_heartbeatrate = on_query_heartbeatrate;
    this.core_contex.on_update_heartbeatrate = on_update_heartbeatrate;
    return true;
  }

  /**
   * core_action_response - publish response message of action command to specific topic.
   *
   * @param {Number} iCmdid - action reply ID
   * @param {String} strSessoinid - the packet session ID.
   * @param {Boolean} bSuccess - the action result.
   * @param {String} strClientid - the Client ID to response the query.
   * @returns {Boolean} result
   * @api public
   * @example client.core_action_response(123, '1234567980', true, '00000001-0000-0000-0000-000123456789');
   */
  core_action_response(iCmdid, strSessoinid, bSuccess, strClientid) {
    if (!this.core_contex.bInited) {
      return false;
    }
    if (!this.core_contex.Client) {
      return false;
    }
    let strtopic = strActionAckTopic.replace("<clientid>", strClientid).replace("<tag>", "device");
    let result = bSuccess ? "SUCCESS" : "FALSE";
    let timetick = 0;
    if (this.core_contex.on_get_timetick != null)
      timetick = this.core_contex.on_get_timetick();
    let strmsg;
    if (strSessoinid == null) {
      strmsg = strGeneralResponse.replace("<clientid>", strClientid)
        .replace("<cmd>", iCmdid)
        .replace("<result>", result)
        .replace("<ts>", timetick);
    }
    else {
      strmsg = strGeneralResponse_Session.replace("<clientid>", strClientid)
        .replace("<cmd>", iCmdid)
        .replace("<result>", result)
        .replace("<session>", strSessoinid)
        .replace("<ts>", timetick);
    }
    return this.core_contex.Client.publish(strtopic, strmsg);
  }

  /**
     * core_heartbeatratequery_response - publish response message of heartbeat query to specific topic.
     *
     * @param {Number} iHeartbeatRate - current heartbeat rate in sec.
     * @param {String} strSessoinid - the packet session ID for query.
     * @param {String} strClientid - the Client ID to response the query.
     * @returns {Boolean} result
     * @api public
     * @example client.core_heartbeatratequery_response(60, '1234567980', '00000001-0000-0000-0000-000123456789');
     */
  core_heartbeatratequery_response(iHeartbeatRate, strSessoinid, strClientid) {
    if (!this.core_contex.bInited) {
      return false;
    }
    if (!this.core_contex.Client) {
      return false;
    }
    let strtopic = strActionAckTopic.replace("<clientid>", strClientid).replace("<tag>", "device");
    let timetick = 0;
    if (this.core_contex.on_get_timetick != null)
      timetick = this.core_contex.on_get_timetick();
    let strmsg;
    if (strSessoinid == null) {
      strmsg = strHeartbeatResponse.replace("<clientid>", strClientid)
        .replace("<heartbeatrate>", iHeartbeatRate)
        .replace("<ts>", timetick);
    }
    else {
      strmsg = strHeartbeatResponse_Session.replace("<clientid>", strClientid)
        .replace("<heartbeatrate>", iHeartbeatRate)
        .replace("<session>", strSessoinid)
        .replace("<ts>", timetick);
    }
    return this.core_contex.Client.publish(strtopic, strmsg);
  }

  /**
     * core_tls_set - setup the pre-shared key for TLS connection.
     * Not verified!
     *
     * @param {String} strCaFile - file path of ca file
     * At least one of strCaFile or strCaPath must be provided to allow SSL support.
     * strCaFile is used to define the path to a file containing the PEM encoded CA certificates that are trusted.
     * @param {String} strCaPath - directory of ca file
     * At least one of strCaFile or strCaPath must be provided to allow SSL support.
     * strCaPath is used to define a directory that contains PEM encoded CA certificates that are trusted. For capath to work correctly, the certificates files must have ".pem" as the file ending and you must run "c_rehash <path to capath>" each time you add/remove a certificate.
     * @param {String} strCertFile - Path to the PEM encoded server certificate.
     * @param {String} strKeyFile - Path to the PEM encoded keyfile.
     * @param {String} strCerPasswd - Password for tls.
     * @returns {Boolean} result
     * @api public
     * @example client.core_tls_set('ca.crt', null, server.crt, server.key, 'maypass');
     */
  core_tls_set(strCaFile, strCaPath, strCertFile, strKeyFile, strCerPasswd) {
    if (!this.core_contex.bInited) {
      return false;
    }
    for (let k in mqtt_ssl_t) {
      this.core_contex.mqtt_ssl[k] = mqtt_ssl_t[k];
    }
    this.core_contex.mqtt_ssl.tlstype = 1;
    this.core_contex.mqtt_ssl.strCaFile = strCaFile;
    this.core_contex.mqtt_ssl.strCaPath = strCaPath;
    this.core_contex.mqtt_ssl.strCertFile = strCertFile;
    this.core_contex.mqtt_ssl.strKeyFile = strKeyFile;
    this.core_contex.mqtt_ssl.strCerPasswd = strCerPasswd;
    return true;
  }

  /**
     * core_tls_psk_set - setup the pre-shared key for TLS connection.
     * Not verified!
     *
     * @param {String} strPsk - ip or url of the broker
     * @param {String} strIdentity - broker listen port
     * @param {String} strCiphers - list of available PSK ciphers.
     * @returns {Boolean} result
     * @api public
     * @example client.core_tls_psk_set('123456', 'myidentify');
     * @example client.core_tls_psk_set('123456', 'myidentify', 'DEFAULT');
     */
  core_tls_psk_set(strPsk, strIdentity, strCiphers) {
    if (!this.core_contex.bInited) {
      return false;
    }
    for (let k in mqtt_ssl_t) {
      this.core_contex.mqtt_ssl[k] = mqtt_ssl_t[k];
    }
    this.core_contex.mqtt_ssl.tlstype = 2;
    this.core_contex.mqtt_ssl.strPsk = strPsk;
    this.core_contex.mqtt_ssl.strIdentity = strIdentity;
    this.core_contex.mqtt_ssl.strCiphers = strCiphers;
    return true;
  }

  /**
     * core_connect - connect to an MQTT broker.
     *
     * @param {String} strServerIP - ip or url of the broker
     * @param {Number}, iServerPort - broker listen port
     * @param {String} strConnID - ID for connect to broker
     * @param {String} strConnPW - password for connect to broker
     * @returns {Boolean} result
     * @api public
     * @example client.core_connect('127.0.0.1', 1883, 'admin', 'admin');
     */
  core_connect(strServerIP, iServerPort, strConnID, strConnPW) {
    let core_contex = this.core_contex;
    if (!this.core_contex.bInited) {
      return false;
    }
	
    this.core_contex.strServerIP = strServerIP;
    this.core_contex.iServerPort = iServerPort;
    this.core_contex.strConnID = strConnID;
    this.core_contex.strConnPW = strConnPW;
    if (this.core_contex.Client != null) {
      this.core_contex.Client.end(true);
      this.core_contex.Client = null;
    }
    let timetick = 0;
    if (this.core_contex.on_get_timetick != null)
      timetick = this.core_contex.on_get_timetick();
	
    let options = {
      host: strServerIP,
      port: iServerPort,
      username: strConnID,
      password: strConnPW,
      will: {
        topic: strWillTopic.replace("<clientid>", core_contex.strClientID),
        payload: GenAgentInfo(core_contex, timetick, 0),
      }
    };
    if (this.core_contex.mqtt_ssl.tlstype == 1) { /* To be verified */
      let fs = require("fs");
      let path = require("path");
      let KEY = fs.readFileSync(this.core_contex.mqtt_ssl.strKeyFile);
      let CERT = fs.readFileSync(this.core_contex.mqtt_ssl.strCertFile);
      let TRUSTED_CA_LIST = fs.readFileSync(this.core_contex.mqtt_ssl.strCaFile);
      options.key = KEY;
      options.cert = CERT;
      options.rejectUnauthorized = true;
      options.ca = TRUSTED_CA_LIST; // The CA list will be used to determine if server is authorized
    }
    else if (this.core_contex.mqtt_ssl.tlstype == 2) { /* To be verified */
      options.key = this.core_contex.mqtt_ssl.strPsk;
      options.identify = this.core_contex.mqtt_ssl.strIdentity;
      options.rejectUnauthorized = true;
    }
	
    this.core_contex.Client = connect(options);
    this.core_contex.Client.on("connect", function (connack) {
      On_Connect(core_contex);
    });
    this.core_contex.Client.on("reconnect", function () {
      On_Reconnect(core_contex);
    });
    this.core_contex.Client.on("close", function () {
      On_Disconnect(core_contex);
    });
    this.core_contex.Client.on("offline", function () {
      On_Disconnect(core_contex);
    });
    this.core_contex.Client.on("error", function () {
      On_Lostconnect(core_contex);
    });
    this.core_contex.Client.on("message", function (topic, payload, packet) {
      On_Recv(core_contex, topic, payload, packet);
    });
    return true;
  }

  /**
     * core_disconnect - close connection
     *
     * @param {Boolean} bForce - do not wait for all in-flight messages to be acked
     * @returns {Boolean} result
     * @api public
     * @example client.core_disconnect(true);
     */
  core_disconnect(bForce) {
    if (!this.core_contex.bInited) {
      return false;
    }
    if (this.core_contex.Client != null) {
      let timetick = 0;
      if (this.core_contex.on_get_timetick != null)
        timetick = this.core_contex.on_get_timetick();
      let msg = GenAgentInfo(this.core_contex, timetick, 0);
      let topic = strInfoAckTopic.replace("<clientid>", this.core_contex.strClientID);
      this.core_contex.Client.publish(topic, msg);
      this.core_contex.Client.end(bForce);
      this.core_contex.Client = null;
    }
    return true;
  }

  /**
     * core_device_register - publish agentinfo to specific topic to register on server.
     *
     * @returns {Boolean} result
     * @api public
     * @example client.core_device_register();
     */
  core_device_register() {
    if (!this.core_contex.bInited) {
      return false;
    }
    if (this.core_contex.Client == null) {
      return false;
    }
    let timetick = 0;
    if (this.core_contex.on_get_timetick != null)
      timetick = this.core_contex.on_get_timetick();
    this.core_contex.Client.subscribe([
      strActionReqTopic.replace("<tag>", this.core_contex.strTag)
        .replace("<clientid>", this.core_contex.strClientID),
      strActionReqTopic.replace("<tag>", "device")
        .replace("<clientid>", this.core_contex.strClientID),
      strAgentCtrlTopic
    ]);
    let msg = GenAgentInfo(this.core_contex, timetick, 1);
    let topic = strInfoAckTopic.replace("<clientid>", this.core_contex.strClientID);
    return this.core_contex.Client.publish(topic, msg);
  }

  /**
     * core_heartbeat_send - publish heartbeat package to specific topic to notify server the client is alive.
     *
     * @returns {Boolean} result
     * @api public
     * @example client.core_heartbeat_send();
     */
  core_heartbeat_send() {
    if (!this.core_contex.bInited) {
      return false;
    }
    if (this.core_contex.Client == null) {
      return false;
    }
    let msg = strHeartbeat.replace("<clientid>", this.core_contex.strClientID);
    let topic = strHeartbeatTopic.replace("<clientid>", this.core_contex.strClientID);
    return this.core_contex.Client.publish(topic, msg);
  }

  /**
     * core_publish - publish <message> to <topic>
     *
     * @param {String} strTopic - topic to publish to
     * @param {String, strPkt} message - message to publish
     * @param {Boolean} bRetain - whether or not to retain the message
     * @param {Number} iQos - qos level to publish on
     * @param {Function} [callback] - function(err){}
     *    called when publish succeeds or fails
     * @returns {Boolean} result
     * @api public
     * @example client.core_publish('topic', 'message');
     * @example client.core_publish('topic', 'message', false, 1, console.log});
     */
  core_publish(strTopic, strPkt, bRetain, iQos, callback) {
    if (!this.core_contex.bInited) {
      return false;
    }
    if (this.core_contex.Client == null) {
      return false;
    }
    let option = {
      qos: iQos,
      retain: bRetain,
    };
    this.core_contex.Client.publish(strTopic, strPkt, option, callback);
    return true;
  }
  
  /**
     * core_subscribe - subscribe to <topic>
     *
     * @param {String} strTopic - topic to subscribe to
     * @param {Number} qos - subscribe qos level
     * @param {Function} [callback] - function(err, granted){} where:
     *    {Error} err - subscription error (none at the moment!)
     *    {Array} granted - array of {topic: 't', qos: 0}
     * @returns {Boolean} result
     * @api public
     * @example client.subscribe('topic', 1);
     * @example client.subscribe('topic', 0, console.log);
      */
  core_subscribe(strTopic, iQos, callback) {
    if (!this.core_contex.bInited) {
      return false;
    }
    if (this.core_contex.Client == null) {
      return false;
    }
    let option = {
      qos: iQos,
    };
    return this.core_contex.Client.subscribe(strTopic, option, callback);
  }
}

function GenAgentInfo(core_context, timetick, status) {
  return strAgentInfo.replace("<parentid>", core_context.strParentID == null ? "" : core_context.strParentID)
    .replace("<hostname>", core_context.strHostName == null ? "" : core_context.strHostName)
    .replace("<sn>", core_context.strSerialNum == null ? "" : core_context.strSerialNum)
    .replace("<mac>", core_context.strMAC == null ? "" : core_context.strMAC)
    .replace("<version>", core_context.strVersion == null ? "" : core_context.strVersion)
    .replace("<type>", core_context.strType == null ? "" : core_context.strType)
    .replace("<product>", core_context.strProduct == null ? "" : core_context.strProduct)
    .replace("<manufacture>", core_context.strManufacture == null ? "" : core_context.strManufacture)
    .replace("<account>", core_context.strLoginID == null ? "" : core_context.strLoginID)
    .replace("<passwd>", core_context.strLoginPW == null ? "" : core_context.strLoginPW)
    .replace("<status>", status)
    .replace("<tag>", core_context.strTag == null ? "" : core_context.strTag)
    .replace("<clientid>", core_context.strClientID)
    .replace("<ts>", timetick);
}

function On_Connect(core_contex) {
  if (core_contex.on_connect != null) {
    core_contex.on_connect();
  }
}

function On_Reconnect(core_contex) {
  // if(core_contex.on_connect != null) {
  // 	core_contex.on_connect();
  // }
}

function On_Disconnect(core_contex) {
  if (core_contex.on_disconnect != null) {
    core_contex.on_disconnect();
  }
}

function On_Lostconnect(core_contex) {
  if (core_contex.on_lostconnect != null) {
    core_contex.on_lostconnect();
  }
}

function On_Recv(core_contex, topic, payload, packet) {
  let bHandled = false;
  if (topic.indexOf("/wisepaas/") < 0) {
    return call_external_msg_recv(core_contex, topic, payload, packet);
  }

  let root = JSON.parse(payload);
  console.log(JSON.stringify(root));
  //if (root['agentID'] != core_contex.strClientID) {
  if (topic.indexOf(core_contex.strClientID) < 0) {
    return call_external_msg_recv(core_contex, topic, payload, packet);
  }

  if (root["handlerName"] != "general") {
    return call_external_msg_recv(core_contex, topic, payload, packet);
  }

  switch (root["commCmd"]) {
  case CommCmd.wise_update_cagent_req:
    return On_Update(core_contex, root);
	
  case CommCmd.wise_cagent_rename_req:
    return On_Rename(core_contex, root);
	
  case CommCmd.wise_server_control_req:
  {
    let iStatusCode = root["content"]["response"]["statuscode"];
    if(iStatusCode == 4){
      return On_ServerReconnect(core_contex, root);
    }
    else {
      return call_external_msg_recv(core_contex, topic, payload, packet);
    }
  }

  case CommCmd.wise_heartbeatrate_query_req:
    if(core_contex.on_query_heartbeatrate != null) {
      var strSessionID = root["sessionID"];
      core_contex.on_query_heartbeatrate(strSessionID, core_contex.strClientID, core_contex.userdata);
    }
    break;
	
  case CommCmd.wise_heartbeatrate_update_req:
    if(core_contex.on_update_heartbeatrate != null) {
      let strSessionID = root["sessionID"];
      let iRate = root["heartbeatrate"];
      core_contex.on_update_heartbeatrate(iRate, strSessionID, core_contex.strClientID, core_contex.userdata);
    }
    break;

  case CommCmd.wise_get_capability_req:
    if(core_contex.on_get_capability != null) {
      core_contex.on_get_capability(payload, core_contex.strClientID, core_contex.userdata);
    }
    break;

  case CommCmd.wise_start_report_req:
    if(core_contex.on_start_report != null) {
      core_contex.on_start_report(payload, core_contex.strClientID, core_contex.userdata);
    }
    break;
		
  case CommCmd.wise_stop_report_req:
    if(core_contex.on_stop_report != null) {
      core_contex.on_stop_report(payload, core_contex.strClientID, core_contex.userdata);
    }
    break;

  default:
    return call_external_msg_recv(core_contex, topic, payload, packet);
  }
}

function On_Update(core_contex, root) {
  let strUserName = root["content"]["userName"];
  let strPwd = root["content"]["pwd"];
  let strSessionID = root["sessionID"];
  let iPort = root["content"]["port"];
  let strPath = root["content"]["path"];
  let strMD5 = root["content"]["md5"];

  if (core_contex.on_update != null) {
    return core_contex.on_update(strUserName, strPwd, iPort, strPath, strMD5, CommCmd.wise_update_cagent_rep, strSessionID, core_contex.strClientID, core_contex.userdata);
  }
}

function On_Rename(core_contex, root) {
  let strName = root["content"]["devName"];
  let strSessionID = root["sessionID"];
  if (core_contex.on_rename != null) {
    return core_contex.on_rename(strName, CommCmd.wise_cagent_rename_rep, strSessionID, core_contex.strClientID, core_contex.userdata);
  }
}

function On_ServerReconnect(core_contex, root) {
  if (core_contex.on_server_reconnect != null) {
    return core_contex.on_server_reconnect(core_contex.strClientID, core_contex.userdata);
  }
}

function call_external_msg_recv(core_contex, topic, payload, packet) {
  if (core_contex.on_msg_recv != null) {
    return core_contex.on_msg_recv(topic, payload, packet);
  }
}

function On_Query_HeartbeatRate() {}

export default WISECore;