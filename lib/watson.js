const ConversationV1 = require('watson-developer-cloud/conversation/v1');

module.exports = {
  setup() {
    // Set up Conversation service wrapper.
    this.conversation = new ConversationV1({
      username: '014c78f9-672e-4372-b7f9-59a4cab8855a',
      password: 'GkLNZERKASTD',
      version_date: '2017-05-26',
    });

    console.log('-------');
    console.log('-------');
    console.log('-------');
    console.log('-------');
    console.log('-------');
    this.reset();

    this.send('')
        .then(() => this.send('yes'))
        .then(() => this.send('here to help'))
        .then(() => this.send('yes'));
  },

  reset() {
    this.context = {};
  },

  send(message) {
    let input = {
      workspace_id: '3eebf0de-6893-4725-b5f3-8e1622224d91',
      input: { 'text': message },
    };

    if (this.context.conversation_id) {
      input.context = this.context;
    }

    return new Promise((resolve, reject) => {
      this.conversation.message(input, (err, response) => {
        if (err) {
          console.error(err); // something went wrong
          reject(err);
          return;
        }

        console.log('-- BEGIN watson --');
        console.log('input: ' + message);
        console.log('output: ' + JSON.stringify(response.output));
        console.log('conv_id: ' + this.context.conversation_id);
        console.log('-- END watson --');



        this.context = response.context;

        // output.responses

        resolve(response.output);
      })
    });
  }
};