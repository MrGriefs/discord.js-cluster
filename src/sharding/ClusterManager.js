'use strict';

const clu = require('cluster');
const EventEmitter = require('events');
const fs = require('fs');
const numCPUs = require('os').cpus().length;
const path = require('path');
const { Collection } = require('@discordjs/collection');
const Cluster = require('./Cluster');
const { Error, TypeError, RangeError } = require('../errors');
const Util = require('../util/Util');

if (numCPUs < 2) {
  console.warn(`
  The discord.js-cluster library is intended for the use of multiprocessing.
  Your system is not capable of multiprocessing and therefore you
  will not see any performance increase using this library.
`);
}

/**
 * This is a utility class that makes multi-process sharding of a bot an easy and painless experience.
 * It works by spawning a self-contained {@link ChildProcess} or {@link Worker} for each individual shard, each
 * containing its own instance of your bot's {@link Client}. They all have a line of communication with the master
 * process, and there are several useful methods that utilise it in order to simplify tasks that are normally difficult
 * with sharding. It can spawn a specific number of shards or the amount that Discord suggests for the bot, and takes a
 * path to your main bot script to launch for each one.
 * @extends {EventEmitter}
 */
class ClusterManager extends EventEmitter {
  /**
   * The mode to spawn shards with for a {@link ClusterManager}. Can be either one of:
   * * 'process' to use child processes
   * * 'worker' to use [Worker threads](https://nodejs.org/api/worker_threads.html)
   * @typedef {string} ClusterManagerMode
   */

  /**
   * The options to spawn shards with for a {@link ClusterManager}.
   * @typedef {Object} ShardingManagerOptions
   * @property {string|number} [totalClusters='auto'] Number of total clusters of all cluster managers or "auto"
   * <warn>It is not recommended to spawn more clusters than CPUs.</warn>
   * @property {string|number} [totalShards='auto'] Number of total shards of all cluster managers or "auto"
   * @property {string|number[]} [clusterList='auto'] List of clusters to spawn or "auto"
   * @property {string|number[]} [shardList='auto'] List of shards to spawn or "auto"
   * @property {number} [guildsPerShard=1000] Amount of guilds each shard should spawn with
   * (only available when totalShards is set to 'auto')
   * @property {ClusterManagerMode} [mode='worker'] Which mode to use for clusters
   * <info>Multiprocessing is only available for workers</info>
   * @property {boolean} [clusterRespawn=true] Whether clusters should automatically respawn upon exiting
   * @property {boolean} [shardRespawn=true] Whether shards should automatically respawn upon exiting
   * @property {string[]} [shardArgs=[]] Arguments to pass to the shard script when spawning
   * (only available when mode is set to 'process')
   * @property {string} [execArgv=[]] Arguments to pass to the shard script executable when spawning
   * (only available when mode is set to 'process')
   * @property {string} [token] Token to use for automatic shard count and passing to shards
   */

