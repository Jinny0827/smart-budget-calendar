declare module 'rate-limit-mongo' {
    import { Store } from 'express-rate-limit';
    class MongoDBStore implements Store {
        constructor(options: {
            uri: string;
            collectionName?: string;
            expireTimeMs?: number;
        });
        increment(key: string): Promise<{ totalHits: number; resetTime: Date }>;
        decrement(key: string): Promise<void>;
        resetKey(key: string): Promise<void>;
    }
    export default MongoDBStore;
}
