/** @jest-environment node */

import { createPostgreSQLAdapter } from '../src';

function createFakePool() {
  const calls: string[] = [];
  const client = {
    async query(statement: string, parameters: readonly unknown[] = []) {
      calls.push(`${statement}:${JSON.stringify(parameters)}`);
      if (statement === 'select id from projects') return { rows: [{ id: 'p1' }], rowCount: 1 };
      if (statement.startsWith('insert')) return { rows: [{ id: 'p9' }], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    },
    release: jest.fn(),
  };
  const pool = {
    async query(statement: string, parameters: readonly unknown[] = []) {
      calls.push(`pool:${statement}:${JSON.stringify(parameters)}`);
      return statement === 'select id from projects'
        ? { rows: [{ id: 'p1' }], rowCount: 1 }
        : { rows: [{ id: 'p9' }], rowCount: 1 };
    },
    connect: jest.fn(async () => client),
    end: jest.fn(async () => undefined),
  };
  return { pool, client, calls };
}

describe('PostgreSQL database adapter', () => {
  it('maps pool queries and execution results', async () => {
    const { pool, calls } = createFakePool();
    const adapter = createPostgreSQLAdapter(pool, { insertIdColumn: 'id' });

    expect(await adapter.query<{ id: string }>('select id from projects')).toEqual([{ id: 'p1' }]);
    expect(await adapter.execute('insert into projects(name) values ($1) returning id', ['OneKit'])).toEqual({
      affectedRows: 1,
      insertId: 'p9',
    });
    expect(calls).toEqual([
      'pool:select id from projects:[]',
      'pool:insert into projects(name) values ($1) returning id:["OneKit"]',
    ]);
  });

  it('uses a dedicated client for transactions and releases it', async () => {
    const { pool, client, calls } = createFakePool();
    const adapter = createPostgreSQLAdapter(pool);

    await adapter.transaction(async transaction => {
      await transaction.execute('update projects set name = $1', ['Updated']);
    });

    expect(calls).toEqual([
      'BEGIN:[]',
      'update projects set name = $1:["Updated"]',
      'COMMIT:[]',
    ]);
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('rolls back failures and closes the pool', async () => {
    const { pool, client, calls } = createFakePool();
    const adapter = createPostgreSQLAdapter(pool);

    await expect(adapter.transaction(async () => {
      throw new Error('transaction failed');
    })).rejects.toThrow('transaction failed');
    expect(calls).toEqual(['BEGIN:[]', 'ROLLBACK:[]']);

    await adapter.close?.();
    expect(pool.end).toHaveBeenCalledTimes(1);
    expect(client.release).toHaveBeenCalledTimes(1);
  });
});
