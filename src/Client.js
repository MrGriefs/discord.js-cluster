'use strict';

const { Client, ShardClientUtil } = require('discord.js');
const ClusterClientUtil = require('./sharding/ClusterClientUtil');
const Logger = require('./util/Logger');

/**
 * Options for the cluster client.
 * @typedef {Object} ClusterClientOptions
 * @param {boolean|Object} [logger=Logger]
 * @extends ClientOptions
 */

/**
 * Extends the base {@link Client} and creates a {@link ClusterClientUtil} and
 * {@link ShardClientUtil} for interacting with the {@link Cluster} and {@link Shard}s.
 * @extends {Client}
 */
class ClusterClient extends Client {
  /**
   * @param {ClusterClientOptions} options Options to pass to the {@link Client}
   */
  constructor(options) {
    if (options.logger === true) options.logger = Logger;
    if (options.logger) {
      for (const [log, fn] of Object.entries(options.logger)) {
        console[log] = fn.bind(null, `Cluster ${process.env.CLUSTERS}`);
      }
    }
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
