<h2 align="center">Discord.js Sharder</h2>

<p align="center">
<a href="https://patreon.com/yeen"><img alt="Patreon" src="https://img.shields.io/badge/patreon-donate?color=F77F6F&labelColor=F96854&logo=patreon&logoColor=ffffff"></a>
<a href="https://discord.gg/eazpsZNrRk"><img alt="Discord" src="https://img.shields.io/discord/368557500884189186?color=7389D8&labelColor=6A7EC2&logo=discord&logoColor=ffffff"></a>
<img href="https://www.travis-ci.com/github/MrGriefs/discordjs-sharder" alt="Travis (.com)" src="https://www.travis-ci.com/MrGriefs/discord.js-cluster.svg?branch=master">
<img href="https://www.npmjs.com/package/discord.js-cluster" alt="David" src="https://img.shields.io/david/MrGriefs/discord.js-cluster">
<img href="https://www.npmjs.com/package/discord.js-cluster" alt="node-current" src="https://img.shields.io/node/v/discord.js-cluster">
<img href="https://www.npmjs.com/package/discord.js-cluster" alt="GitHub package.json version" src="https://img.shields.io/github/package-json/v/MrGriefs/discord.js-cluster">
<a href="https://npm.runkit.com/discord.js-cluster"><img alt="RunKit" src="https://img.shields.io/badge/Run-Kit-red"></a>
</p>

## Table of Contents

- [About](#about)
- [Installation](#installation)
- [Usage](#usage)
- [Documentation](#documentation)

## About

discord.js-cluster is a powerful cluster manager for the [Discord.js](https://discord.js.org/) library which implements [multiprocessing](https://en.wikipedia.org/wiki/Multicore_programming) to increase the performance of your client, heavily inspired by the Discord.js built-in [ShardingManager](https://discord.js.org/#/docs/main/stable/class/ShardingManager).  
Using the Node.js [cluster](https://nodejs.org/api/cluster.html) module, Discord.js Cluster spreads all [ShardingManager](https://discord.js.org/#/docs/main/stable/class/ShardingManager)s evenly among cores, and is easy to implement!

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

Can be used exactly like the [ShardingManager](https://discord.js.org/#/docs/main/stable/class/ShardingManager)  
`index.js:`

```javascript
const { ClusterManager } = require('discord.js-cluster');

const manager = new ClusterManager('./bot.js', { token: 'your-token-goes-here' });

manager.on('clusterCreate', cluster => console.log(`Launched cluster ${cluster.id}`));

manager.spawn();
```

`bot.js:`

```javascript
const { Client } = require('discord.js-cluster');
const { Intents } = require('discord.js');

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

client.on('ready', () => console.log(`Cluster ${client.cluster.id} is ready!`));

client.login(); // no token is required here!
```

## <a id="documentation"></a> [Documentation](https://mrgriefs.github.io/discord.js-cluster)

You can find more documentation on the [website](https://mrgriefs.github.io/discord.js-cluster).
