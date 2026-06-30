const { Client } = require('@line/bot-sdk');

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = new Client(config);

// Vercel จะเรียกใช้ฟังก์ชันที่ export ออกมานี้โดยอัตโนมัติ
module.exports = async (req, res) => {
  console.log("--- Webhook เริ่มทำงานแล้ว! ---");
  // LINE จะส่งข้อมูลแบบ POST มาที่นี่
  if (req.method === 'POST') {
    const events = req.body.events;

    try {
      await Promise.all(events.map(async (event) => {
        if (event.type === 'postback') {
          const userId = event.source.userId;
          const data = event.postback.data;

          if (data === 'action=switch_to_menu_2') {
            await client.linkRichMenuToUser(userId, process.env.RICH_MENU_ID_2);
          } else if (data === 'action=switch_to_menu_1') {
            await client.linkRichMenuToUser(userId, process.env.RICH_MENU_ID_1);
          }
        }
      }));
      res.status(200).send('OK');
    } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
    }
  } else {
    // ถ้าไม่ใช่ POST (เช่นเราเผลอเอาเบราว์เซอร์ไปเปิดดู) ให้ตอบกลับปกติ
    res.status(200).send('Webhook Server is running...');
  }
};
