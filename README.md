<h2 align="center">Discord.js Sharder</h2>

<p align="center">
<a href="https://patreon.com/yeen"><img alt="Patreon" src="https://img.shields.io/badge/patreon-donate?color=F77F6F&labelColor=F96854&logo=patreon&logoColor=ffffff"></a>
<a href="https://discord.gg/eazpsZNrRk"><img alt="Discord" src="https://img.shields.io/discord/368557500884189186?color=7389D8&labelColor=6A7EC2&logo=discord&logoColor=ffffff"></a>
<img href="https://www.travis-ci.com/github/MrGriefs/discordjs-sharder" alt="Travis (.com)" src="https://img.shields.io/travis/MrGriefs/discordjs-sharder">
<img href="https://www.npmjs.com/package/discord.js-cluster" alt="David" src="https://img.shields.io/david/MrGriefs/discord.js-cluster">
<img href="https://www.npmjs.com/package/discord.js-cluster" alt="node-current" src="https://img.shields.io/node/v/discord.js-cluster">
<img href="https://www.npmjs.com/package/discord.js-cluster" alt="GitHub package.json version" src="https://img.shields.io/github/package-json/v/MrGriefs/discord.js-cluster">
<a href="https://npm.runkit.com/discord.js-cluster"><img alt="RunKit" src="https://img.shields.io/badge/Run-Kit-red"></a>
</p>

## Table of Contents

