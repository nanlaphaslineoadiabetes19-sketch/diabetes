const axios = require('axios');

// 1. ใส่ Channel Access Token ของคุณตรงนี้
const TOKEN = 'ใส่_CHANNEL_ACCESS_TOKEN_ของคุณ';

const richMenuData = {
  size: { width: 2500, height: 1686 },
  selected: true,
  name: "เมนูหลักหน้า 1",
  chatBarText: "เมนูหลัก",
  areas: [
    {
      bounds: { x: 0, y: 0, width: 833, height: 843 },
      action: { type: "message", text: "action=switch_to_menu_2" } // คำสั่งสลับเมนู
    }
    // ... ใส่พิกัดปุ่มอื่นๆ ให้ครบตามจำนวนปุ่มของคุณ
  ]
};

async function createMenu() {
  try {
    const response = await axios.post('https://api.line.me/v2/bot/richmenu', richMenuData, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('สร้างสำเร็จ! นี่คือ Rich Menu ID ของคุณ:');
    console.log(response.data.richMenuId); // <--- ตัวนี้แหละคือรหัสที่ต้องเอาไปใส่ Vercel
  } catch (error) {
    console.error('สร้างไม่สำเร็จ:', error.response.data);
  }
}

createMenu();
