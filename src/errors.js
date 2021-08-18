'use strict';

const Errors = require('discord.js/src/errors/index.js');

const Messages = {
  CLUSTER_INVALID: 'Invalid cluster settings were provided.',
  CLUSTER_NO_CLUSTERS: 'No clusters have been spawned.',
  CLUSTER_IN_PROCESS: 'Clusters are still being spawned.',
  CLUSTER_INVALID_EVAL_BROADCAST: 'Script to evaluate must be a function',
  CLUSTER_IS_PRIMARY: 'Clusters cannot be spawned from a Primary cluster manager.',
  CLUSTER_CLUSTER_NOT_FOUND: id => `Cluster ${id} could not be found.`,
  CLUSTER_ALREADY_SPAWNED: count => `Already spawned ${count} clusters.`,
  CLUSTER_PROCESS_EXISTS: id => `Cluster ${id} already has an active process.`,
  CLUSTER_WORKER_EXISTS: id => `Cluster ${id} already has an active worker.`,
  CLUSTER_READY_TIMEOUT: id => `Cluster ${id}'s Client took too long to become ready.`,
  CLUSTER_READY_DISCONNECTED: id => `Cluster ${id}'s Client disconnected before becoming ready.`,
  CLUSTER_READY_DIED: id => `Cluster ${id}'s process exited before its Client became ready.`,
  CLUSTER_NO_CHILD_EXISTS: id => `Cluster ${id} has no active process or worker.`,
  CLUSTER_CLUSTER_MISCALCULATION: (cluster, guild, clusterCount, shardCount) =>
    `Calculated invalid cluster ${cluster} for guild ${guild} with ${clusterCount} clusters and ${shardCount} shards.`,
  CLUSTER_SHARD_MISCALCULATION: (shard, guild, clusterCount, shardCount) =>
    `Calculated invalid shard ${shard} for guild ${guild} with ${clusterCount} clusters and ${shardCount} shards.`,
};

for (const [name, message] of Object.entries(Messages)) Errors.register(name, message);

module.exports = Errors;
