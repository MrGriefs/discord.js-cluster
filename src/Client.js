'use strict';

const { Client, ShardClientUtil } = require('discord.js');
const ClusterClientUtil = require('./sharding/ClusterClientUtil');

class ClusterClient extends Client {
  constructor(options) {
    super(options);

    /**
     * Cluster helpers for the client (only if the process was spawned from a {@link ClusterManager})
     * @type {?ClusterClientUtil}
     */
    this.cluster = process.env.CLUSTER_MANAGER
      ? ClusterClientUtil.singleton(this, process.env.CLUSTER_MANAGER_MODE)
      : null;

    /**
     * Shard helpers for the client (only if the process was spawned from a {@link ClusterManager})
     * @type {?ShardClientUtil}
     */
    this.shard = process.env.CLUSTER_MANAGER ? ShardClientUtil.singleton(this) : null;
  }
}

module.exports = ClusterClient;
