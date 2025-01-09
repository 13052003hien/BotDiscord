require('dotenv/config');
const { Client, IntentsBitField } = require('discord.js');
const axios = require('axios');
const logger = require('./utils/logger');

// Replace console.log/error with logger
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Promise Rejection', { error: error.message, stack: error.stack });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
});

// Add debug mode
const DEBUG = true;
function debugLog(...args) {
  if (DEBUG) {
    logger.debug('Debug Log', { args });
  }
}

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildMembers,
    // Removed GuildVoiceStates intent as it's no longer needed
  ],
});

// Add debug trace points
client.on('ready', () => {
  logger.trace('Bot initialization', {
    intents: client.options.intents,
    cache: {
      guilds: client.guilds.cache.size,
      users: client.users.cache.size,
      channels: client.channels.cache.size
    }
  });
  logger.info('Bot is online!', {
    username: client.user.tag,
    guilds: client.guilds.cache.size,
    env: {
      hasToken: !!process.env.TOKEN,
      hasApiKey: !!process.env.GOOGLE_API_KEY,
      channelId: process.env.CHANNEL_ID,
      welcomeChannelId: process.env.WELCOME_CHANNEL_ID
    }
  });
});

// Add error event handler
client.on('error', error => {
  logger.error('Bot Error', { error: error.message, stack: error.stack });
});

// Add welcome message tracker
const recentWelcomes = new Set();

client.on('guildMemberAdd', async (member) => {
  // Check if we've already welcomed this user recently
  const userId = member.user.id;
  if (recentWelcomes.has(userId)) {
    logger.debug('Skipping duplicate welcome message', { userId });
    return;
  }

  // Add user to recent welcomes
  recentWelcomes.add(userId);

  // Remove from set after 10 seconds
  setTimeout(() => {
    recentWelcomes.delete(userId);
  }, 10000);

  logger.debug('Sending welcome message', {
    username: member.user.username,
    userId: member.user.id
  });

  try {
    const welcomeChannel = member.guild.channels.cache.get(process.env.WELCOME_CHANNEL_ID);
    
    if (!welcomeChannel) {
      logger.error('Welcome channel not found!');
      return;
    }

    const welcomeMessage = `Yahoooo~ Chào mừng ${member.user.username} đến với server của chúng mình! ٩(◕‿◕｡)۶`;
    await welcomeChannel.send(welcomeMessage);
    logger.info(`Welcome message sent to ${member.user.username}`);
  } catch (error) {
    logger.error('Welcome message failed', {
      error: error.message,
      member: {
        username: member.user.username,
        id: member.user.id
      }
    });
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
            text: `Previous conversation:\n${conversationText}\nUser (cậu - MoMo): ${message.content}\nHãy trả lời xưng hô như một nhân vật anime ngọt ngào, gọi người kia là "cậu" và xưng là "MoMo". ٩(◕‿◕｡)۶ (Ví dụ: "Cậu ơi, MoMo đây~") :3`
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
    logger.error('Error processing message', { error: error.message, stack: error.stack });
    message.reply('Sorry, I encountered an error while processing your request.');
  }
});

// Add debug logging for permissions
client.on('channelCreate', channel => {
  if (channel.type === 'GUILD_TEXT') {
    logger.debug('Channel Permissions', {
      channel: channel.name,
      botPermissions: channel.permissionsFor(client.user).toArray()
    });
  }
});

// Add connection error handler
client.on('disconnect', (event) => {
  logger.warn('Bot disconnected', { event });
});

// Add reconnection handler
client.on('reconnecting', () => {
  logger.info('Bot is reconnecting...');
});

client.login(process.env.TOKEN).catch(error => {
  logger.error('Failed to login', {
    error: error.message,
    tokenPrefix: process.env.TOKEN?.slice(0, 10)
  });
});