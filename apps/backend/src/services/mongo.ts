import { Collection, Document, MongoClient } from "mongodb";

let client: MongoClient | null = null;

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

async function getMongoClient(): Promise<MongoClient> {
  if (client) return client;

  client = new MongoClient(getMongoUri());
  await client.connect();
  return client;
}

export async function getCollection<TDocument extends Document>(name: string): Promise<Collection<TDocument>> {
  const connectedClient = await getMongoClient();
  return connectedClient.db(getMongoDbName()).collection<TDocument>(name);
}
