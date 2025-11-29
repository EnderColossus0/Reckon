const { EmbedBuilder } = require('discord.js');

const commandHelp = {
  // Configuration
  aichat: {
    category: 'Configuration',
    title: 'AI Chat Channel Setup',
    description: 'Set a specific channel where the bot will respond to AI commands. Once set, AI responses will only be posted in that channel.',
    usage: '-aichat [channel_name or #channel]',
    examples: [
      '-aichat ai-chat (sets current channel)',
      '-aichat #general (sets the general channel)',
      '-aichat (shows current AI channel)'
    ],
    notes: 'Requires admin permissions to use this command.'
  },

  // AI
  setaimodel: {
    category: 'AI',
    title: 'Switch AI Model',
    description: 'Switch between Gemini (default) and Groq for AI commands. You can set different models for conversations vs. tools.',
    usage: '-setaimodel [chat|tool] [gemini|groq]',
    examples: [
      '-setaimodel chat groq (use Groq for conversations)',
      '-setaimodel tool gemini (use Gemini for tools)',
      '-setaimodel chat gemini (back to Gemini for conversations)'
    ],
    notes: 'Both default to Gemini. Useful when hitting API limits. Groq doesn\'t support image analysis.'
  },

  // AI Tools
  analyze: {
    category: 'AI Tools',
    title: 'Image Analysis',
    description: 'Analyze images by uploading them, providing a URL, or replying to a message with an image. Supports PNG, JPG, GIF, and WebP.',
    usage: '-analyze [image_url] OR upload image OR reply to message',
    examples: [
      '-analyze https://example.com/image.jpg',
      'Upload an image with the -analyze command',
      'Reply to a message with -analyze (analyzes the image in that message)'
    ],
    notes: 'Max image size: 20MB. Groq will auto-fallback to Gemini for image analysis.'
  },

  codegen: {
    category: 'AI Tools',
    title: 'Code Generation',
    description: 'Generate clean, well-commented code for any programming task. Provide a description of what code you need.',
    usage: '-codegen [code_request] OR reply to message',
    examples: [
      '-codegen fibonacci function in javascript',
      '-codegen sort an array in python',
      'Reply to a message with -codegen (generates code for the message content)'
    ],
    notes: 'Generated code includes comments and usage examples where applicable.'
  },

  creative: {
    category: 'AI Tools',
    title: 'Creative Writing',
    description: 'Generate creative writing based on your prompt. Great for stories, poetry, scripts, and more.',
    usage: '-creative [writing_prompt] OR reply to message',
    examples: [
      '-creative write a short sci-fi story about time travel',
      '-creative a mysterious forest adventure',
      'Reply to a message with -creative'
    ],
    notes: 'Output is limited to 3900 characters per response.'
  },

  explain: {
    category: 'AI Tools',
    title: 'Simple Explanations',
    description: 'Get a topic explained in simple, easy-to-understand terms (like explaining to a 10-year-old).',
    usage: '-explain [topic] OR reply to message',
    examples: [
      '-explain quantum computing',
      '-explain blockchain technology',
      'Reply to a message with -explain'
    ],
    notes: 'Perfect for learning complex topics quickly.'
  },

  joke: {
    category: 'AI Tools',
    title: 'Tell a Joke',
    description: 'Get a funny joke. You can specify a style or let the bot choose randomly.',
    usage: '-joke [style]',
    examples: [
      '-joke (random joke)',
      '-joke dark humor',
      '-joke programming jokes'
    ],
    notes: 'Focuses on clever, actually funny jokes (not dad jokes unless requested).'
  },

  mathsolve: {
    category: 'AI Tools',
    title: 'Math Problem Solver',
    description: 'Solve math problems with step-by-step explanations. Works for algebra, calculus, geometry, and more.',
    usage: '-mathsolve [problem] OR reply to message',
    examples: [
      '-mathsolve solve 2x + 5 = 13',
      '-mathsolve find the derivative of x^2 + 3x',
      'Reply to a message with -mathsolve'
    ],
    notes: 'Includes detailed work and explanation for each step.'
  },

  riddle: {
    category: 'AI Tools',
    title: 'Get a Riddle',
    description: 'Get a riddle to solve with difficulty levels (easy, medium, hard). Answer is hidden in spoiler format.',
    usage: '-riddle [difficulty]',
    examples: [
      '-riddle (random difficulty)',
      '-riddle easy',
      '-riddle hard'
    ],
    notes: 'Answer reveals in spoiler format. Color changes by difficulty: green=easy, yellow=medium, red=hard.'
  },

  sentiment: {
    category: 'AI Tools',
    title: 'Sentiment Analysis',
    description: 'Analyze the sentiment (emotion) of any text. Get overall sentiment, confidence, and detected emotions.',
    usage: '-sentiment [text] OR reply to message',
    examples: [
      '-sentiment I absolutely love this amazing day!',
      '-sentiment this is terrible and I hate it',
      'Reply to a message with -sentiment'
    ],
    notes: 'Provides sentiment type, confidence level, and key emotions detected.'
  },

  summarize: {
    category: 'AI Tools',
    title: 'Text Summarization',
    description: 'Summarize long text into 2-3 key sentences while keeping all important points.',
    usage: '-summarize [text] OR reply to message',
    examples: [
      '-summarize [paste long text here]',
      'Reply to a message with -summarize'
    ],
    notes: 'Keeps the most important information while condensing the text.'
  },

  tips: {
    category: 'AI Tools',
    title: 'Tips & Advice',
    description: 'Get 5 practical, actionable tips for any topic you specify.',
    usage: '-tips [topic] OR reply to message',
    examples: [
      '-tips productivity',
      '-tips learning faster',
      '-tips staying healthy'
    ],
    notes: 'Tips are specific and useful, not generic advice.'
  },

  translate: {
    category: 'AI Tools',
    title: 'Language Translation',
    description: 'Translate text to any language. Specify the target language and provide the text.',
    usage: '-translate [language] [text] OR reply to message with language',
    examples: [
      '-translate spanish hello world',
      '-translate french I love this bot',
      'Reply to a message with -translate french'
    ],
    notes: 'Works with any language. Reply requires just the language name.'
  },

  trivia: {
    category: 'AI Tools',
    title: 'Trivia Questions',
    description: 'Get trivia questions with difficulty levels. Answer reveals after a delay. Syntax: -trivia [category] [difficulty] [delay]',
    usage: '-trivia [category] [difficulty] [delay_seconds]',
    examples: [
      '-trivia (random everything)',
      '-trivia history hard 30 (history, hard, 30 second delay)',
      '-trivia sports easy (sports, easy difficulty)',
      '-trivia easy (random category, easy difficulty)'
    ],
    notes: 'Difficulty: easy (green)=easiest, medium (yellow)=moderate, hard (red)=hardest. Delay: 1-60 seconds.'
  },

  // Customization
  setcolor: {
    category: 'Customization',
    title: 'Custom Embed Color',
    description: 'Set a custom color for all AI embed responses. Use hex color codes.',
    usage: '-setcolor [hex_color_code]',
    examples: [
      '-setcolor #FF5733',
      '-setcolor #00FF00 (green)',
      '-setcolor (shows current color)'
    ],
    notes: 'Color code format: #RRGGBB (e.g., #FF0000 for red)'
  },

  settitle: {
    category: 'Customization',
    title: 'Custom Embed Title',
    description: 'Set a custom title prefix for all AI embed responses.',
    usage: '-settitle [custom_title]',
    examples: [
      '-settitle Custom Title',
      '-settitle My Bot',
      '-settitle (shows current title)'
    ],
    notes: 'Custom title will appear at the top of embed responses.'
  },

  setfooter: {
    category: 'Customization',
    title: 'Custom Embed Footer',
    description: 'Set custom footer text that appears at the bottom of AI embed responses.',
    usage: '-setfooter [custom_footer_text]',
    examples: [
      '-setfooter My Custom Footer',
      '-setfooter Powered by Outlaw AI',
      '-setfooter (shows current footer)'
    ],
    notes: 'Footer text appears below the main content in embeds.'
  },

  embedsettings: {
    category: 'Customization',
    title: 'View Embed Settings',
    description: 'View all your current embed customization settings (color, title, footer).',
    usage: '-embedsettings',
    examples: [
      '-embedsettings'
    ],
    notes: 'Shows your current custom color, title, and footer settings.'
  },

  // Memory & Knowledge
  memory: {
    category: 'Memory & Knowledge',
    title: 'Memory Management',
    description: 'View or clear your personal memory. The bot remembers facts about you across conversations.',
    usage: '-memory [view|clear]',
    examples: [
      '-memory (view your facts)',
      '-memory clear (clear all saved facts about you)'
    ],
    notes: 'Memory is shared across all commands. All facts are accessible to the AI when responding.'
  },

  // Utility
  ping: {
    category: 'Utility',
    title: 'Bot Latency',
    description: 'Check the bot\'s current latency/response time in milliseconds.',
    usage: '-ping',
    examples: [
      '-ping'
    ],
    notes: 'Shows bot latency and Discord API response time.'
  },

  menu: {
    category: 'Utility',
    title: 'Command Menu',
    description: 'Display a complete menu of all available commands organized by category.',
    usage: '-menu',
    examples: [
      '-menu'
    ],
    notes: 'Shows all commands with brief descriptions and usage hints.'
  },

  help: {
    category: 'Utility',
    title: 'Detailed Command Help',
    description: 'Get detailed information about any command, including usage, examples, and tips.',
    usage: '-help [command_name]',
    examples: [
      '-help trivia (learn about trivia command)',
      '-help translate (learn about translate command)',
      '-help help (learn about this command!)'
    ],
    notes: 'Use this command to learn how to use any other command in detail.'
  }
};

