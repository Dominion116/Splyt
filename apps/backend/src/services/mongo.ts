import { Collection, Document, MongoClient } from "mongodb";

let client: MongoClient | null = null;
// Tracks an in-flight connect() so concurrent callers don't open competing
// connections after a drop.
let connecting: Promise<MongoClient> | null = null;

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is required");
  }
  return uri;
}

function getMongoDbName(): string {
  return process.env.MONGODB_DB_NAME ?? "splyt";
}

/**
 * Returns a healthy MongoClient. Detects a dropped connection by pinging the
 * admin db before each handout — when the ping fails we discard the stale
 * client and reconnect. Without this, a network blip or Atlas failover would
 * leave the cached client wedged and every API request would 500 until the
 * Node process was restarted (LOW-02).
 */
async function getMongoClient(): Promise<MongoClient> {
  if (client) {
    try {
      // Cheap liveness probe; round-trips to the cluster.
      await client.db("admin").command({ ping: 1 });
      return client;
    } catch (err) {
      console.warn("[mongo] ping failed, reconnecting:", err instanceof Error ? err.message : err);
      // Best-effort cleanup; ignore close errors on an already-broken client.
      try {
        await client.close(true);
      } catch {
        /* noop */
      }
      client = null;
    }
  }

  if (connecting) return connecting;

  connecting = (async () => {
    const next = new MongoClient(getMongoUri(), {
      // Modest server selection so a cold cluster doesn't hold the request
      // for the default 30s.
      serverSelectionTimeoutMS: 5_000,
      retryReads: true,
      retryWrites: true
    });
    await next.connect();
    client = next;
    return next;
  })().finally(() => {
    connecting = null;
  });

  return connecting;
}

export async function getCollection<TDocument extends Document>(name: string): Promise<Collection<TDocument>> {
  const connectedClient = await getMongoClient();
  return connectedClient.db(getMongoDbName()).collection<TDocument>(name);
}
