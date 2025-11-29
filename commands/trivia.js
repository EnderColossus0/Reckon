const { EmbedBuilder } = require('discord.js');
const { hasCooldown, getCooldownRemaining, setCooldown } = require('../utils/cooldown');
const toolHandler = require('../ai/toolHandler');

module.exports = {
  data: { name: 'trivia', description: 'Generate a trivia question' },
  async execute(message, args, client) {
    // Check cooldown
    if (hasCooldown(message.author.id, 'trivia')) {
      const remaining = (getCooldownRemaining(message.author.id, 'trivia') / 1000).toFixed(2);
      return message.reply(`Wait ${remaining}s.`);
    }
    setCooldown(message.author.id, 'trivia');

    // Parse category, difficulty, and delay from args
    let category = 'random';
    let difficulty = ['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)]; // random difficulty by default
    let delaySeconds = 10; // default 10 seconds
    
    if (args.length > 0) {
      // Check if last arg is a number (delay)
      let remainingArgs = args;
      const lastArg = args[args.length - 1];
      if (!isNaN(lastArg) && lastArg.trim() !== '') {
        delaySeconds = Math.max(1, Math.min(60, parseInt(lastArg))); // clamp 1-60 seconds
        remainingArgs = args.slice(0, -1);
      }
      
      // Check if second-to-last arg is a difficulty
      if (remainingArgs.length > 0) {
        const secondLast = remainingArgs[remainingArgs.length - 1]?.toLowerCase();
        if (['easy', 'medium', 'hard'].includes(secondLast)) {
          difficulty = secondLast;
          category = remainingArgs.slice(0, -1).join(' ') || 'random';
        } else {
          category = remainingArgs.join(' ') || 'random';
        }
      }
    }
    
    await message.channel.sendTyping();

    try {
      const prompt = `Generate an interesting ${difficulty} trivia question about ${category}. Format your response as:
QUESTION: [the question]
A) [option A]
B) [option B]
C) [option C]
D) [option D]
ANSWER: [correct letter and explanation]`;

      const { result: trivia, model } = await toolHandler.generate(message.author.id, prompt);

      // Parse out the answer section
      const answerMatch = trivia.match(/ANSWER:\s*(.+?)$/mi);
      const answer = answerMatch ? answerMatch[1].trim() : 'Could not extract answer';
      
      // Remove ANSWER line from display
      const questionOnly = trivia.replace(/ANSWER:.*?$/mi, '').trim();

      // Color based on difficulty
      const difficultyColors = {
        easy: '#00FF00',
        medium: '#FFFF00',
        hard: '#FF0000'
      };
      const embedColor = difficultyColors[difficulty] || '#9370DB';

      // Create question embed (without answer)
      const questionEmbed = new EmbedBuilder()
        .setTitle('🧠 Trivia Question')
        .setDescription(questionOnly.slice(0, 3900))
        .setColor(embedColor)
        .setFooter({ text: `Difficulty: ${difficulty} • Answer reveals in ${delaySeconds}s • Model: ${model}` })
        .setTimestamp();

      const reply = await message.reply({ embeds: [questionEmbed] });

      // Send answer embed after delay
      setTimeout(async () => {
        try {
          const answerEmbed = new EmbedBuilder()
            .setTitle('✅ Answer')
            .setDescription(answer)
            .setColor(embedColor)
            .setTimestamp();

          await message.reply({ embeds: [answerEmbed] });
        } catch (err) {
          console.error('[Trivia] Error sending answer:', err.message);
        }
      }, delaySeconds * 1000);
    } catch (err) {
      console.error('[Trivia] Error:', err.message);
      message.reply(`❌ Error: ${err.message}`);
    }
  }
};
