'use strict';

const EventEmitter = require('events');
const path = require('path');
const { Util } = require('discord.js');
const { Error } = require('../errors');
let childProcess = null;
let worker = null;

/**
 * A self-contained shard created by the {@link ClusterManager}. Each one has a {@link ChildProcess} that contains
 * an instance of the bot and its {@link Client}. When its child process/worker exits for any reason, the shard will
 * spawn a new one to replace it as necessary.
 * @extends EventEmitter
 */
class Cluster extends EventEmitter {
  /**
   * @param {ClusterManager} manager Manager that is creating this cluster
   * @param {number} id The cluster's id
   * @param {number[]} shards The list of shards to spawn
   */
  constructor(manager, id, shards) {
    super();

    if (manager.mode === 'process') childProcess = require('child_process');
    else if (manager.mode === 'worker') worker = require('cluster');

    /**
     * Manager that created the shard
     * @type {ClusterManager}
     */
    this.manager = manager;

    /**
     * The cluster's id in the manager
     * @type {number}
     */
    this.id = id ?? Number(process.env.CLUSTERS);

    /**
     * Arguments for the cluster's process (only when {@link ClusterManager#mode} is `process`)
     * @type {string[]}
     */
    this.args = manager.clusterArgs ?? [];

    /**
     * Arguments for the shard's process executable (only when {@link ClusterManager#mode} is `process`)
     * @type {string[]}
     */
    this.execArgv = manager.execArgv;

    /**
     * The shards this cluster managers
     * @type {number[]}
     */
    this.shards = shards ?? JSON.parse(process.env.SHARDS);

    /**
     * Environment variables for the cluster's process, or workerData for the cluster's worker
     * @type {Object}
     */
    this.env = Object.assign({}, process.env, {
      CLUSTER_MANAGER: true,
      CLUSTERS: this.id,
      CLUSTER_COUNT: process.env.CLUSTER_COUNT,
      SHARDS: JSON.stringify(this.shards),
      SHARD_COUNT: process.env.SHARD_COUNT ?? this.shards.length,
      DISCORD_TOKEN: this.manager.token,
    });

    /**
     * Whether the cluster's {@link Client} is ready
     * @type {boolean}
     */
    this.ready = false;

    /**
     * Process of the cluster (if {@link ClusterManager#mode} is `process`)
     * @type {?ChildProcess}
     */
    this.process = null;

    /**
     * Worker of the cluster (if {@link ClusterManager#mode} is `worker`)
     * @type {?Worker}
     */
    this.worker = null;

    /**
     * Ongoing promises for calls to {@link Cluster#eval}, mapped by the `script` they were called with
     * @type {Map<string, Promise>}
     * @private
     */
    this._evals = new Map();

    /**
     * Ongoing promises for calls to {@link Cluster#fetchClientValue}, mapped by the `prop` they were called with
     * @type {Map<string, Promise>}
     * @private
     */
    this._fetches = new Map();

    /**
     * Listener function for the {@link ChildProcess}' `exit` event
     * @type {Function}
     * @private
     */
    this._exitListener = this._handleExit.bind(this, undefined);
  }

  /**
   * Forks a child process or creates a worker thread for the cluster.
   * <warn>You should not need to call this manually.</warn>
   * @param {number} [timeout=30000] The amount in milliseconds to wait until the {@link Client} has become ready
   * before resolving (`-1` or `Infinity` for no wait)
   * @returns {Promise<ChildProcess>}
   */
  spawn(timeout = 30000) {
    if (this.process) throw new Error('CLUSTER_PROCESS_EXISTS', this.id);
    if (this.worker) throw new Error('CLUSTER_WORKER_EXISTS', this.id);

    if (this.manager.mode === 'process') {
      this.process = childProcess
        .fork(path.resolve(this.manager.file), this.args, {
          env: this.env,
          execArgv: this.execArgv,
        })
        .on('message', this._handleMessage.bind(this))
        .on('exit', this._exitListener);
    } else if (this.manager.mode === 'worker') {
      this.worker = worker.fork(this.env).on('message', this._handleMessage.bind(this)).on('exit', this._exitListener);
    }

    this._evals.clear();
    this._fetches.clear();

    const child = this.process ?? this.worker;

    /**
     * Emitted upon the creation of the cluster's child process/worker.
     * @event Cluster#spawn
     * @param {ChildProcess|Worker} process Child process/worker that was created
     */
    this.emit('spawn', child);

    if (timeout === -1 || timeout === Infinity) return child;
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(spawnTimeoutTimer);
        this.off('ready', onReady);
        this.off('disconnect', onDisconnect);
        this.off('death', onDeath);
      };

