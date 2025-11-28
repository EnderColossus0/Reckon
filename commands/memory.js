const ai = require('../ai/aiHandler');

module.exports = {
  data: { name: 'memory', description: 'View or clear what I remember about you' },
  
  async execute(message, args) {
    const userId = message.author.id;
    const action = args[0]?.toLowerCase();

    if (action === 'clear') {
      await ai.clearMemory(userId);
      return message.reply('Done! I\'ve forgotten everything about you. We can start fresh.');
    }

    const facts = await ai.getKnowledge(userId);

    if (facts.length === 0) {
      return message.reply('I don\'t have any saved facts about you yet. Chat with me and I\'ll remember important things!');
    }

    let response = '**What I Remember About You:**\n\n';
    facts.forEach((f, i) => {
      response += `${i + 1}. ${f.text}\n`;
    });

    if (response.length > 1900) {
      response = response.slice(0, 1900) + '...';
    }

    return message.reply(response);
  }
};
