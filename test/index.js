const { ClusterManager, Logger } = require("../src/index");
const path = require('path');

require('dotenv').config();

let manager = new ClusterManager(path.join(__dirname, 'main.js'), {
    logger: Logger,
    mode: 'worker'
});

manager.spawn();