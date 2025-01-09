const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('momodauroi')
    .setDescription('Kiểm tra độ trễ của bot')
    .setNameLocalizations({
      vi: 'momodauroi'
    }),
  async execute(interaction) {
    const sent = await interaction.reply({ 
      content: 'Đang tính toán...', 
      fetchReply: true 
    });
    
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(interaction.client.ws.ping);
    
    await interaction.editReply(
      `🏓 Pong!\nĐộ trễ bot: ${latency}ms\nĐộ trễ API: ${apiLatency}ms`
    );
  }
};
