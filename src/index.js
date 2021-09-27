const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const marked = require('marked');
const Gun = require('gun');
const TerminalRenderer = require('marked-terminal');

const { admin_telegram, port, options, token } = require('./config.json');

const TOKEN = process.env.TELEGRAM_TOKEN || token;
const url = 'https://shadow-link.tk';
const PORT = process.env.PORT || port


const bot = new TelegramBot(TOKEN);
bot.setWebHook(`${url}/bot${TOKEN}`);


marked.setOptions({
  renderer: new TerminalRenderer()
})

const app = express();

app.use(Gun.serve)
app.use(express.json())

console.log(marked('# Starting Gunpoint API !'))

let gun;
if (options.peers.length === 0) {
  gun = Gun({
    web: app.listen(PORT, () => { console.log(marked('**Gunpoint is running at http://localhost:' + PORT + '**')) })
  });
} else if (options.peers.length > 0) {
  gun = Gun({
    peers: options.peers,
    web: app.listen(PORT, () => { console.log(marked('**Gunpoint is running at http://localhost:' + PORT + '**')) })
  });
}


// -- Json to table --------------------------------------------------------

const clsMap = [
  [/^".*:$/, "red"],
  [/^"/, "green"],
  [/true|false/, "blue"],
  [/null/, "magenta"],
  [/.*/, "darkorange"],
]

const syntaxHighlight = obj => JSON.stringify(obj, null, 4)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, match => `<span style="color:${clsMap.find(([regex]) => regex.test(match))[1]}">${match}</span>`);


const row = html => `<tr>\n${html}</tr>\n`,
  heading = object => row(Object.keys(object).reduce((html, heading) => (html + `<th>${heading}</th>`), '')),
  datarow = object => row(Object.values(object).reduce((html, value) => (html + `<td>${value}</td>`), ''));

function htmlTable(dataList) {
  return `<table>
            ${heading(dataList[0])}
            ${dataList.reduce((html, object) => (html + datarow(object)), '')}
          </table>`
}


// -- Telegram api --------------------------------------------------------
// We are receiving updates at the route below!
app.post(`/bot${TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

const onStartMessage = `HI! 
List of commands:
[ /subscribe account-name ] - subscribe for your shadow-link contacts profile updates`

const onSubscribeMessage = `HI! 
Send me:
"/subscribe account-name" to subscribe for your shadow-link account watchlist updates`

bot.onText(/\/start/, (msg) => {
  const { chat: { id } } = msg
  bot.sendMessage(id, onStartMessage)
});

bot.onText(/\/subscribe (.+)/, (msg, [source, match]) => {
  const { chat: { id } } = msg

  let gun_user = gun.get("telegram-users").get(match)
  gun_user.put({ telegramID: id })

  gun.get("telegram-bot").get("subscribers").set(gun_user)

  bot.sendMessage(id, onSubscribeMessage)
});

// -- Gun api --------------------------------------------------------
app.get('/', (req, res) => {
  res.status(200).send({ msg: "Welcome to Gunpoint API !" })
})

app.get('/get/:key', (req, res) => {

  const { key } = req.params;

  let toFetch = gun.get(key);
  toFetch.once((data) => { res.status(200).send({ data: data }) })
});

app.get('/get/:key/:key2', (req, res) => {

  const { key, key2 } = req.params;

  let toFetch = gun.get(key).get(key2);
  toFetch.once((data) => { res.status(200).send(syntaxHighlight({ data: data })) })
});

app.get('/user/:pub', (req, res) => {

  const { pub } = req.params;

  let toFetch = gun.user(pub);
  toFetch.map().once((data) => { if (data) bot.sendMessage(admin_telegram, JSON.stringify({ data: data })) })
});

app.get('/user/:pub/:key', (req, res) => {

  const { pub, key } = req.params;

  let toFetch = gun.user(pub).get(key);
  toFetch.map().once((data) => { if (data) bot.sendMessage(admin_telegram, JSON.stringify({ data: data })) })
});

app.get('/user/:pub/:key/:key2', (req, res) => {

  const { pub, key, key2 } = req.params;

  let toFetch = gun.user(pub).get(key).get(key2);
  toFetch.map().once((data) => { if (data) bot.sendMessage(admin_telegram, JSON.stringify({ data: data })) })
});


app.post('/put/:key', (req, res) => {

  const { key } = req.params;
  const dataToAdd = req.body;

  if (!dataToAdd) {
    console.log("No data !");
    res.status(418).send({ error: "There's no data in your request !" })
  } else {
    let toFetch = gun.get(key);
    let dataFetched;

    toFetch.put(dataToAdd)
    toFetch.once((data) => { res.status(200).send({ success: "Ouuuya ! The data has been added !", dataAdded: dataToAdd, currentContent: data }) })
  }
})

app.post('/put/:key/in/:key2', (req, res) => {
  const toSetIn = req.params.key;
  const where = req.params.key2;

  gun.get(where).set(toSetIn);
  res.status(200).send({ success: `${toSetIn} has been successfully put in ${where} !` })
})

app.delete('/delete/:data/in/:key', (req, res) => {
  const toDelete = req.params.data;
  const where = req.params.key;

  const whereIsTheData = gun.get(where);
  whereIsTheData.get(toDelete).put(null);
  res.status(200).send({ success: `${toDelete} has been successfully deleted in ${where} !` })
})