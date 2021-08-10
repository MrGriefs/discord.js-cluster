const Sharder = require("../src/index").Master;
const { Intents } = require('discord.js');
const path = require('path');

require('dotenv').config();

let sharder = new Sharder(`Bot ${process.env.TOKEN}`, path.join(__dirname, 'main.js'), {
    name: "Travis CLI",
    stats: true,
    clusters: 2,
    shards: 4,
    debug: true,
    clientOptions: {
        intents: [
            Intents.FLAGS.GUILD_MESSAGES,
            Intents.FLAGS.GUILDS
        ]
    }
});

sharder.on("stats", stats => {
    console.log(stats)
});

if (sharder.isMaster()) setTimeout(process.exit, 60000 * 5);