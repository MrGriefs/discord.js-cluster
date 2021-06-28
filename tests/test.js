const Sharder = require("../src/index").Master;
const path = require('path');

require('dotenv').config();

let sharder = new Sharder(`Bot ${process.env.TOKEN}`, path.join(__dirname, 'main.js'), {
    name: "Travis CLI",
    stats: true,
    clusters: 2,
    shards: 4,
    debug: true
});

sharder.on("stats", stats => {
    console.log(stats)
});

if (sharder.isMaster()) setTimeout(process.exit, 60000);