      const onReady = () => {
        cleanup();
        resolve(child);
      };

      const onDisconnect = () => {
        cleanup();
        reject(new Error('CLUSTER_READY_DISCONNECTED', this.id));
      };

      const onDeath = () => {
        cleanup();
        reject(new Error('CLUSTER_READY_DIED', this.id));
      };

      const onTimeout = () => {
        cleanup();
        reject(new Error('CLUSTER_READY_TIMEOUT', this.id));
      };

      const spawnTimeoutTimer = setTimeout(onTimeout, timeout * this.shards.length);
      this.once('ready', onReady);
      this.once('disconnect', onDisconnect);
      this.once('death', onDeath);
    });
  }

  /**
   * Immediately kills the cluster's process/worker and does not restart it.
   */
  kill() {
    const child = this.process ?? this.worker;
    child.removeListener('exit', this._exitListener);
    child.kill();

    this._handleExit(false);
  }

  /**
   * Options used to respawn a cluster.
   * @typedef {Object} ClusterRespawnOptions
   * @property {number} [delay=500] How long to wait between killing the process/worker and
   * restarting it (in milliseconds)
   * @property {number} [timeout=30000] The amount in milliseconds to wait until the {@link Client}
   * has become ready before resolving (`-1` or `Infinity` for no wait)
   */

  /**
   * Kills and restarts the cluster's process/worker.
   * @param {ClusterRespawnOptions} [options] Options for respawning the cluster
   * @returns {Promise<ChildProcess>}
   */
  async respawn({ delay = 500, timeout = 30000 } = {}) {
    this.kill();
    if (delay > 0) await Util.delayFor(delay);
    return this.spawn(timeout);
  }

  /**
   * Sends a message to the cluster's process/worker.
   * @param {*} message Message to send to the shard
   * @returns {Promise<Cluster>}
   */
  send(message) {
    const child = this.process ?? this.worker;
    return new Promise((resolve, reject) => {
      child.send(message, err => {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }

  /**
   * Fetches a client property value of the cluster.
   * @param {string} prop Name of the client property to get, using periods for nesting
   * @returns {Promise<*>}
   * @example
   * cluster.fetchClientValue('guilds.cache.size')
   *   .then(count => console.log(`${count} guilds in cluster ${cluster.id}`))
   *   .catch(console.error);
   */
  fetchClientValue(prop) {
    // Cluster is dead (maybe respawning), don't cache anything and error immediately
    if (!this.process && !this.worker) return Promise.reject(new Error('CLUSTER_NO_CHILD_EXISTS', this.id));

    // Cached promise from previous call
    if (this._fetches.has(prop)) return this._fetches.get(prop);

    const promise = new Promise((resolve, reject) => {
      const child = this.process ?? this.worker;

      const listener = message => {
        if (message?._fetchProp !== prop) return;
        child.removeListener('message', listener);
        this._fetches.delete(prop);
        resolve(message._result);
      };
      child.on('message', listener);

      this.send({ _fetchProp: prop }).catch(err => {
        child.removeListener('message', listener);
        this._fetches.delete(prop);
        reject(err);
      });
    });

    this._fetches.set(prop, promise);
    return promise;
  }

  /**
   * Evaluates a script or function on the cluster, in the context of the {@link Client}.
   * @param {string|Function} script JavaScript to run on the cluster
   * @returns {Promise<*>} Result of the script execution
   */
  eval(script) {
    // Cluster is dead (maybe respawning), don't cache anything and error immediately
    if (!this.process && !this.worker) return Promise.reject(new Error('CLUSTER_NO_CHILD_EXISTS', this.id));

    // Cached promise from previous call
    if (this._evals.has(script)) return this._evals.get(script);

    const promise = new Promise((resolve, reject) => {
      const child = this.process ?? this.worker;

      const listener = message => {
        if (message?._eval !== script) return;
        child.removeListener('message', listener);
        this._evals.delete(script);
        if (!message._error) resolve(message._result);
        else reject(Util.makeError(message._error));
      };
      child.on('message', listener);

      const _eval = typeof script === 'function' ? `(${script})(this)` : script;
      this.send({ _eval }).catch(err => {
        child.removeListener('message', listener);
        this._evals.delete(script);
        reject(err);
      });
    });

    this._evals.set(script, promise);
    return promise;
  }

  /**
   * Handles a message received from the child process/worker.
   * @param {*} message Message received
   * @private
   */
  _handleMessage(message) {
    if (message) {
      // Cluster is ready
      if (message._ready) {
        this.ready = true;
        /**
         * Emitted upon the cluster's {@link Client#ready} event.
         * @event Cluster#ready
         */
        this.emit('ready');
        return;
      }

      // Cluster has disconnected
      if (message._disconnect) {
        this.ready = false;
        /**
         * Emitted upon the cluster's {@link Client#disconnect} event.
         * @event Cluster#disconnect
         */
        this.emit('disconnect');
        return;
      }

      // Cluster is attempting to reconnect
      if (message._reconnecting) {
        this.ready = false;
        /**
         * Emitted upon the cluster's {@link Client#reconnecting} event.
         * @event Cluster#reconnecting
         */
        this.emit('reconnecting');
        return;
      }

      // Cluster is requesting a property fetch
      if (message._sFetchProp) {
        const resp = { _sFetchProp: message._sFetchProp, _sFetchPropShard: message._sFetchPropShard };
        this.manager.fetchClientValues(message._sFetchProp, message._sFetchPropShard).then(
          results => this.send({ ...resp, _result: results }),
          err => this.send({ ...resp, _error: Util.makePlainError(err) }),
        );
        return;
      }

      // Cluster is requesting an eval broadcast
      if (message._sEval) {
        const resp = { _sEval: message._sEval, _sEvalShard: message._sEvalShard };
        this.manager._performOnClusters('eval', [message._sEval], message._sEvalShard).then(
          results => this.send({ ...resp, _result: results }),
          err => this.send({ ...resp, _error: Util.makePlainError(err) }),
        );
        return;
      }

      // Cluster is requesting a respawn of all clusters
      if (message._sRespawnAll) {
        const { shardDelay, respawnDelay, timeout } = message._sRespawnAll;
        this.manager.respawnAll({ shardDelay, respawnDelay, timeout }).catch(() => {
          // Do nothing
        });
        return;
      }
    }

    /**
     * Emitted upon receiving a message from the child process/worker.
     * @event Cluster#message
     * @param {*} message Message that was received
     */
    this.emit('message', message);
  }

  /**
   * Handles the shard's process/worker exiting.
   * @param {boolean} [respawn=this.manager.respawn] Whether to spawn the shard again
   * @private
   */
  _handleExit(respawn = this.manager.clusterRespawn) {
    /**
     * Emitted upon the shard's child process/worker exiting.
     * @event Cluster#death
     * @param {ChildProcess|Worker} process Child process/worker that exited
     */
    this.emit('death', this.process ?? this.worker);

    this.ready = false;
    this.process = null;
    this.worker = null;
    this._evals.clear();
    this._fetches.clear();

    if (respawn) this.spawn().catch(err => this.emit('error', err));
  }
}

module.exports = Cluster;
