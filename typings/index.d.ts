import { Collection } from '@discordjs/collection';
import { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { Client, ClientOptions, ShardingManagerMode, Serialized, Awaited, Snowflake } from 'discord.js';
import { MessagePort, Worker } from 'worker_threads';

export class ClusterClient extends Client {
  public constructor(options: ClientOptions);
  public cluster: ClusterClientUtil | null;
}

export class Cluster extends EventEmitter {
  public constructor(manager: ClusterManager, id: number);
  private _evals: Map<string, Promise<unknown>>;
  private _exitListener: (...args: any[]) => void;
  private _fetches: Map<string, Promise<unknown>>;
  private _handleExit(respawn?: boolean): void;
  private _handleMessage(message: unknown): void;

  public args: string[];
  public execArgv: string[];
  public env: unknown;
  public id: number;
  public manager: ClusterManager;
  public process: ChildProcess | null;
  public ready: boolean;
  public worker: Worker | null;
  public eval(script: string): Promise<unknown>;
  public eval<T>(fn: (client: Client) => T): Promise<T[]>;
  public fetchClientValue(prop: string): Promise<unknown>;
  public kill(): void;
  public respawn(options?: { delay?: number; timeout?: number }): Promise<ChildProcess>;
  public send(message: unknown): Promise<Cluster>;
  public spawn(timeout?: number): Promise<ChildProcess>;

  public on(event: 'spawn' | 'death', listener: (child: ChildProcess) => Awaited<void>): this;
  public on(event: 'disconnect' | 'ready' | 'reconnecting', listener: () => Awaited<void>): this;
  public on(event: 'error', listener: (error: Error) => Awaited<void>): this;
  public on(event: 'message', listener: (message: any) => Awaited<void>): this;
  public on(event: string, listener: (...args: any[]) => Awaited<void>): this;

  public once(event: 'spawn' | 'death', listener: (child: ChildProcess) => Awaited<void>): this;
  public once(event: 'disconnect' | 'ready' | 'reconnecting', listener: () => Awaited<void>): this;
  public once(event: 'error', listener: (error: Error) => Awaited<void>): this;
  public once(event: 'message', listener: (message: any) => Awaited<void>): this;
  public once(event: string, listener: (...args: any[]) => Awaited<void>): this;
}

export class ClusterClientUtil {
  public constructor(client: Client, mode: ClusterManagerMode);
  private _handleMessage(message: unknown): void;
  private _respond(type: string, message: unknown): void;

  public client: Client;
  public readonly count: number;
  public readonly ids: number[];
  public mode: ClusterManagerMode;
  public parentPort: MessagePort | null;
  public broadcastEval<T>(fn: (client: Client) => Awaited<T>): Promise<Serialized<T>[]>;
  public broadcastEval<T>(fn: (client: Client) => Awaited<T>, options: { shard: number }): Promise<Serialized<T>>;
  public broadcastEval<T, P>(
    fn: (client: Client, context: Serialized<P>) => Awaited<T>,
    options: { context: P },
  ): Promise<Serialized<T>[]>;
  public broadcastEval<T, P>(
    fn: (client: Client, context: Serialized<P>) => Awaited<T>,
    options: { context: P; shard: number },
  ): Promise<Serialized<T>>;
  public fetchClientValues(prop: string): Promise<unknown[]>;
  public fetchClientValues(prop: string, shard: number): Promise<unknown>;
  public respawnAll(options?: MultipleShardRespawnOptions): Promise<void>;
  public send(message: unknown): Promise<void>;

  public static singleton(client: Client, mode: ClusterManagerMode): ClusterClientUtil;
  public static shardIdForGuildId(guildId: Snowflake, shardCount: number): number;
}

export class ClusterManager extends EventEmitter {
  public constructor(file: string, options?: ClusterManagerOptions);
  private _performOnShards(method: string, args: unknown[]): Promise<unknown[]>;
  private _performOnShards(method: string, args: unknown[], shard: number): Promise<unknown>;

  public file: string;
  public respawn: boolean;
  public shardArgs: string[];
  public clusters: Collection<number, Cluster>;
  public token: string | null;
  public totalShards: number | 'auto';
  public shardList: number[] | 'auto';
  public broadcast(message: unknown): Promise<Shard[]>;
  public broadcastEval<T>(fn: (client: Client) => Awaited<T>): Promise<Serialized<T>[]>;
  public broadcastEval<T>(fn: (client: Client) => Awaited<T>, options: { shard: number }): Promise<Serialized<T>>;
  public broadcastEval<T, P>(
    fn: (client: Client, context: Serialized<P>) => Awaited<T>,
    options: { context: P },
  ): Promise<Serialized<T>[]>;
  public broadcastEval<T, P>(
    fn: (client: Client, context: Serialized<P>) => Awaited<T>,
    options: { context: P; shard: number },
  ): Promise<Serialized<T>>;
  public createCluster(id: number): Cluster;
  public fetchClientValues(prop: string): Promise<unknown[]>;
  public fetchClientValues(prop: string, shard: number): Promise<unknown>;
  public respawnAll(options?: MultipleShardRespawnOptions): Promise<Collection<number, Shard>>;
  public spawn(options?: MultipleShardSpawnOptions): Promise<Collection<number, Shard>>;

  public on(event: 'clusterCreate', listener: (cluster: Cluster) => Awaited<void>): this;

  public once(event: 'clusterCreate', listener: (cluster: Cluster) => Awaited<void>): this;
}

export interface ClusterManagerOptions {
  totalShards?: number | 'auto';
  shardList?: number[] | 'auto';
  totalClusters?: number | 'auto';
  clusterList?: number[] | 'auto';
  mode?: ShardingManagerMode;
  respawn?: boolean;
  shardArgs?: string[];
  token?: string;
  execArgv?: string[];
}

export type ClusterManagerMode = ShardingManagerMode;