module.exports = {
  data: { name: 'help', description: 'Get detailed help for a specific command' },
  async execute(message, args, client) {
    const commandName = args[0]?.toLowerCase();

    if (!commandName) {
      const embed = new EmbedBuilder()
        .setTitle('Help Command')
        .setDescription('Get detailed information about any command.')
        .setColor('#FFFFFF')
        .addFields({
          name: 'Usage',
          value: '-help [command_name]',
          inline: false
        },
        {
          name: 'Examples',
          value: '-help trivia\n-help translate\n-help analyze',
          inline: false
        },
        {
          name: 'Tips',
          value: 'Use `-menu` to see all available commands.',
          inline: false
        });

      return message.reply({ embeds: [embed] });
    }

    const help = commandHelp[commandName];

    if (!help) {
      return message.reply(`❌ Command \`${commandName}\` not found. Use \`-menu\` to see all commands.`);
    }

    const embed = new EmbedBuilder()
      .setTitle(`❓ ${help.title}`)
      .setDescription(help.description)
      .setColor('#5865F2')
      .addFields(
        {
          name: '📝 Usage',
          value: `\`${help.usage}\``,
          inline: false
        },
        {
          name: '📚 Examples',
          value: help.examples.map(ex => `• \`${ex}\``).join('\n'),
          inline: false
        }
      );

    if (help.notes) {
      embed.addFields({
        name: '💡 Notes',
        value: help.notes,
        inline: false
      });
    }

    await message.reply({ embeds: [embed] });
  }
};
