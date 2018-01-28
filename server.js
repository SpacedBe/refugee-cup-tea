const chat = require('./lib/chat');
const watson = require('./lib/watson');

const express = require('express');
const app = express();
const bodyParser = require('body-parser');

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

let mydb;

app.get('/', (req, res) => {
  res.status(200).send('its working');
});

/* SETUP ROUTES MESSENGER */

chat.setGreeting('Hello!');
watson.setup();

app.get('/webhook', (req, res) => {
  const verified = chat.verify({
    mode: req.query['hub.mode'],
    token: req.query['hub.verify_token'],
    challenge: req.query['hub.challenge'],
  });

  if (verified) {
    res.status(200).send(verified);
  } else {
    res.status(200).send('no query params');
  }
});

app.post('/webhook', (req, res) => {
  let body = req.body;

  if (body.object === 'page') {
    body.entry.forEach(function (entry) {
      chat.processEntry(entry);
    });

    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

const port = process.env.PORT || 3000;

app.listen(port, function () {
  console.log('To view your app, open this link in your browser: http://localhost:' + port);
});