// ⚙️ [CONFIG] นำ ID ของ Google Sheet มาวาง
const SPREADSHEET_ID = "16x2FW6xcvZiSAnPVh6f-uQh61g6ABKjfCB4K2FRB1P4"; 
const LINE_ACCESS_TOKEN = 'cnp7+ZNgiMc8HnnR4nhj+o3xvB2etsJEpN9W2iFi7O6ISYBppkkDydgq5NRcmQt3Bxx4GOfa6h+pkeX+zGFkkknWg7j1y9/OzXjrM8OWEDJjBcBuDp9ajnxUq0Ghu/bychoxFHpkdLdzuVvVSkqE5gdB04t89/1O/w1cDnyilFU=';
// ⚙️ ลิงก์ Web App URL 
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwLuqh2ivMXanbpRRbFfhMeOElAFgyrWBkFOthPZzCTjiI0gWdy7rDXTiuYlpj2Lzyb/exec";

function getSS() {
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== "") { return SpreadsheetApp.openById(SPREADSHEET_ID.trim()); }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("ไม่สามารถเชื่อมต่อไฟล์ Google Sheet ได้");
  return ss;
}

function createResponse(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ==========================================
// ส่วนที่ 1: ระบบ Admin / ผู้ป่วย / แชท / นัดหมาย (คงเดิม)
// ==========================================
function handleAdminActions(type, params, e) {
  var ss = getSS();
  if (type === 'checkAdmin') {
      var adminSheet = ss.getSheetByName("admin");
      if (!adminSheet) return createResponse({error: "ไม่พบชีตชื่อ admin"});
      var data = adminSheet.getDataRange().getValues();
      var userId = params.line_id || params.lineId;
      var isAdmin = false;
      for (var i = data.length - 1; i >= 1; i--) {
          if (data[i][1] && String(data[i][1]).trim() === String(userId).trim()) {
              if (data[i][3] && String(data[i][3]).trim().toLowerCase() === 'active') isAdmin = true;
              break;
          }
      }
      return createResponse({ isAdmin: isAdmin });
  }

  if (type === "registerAdmin") {
    var lineId = params.line_id || params.lineId;
    if (!lineId) return createResponse({ success: false, message: "ไม่พบ line_id ในคำขอ" });
    var adminSheet = ss.getSheetByName("admin"); 
    if (!adminSheet) return createResponse({error: "ไม่พบชีตชื่อ admin"});
    var data = adminSheet.getDataRange().getValues();
    var existingIndex = -1;
    for (var i = data.length - 1; i >= 1; i--) {
      if (data[i][1] && String(data[i][1]).trim() === String(lineId).trim()) { existingIndex = i; break; }
    }
    if (existingIndex !== -1) {
      adminSheet.getRange(existingIndex + 1, 4).setValue("active");     
      return createResponse({ success: true, message: "เปิดสิทธิ์เป็น Active ให้เรียบร้อยแล้ว" });
    } else {
      adminSheet.appendRow([new Date(), lineId, params.line_name || params.lineName || "", "active"]);
      return createResponse({ success: true, message: "เพิ่มสิทธิ์ Admin ใหม่เรียบร้อยแล้ว" });
    }
  }

  if (type === "getAdmins") {
    var adminSheet = ss.getSheetByName("admin");
    if (!adminSheet) return createResponse({error: "ไม่พบชีตชื่อ admin"});
    var data = adminSheet.getDataRange().getValues();
    var adminList = [];
    for (var i = 1; i < data.length; i++) {
      if (data[i][1]) adminList.push({ line_id: data[i][1].toString(), line_name: data[i][2].toString() });
    }
    return createResponse(adminList);
  }

  if (type === "deleteAdmin") {
    var lineIdToDelete = params.line_id || params.lineId;
    var adminSheet = ss.getSheetByName("admin");
    var data = adminSheet.getDataRange().getValues();
    var success = false;
    for (var i = data.length - 1; i >= 1; i--) {
      if (data[i][1] && data[i][1].toString() === lineIdToDelete) {
        adminSheet.getRange(i + 1, 1).setValue(new Date());
        adminSheet.getRange(i + 1, 4).setValue('revoked'); 
        success = true;
      }
    }
    return createResponse({ success: success });
  }
  return null; 
}

function handleChatActions(actionType, params) {
  var ss = getSS();
  if (actionType === 'saveChat') {
    var sheet = ss.getSheetByName('chatlog');
    var userSheet = ss.getSheetByName('users');
    var status = (params.sender === 'admin') ? 'read' : 'unread';
    sheet.appendRow([new Date(), params.line_id, params.line_name, params.message, params.sender, status]);
    
    var users = userSheet.getDataRange().getValues();
    var exists = false;
    for (var i = 1; i < users.length; i++) {
      if (String(users[i][0]).trim() == String(params.line_id).trim()) { exists = true; break; }
    }
    if (!exists) userSheet.appendRow([params.line_id, params.line_name]);
    return createResponse({status: "success"});
  }

  if (actionType === 'markAsRead') {
    var sheet = ss.getSheetByName('chatlog');
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][1] == params.line_id && data[i][5] == 'unread') {
        sheet.getRange(i + 1, 6).setValue('read');
      }
    }
    return createResponse({status: "success"});
  }
  
  if (actionType === 'getChatLogs') {
    return createResponse(ss.getSheetByName('chatlog').getDataRange().getValues());
  }
  return null;
}

