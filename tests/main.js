const Base = require("../src/index").Base;
class Main extends Base {
    constructor(bot) {
        super(bot);
    }

    async launch() {
        console.log("Launched");
        
        let msg = await this.bot.channels.resolve('858769057154859040')?.send(`Hello from cluster ${this.clusterID}!`);

        console.log(msg ? msg.id : "Channel not found within cache.");
    }
}

module.exports = Main;