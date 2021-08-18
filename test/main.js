const { Client } = require("../src/index");
const { Intents } = require('discord.js');

const client = new Client({
    intents: [
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILDS
    ]
});

client.once('ready', async () => {
    console.log(`Launched from ${client.cluster.id}`);
    console.log(`with shards ${client.shard.ids}`)

    const msg = await client.channels.resolve('858769057154859040')?.send(`Hello from cluster ${client.cluster.id}!`);

    console.log(msg ? msg.id : "Channel not found within cache.");
})

client.on('debug', console.debug)

client.on('error', console.error)

client.on('warn', console.warn)

client.login()