function checkAdminPermission(line_id) {
  var data = getSS().getSheetByName('admin').getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]).trim() === String(line_id).trim() && data[i][3] === 'active') return true;
  }
  return false;
}

function getAppointments(lineId) { 
  var data = getSS().getSheetByName('appointments').getDataRange().getValues();
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var isMatch = lineId ? (data[i][1] === lineId) : true;
    if (isMatch && (data[i][1] || data[i][2])) { 
      result.push({ row: i + 1, update: data[i][0], line_id: data[i][1], line_name: data[i][2], app_date: data[i][3], status: data[i][4] });
    }
  }
  return createResponse(result);
}

function addAppointment(params) {
  getSS().getSheetByName('appointments').appendRow([new Date(), params.line_id, params.line_name, params.appointment_date, "confirmed"]);
  return createResponse({status: "success"});
}

function deleteAppointment(params) {
  getSS().getSheetByName('appointments').deleteRow(parseInt(params.row));
  return createResponse({status: "success"});
}

function updateAppointment(params) {
  var sheet = getSS().getSheetByName('appointments');
  var row = parseInt(params.row);
  if (!row || isNaN(row)) return createResponse({status: "error", message: "Invalid row"});
  sheet.getRange(row, 1).setValue(new Date()); 
  sheet.getRange(row, 4).setValue(new Date(params.new_date)); 
  return createResponse({status: "success"});
}

function getUsersForAppointment() {
  var data = getSS().getSheetByName('pretest').getDataRange().getValues();
  var usersMap = {}; 
  for (var i = 1; i < data.length; i++) {
    var line_id = String(data[i][1]).trim(); 
    var line_name = String(data[i][2]).trim(); 
    if (line_id && !usersMap[line_id]) usersMap[line_id] = line_name;
  }
  var uniqueUsers = [];
  for (var id in usersMap) { uniqueUsers.push({ line_id: id, line_name: usersMap[id] }); }
  return createResponse(uniqueUsers);
}

function addBulkAppointments(params) {
  var sheet = getSS().getSheetByName('appointments');
  var patients = JSON.parse(params.patients); 
  var date = params.appointment_date;
  patients.forEach(function(p) { sheet.appendRow([new Date(), p.id, p.name, date, "confirmed"]); });
  return createResponse({status: "success", count: patients.length});
}

function sendAppointmentReminders() {
  var data = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('appointments').getDataRange().getValues();
  var now = new Date(); 
  for (var i = 1; i < data.length; i++) {
    var lineId = data[i][1];
    var appDateRaw = data[i][3]; 
    var status = data[i][4];     
    if (!lineId || !appDateRaw || status !== 'confirmed') continue;
    
    var appDate = new Date(appDateRaw);
    var diffMinutes = Math.floor((appDate.getTime() - now.getTime()) / (1000 * 60)); 
    var dateTh = appDate.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    var timeTh = appDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    
    if (diffMinutes > 1435 && diffMinutes <= 1440) {
      pushMessage(lineId, "⏳ แจ้งเตือน: พรุ่งนี้คุณมีนัดหมาย\n\n📅 วันที่: " + dateTh + "\n⏰ เวลา: " + timeTh + " น.\n\nอย่าลืมเตรียมตัวให้พร้อมนะค่ะ");
    } else if (diffMinutes > -5 && diffMinutes <= 0) {
      pushMessage(lineId, "🚨 แจ้งเตือน: ถึงเวลานัดหมายของคุณแล้ว!\n\n📅 วันที่: " + dateTh + "\n⏰ เวลา: " + timeTh + " น.\n\nกรุณาติดต่อเจ้าหน้าที่ได้เลยค่ะ");
    }
  }
}

