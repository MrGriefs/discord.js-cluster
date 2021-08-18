'use strict';

const {
  Constants: { Events },
} = require('discord.js');
const { Error } = require('../errors');
const Util = require('../util/Util');

/**
 * Helper class for sharded clients spawned as a child process/worker, such as from a {@link ShardingManager}.
 * Utilises IPC to send and receive data to/from the master process and other shards.
 */
class ClusterClientUtil {
  /**
   * @param {Client} client Client of the current shard
   * @param {ClusterManagerMode} mode Mode the shard was spawned with
   */
  constructor(client, mode) {
    /**
     * Client for the shard
     * @type {Client}
     */
    this.client = client;

    /**
     * Mode the shard was spawned with
     * @type {ClusterManagerMode}
     */
    this.mode = mode;

    process.on('message', this._handleMessage.bind(this));
    client.on('ready', () => {
      process.send({ _ready: true });
    });
    client.on('disconnect', () => {
      process.send({ _disconnect: true });
    });
    client.on('reconnecting', () => {
      process.send({ _reconnecting: true });
    });
  }

  /**
   * The cluster id of this client
   * @type {number}
   * @readonly
   */
  get id() {
    return JSON.parse((require('worker_threads').workerData ?? process.env).CLUSTERS);
  }

  /**
   * Total number of clusters
   * @type {number}
   * @readonly
   */
  get count() {
    return Number((require('worker_threads').workerData ?? process.env).CLUSTER_COUNT);
  }

  /**
   * Shard helpers for the client (only if the process was spawned from a {@link ClusterManager})
   * @type {ShardClientUtil}
   * @readonly
   */
  get shard() {
    return this.client.shard;
  }

  /**
   * Sends a message to the master process.
   * @param {*} message Message to send
   * @returns {Promise<void>}
   * @emits Shard#message
   */
  send(message) {
    return new Promise((resolve, reject) => {
      process.send(message, err => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Fetches a client property value of each cluster, or a given cluster.
   * @param {string} prop Name of the client property to get, using periods for nesting
   * @param {number} [cluster] Cluster to fetch property from, all if undefined
   * @returns {Promise<*|Array<*>>}
   * @example
   * client.cluster.fetchClientValues('guilds.cache.size')
   *   .then(results => console.log(`${results.reduce((prev, val) => prev + val, 0)} total guilds`))
   *   .catch(console.error);
   * @see {@link ClusterManager#fetchClientValues}
   */
  fetchClientValues(prop, cluster) {
    return new Promise((resolve, reject) => {
      const listener = message => {
        if (message?._sFetchProp !== prop || message._sFetchPropShard !== cluster) return;
        process.removeListener('message', listener);
        if (!message._error) resolve(message._result);
        else reject(Util.makeError(message._error));
      };
      process.on('message', listener);

      this.send({ _sFetchProp: prop, _sFetchPropShard: cluster }).catch(err => {
        process.removeListener('message', listener);
        reject(err);
      });
    });
  }

  /**
   * Evaluates a script or function on all clusters, or a given cluster, in the context of the {@link Client}s.
   * @param {Function} script JavaScript to run on each cluster
   * @param {BroadcastEvalOptions} [options={}] The options for the broadcast
   * @returns {Promise<*|Array<*>>} Results of the script execution
   * @example
   * client.cluster.broadcastEval(client => client.guilds.cache.size)
   *   .then(results => console.log(`${results.reduce((prev, val) => prev + val, 0)} total guilds`))
   *   .catch(console.error);
   * @see {@link ClusterManager#broadcastEval}
   */
  broadcastEval(script, options = {}) {
    return new Promise((resolve, reject) => {
      if (typeof script !== 'function') {
        reject(new TypeError('CLUSTER_INVALID_EVAL_BROADCAST'));
        return;
      }
      script = `(${script})(this, ${JSON.stringify(options.context)})`;

      const listener = message => {
        if (message?._sEval !== script || message._sEvalShard !== options.shard) return;
        process.removeListener('message', listener);
        if (!message._error) resolve(message._result);
        else reject(Util.makeError(message._error));
      };
      process.on('message', listener);

      this.send({ _sEval: script, _sEvalShard: options.shard }).catch(err => {
        process.removeListener('message', listener);
        reject(err);
      });
    });
  }

  /**
   * Requests a respawn of all shards.
   * @param {MultipleShardRespawnOptions} [options] Options for respawning shards
   * @returns {Promise<void>} Resolves upon the message being sent
   * @see {@link ClusterManager#respawnAll}
   */
  respawnAll({ shardDelay = 5000, respawnDelay = 500, timeout = 30000 } = {}) {
    return this.send({ _sRespawnAll: { shardDelay, respawnDelay, timeout } });
  }

  /**
   * Handles an IPC message.
   * @param {*} message Message received
   * @private
   */
  async _handleMessage(message) {
    if (!message) return;
    if (message._fetchProp) {
      const props = message._fetchProp.split('.');
      let value = this.client;
      for (const prop of props) value = value[prop];
      this._respond('fetchProp', { _fetchProp: message._fetchProp, _result: value });
    } else if (message._eval) {
      try {
        this._respond('eval', { _eval: message._eval, _result: await this.client._eval(message._eval) });
      } catch (err) {
        this._respond('eval', { _eval: message._eval, _error: Util.makePlainError(err) });
      }
    }
  }

  /**
   * Sends a message to the master process, emitting an error from the client upon failure.
   * @param {string} type Type of response to send
   * @param {*} message Message to send
   * @private
   */
  _respond(type, message) {
    this.send(message).catch(err => {
      const error = new Error(`Error when sending ${type} response to master process: ${err.message}`);
      error.stack = err.stack;
      /**
       * Emitted when the client encounters an error.
       * @event Client#error
       * @param {Error} error The error encountered
       */
      this.client.emit(Events.ERROR, error);
    });
  }

  /**
   * Creates/gets the singleton of this class.
   * @param {Client} client The client to use
   * @param {ClusterManagerMode} mode Mode the shard was spawned with
   * @returns {ClusterClientUtil}
   */
  static singleton(client, mode) {
    if (!this._singleton) {
      this._singleton = new this(client, mode);
    } else {
      client.emit(
        Events.WARN,
        'Multiple clients created in child process/worker; only the first will handle sharding helpers.',
      );
    }
    return this._singleton;
  }

  /**
   * Get the cluster id for a given guild id.
   * @param {Snowflake} guildId Snowflake guild id to get cluster id for
   * @param {number} clusterCount Number of clusters
   * @param {number} shardCount Number of shards
   * @returns {number}
   */
  static clusterIdForGuildId(guildId, clusterCount, shardCount) {
    const shard = Number(BigInt(guildId) >> 22n) % shardCount;
    if (shard < 0) throw new Error('CLUSTER_SHARD_MISCALCULATION', shard, guildId, clusterCount, shardCount);
    const cluster = Util.chunk(
      Array(shardCount)
        .fill()
        .map((_, i) => i),
      clusterCount,
    ).findIndex(shardList => shardList[0] < shard && shardList[shardList.length] > shard);
    if (cluster < 0) throw new Error('CLUSTER_CLUSTER_MISCALCULATION', cluster, guildId, clusterCount, shardCount);
    return cluster;
  }
}

module.exports = ClusterClientUtil;
