require('dotenv/config');
const { Client, IntentsBitField } = require('discord.js');
const axios = require('axios');

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildMembers, // Add this intent
  ],
});

client.on('ready', () => {
  console.log('The bot is online!');
});

// Add welcome message event handler
client.on('guildMemberAdd', async (member) => {
  try {
    const welcomeChannel = member.guild.channels.cache.get(process.env.WELCOME_CHANNEL_ID);
    if (!welcomeChannel) {
      console.error('Welcome channel not found!');
      return;
    }

    const welcomeMessage = `Yahoooo~ Chào mừng ${member.user.username} đến với server của chúng mình! MoMo rất vui khi được gặp cậu ٩(◕‿◕｡)۶`;
    await welcomeChannel.send(welcomeMessage);
  } catch (error) {
    console.error('Error sending welcome message:', error);
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== process.env.CHANNEL_ID) return;
  if (message.content.startsWith('!')) return;

  try {
    await message.channel.sendTyping();

    let prevMessages = await message.channel.messages.fetch({ limit: 15 });
    prevMessages.reverse();

    let conversationText = '';
    prevMessages.forEach((msg) => {
      if (msg.content.startsWith('!')) return;
      if (msg.author.id !== client.user.id && message.author.bot) return;
      if (msg.author.id !== message.author.id) return;
      conversationText += msg.content + '\n';
    });

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GOOGLE_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: `Previous conversation:\n${conversationText}\nUser (cậu - MoMo): ${message.content}\nHãy trả lời xưng hô như một nhân vật anime ngọt ngào, gọi người kia là "cậu" và xưng là "MoMo".`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const botMessage = response.data.candidates[0].content.parts[0].text;
    message.reply(botMessage);
  } catch (error) {
    console.error('Error details:', error.response?.data || error.message);
    message.reply('Sorry, I encountered an error while processing your request.');
  }
});

client.login(process.env.TOKEN);