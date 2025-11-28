const aiHandler = require('../ai/aiHandler');
const memoryManager = require('../memory/memoryManager');

module.exports = {
  data: { name: 'memory', description: 'View or clear what the AI remembers about you' },
  async execute(message, args) {
    const action = args[0]?.toLowerCase();
    const userId = message.author.id;

    if (action === 'clear') {
      await aiHandler.clearUserMemory(userId);
      return message.reply('Your memory has been cleared. I no longer remember our past conversations or facts about you.');
    }

    if (action === 'view' || !action) {
      const knowledge = await memoryManager.getKnowledge(userId);
      const conversations = await memoryManager.getConversationHistory(userId, 5);

      let response = '**What I Remember About You:**\n\n';

      if (knowledge.length > 0) {
        response += '**Facts:**\n';
        knowledge.forEach((k, i) => {
          response += `${i + 1}. ${k.fact}\n`;
        });
      } else {
        response += '*No facts stored yet.*\n';
      }

      response += `\n**Recent Conversations:** ${conversations.length} stored\n`;

      if (response.length > 1900) {
        response = response.slice(0, 1900) + '...';
      }

      return message.reply(response);
    }

    return message.reply('Usage: `-memory` to view, `-memory clear` to clear your memory');
  }
};
