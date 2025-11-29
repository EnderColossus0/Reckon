const ai = require('../ai/aiHandler');
const memory = require('../memory/memoryManager');

module.exports = {
  data: { name: 'setaimodel', description: 'Switch AI models for chat or tools' },
  
  async execute(message, args) {
    const type = args[0]?.toLowerCase();
    const model = args[1]?.toLowerCase();

    // No arguments - show current settings
    if (!type) {
      const chatModel = ai.getModel(message.author.id);
      const toolModel = await memory.getToolModel(message.author.id);
      return message.reply(`**Chat Model:** ${chatModel}\n**Tool Model:** ${toolModel}\n\n**How to switch**\n\`-setaimodel chat gemini\`\n\`-setaimodel tool groq\``);
    }

    // Invalid type
    if (!['chat', 'tool'].includes(type)) {
      return message.reply(`❌ Use **chat** or **tool**.\nExample: \`-setaimodel chat gemini\` or \`-setaimodel tool groq\``);
    }

    // No model specified
    if (!model || !['gemini', 'groq'].includes(model)) {
      return message.reply(`❌ Model must be **gemini** or **groq**.\nExample: \`-setaimodel ${type} gemini\``);
    }

    // Set the model
    if (type === 'chat') {
      ai.setModel(message.author.id, model);
    } else {
      await memory.setToolModel(message.author.id, model);
    }

    message.reply(`✅ **${type}** model switched to **${model}**.`);
  }
};