- [About](#about)
- [Installation](#installation)
- [Usage](#usage)
  - [Example](#example)
  - [Options](#options)

## About

Discord.js Cluster is a fork of [Eris Sharder](https://www.npmjs.org/package/eris-sharder), proposing a powerful sharding manager for the Discord.js library, using [Node.js's cluster](https://nodejs.org/api/cluster.html) module to spread shards evenly among all cores.
All features are on-par with [Eris Sharder](https://www.npmjs.org/package/eris-sharder), anything that gets added to [Eris Sharder](https://www.npmjs.org/package/eris-sharder) will get added here too.

## Installation

With npm:  

```bash
$ npm install discord.js-cluster
```

With yarn:  

```bash
$ yarn add discord.js-cluster
```

## Usage

In index.js:

```javascript
const Sharder = require('discord.js-cluster').Master;
const sharder = new Sharder(token, pathToMainFile, options);
```

In main.js

```javascript
const Base = require('discord.js-cluster').Base;
module.exports = class extends Base {
    constructor(bot) {
        super(bot);
    }

    launch() {

    }
}
```

### Example

#### Directory Tree

In this example the directory tree will look something like this:

```
Project/
├── node-modules/
│   ├── discord.js-cluster
|
├── src/
│   ├── main.js
│   
├── index.js
```

#### Example of main.js

```javascript
const Base = require('discord.js-cluster').Base;
module.exports = class extends Base{
    constructor(bot) {
        super(bot);
    }

    launch() {
      this.bot.channels.resolve('1234').send(`Hello from cluster ${this.clusterID}!`)
    }

}
```

#### Example of index.js

```javascript
const Discord = require('discord.js');
const Sharder = require('discord.js-cluster').Master;
const sharder = new Sharder('Bot Token', 'src/main.js', {
  client: ExtendedClient, // Optional: Pass in an extended d.js client to use instead
  stats: true,
  debug: true,
  guildsPerShard: 1500,
  name: 'Example Bot',
  webhooks: {
    shard: {
      id: 'Webhook ID',
      token: 'Webhook Token'
    },
     cluster: {
      id: 'Webhook ID',
      token: 'Webhook Token'
    }
  },
  // Optional: Options for the Discord.js Client
  clientOptions: {
    allowedMentions: { users: [], roles: [], repliedUser: false },
    intents: [
      Discord.Intents.GUILD_MESSAGES
    ]
  }
});

sharder.on("stats", stats => {
  console.log(stats);
});
```

### Options

| Name                     | Description                                                                                                                                                 | Default               |
|--------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------|
| `token`                  | your discord bot token. It will be used to calculate how many shards to spawn and to pass it on to your main file.                                          |                       |
| `pathToMainFile`         | path to a file that exports a class. The class must containt a method called "launch". In the constructor the only paramater you should put is for the bot. |                       |
| `options.client`         | An extended client to use instead.                                                                                                                          | `Discord.Client`      |
| `options.stats`          | boolean. When set to true it enables stats output.                                                                                                          | `false`               |
| `options.webhooks`       | Object. ```{shard: {id: "webhookID", token: "webhookToken"}, cluster:{id: "webhookID", token: "webhookToken"}}```                                           |                       |
| `options.clientOptions`  | A object of client options you want to pass to the Discord.js client constructor.                                                                           | `{}`                  |
| `options.clusters`       | The number of how many clusters you want. Defaults to the amount of threads                                                                                 |                       |
| `options.clusterTimeout` | Number of seconds between starting up clusters. Values lower than 5 may lead to an Invalid Session on first shard.                                          | `5000`                |
| `options.shards`         | The number of total shards you plan to run. Defaults to the amount that the gateway reccommends, taking into account `options.guildsPerShard`               |                       |
| `options.firstShardID`   | ID of the first shard to start on this instance.                                                                                                            | `0`                   |
| `options.lastShardID`    | ID of the last shard to start on this instance.                                                                                                             | `options.shards - 1`  |
| `options.debug`          | Boolean to enable debug logging.                                                                                                                            | false                 |
| `options.statsInterval`  | Interval to release the stats event in milliseconds.                                                                                                        | `1000`                |
| `options.name`           | Name to print on startup.                                                                                                                                   | `"DiscordJS-Sharder"` |
| `options.guildsPerShard` | Number to calculate how many guilds per shard. Defaults to 1300. Overriden if you only have 1 shard.                                                        | `1300`                |


To see an example, click [here](https://github.com/Discord-Sharders/eris-sharder#example)

### IPC

discord.js-cluster supports a variety of IPC events. All IPC events can be used via `process.send({type: "event"});`

#### Logging

discord.js-cluster supports the following IPC logging events.

| Name  | Example                                          | Description                      |
|-------|--------------------------------------------------|----------------------------------|
| log   | `process.send({name: "log", msg: "example"});`   | Logs to console with gray color. |
| info  | `process.send({name: "info", msg: "example"});`  | Logs to console in green color.  |
| debug | `process.send({name: "debug", msg: "example"});` | Logs to console in cyan color.   |
| warn  | `process.send({name: "warn", msg: "example"});`  | Logs to console in yellow color. |
| error | `process.send({name: "error", msg: "example"});` | Logs to console in red color.    |

#### Info

In every cluster when your code is loaded, if you extend the Base class you get access to `this.bot`, `this.clusterID`, and  `this.ipc`. `this.ipc` has a couple methods which you can find very useful.

| Name         | Example                                   | Description                                                                           |
|--------------|-------------------------------------------|---------------------------------------------------------------------------------------|
| register     | `this.ipc.register(event, callback);`     | Using this you can register to listen for events and a callback that will handle them |
| unregister   | `this.ipc.unregister(event);`             | Use this to unregister for an event                                                   |
| broadcast    | `this.ipc.broadcast(name, message);`      | Using this you can send a custom message to every cluster                             |
| sendTo       | `this.ipc.sendTo(cluster, name, message)` | Using this you can send a message to a specific cluster                               |
| fetchUser    | `await this.ipc.fetchUser(id)`            | Using this you can search for a user by id on all clusters                            |
| fetchGuild   | `await this.ipc.fetchGuild(id)`           | Using this you can search for a guild by id on all clusters                           |
| fetchChannel | `await this.ipc.fetchChannel(id)`         | Using this you can search for a channel by id on all clusters                         |
