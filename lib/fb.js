const PAGE_ACCESS_TOKEN = 'EAACBFVm8VxMBAOEqiIZB8wU8sq0pEKDLoEcLJi1ZBqLRcpVcnbSzUAvlSyKmDUuqGbohdMhe29ONTYYGXmnUIUVZANZAtfZCIRfcopDDfAnp7imZCAsPUUmUchUm4ZBu5eV6JNS4aNXp6rsn7YTZAtOWDTUVx73F7SNDv2mG0GrBQAZDZD';

const request = require('request');

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
            "text": greeting
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
          resolve(JSON.parse(body));
        } else {
          reject();
        }
      });
    });
  },

  sendAPI(senderId, message, responses) {
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
          console.log(`to: ${senderId}`);
          console.log(`message: ${message}`);
          resolve();
        } else {
          console.error('Unable to send message:' + err);
          reject();
        }
      });
    });
  }
};