const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('chat')
    .setDescription('Trò chuyện với MoMo')
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Tin nhắn của bạn')
        .setRequired(true)),
  async execute(interaction) {
    await interaction.deferReply();
    const message = interaction.options.getString('message');

    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GOOGLE_API_KEY}`,
        {
          contents: [{
            parts: [{
              text: `User (cậu - MoMo): ${message}\nHãy trả lời xưng hô như một nhân vật anime ngọt ngào, gọi người kia là "cậu" và xưng là "MoMo". ٩(◕‿◕｡)۶`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          }
        },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const botMessage = response.data.candidates[0].content.parts[0].text;
      await interaction.editReply(botMessage);
    } catch (error) {
      await interaction.editReply('MoMo xin lỗi, MoMo không thể trả lời lúc này (╥﹏╥)');
    }
  }
};