// ==========================================
// ส่วนที่ 2: ระบบจัดการ Web/Line OA Requests
// ==========================================
function doGet(e) {
  if (e.parameter && e.parameter.action === 'checkAuth') {
    return ContentService.createTextOutput(JSON.stringify({authorized: checkAdminPermission(e.parameter.id)})).setMimeType(ContentService.MimeType.JSON);
  }
  
  try {
    var params = e.parameter || {};
    var ss = getSS();
    var type = String(params.type || params.action || "").trim();

    if (type === 'uploadMed') {
      var template = HtmlService.createTemplateFromFile('upload_med');
      template.row = params.row;
      template.lineId = params.lineId;
      template.lineName = params.lineName;
      template.deductAmount = params.deduct;
      // เพิ่ม 3 บรรทัดนี้เพื่อให้หน้าเว็บดึงชื่อยาไปโชว์ได้
      template.medType = params.medType || "";
      template.meal = params.meal || "";
      template.phaseText = params.phaseText || "";
      
      return template.evaluate()
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setTitle('ยืนยันการทานยา');
    }

    // ใน doPost ให้เพิ่มบรรทัดนี้ในส่วนของ if/else หรือ switch case ของ action
    if (params.action === 'getMedicineList') {
      return createResponse(getMedicineList()); // ส่งรายชื่อยาไปที่หน้าเว็บ
    }

    if (!type && (params.t || params.line_id)) type = "registerAdmin";
    if (type === 'getPatients' || type === 'getUsers' || type === 'getUsersForAppointment') return getUsersForAppointment(); 
    if (type === 'getAppointments') return getAppointments(params.lineId); 

    // --- เพื่อรองรับการดึงข้อมูลยาคงเหลือ ---
    if (type === 'getMedStock') {
      return ContentService.createTextOutput(JSON.stringify(getMedStock(params.line_id))).setMimeType(ContentService.MimeType.JSON);
    }

    var adminResponse = handleAdminActions(type, params, e); if (adminResponse !== null) return adminResponse;
    var chatResponse = handleChatActions(type, params); if (chatResponse !== null) return chatResponse;

    if (type === 'getHistoryTable' || type === 'getGraphData') {
       var targetLineId = params.line_id || params.lineId;
       var data = ss.getSheetByName('bloodsugar').getDataRange().getValues();
       if (data.length <= 1) return createResponse([]);
       var resultList = [];
       for (var i = 1; i < data.length; i++) {
         if (String(data[i][1]).trim() === String(targetLineId).trim()) {
           var rawDate = data[i][0];
           var displayDate = rawDate instanceof Date ? Utilities.formatDate(rawDate, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm") : String(rawDate);
           if (type === 'getHistoryTable') {
              var isoDate = rawDate instanceof Date ? Utilities.formatDate(rawDate, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm") : String(rawDate);
              resultList.push({ row: i + 1, dateTime: displayDate, isoDate: isoDate, name: data[i][2], bloodsugar: data[i][3] });
           } else {
              var sugarVal = parseFloat(data[i][3]);
              if (!isNaN(sugarVal)) resultList.push({ date: displayDate, value: sugarVal, timeOrder: rawDate instanceof Date ? rawDate.getTime() : i });
           }
         }
       }
       if (type === 'getGraphData') {
         resultList.sort(function(a, b) { return a.timeOrder - b.timeOrder; });
         return createResponse(resultList.map(function(item) { return { date: item.date, value: item.value }; }));
       }
       return createResponse(resultList);
    }

    return createResponse({error: "Action not match", params: e.parameter});
  } catch (error) { return createResponse({error: error.toString()}); }
}

function doPost(e) {
  try {
    var params = e.parameter || {};
    if (e.postData && e.postData.contents) {
      try {
        var jsonBody = JSON.parse(e.postData.contents);
        // เช็ค Webhook ของ LINE (ส่วนนี้เก็บไว้)
        if (jsonBody.events && jsonBody.events.length > 0) {
          var event = jsonBody.events[0];
          if (event.type === 'postback' && event.postback.data === 'action=snooze') {
             replyMessage(event.replyToken, "รับทราบค่ะ ระบบจะทำการแจ้งเตือนซ้ำอีกครั้งใน 10 นาทีนะคะ ⏳");
             return ContentService.createTextOutput("OK");
          }
        }
        // แปลง JSON เป็น params เพื่อให้ฟังก์ชันต่างๆ ใช้งานได้
        for (var key in jsonBody) { params[key] = jsonBody[key]; }
      } catch(err) {}
    }

    var actionType = params.action || params.type;

    // --- ส่วน Routing (เรียกฟังก์ชันทำงานตาม action) ---
    if (actionType === 'confirmMed') return createResponse(confirmMedFromWeb(params)); 
    if (actionType === 'saveMedicine') return saveMedicineData(params); // <--- ตรงนี้แหละครับที่เรียกใช้งาน
    if (actionType === 'saveMedicineDaily') return saveMedicineData(params); // เผื่อกรณีใช้ชื่อ action ต่างกัน
    if (actionType === 'addBulkAppointments') return addBulkAppointments(params);
    if (actionType === 'deleteAppointment') return deleteAppointment(params);
    if (actionType === 'editAppointment') return updateAppointment(params);

    // --- ส่วนจัดการ Admin/Chat ---
    var adminResponse = handleAdminActions(actionType, params, e); if (adminResponse !== null) return adminResponse;
    var chatResponse = handleChatActions(actionType, params); if (chatResponse !== null) return chatResponse;

    // --- ส่วนจัดการ Blood Sugar (ถ้ามี action อื่นๆ) ---
    var sheet = getSS().getSheetByName("bloodsugar");
    if (actionType === 'update' || actionType === 'delete') {
      var targetRow = parseInt(params.row);
      if (String(sheet.getRange(targetRow, 2).getValue()).trim() !== String(params.line_id).trim()) return createResponse({status: "error", message: "ไม่มีสิทธิ์จัดการข้อมูลแถวนี้"});
      if (actionType === 'update') {
        if (params.new_date) sheet.getRange(targetRow, 1).setValue(new Date(params.new_date));
        if (params.new_bloodsugar) sheet.getRange(targetRow, 4).setValue(parseFloat(params.new_bloodsugar));
      } else { sheet.deleteRow(targetRow); }
      return createResponse({status: "success"});
    }
    if(actionType === 'update_bloodsugar') { // ควรเช็ค action name ให้ชัดเจน
      sheet.appendRow([params.custom_date ? new Date(params.custom_date) : new Date(), params.line_id || "", params.line_name || "", params.bloodsugar || ""]);
      return createResponse({status: "success"});
    }
    
    return createResponse({status: "error", message: "Action not found"});

  } catch (error) { return createResponse({status: "error", message: error.toString()}); }
}


// ==========================================
// 📌 3. ส่วนของระบบบันทึกและแจ้งเตือนยา (ปรับใหม่)
// ==========================================
function saveMedicineData(params) {
  var ss = getSS();
  var sheet = ss.getSheetByName("set_medicine");
  
  // 1. ตรวจสอบและสร้างหัวตารางใหม่ (ถ้ายังไม่มี)
  if (!sheet) {
    sheet = ss.insertSheet("set_medicine");
    sheet.appendRow([
      "update", "line_id", "line_name", "last_taken", 
      "med_morning", "morning_before_dose", "morning_before_time", "morning_after_dose", "morning_after_time",
      "med_lunch", "lunch_before_dose", "lunch_before_time", "lunch_after_dose", "lunch_after_time",
      "med_dinner", "dinner_before_dose", "dinner_before_time", "dinner_after_dose", "dinner_after_time"
    ]);
    sheet.getRange("A1:S1").setFontWeight("bold").setBackground("#d9edf7"); 
  }

  // 2. บันทึกข้อมูล
  sheet.appendRow([
    new Date(),                      // update
    params.line_id,                  // line_id
    params.line_name,                // line_name
    new Date(),                      // last_taken
    
    // มื้อเช้า
    params.med_morning || "",
    params.morning_before_dose || 0, 
    params.morning_before_time || "", 
    params.morning_after_dose || 0,
    params.morning_after_time || "",
    
    // มื้อกลางวัน
    params.med_lunch || "",
    params.lunch_before_dose || 0,
    params.lunch_before_time || "",
    params.lunch_after_dose || 0,
    params.lunch_after_time || "",
    
    // มื้อเย็น
    params.med_dinner || "",
    params.dinner_before_dose || 0,
    params.dinner_before_time || "",
    params.dinner_after_dose || 0,
    params.dinner_after_time || ""
  ]);
  
  return createResponse({ status: "success" });
}

function sendMedicineReminders() {
  var ss = getSS(); 
  var sheet = ss.getSheetByName('set_medicine');
  if (!sheet) return;
  
  var data = sheet.getDataRange().getValues();
  var now = new Date(); 
  var todayStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd"); // วันที่ปัจจุบัน
  
  for (var i = 1; i < data.length; i++) {
    var row = i + 1;             
    var lineId = data[i][1];     
    var lineName = data[i][2];   
    var meal = data[i][3];       
    var medType = data[i][4];    
    var beforeTime = data[i][5]; // คาดหวังรูปแบบ HH:mm
    var afterTime = data[i][6];  
    var currentPills = Number(data[i][7]) || 0; 
    var lastTakenDate = data[i][8] || ""; // ตรวจสอบว่าวันนี้กินไปหรือยัง
    
    // จุดสำคัญ: แปลงค่าจากคอลัมน์ I ให้เป็นข้อความวันที่ก่อนเทียบ
    var lastTakenRaw = data[i][8]; 
    var lastTakenStr = "";
    if (lastTakenRaw instanceof Date) {
      lastTakenStr = Utilities.formatDate(lastTakenRaw, Session.getScriptTimeZone(), "yyyy-MM-dd");
    } else {
      lastTakenStr = lastTakenRaw.toString().trim();
    }

    if (!lineId || currentPills <= 0) continue; 
    
    /// 🛑 ตรวจสอบ: ถ้าวันที่บันทึกล่าสุด ตรงกับ วันนี้ ให้ข้าม (หยุดเตือน)
    if (lastTakenStr === todayStr) {
      Logger.log("แถวที่ " + row + " กินไปแล้ว (หยุดเตือน)");
      continue;
    }

    var deductAmount = 1; 
    if (medType.indexOf("2 เม็ด") !== -1) deductAmount = 2;
    else if (medType.indexOf("1/2 เม็ด") !== -1) deductAmount = 0.5;

    // เช็คเวลาก่อนอาหาร
    if (beforeTime) _checkAndSendMedReminder(row, lineId, lineName, meal, medType, beforeTime, now, "ก่อนอาหาร 30 นาที", currentPills, deductAmount);

    // เช็คเวลาหลังอาหาร
    if (afterTime) _checkAndSendMedReminder(row, lineId, lineName, meal, medType, afterTime, now, "พร้อม/หลังอาหารทันที", currentPills, deductAmount);
  }
}

function _checkAndSendMedReminder(row, lineId, lineName, meal, medType, timeStr, now, defaultPhaseText, currentPills, deductAmount) {
  if (!timeStr || timeStr === "") return false;
  if (timeStr instanceof Date) { timeStr = Utilities.formatDate(timeStr, Session.getScriptTimeZone(), "HH:mm"); }
  
  var timeParts = timeStr.toString().split(":");
  if (timeParts.length < 2) return false;
  var hours = parseInt(timeParts[0], 10);
  var minutes = parseInt(timeParts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return false;

  var medTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
  var diffMs = medTime.getTime() - now.getTime();
  var diffMinutes = Math.floor(diffMs / (1000 * 60)); 

  if (diffMinutes <= 10 && diffMinutes >= -120) {
    var remainingPills = currentPills - deductAmount; 
    
    // ดึงกล่อง Flex Message ดีไซน์ใหม่
    var msgData = getCustomFlexMessage(row, lineId, lineName, meal, medType, defaultPhaseText, remainingPills, deductAmount);
    
    // สร้างข้อความบับเบิ้ลแจ้งเตือนด้านบน (เช่น "แจ้งเตือน รับประทานยาก่อนอาหารเช้าค่ะ")
    var timePhase = defaultPhaseText.indexOf("ก่อน") !== -1 ? "ก่อนอาหาร" : "หลังอาหาร";
    var mealName = meal.replace("มื้อ", ""); // ตัดคำว่ามื้อออก เหลือแค่ เช้า/กลางวัน/เย็น
    var altTextMsg = "แจ้งเตือน รับประทานยา" + timePhase + mealName + "ค่ะ";

    // ส่งเข้า LINE แบบแพ็คคู่ (ข้อความ + Flex Message)
    pushFlexMessage(lineId, msgData.flex, altTextMsg); 
    return true; 
  }
  return false;
}

// 🎨 ฟังก์ชันแต่ง Flex Message ให้เหมือนรูปภาพต้นฉบับ 100%
function getCustomFlexMessage(row, lineId, lineName, meal, medType, defaultPhase, remainingPills, deductAmount) {
    var imgUrl = "https://cdn-icons-png.flaticon.com/512/2862/2862884.png";
    var titleText = medType;
    var nameText = medType;
    var sizeText = "-";
    var phaseText = deductAmount + " เม็ด " + defaultPhase;
    var titleColor = "#1DB446";

    // แยกเงื่อนไขยาตามลิงก์รูปที่คุณให้มา
    if (medType.indexOf("Glipizide") !== -1) {
        imgUrl = "https://drive.google.com/uc?export=view&id=1_iKMzrm7RUSD39WrSWp_4wtoCRWSaJp2";
        titleText = "กลิพิไซด์ (Glipizide)";
        nameText = "กลิพิไซด์";
        sizeText = "5 มิลลิกรัม";
        phaseText = "1 เม็ด ก่อนอาหาร 30 นาที";
        titleColor = "#0d6efd"; // สีน้ำเงิน
    } else if (medType.indexOf("Metformin 500mg (1 เม็ด)") !== -1) {
        imgUrl = "https://drive.google.com/uc?export=view&id=1g0mi44-0dUr9VEnxyOry0E_j2wCJdbvb";
        titleText = "เมทฟอร์มิน (Metformin)";
        nameText = "เมทฟอร์มิน";
        sizeText = "500 มิลลิกรัม";
        phaseText = "1 เม็ด พร้อม/หลังอาหารทันที";
        titleColor = "#0d6efd"; 
    } else if (medType.indexOf("Metformin 500mg (2 เม็ด)") !== -1) {
        imgUrl = "https://drive.google.com/uc?export=view&id=1f8EcX9ZzaA1UOsEajNdKKaGc20Jx9XE8";
        titleText = "เมทฟอร์มิน (Metformin)";
        nameText = "เมทฟอร์มิน";
        sizeText = "500 มิลลิกรัม";
        phaseText = "2 เม็ด พร้อม/หลังอาหารทันที";
        titleColor = "#0d6efd";
    } else if (medType.indexOf("Pioglitazone 30mg (1 เม็ด)") !== -1) {
        imgUrl = "https://drive.google.com/uc?export=view&id=1MxgNNyDg4DdmniDVOY41wofFg-rplOc8";
        titleText = "ไพโอกลิตาโซน (Pioglitazone)";
        nameText = "ไพโอกลิตาโซน";
        sizeText = "30 มิลลิกรัม";
        phaseText = "1 เม็ด หลังอาหาร";
        titleColor = "#0d6efd"; 
    } else if (medType.indexOf("Pioglitazone 30mg (1/2 เม็ด)") !== -1) {
        imgUrl = "https://drive.google.com/uc?export=view&id=1-TSaxMMMmM2O9yuSSJ6rN51GjmjGZb4m";
        titleText = "ไพโอกลิตาโซน (Pioglitazone)";
        nameText = "ไพโอกลิตาโซน";
        sizeText = "30 มิลลิกรัม";
        phaseText = "1/2 เม็ด หลังอาหาร";
        titleColor = "#0d6efd"; 
    }

    // สร้างลิงก์ฝังไปในปุ่ม ให้ส่งชื่อยาไปหน้าอัปโหลดรูปด้วย
    var uploadUrl = WEB_APP_URL + "?action=uploadMed&row=" + row + "&lineId=" + lineId + "&lineName=" + encodeURIComponent(lineName) + "&deduct=" + deductAmount + "&medType=" + encodeURIComponent(titleText) + "&meal=" + encodeURIComponent(meal) + "&phaseText=" + encodeURIComponent(phaseText);

    // โครงสร้าง Flex Message ถอดแบบจากรูปเป๊ะๆ
    var flex = {
      "type": "flex",
      "altText": "แจ้งเตือนรับประทานยา " + meal,
      "contents": {
        "type": "bubble",
        "hero": {
          "type": "image",
          "url": imgUrl,
          "size": "full",
          "aspectRatio": "1:1",
          "aspectMode": "cover"
        },
        "body": {
          "type": "box",
          "layout": "vertical",
          "contents": [
            { "type": "text", "text": titleText, "weight": "bold", "color": titleColor, "size": "lg", "align": "center", "wrap": true },
            { "type": "separator", "margin": "md" },
            {
              "type": "box",
              "layout": "vertical",
              "margin": "md",
              "spacing": "sm",
              "contents": [
                {
                  "type": "box", "layout": "baseline", "spacing": "sm",
                  "contents": [
                    { "type": "text", "text": "ชื่อยา :", "color": "#111111", "size": "sm", "weight": "bold", "flex": 2 },
                    { "type": "text", "text": nameText, "wrap": true, "color": "#111111", "size": "sm", "flex": 5 }
                  ]
                },
                {
                  "type": "box", "layout": "baseline", "spacing": "sm",
                  "contents": [
                    { "type": "text", "text": "ขนาด :", "color": "#111111", "size": "sm", "weight": "bold", "flex": 2 },
                    { "type": "text", "text": sizeText, "wrap": true, "color": "#111111", "size": "sm", "flex": 5 }
                  ]
                },
                {
                  "type": "box", "layout": "baseline", "spacing": "sm",
                  "contents": [
                    { "type": "text", "text": "วิธีใช้ :", "color": "#111111", "size": "sm", "weight": "bold", "flex": 2 },
                    { "type": "text", "text": phaseText, "wrap": true, "color": "#dc3545", "weight": "bold", "size": "sm", "flex": 5 }
                  ]
                }
              ]
            }
          ]
        },
        "footer": {
          "type": "box",
          "layout": "horizontal",
          "spacing": "sm",
          "contents": [
            {
              "type": "button",
              "style": "primary",
              "color": "#c93e35", // สีแดงอิฐ (ยังไม่ได้กิน)
              "action": {
                "type": "postback",
                "label": "ยังไม่ได้กิน",
                "data": "action=snooze"
              }
            },
            {
              "type": "button",
              "style": "primary",
              "color": "#588f4e", // สีเขียวหม่น (กินแล้ว)
              "action": {
                "type": "uri",
                "label": "กินแล้ว",
                "uri": uploadUrl
              }
            }
          ]
        }
      }
    };
    return { flex: flex };
}

// ฟังก์ชันดึงรายชื่อยาจาก Sheet "medicine"
function getMedicineList() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("medicine");
  
  // ดึงข้อมูลจาก Column A (แถวที่ 2 เป็นต้นไปจนถึงแถวสุดท้าย)
  var range = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1);
  var values = range.getValues();
  
  // แปลงให้เป็น Object เพื่อให้ JavaScript ใช้ง่าย
  return values.map(function(row) {
    return row[0]; 
  });
}


// ==========================================
// 📂 4. ระบบบันทึกภาพถ่ายและหักคลังยา
// ==========================================
function saveMedicinePhoto(base64Data, patientName) {
  var mainFolderName = "Medicine_Proofs";
  var folders = DriveApp.getFoldersByName(mainFolderName);
  var mainFolder = folders.hasNext() ? folders.next() : DriveApp.createFolder(mainFolderName);
  var safeName = patientName ? patientName.replace(/[/\\?%*:|"<>]/g, '') : "Unknown_Patient";
  var patientFolders = mainFolder.getFoldersByName(safeName);
  var patientFolder = patientFolders.hasNext() ? patientFolders.next() : mainFolder.createFolder(safeName);

  var contentType = base64Data.substring(5, base64Data.indexOf(';'));
  var bytes = Utilities.base64Decode(base64Data.split(',')[1]);
  var fileName = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd_HH-mm") + ".jpg";
  var file = patientFolder.createFile(Utilities.newBlob(bytes, contentType, fileName));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); 
  return file.getUrl();
}

function confirmMedFromWeb(params) {
  try {
    var ss = getSS();
    var sheet = ss.getSheetByName('set_medicine');
    var row = parseInt(params.row);

    var imageUrl = saveMedicinePhoto(params.imageBase64, params.lineName);
    var currentPills = Number(sheet.getRange(row, 8).getValue()) || 0; // ย้ายคอลัมน์ยามา H(8)
    var deductAmount = Number(params.deductAmount) || 1;
    var newPills = currentPills - deductAmount;
    
    sheet.getRange(row, 8).setValue(newPills);

    // 🌟🌟 ไฮไลต์จุดแก้: เปลี่ยนจากบันทึกคำว่า taken เป็นบันทึกวันที่ปัจจุบันแทน! 
    // เพื่อที่วันพรุ่งนี้ วันที่เปลี่ยนไป ระบบจะได้ดึงมาแจ้งเตือนลูปใหม่ได้
    var todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
    sheet.getRange(row, 9).setValue(todayStr); // ย้ายสถานะมา I(9)

    pushMessage(params.lineId, "✅ บันทึกการทานยาเรียบร้อยแล้วค่ะ!\n💊 ยาคงเหลือ: " + newPills + " เม็ด\n\nดูภาพหลักฐานได้ที่นี่:\n" + imageUrl);
    return { status: "success" };
  } catch(err) {
    return { status: "error", message: err.toString() };
  }
}

// อัปเกรดฟังก์ชันส่ง LINE ให้ส่งข้อความบับเบิ้ล (บน) คู่กับ Flex Message (ล่าง) แบบในรูปเป๊ะ
function pushFlexMessage(userId, flexMsg, altTextMsg) {
  try { 
    var messages = [];
    if (altTextMsg) {
       messages.push({ "type": "text", "text": altTextMsg });
    }
    messages.push(flexMsg);

    UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
      "method": "post", 
      "headers": { "Content-Type": "application/json", "Authorization": "Bearer " + LINE_ACCESS_TOKEN },
      "payload": JSON.stringify({ "to": userId, "messages": messages })
    });
  } catch(e) { }
}

