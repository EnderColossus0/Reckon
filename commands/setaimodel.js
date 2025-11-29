const ai = require('../ai/aiHandler');

module.exports = {
  data: { name: 'setaimodel', description: 'Switch between AI models (gemini or groq)' },
  
  async execute(message, args) {
    const model = args[0]?.toLowerCase();

    if (!model || !['gemini', 'groq'].includes(model)) {
      const current = ai.getModel(message.author.id);
      return message.reply(`Current model — **${current}**\n\n**How to switch**\n\`-setaimodel gemini\`\nor\n\`-setaimodel groq\``);
    }

    ai.setModel(message.author.id, model);
    message.reply(`Switched to **${model}**.`);
  }
};
