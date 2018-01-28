const request = require('request');
const watson = require('./watson');

const PAGE_ACCESS_TOKEN = 'EAACBFVm8VxMBAOEqiIZB8wU8sq0pEKDLoEcLJi1ZBqLRcpVcnbSzUAvlSyKmDUuqGbohdMhe29ONTYYGXmnUIUVZANZAtfZCIRfcopDDfAnp7imZCAsPUUmUchUm4ZBu5eV6JNS4aNXp6rsn7YTZAtOWDTUVx73F7SNDv2mG0GrBQAZDZD';

let mode = 'watson';

const roles = {
  refugee: null,
  helper: null,
};

module.exports = {
  verify({ mode, token, challenge }) {
    // Your verify token. Should be a random string.
    let VERIFY_TOKEN = '1234';

    // Checks if a token and mode is in the query string of the request
    if (mode && token) {
      // Checks the mode and token sent is correct
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        // Responds with the challenge token from the request
        return challenge;
      } else {
        return false;
      }
    } else {
      return false;
    }
  },

  setGreeting(greeting) {
    request({
      'uri': 'https://graph.facebook.com/v2.6/me/messenger_profile',
      'qs': { 'access_token': PAGE_ACCESS_TOKEN },
      'method': 'POST',
      'json': {
        "greeting": [
          {
            "locale": "default",
            "text": "Hello!"
          },
        ],
        'get_started': { 'payload': '<postback_payload>' },
      },
    }, (err, res, body) => {
      if (!err) {
        console.log(body);
        console.log('message sent!')
      } else {
        console.error('Unable to send message:' + err);
      }
    });
  },

  processEntry(entry) {
    // Gets the message. entry.messaging is an array, but
    // will only ever contain one message, so we get index 0
    let webhook_event = entry.messaging[0];
    console.log(webhook_event);

    // Get the sender PSID
    let sender_psid = webhook_event.sender.id;
    console.log('Sender PSID: ' + sender_psid);

    // Check if the event is a message or postback and
    // pass the event to the appropriate handler function
    if (webhook_event.message) {
      this.handleMessage(sender_psid, webhook_event.message);
    } else if (webhook_event.postback) {
      this.handlePostback(sender_psid, webhook_event.postback);
    }
  },

  // Handles messages events
  handleMessage(sender_psid, received_message) {
    let response;

    // Check if the message contains text
    if (received_message.text) {
      console.log('-- BEGIN message received --');
      console.log('from: ' + sender_psid);
      console.log('message: ' + received_message.text);
      console.log('-- END message received --');


      switch (received_message.text) {
        case 'set-helper':
          this.callSendAPI(sender_psid, 'seting you up as helper', null, 'helper');

          break;

        case 'set-refugee':
          this.callSendAPI(sender_psid, 'seting you up as refugee', null, 'refugee');


          break;
        case 'reset':
          mode = 'watson';

          watson.reset();

          this.callSendAPI(sender_psid, 'reset done');

          this.sendWatson('', sender_psid);

          break;
        default:
          if (mode === 'watson') {
            this.sendWatson(received_message.text, sender_psid);
          } else {
            let sendTo;

            if (roles.helper === sender_psid) {
              sendTo = roles.refugee;
            }

            if (roles.refugee === sender_psid) {
              sendTo = roles.helper;
            }

            this.doCall(0, [received_message.text], null, sendTo);
          }
      }
    }
  },

  sendWatson(input, sender_psid) {
    watson.send(input)
        .then((response) => {
          this.doCall(0, response.text, response.responses, sender_psid, response.setRole);
        });
  },

  doCall(index, array, responses, sender_psid, setRole) {
    const message = array[index];
    // check for empty
    if (!message) {
      return;
    }

    this.startStopTyping(sender_psid);

    setTimeout(() => {
      setTimeout(() => {
        this.callSendAPI(sender_psid, message, responses, setRole)
            .then(() => this.doCall(index + 1, array, responses, sender_psid, setRole));
      }, 400);
    }, index * ((75 * message.length) + 200));
  },

  startStopTyping(sender_psid, type = 'typing_on') {
    request({
      'uri': 'https://graph.facebook.com/v2.6/me/messages',
      'qs': { 'access_token': PAGE_ACCESS_TOKEN },
      'method': 'POST',
      'json': {
        'recipient': {
          'id': sender_psid,
        },
        'sender_action': type,
      }
    }, (err, res, body) => {
      if (!err) {
        console.log(`typing : ${type}`);
      } else {
        console.error(`Unable to send message:${err}`);
      }
    });
  },

  // Handles messaging_postbacks events
  handlePostback(sender_psid, received_postback) {
    console.log('****post back****');
    console.log('****post back****');
    console.log(received_postback);

    if (received_postback.payload === '<postback_payload>') {
      watson.reset();
      this.sendWatson('', sender_psid);
    }
  },

  // Sends response messages via the Send API
  callSendAPI(senderId, message, responses, role) {
    if (role) {
      roles[role] = senderId;

      if (roles.helper && roles.refugee) {
        this.startRelayMode();
      }
    }

    return new Promise((resolve, reject) => {
      // Construct the message body
      let request_body = {
        'recipient': {
          'id': senderId
        },
        'message': {
          text: message,
        }
      };

      if (responses) {
        request_body.message.quick_replies = responses.map((res) => {
          if (res === 'location') {
            return {
              'content_type': 'location',
            }
          } else {
            return {
              'content_type': 'text',
              'title': res,
              'payload': res,
            }
          }
        });
      }

      // Send the HTTP request to the Messenger Platform
      request({
        'uri': 'https://graph.facebook.com/v2.6/me/messages',
        'qs': { 'access_token': PAGE_ACCESS_TOKEN },
        'method': 'POST',
        'json': request_body
      }, (err, res, body) => {
        if (!err) {
          console.log('-- BEGIN message send back --');
          console.log(`to: ${senderId}`);
          console.log(`message: ${message}`);
          console.log(`res: ${JSON.stringify(res)}`);
          console.log('-- END message send back --');
          resolve();
        } else {
          console.error('Unable to send message:' + err);
          reject();
        }
      });
    });
  },

  startRelayMode() {
    console.log('--------******---------');
    console.log('--------******---------');
    console.log('***RELAY MODE ACTIVE***');
    console.log('--------******---------');
    console.log('--------******---------');

    Promise.all([
        this.getProfile(roles.helper),
        this.getProfile(roles.refugee),
    ]).then(([helperProfile, refugeeProfile]) => {
      mode = 'relay';

      // send both of them messages they are matched
      setTimeout(() => {
        this.doCall(0, [
            `Hi ${helperProfile.first_name}, 
            I've matched you with ${refugeeProfile.first_name}`,
          `. Take it away!`
        ], null, roles.helper);
        this.doCall(0, [
          `Hi ${refugeeProfile.first_name}, 
            I've matched you with ${helperProfile.first_name}`,
          `. Take it away!`
        ], null, roles.refugee);
      }, 250);
    });
  },

  getProfile(senderId) {
    return new Promise((resolve, reject) => {
      request({
        'uri': `https://graph.facebook.com/v2.6/${senderId}`,
        'qs': {
          'access_token': PAGE_ACCESS_TOKEN,
          'fields': 'first_name,last_name,profile_pic',
        },
        'method': 'GET',
      }, (err, res, body) => {
        if (!err) {
          console.log('-- BEGIN message send back --');
          console.log(`profile: ${JSON.stringify(res)}`);
          console.log('-- END message send back --');
          resolve(res);
        } else {
          console.error('Unable to fetch profile:' + err);
          reject();
        }
      });
    });
  }
};