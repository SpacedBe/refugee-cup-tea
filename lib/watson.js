const ConversationV1 = require('watson-developer-cloud/conversation/v1');

var dirty = require('dirty');

module.exports = {
  setup() {
    // Set up Conversation service wrapper.
    this.conversation = new ConversationV1({
      username: '014c78f9-672e-4372-b7f9-59a4cab8855a',
      password: 'GkLNZERKASTD',
      version_date: '2017-05-26',
    });

    this.reset();

    this.send('', 'test--')
        .then(() => this.send('yes', 'test--'))
        .then(() => this.send('I need help', 'test--'))
        .then(() => this.send('friendly chat', 'test--'))
        .then(() => this.send('yes', 'test--'));


    this.send('', 'test--2')
        .then(() => this.send('no', 'test--2'))
        .then(() => this.send('yes', 'test--2'))
        .then(() => this.send('yes', 'test--2'));
  },

  reset() {
    this.context = dirty('user.db');
  },

  send(message, sender_psid) {
    let input = {
      workspace_id: 'b340b0ae-6757-4fd9-85d6-d2e11334929e',
      input: { 'text': message },
    };

    if (this.context.get(sender_psid)) {
      input.context = this.context.get(sender_psid);
    }

    return new Promise((resolve, reject) => {
      this.conversation.message(input, (err, response) => {
        if (err) {
          console.error(err);
          reject(err);
          return;
        }

        console.log('input: ' + message);
        console.log('output: ' + JSON.stringify(response.output));

        this.context.set(sender_psid, response.context);

        resolve(response.output);
      })
    });
  }
};