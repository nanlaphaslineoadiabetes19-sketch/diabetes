const { Client } = require('@line/bot-sdk');

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = new Client(config);

module.exports = async (req, res) => {
  // ตรวจสอบว่าเป็น POST request หรือไม่ (LINE จะส่ง POST มาเสมอ)
  if (req.method !== 'POST') {
    return res.status(200).send('Method Not Allowed');
  }

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
    res.status(500).end();
  }
};
