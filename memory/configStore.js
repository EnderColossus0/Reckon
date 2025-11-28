const memory = require('./memoryManager');

module.exports = {
  async getGuildConfig(guildId) {
    return await memory.getGuildConfig(guildId);
  },
  
  async setGuildConfig(guildId, config) {
    await memory.setGuildConfig(guildId, config);
  }
};