  /**
   * @param {string} file Path to your shard script file
   * @param {ShardingManagerOptions} [options] Options for the sharding manager
   */
  constructor(file, options = {}) {
    super();
    options = Util.mergeDefault(
      {
        totalClusters: 'auto',
        totalShards: 'auto',
        guildsPerShard: 1000,
        mode: 'worker',
        clusterRespawn: true,
        shardRespawn: true,
        clusterArgs: [],
        shardArgs: [],
        execArgv: [],
        token: process.env.DISCORD_TOKEN,
      },
      options,
    );

    /**
     * Path to the shard script file
     * @type {string}
     */
    this.file = file;
    if (!file) throw new Error('CLIENT_INVALID_OPTION', 'File', 'specified.');
    if (!path.isAbsolute(file)) this.file = path.resolve(process.cwd(), file);
    const stats = fs.statSync(this.file);
    if (!stats.isFile()) throw new Error('CLIENT_INVALID_OPTION', 'File', 'a file');

    /**
     * List of clusters this cluster manager spawns
     * @type {string|number[]}
     */
    this.clusterList = options.clusterList ?? 'auto';
    if (this.clusterList !== 'auto') {
      if (!Array.isArray(this.clusterList)) {
        throw new TypeError('CLIENT_INVALID_OPTION', 'clusterList', 'an array.');
      }
      this.clusterList = [...new Set(this.clusterList)];
      if (this.clusterList.length < 1) throw new RangeError('CLIENT_INVALID_OPTION', 'clusterList', 'at least 1 id.');
      if (
        this.clusterList.some(
          clusterId =>
            typeof clusterId !== 'number' || isNaN(clusterId) || !Number.isInteger(clusterId) || clusterId < 0,
        )
      ) {
        throw new TypeError('CLIENT_INVALID_OPTION', 'clusterList', 'an array of positive integers.');
      }
    }

    /**
     * Amount of clusters that all cluster managers spawn in total
     * @type {number}
     */
    this.totalClusters = options.totalClusters || 'auto';
    if (this.totalClusters !== 'auto') {
      if (typeof this.totalClusters !== 'number' || isNaN(this.totalClusters)) {
        throw new TypeError('CLIENT_INVALID_OPTION', 'Amount of clusters', 'a number.');
      }
      if (this.totalClusters < 1) throw new RangeError('CLIENT_INVALID_OPTION', 'Amount of clusters', 'at least 1.');
      if (!Number.isInteger(this.totalClusters)) {
        throw new RangeError('CLIENT_INVALID_OPTION', 'Amount of clusters', 'an integer.');
      }
    }

    /**
     * List of shards this sharding manager spawns
     * @type {string|number[]}
     */
    this.shardList = options.shardList ?? 'auto';
    if (this.shardList !== 'auto') {
      if (!Array.isArray(this.shardList)) {
        throw new TypeError('CLIENT_INVALID_OPTION', 'shardList', 'an array.');
      }
      this.shardList = [...new Set(this.shardList)];
      if (this.shardList.length < 1) throw new RangeError('CLIENT_INVALID_OPTION', 'shardList', 'at least 1 id.');
      if (
        this.shardList.some(
          shardId => typeof shardId !== 'number' || isNaN(shardId) || !Number.isInteger(shardId) || shardId < 0,
        )
      ) {
        throw new TypeError('CLIENT_INVALID_OPTION', 'shardList', 'an array of positive integers.');
      }
    }

    /**
     * Amount of shards that all sharding managers spawn in total
     * @type {number}
     */
    this.totalShards = options.totalShards || 'auto';
    if (this.totalShards !== 'auto') {
      if (typeof this.totalShards !== 'number' || isNaN(this.totalShards)) {
        throw new TypeError('CLIENT_INVALID_OPTION', 'Amount of shards', 'a number.');
      }
      if (this.totalShards < 1) throw new RangeError('CLIENT_INVALID_OPTION', 'Amount of shards', 'at least 1.');
      if (!Number.isInteger(this.totalShards)) {
        throw new RangeError('CLIENT_INVALID_OPTION', 'Amount of shards', 'an integer.');
      }
    }

    /**
     * Amount of guilds each shard should spawn with
     * @type {number}
     */
    this.guildsPerShard = options.guildsPerShard || 1000;
    if (typeof this.guildsPerShard !== 'number' || isNaN(this.guildsPerShard)) {
      throw new TypeError('CLIENT_INVALID_OPTION', 'Amount of guilds per shard', 'a number.');
    }

    /**
     * Mode for shards to spawn with
     * @type {ClusterManagerMode}
     */
    this.mode = options.mode;
    if (this.mode !== 'process' && this.mode !== 'worker') {
      throw new RangeError('CLIENT_INVALID_OPTION', 'Cluster mode', '"process" or "worker"');
    }

    /**
     * Whether clusters should automatically respawn upon exiting
     * @type {boolean}
     */
    this.clusterRespawn = options.clusterRespawn;

    /**
     * Whether shards should automatically respawn upon exiting
     * @type {boolean}
     */
    this.shardRespawn = options.shardRespawn;

    /**
     * An array of arguments to pass to clusters (only when {@link ClusterManager#mode} is `process`)
     * @type {string[]}
     */
    this.clusterArgs = options.clusterArgs;

    /**
     * An array of arguments to pass to shards (only when {@link ClusterManager#mode} is `process`)
     * @type {string[]}
     */
    this.shardArgs = options.shardArgs;

    /**
     * An array of arguments to pass to the executable (only when {@link ClusterManager#mode} is `process`)
     * @type {string[]}
     */
    this.execArgv = options.execArgv;

    /**
     * Token to use for obtaining the automatic shard count, and passing to clusters
     * @type {?string}
     */
    this.token = options.token?.replace(/^Bot\s*/i, '') ?? null;

    /**
     * A collection of clusters that this manager has spawned
     * @type {Collection<number, Cluster>}
     */
    this.clusters = new Collection();

    process.env.CLUSTER_MANAGER = true;
    process.env.CLUSTER_MANAGER_MODE = this.mode;
    process.env.DISCORD_TOKEN = this.token;
  }

