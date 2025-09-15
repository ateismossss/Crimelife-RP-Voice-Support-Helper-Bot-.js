const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, getVoiceConnection, StreamType } = require('@discordjs/voice');
const path = require('path');
const config = require('./config.js');

// === EINSTELLUNGEN FÜR EMBEDS ===
const EMBED_AUTHOR = { 
    name: 'Voice Helper', 
    iconURL: 'https://cdn.discordapp.com/attachments/1194736265568976987/1410266876780740650/discord-logo-icon-editorial-free-vector.png?ex=68b064e0&is=68af1360&hm=89de90f08c2c2baa317c00f0c90dcfebcbb36e0046b31001e88b48e2c73d1a02&' 
};
const EMBED_FOOTER = { 
    text: '© Copyright 2025 | Ateismos', 
    iconURL: 'https://cdn.discordapp.com/attachments/1194736265568976987/1410266876780740650/discord-logo-icon-editorial-free-vector.png?ex=68b064e0&is=68af1360&hm=89de90f08c2c2baa317c00f0c90dcfebcbb36e0046b31001e88b48e2c73d1a02&' 
};

const AUDIO_FILE = path.join(__dirname, 'assets', 'audio.mp3');
const VOLUME = 0.3;

const client = new Client({ 
    intents: [ 
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildVoiceStates, 
        GatewayIntentBits.GuildMembers 
    ] 
});

let memberCount = 0;
let boostCount = 0;

client.on('ready', async () => {
    const guild = client.guilds.cache.get(config.guildId);
    if (!guild) {
        console.error('❌ Guild nicht gefunden!');
        return;
    }

    
    await guild.members.fetch(); 
    memberCount = guild.memberCount;
    boostCount = guild.premiumSubscriptionCount || 0;

    console.log(`\x1b[32m✅ Eingeloggt als ${client.user.tag}\x1b[0m`);
    console.log(`\x1b[31m🔧 Made by Ateismos\x1b[0m`);
    console.log(`Modul geladen!`);
});

client.on('guildMemberAdd', () => {
    memberCount++;
});

client.on('guildMemberRemove', () => {
    memberCount--;
});

client.on('voiceStateUpdate', (oldState, newState) => {
    const targetChannelId = config.voiceChannelId;

    if (!oldState.channel && newState.channel && newState.channel.id === targetChannelId && newState.member.id !== client.user.id) {
        const channel = newState.channel;
        if (channel.members.size === 1) {
            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
                selfDeaf: true
            });

            sendLogEmbed(
                config.logChannelId,
                'Bot ist dem Voice-Channel beigetreten',
                `ist dem Voice-Channel **${channel.name}** beigetreten.`,
                0x3498db,
                newState.member.id
            );

            setTimeout(() => {
                const player = createAudioPlayer();
                const resource = createAudioResource(AUDIO_FILE, { inputType: StreamType.Arbitrary, inlineVolume: true });
                resource.volume.setVolume(VOLUME);
                player.play(resource);

                player.on(AudioPlayerStatus.Idle, () => {
                    const loopResource = createAudioResource(AUDIO_FILE, { inputType: StreamType.Arbitrary, inlineVolume: true });
                    loopResource.volume.setVolume(VOLUME);
                    player.play(loopResource);
                });

                connection.subscribe(player);
            }, 2000);
        }
    }

    if (newState.member.id === client.user.id && newState.channelId && newState.channelId !== targetChannelId) {
        const connection = getVoiceConnection(newState.guild.id);
        if (connection) {
            connection.destroy();
            sendLogEmbed(
                config.logChannelId,
                'Bot hat den Voice-Channel verlassen',
                `Der Bot hat den Voice-Channel **${oldState.channel?.name || 'Unbekannt'}** verlassen.`,
                0xe74c3c
            );
        }
    }

    if (oldState.channel && oldState.channel.members.size === 1 && oldState.channel.members.has(client.user.id)) {
        const connection = getVoiceConnection(oldState.guild.id);
        if (connection) {
            connection.destroy();
            sendLogEmbed(
                config.logChannelId,
                'Bot hat den Voice-Channel verlassen',
                `Der Bot hat den Voice-Channel **${oldState.channel.name}** verlassen.`,
                0xe74c3c
            );
        }
    }
});

// ===   EMBED LOG   ===
function sendLogEmbed(channelId, title, description, color, userId = null) {
    const logChannel = client.channels.cache.get(channelId);
    if (!logChannel) return;
    if (userId) {
        description = `<@${userId}> ${description}`;
    }
    const embed = new EmbedBuilder()
        .setAuthor(EMBED_AUTHOR)
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setFooter(EMBED_FOOTER)
        .setTimestamp();
    logChannel.send({ embeds: [embed] });
}

// ===   STATUS   ===
const statuses = [
    () => `👥 ・Mitglieder ${memberCount}`,
    () => `💎 ・Boosts ${boostCount}`,
    () => `👀 ・Beobachtet Warteraum`
];

let i = 0;
setInterval(async () => {
    const guild = client.guilds.cache.get(config.guildId);
    if (!guild) return;

    
    boostCount = guild.premiumSubscriptionCount || 0;

    const statusText = statuses[i]();
    client.user.setPresence({
        activities: [{ name: statusText, type: 4 }],
        status: 'online'
    });

    i = (i + 1) % statuses.length;
}, 10000);

client.login(config.token);
