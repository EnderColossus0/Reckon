module.exports = {
  data: { name: 'ping', description: 'Check bot latency' },
  async execute(message, args) {
    const sent = await message.reply('Pinging...');
    const latency = sent.createdTimestamp - message.createdTimestamp;
    sent.edit(`Outlaw has a delay of ${latency}ms.`);
  }
};