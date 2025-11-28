const aiHandler = require('../ai/aiHandler');

module.exports = {
  data: { name: 'setaimodel', description: 'Set your preferred AI model (gemini or groq)' },
  async execute(message, args) {
    if (!args[0]) {
      return message.reply('❌ Please specify a model. Example: -setaimodel gemini');
    }

    const model = args[0].toLowerCase();
    if (!['gemini', 'groq'].includes(model)) {
      return message.reply('❌ Invalid model. Available models: gemini, groq');
    }

    // Set the model in memory for the user
    aiHandler.setActiveModelForUser(message.author.id, model);

    // Confirmation message
    message.reply(`✅ Your AI model has been set to **${model}**`);

    // Optional: log to console for debugging
    console.log(`User ${message.author.tag} set AI model to ${model}`);
  }
};