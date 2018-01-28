const request = require('request');

const watson = require('./watson');
const fb = require('./fb');

let mode = 'watson';

const roles = {
  refugee: null,
  helper: null,
};

const names = {
  refugee: null,
  helper: null,
};

module.exports = {
  processEntry(entry) {
    let webhook_event = entry.messaging[0];
    let sender_psid = webhook_event.sender.id;

    if (webhook_event.message) {
      this.handleMessage(sender_psid, webhook_event.message);
    } else if (webhook_event.postback) {
      this.handlePostback(sender_psid, webhook_event.postback);
    }
  },

  // Handles messages events
  handleMessage(sender_psid, received_message) {
    // Check if the message contains text
    if (received_message.text) {
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

              this.doCall(0, [`${names.helper}: ${received_message.text}`], null, sendTo);
            }

            if (roles.refugee === sender_psid) {
              sendTo = roles.helper;

              this.doCall(0, [`${names.refugee}: ${received_message.text}`], null, sendTo);
            }
          }
      }
    }
  },

  sendWatson(input, sender_psid) {
    watson.send(input, sender_psid)
        .then((response) => {
          let setRole = null;

          if (response.context && response.context.set_role) {
            setRole = response.context.set_role;
          }

          this.doCall(0, response.text, response.responses, sender_psid, setRole);
        });
  },

  doCall(index, array, responses, sender_psid, setRole) {
    const message = array[index];

    if (!message) {
      return;
    }

    fb.startStopTyping(sender_psid);

    setTimeout(() => {
      this.callSendAPI(sender_psid, message, responses, setRole)
          .then(() => this.doCall(index + 1, array, responses, sender_psid, setRole));
    }, index * ((50 * message.length) + 350));
  },

  handlePostback(sender_psid, received_postback) {
    if (received_postback.payload === '<postback_payload>') {
      watson.reset();
      this.sendWatson('', sender_psid);
    }
  },

  callSendAPI(senderId, message, responses, role) {
    if (role) {
      roles[role] = senderId;

      if (roles.helper && roles.refugee) {
        this.startRelayMode();
      }
    }

    return fb.sendAPI(senderId, message, responses);
  },

  startRelayMode() {
    Promise.all([
      fb.getProfile(roles.helper),
      fb.getProfile(roles.refugee),
    ]).then(([helperProfile, refugeeProfile]) => {
      mode = 'relay';

      names.helper = helperProfile.first_name;
      names.refugee = refugeeProfile.first_name;

      // send both of them messages they are matched
      setTimeout(() => {
        this.doCall(0, [
          `Hi ${names.helper}, I've matched you with ${names.refugee}.`,
          `Take it away!`
        ], null, roles.helper);
        this.doCall(0, [
          `Hi ${names.helper}, I've matched you with ${names.refugee}.`,
          `Take it away!`
        ], null, roles.refugee);
      }, 250);
    });
  },
};