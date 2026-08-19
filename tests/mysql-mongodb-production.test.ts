import { createMongoDBAdapter, createMySQLAdapter } from '../src';

describe('MySQL adapter', () => {
  it('maps mysql2 query/execute results and releases transactions', async () => {
    const release = jest.fn();
    const connection = {
      query: jest.fn(async () => [[{ id: 1, name: 'Ada' }], []]),
      execute: jest.fn(async () => [{ affectedRows: 1, insertId: 9 }, []]),
      beginTransaction: jest.fn(async () => undefined),
      commit: jest.fn(async () => undefined),
      rollback: jest.fn(async () => undefined),
      release,
    };
    const pool = {
      query: jest.fn(async () => [[{ id: 1 }], []]),
      execute: jest.fn(async () => [{ affectedRows: 2 }, []]),
      getConnection: jest.fn(async () => connection),
      end: jest.fn(async () => undefined),
    };
    const adapter = createMySQLAdapter(pool);

    await expect(adapter.query<{ id: number }>('select 1')).resolves.toEqual([{ id: 1 }]);
    await expect(adapter.execute('insert', ['Ada'])).resolves.toEqual({ affectedRows: 2 });
    await expect(adapter.transaction(async (tx) => tx.execute('insert', ['Ada']))).resolves.toEqual({
      affectedRows: 1,
      insertId: 9,
    });
    expect(connection.beginTransaction).toHaveBeenCalled();
    expect(connection.commit).toHaveBeenCalled();
    expect(release).toHaveBeenCalledTimes(1);
    await adapter.close();
    expect(pool.end).toHaveBeenCalled();
  });

  it('rolls back and releases a failed transaction', async () => {
    const connection = {
      query: jest.fn(),
      execute: jest.fn(),
      beginTransaction: jest.fn(async () => undefined),
      commit: jest.fn(),
      rollback: jest.fn(async () => undefined),
      release: jest.fn(),
    };
    const adapter = createMySQLAdapter({
      query: jest.fn(),
      execute: jest.fn(),
      getConnection: jest.fn(async () => connection),
    });

    await expect(adapter.transaction(async () => { throw new Error('failed'); })).rejects.toThrow('failed');
    expect(connection.rollback).toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalled();
  });
});

describe('MongoDB adapter', () => {
  it('exposes typed collections and closes the injected client', async () => {
    const collection = {
      find: jest.fn(() => ({ toArray: jest.fn(async () => [{ _id: '1', name: 'Ada' }]) })),
      insertOne: jest.fn(async () => ({ insertedId: '2' })),
      updateOne: jest.fn(async () => ({ matchedCount: 1, modifiedCount: 1 })),
      deleteOne: jest.fn(async () => ({ deletedCount: 1 })),
    };
    const client = {
      db: jest.fn(() => ({ collection: jest.fn(() => collection) })),
      close: jest.fn(async () => undefined),
    };
    const adapter = createMongoDBAdapter(client, 'app');
    const users = adapter.collection<{ _id: string; name: string }>('users');

    await expect(users.find({ active: true }).toArray()).resolves.toEqual([{ _id: '1', name: 'Ada' }]);
    await expect(users.insertOne({ _id: '2', name: 'Grace' })).resolves.toEqual({ insertedId: '2' });
    await expect(users.updateOne({ _id: '2' }, { $set: { name: 'Grace Hopper' } })).resolves.toEqual({ matchedCount: 1, modifiedCount: 1 });
    await expect(users.deleteOne({ _id: '2' })).resolves.toEqual({ deletedCount: 1 });
    await adapter.close();
    expect(client.db).toHaveBeenCalledWith('app');
    expect(client.close).toHaveBeenCalled();
  });
});