  /**
   * Creates a single shard.
   * <warn>Using this method is usually not necessary if you use the spawn method.</warn>
   * @param {number} [id=this.shards.size] Id of the shard to create
   * <info>This is usually not necessary to manually specify.</info>
   * @param {number[]} shards List of shard ids to spawn in this cluster
   * @returns {Cluster} Note that the created shard needs to be explicitly spawned using its spawn method.
   */
  createCluster(id = this.clusters.size, shards) {
    const cluster = new Cluster(this, id, shards);
    this.clusters.set(id, cluster);
    /**
     * Emitted upon creating a cluster.
     * @event ClusterManager#shardCreate
     * @param {Cluster} cluster Cluster that was created
     */
    this.emit('clusterCreate', cluster);
    return cluster;
  }

  /**
   * Option used to spawn multiple clusters.
   * @typedef {Object} MultipleClusterSpawnOptions
   * @property {number|string} [clusters=this.totalClusters] Number of clusters to spawn
   * @property {number|string} [shards=this.totalShards] Number of shards to spawn
   * @property {number} [delay=5500] How long to wait in between spawning each shard (in milliseconds)
   * @property {number} [timeout=30000] The amount in milliseconds to wait until the {@link Client} has become ready
   */

  /**
   * Spawns multiple clusters.
   * @param {MultipleClusterSpawnOptions} [options] Options for spawning shards
   * @returns {Promise<Collection<number, Cluster>>}
   */
  async spawn({ clusters = this.totalClusters, shards = this.totalShards, delay = 5500, timeout = 30000 } = {}) {
    // Modify the settings of this cluster
    clu.setupPrimary({
      exec: this.file,
      args: this.clusterArgs,
      execArgv: this.execArgv,
    });

    // Obtain/verify the number of shards to spawn
    if (shards === 'auto') {
      shards = await Util.fetchRecommendedShards(this.token, { guildsPerShard: this.guildsPerShard });
    } else {
      if (typeof shards !== 'number' || isNaN(shards)) {
        throw new TypeError('CLIENT_INVALID_OPTION', 'Amount of shards', 'a number.');
      }
      if (shards < 1) throw new RangeError('CLIENT_INVALID_OPTION', 'Amount of shards', 'at least 1.');
      if (!Number.isInteger(shards)) {
        throw new TypeError('CLIENT_INVALID_OPTION', 'Amount of shards', 'an integer.');
      }
    }

    // Make sure this many shards haven't already been spawned
    const shardSize = this.clusters.reduce(cluster => cluster.shards.length, 0);
    if (shardSize >= shards) throw new Error('SHARDING_ALREADY_SPAWNED', shards);
    if (this.shardList === 'auto' || this.totalShards === 'auto' || this.totalShards !== shards) {
      this.shardList = [...Array(shards).keys()];
    }
    if (this.totalShards === 'auto' || this.totalShards !== shards) {
      this.totalShards = shards;
    }

    if (this.shardList.some(shardId => shardId >= shards)) {
      throw new RangeError(
        'CLIENT_INVALID_OPTION',
        'Amount of shards',
        'bigger than the highest shardId in the shardList option.',
      );
    }

    // Obtain/verify the number of clusters to spawn
    if (clusters === 'auto') {
      clusters = numCPUs;
    } else {
      if (typeof clusters !== 'number' || isNaN(clusters)) {
        throw new TypeError('CLIENT_INVALID_OPTION', 'Amount of clusters', 'a number.');
      }
      if (clusters < 1) throw new RangeError('CLIENT_INVALID_OPTION', 'Amount of clusters', 'at least 1.');
      if (!Number.isInteger(clusters)) {
        throw new TypeError('CLIENT_INVALID_OPTION', 'Amount of clusters', 'an integer.');
      }
    }

    if (clusters > numCPUs) {
      this.emit(
        'warn',
        'Spawning more clusters than available CPUs is not recommended and will not increase performance.',
      );
    }

    // Split the list of shards into chunks and ensure this many clusters are needed
    const shardChunk = Util.chunk(this.shardList, clusters);
    if (clusters > shardChunk.length) {
      clusters = shardChunk.length;
    }

    // Make sure this many clusters haven't already been spawned
    if (this.clusters.size >= clusters) throw new Error('CLUSTER_ALREADY_SPAWNED', this.clusters.size);
    if (this.clusterList === 'auto' || this.totalClusters === 'auto' || this.totalClusters !== clusters) {
      this.clusterList = [...Array(clusters).keys()];
    }
    if (this.totalClusters === 'auto' || this.totalClusters !== clusters) {
      this.totalClusters = clusters;
    }

    if (this.clusterList.some(clusterId => clusterId >= clusters)) {
      throw new RangeError(
        'CLIENT_INVALID_OPTION',
        'Amount of clusters',
        'bigger than the highest clusterId in the clusterList option.',
      );
    }

    // Spawn the clusters
    for (const [clusterId, shardList] of Object.entries(shardChunk)) {
      const promises = [];
      const cluster = this.createCluster(clusterId, shardList);
      promises.push(cluster.spawn(timeout));
      if (delay > 0 && this.clusters.size !== this.clusterList.length) promises.push(Util.delayFor(delay));
      await Promise.all(promises); // eslint-disable-line no-await-in-loop
    }

    return this.clusters;
  }

