export interface MongoCursor<T> {
    toArray(): Promise<readonly T[]>;
}
export interface MongoCollection<T extends Record<string, unknown> = Record<string, unknown>> {
    find(filter?: Record<string, unknown>, options?: Record<string, unknown>): MongoCursor<T>;
    insertOne(document: T): Promise<{
        insertedId: unknown;
    }>;
    updateOne(filter: Record<string, unknown>, update: Record<string, unknown>): Promise<{
        matchedCount?: number;
        modifiedCount?: number;
    }>;
    deleteOne(filter: Record<string, unknown>): Promise<{
        deletedCount?: number;
    }>;
    countDocuments?(filter?: Record<string, unknown>): Promise<number>;
}
export interface MongoDatabase {
    collection<T extends Record<string, unknown> = Record<string, unknown>>(name: string): MongoCollection<T>;
}
export interface MongoClientLike {
    db(name?: string): MongoDatabase;
    close?(): Promise<void>;
}
export interface MongoDatabaseAdapter {
    collection<T extends Record<string, unknown> = Record<string, unknown>>(name: string): MongoCollection<T>;
    close(): Promise<void>;
}
/**
 * Creates a document-native MongoDB adapter around a mongodb-compatible client.
 * MongoDB is intentionally not forced into the relational DatabaseAdapter contract.
 */
export declare function createMongoDBAdapter(client: MongoClientLike, databaseName?: string): MongoDatabaseAdapter;
