const { Client } = require('@line/bot-sdk');

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = new Client(config);

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    const events = req.body.events;
    await Promise.all(events.map(handleEvent));
    return res.status(200).send('OK');
  }
  res.status(405).send('Method Not Allowed');
};

async function handleEvent(event) {
  if (event.type !== 'postback') return;

  const userId = event.source.userId;
  const data = event.postback.data;

  if (data === 'action=switch_to_menu_2') {
    return client.linkRichMenuToUser(userId, process.env.RICH_MENU_ID_2);
  } else if (data === 'action=switch_to_menu_1') {
    return client.linkRichMenuToUser(userId, process.env.RICH_MENU_ID_1);
  }
}
