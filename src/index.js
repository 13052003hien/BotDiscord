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
    IntentsBitField.Flags.GuildVoiceStates, // Add this intent
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

client.on('guildMemberAdd', async (member) => {
  logger.trace('Member add event triggered', {
    member: {
      id: member.user.id,
      username: member.user.username,
      joinedAt: member.joinedAt
    },
    guild: {
      id: member.guild.id,
      name: member.guild.name,
      memberCount: member.guild.memberCount
    }
  });
  logger.info('New member joined', {
    username: member.user.username,
    userId: member.user.id,
    guild: member.guild.name
  });
  
  try {
    await member.guild.channels.fetch(); // Fetch all channels if not cached
    const welcomeChannel = member.guild.channels.cache.get('1326839185973317663');
    
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
      stack: error.stack,
      member: {
        username: member.user.username,
        id: member.user.id,
        guild: member.guild.name
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

client.on('voiceStateUpdate', async (oldState, newState) => {
  logger.trace('Voice state update', {
    user: {
      id: newState.member.user.id,
      username: newState.member.user.username
    },
    oldChannel: oldState.channel?.name,
    newChannel: newState.channel?.name,
    timestamp: new Date().toISOString()
  });
  if (!oldState.channelId && newState.channelId) {
    logger.info('User joined voice channel', {
      username: newState.member.user.username,
      channelName: newState.channel.name
    });
    
    try {
      const channel = newState.guild.channels.cache.get(process.env.WELCOME_CHANNEL_ID);
      
      if (!channel) {
        logger.error('Voice welcome channel not found!', {
          channelId: process.env.WELCOME_CHANNEL_ID,
          guild: newState.guild.name,
          guildId: newState.guild.id
        });
        return;
      }

      if (!channel.permissionsFor(client.user).has('SendMessages')) {
        logger.error('Bot missing permissions in channel', { channelName: channel.name, required: 'SendMessages' });
        return;
      }

      await channel.send(`Yahoooo~ Chào mừng <@${newState.member.user.id}> đến kênh voice **${newState.channel.name}**! ٩(◕‿◕｡)۶`);
      logger.info(`Successfully sent voice welcome message for ${newState.member.user.username}`);
    } catch (error) {
      logger.error('Voice welcome message failed', {
        error: error.message,
        stack: error.stack,
        user: newState.member.user.username,
        channel: newState.channel.name
      });
    }
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