function pushMessage(userId, text) {
  try { UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    "method": "post", "headers": { "Content-Type": "application/json", "Authorization": "Bearer " + LINE_ACCESS_TOKEN },
    "payload": JSON.stringify({ "to": userId, "messages": [{"type": "text", "text": text}] })
  }); } catch(e) {}
}

function replyMessage(replyToken, text) {
  try { UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', {
    "method": "post", "headers": { "Content-Type": "application/json", "Authorization": "Bearer " + LINE_ACCESS_TOKEN },
    "payload": JSON.stringify({ "replyToken": replyToken, "messages": [{"type": "text", "text": text}] })
  }); } catch(e) {}
}
function triggerMyPermission() { DriveApp.createFolder("ทดสอบสิทธิ์สร้างโฟลเดอร์"); }


// ฟังก์ชันสำหรับดึงข้อมูลยาคงเหลือจาก Sheet set_medicine
function getMedStock(line_id) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("set_medicine");
  if (!sheet) return { list: [], totalSum: 0 };
  
  var data = sheet.getDataRange().getValues();
  var stockMap = {}; 
  var grandTotal = 0;

  // วนลูปข้อมูล (เริ่มแถวที่ 1 ถ้าหัวตารางอยู่แถว 0)
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(line_id)) {
      
      // สร้าง Array เก็บข้อมูล 3 มื้อเพื่อวนลูปบวกเลข
      // [ชื่อยา_Index, จำนวนยา_Index]
      var meds = [
        [4, 5],   // มื้อเช้า
        [9, 10],  // มื้อกลางวัน
        [14, 15]  // มื้อเย็น
      ];
      
      meds.forEach(function(m) {
        var name = String(data[i][m[0]]); // ชื่อยา
        var pills = parseInt(data[i][m[1]]) || 0; // จำนวนยา
        
        if (name && name !== "") {
          var cleanMedName = name.split('(')[0].trim();
          stockMap[cleanMedName] = (stockMap[cleanMedName] || 0) + pills;
          grandTotal += pills;
        }
      });
    }
  }

  // จัดเรียงชื่อยา
  var order = ["Glipizide", "Metformin 500mg", "Pioglitazone 30mg"];
  var result = [];
  
  order.forEach(function(name) {
    if (stockMap[name] !== undefined) {
      result.push({ med_name: name, total_pills: stockMap[name] });
      delete stockMap[name];
    }
  });
  
  for (var key in stockMap) {
    result.push({ med_name: key, total_pills: stockMap[key] });
  }

  return { list: result, totalSum: grandTotal };
}
