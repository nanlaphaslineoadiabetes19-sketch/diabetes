const express = require('express');
const { Client } = require('@line/bot-sdk');

const app = express();

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = new Client(config);

app.post('/webhook', express.json(), (req, res) => {
  const events = req.body.events;
  console.log('Events received:', JSON.stringify(events)); // เพิ่มบรรทัดนี้ เพื่อดูว่า LINE ส่ง data อะไรมาบ้าง
  
  Promise.all(events.map(async (event) => {
    // ตรวจสอบว่าเป็นการกดปุ่มแบบ Postback (การสลับหน้า) หรือไม่
    if (event.type === 'postback') {
      const userId = event.source.userId;
      const data = event.postback.data;
      console.log('Postback data received:', data); // ดูว่า data ที่ได้รับมาคืออะไร

      if (data === 'action=switch_to_menu_2') {
        // สั่งเปลี่ยนเป็นเมนูหน้า 2
        await client.linkRichMenuToUser(event.source.userId, process.env.RICH_MENU_ID_2);
      } else if (data === 'action=switch_to_menu_1') {
        // สั่งเปลี่ยนเป็นเมนูหน้า 1
        await client.linkRichMenuToUser(userId, process.env.RICH_MENU_ID_1);
      }
    }
  }))
  .then(() => res.status(200).send('OK'))
  .catch((err) => {
    console.error(err);
    res.status(500).end();
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