  /**
   * Sends a message to all shards.
   * @param {*} message Message to be sent to the shards
   * @returns {Promise<Shard[]>}
   */
  broadcast(message) {
    const promises = [];
    for (const cluster of this.clusters.values()) promises.push(cluster.send(message));
    return Promise.all(promises);
  }

  /**
   * Options for {@link ClusterManager#broadcastEval} and {@link ShardClientUtil#broadcastEval}.
   * @typedef {Object} BroadcastEvalOptions
   * @property {number} [cluster] Shard to run script on, all if undefined
   * @property {*} [context] The JSON-serializable values to call the script with
   */

  /**
   * Evaluates a script on all shards, or a given shard, in the context of the {@link Client}s.
   * @param {Function} script JavaScript to run on each shard
   * @param {BroadcastEvalOptions} [options={}] The options for the broadcast
   * @returns {Promise<*|Array<*>>} Results of the script execution
   */
  broadcastEval(script, options = {}) {
    if (typeof script !== 'function') return Promise.reject(new TypeError('CLUSTER_INVALID_EVAL_BROADCAST'));
    return this._performOnClusters('eval', [`(${script})(this, ${JSON.stringify(options.context)})`], options.cluster);
  }

  /**
   * Fetches a client property value of each shard, or a given shard.
   * @param {string} prop Name of the client property to get, using periods for nesting
   * @param {number} [cluster] Shard to fetch property from, all if undefined
   * @returns {Promise<*|Array<*>>}
   * @example
   * manager.fetchClientValues('guilds.cache.size')
   *   .then(results => console.log(`${results.reduce((prev, val) => prev + val, 0)} total guilds`))
   *   .catch(console.error);
   */
  fetchClientValues(prop, cluster) {
    return this._performOnClusters('fetchClientValue', [prop], cluster);
  }

  /**
   * Runs a method with given arguments on all shards, or a given shard.
   * @param {string} method Method name to run on each shard
   * @param {Array<*>} args Arguments to pass through to the method call
   * @param {number} [cluster] Shard to run on, all if undefined
   * @returns {Promise<*|Array<*>>} Results of the method execution
   * @private
   */
  _performOnClusters(method, args, cluster) {
    if (this.clusters.size === 0) return Promise.reject(new Error('CLUSTER_NO_CLUSTERS'));

    if (typeof cluster === 'number') {
      if (this.clusters.has(cluster)) return this.clusters.get(cluster)[method](...args);
      return Promise.reject(new Error('CLUSTER_CLUSTER_NOT_FOUND', cluster));
    }

    if (this.clusters.size !== this.clusterList.length) return Promise.reject(new Error('CLUSTER_IN_PROCESS'));

    const promises = [];
    for (const cl of this.clusters.values()) promises.push(cl[method](...args));
    return Promise.all(promises);
  }

  /**
   * Options used to respawn all shards.
   * @typedef {Object} MultipleClusterRespawnOptions
   * @property {number} [shardDelay=5000] How long to wait between shards (in milliseconds)
   * @property {number} [delay=500] How long to wait between killing a shard's process and restarting it
   * (in milliseconds)
   * @property {number} [timeout=30000] The amount in milliseconds to wait for a shard to become ready before
   * continuing to another (`-1` or `Infinity` for no wait)
   */

  /**
   * Kills all running clusters and respawns them.
   * @param {MultipleClusterRespawnOptions} [options] Options for respawning clusters
   * @returns {Promise<Collection<number, Cluster>>}
   */
  async respawnAll({ shardDelay = 5000, delay = 500, timeout = 30000 } = {}) {
    let s = 0;
    for (const cluster of this.clusters.values()) {
      const promises = [cluster.respawn({ delay, timeout })];
      if (++s < this.clusters.size && shardDelay > 0) promises.push(Util.delayFor(shardDelay));
      await Promise.all(promises); // eslint-disable-line no-await-in-loop
    }
    return this.clusters;
  }
}

module.exports = ClusterManager;

/**
 * Emitted for general warnings.
 * @event Client#warn
 * @param {string} info The warning
 */
