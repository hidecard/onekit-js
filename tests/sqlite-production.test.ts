/** @jest-environment node */

import { createSQLiteAdapter } from '../src';

function createFakeSQLite() {
  const calls: string[] = [];
  const database = {
    prepare(statement: string) {
      calls.push(statement);
      return {
        all: (...parameters: readonly unknown[]) => [{ statement, parameters }],
        run: (...parameters: readonly unknown[]) => ({
          changes: parameters.length ? 1 : 0,
          lastInsertRowid: 12n,
        }),
      };
    },
    close: jest.fn(),
  };
  return { database, calls };
}

describe('SQLite database adapter', () => {
  it('maps query and execute operations to the injected driver handle', async () => {
    const { database, calls } = createFakeSQLite();
    const adapter = createSQLiteAdapter(database);

    expect(await adapter.query<{ statement: string }>('select * from projects', ['p1'])).toEqual([
      { statement: 'select * from projects', parameters: ['p1'] },
    ]);
    expect(await adapter.execute('insert into projects(name) values (?)', ['OneKit'])).toEqual({
      affectedRows: 1,
      insertId: '12',
    });
    expect(calls).toEqual(['select * from projects', 'insert into projects(name) values (?)']);
  });

  it('wraps async work in BEGIN/COMMIT and rolls back failures', async () => {
    const { database, calls } = createFakeSQLite();
    const adapter = createSQLiteAdapter(database);

    await adapter.transaction(async transaction => {
      await transaction.execute('insert into projects(name) values (?)', ['OneKit']);
      return true;
    });
    expect(calls.slice(0, 3)).toEqual(['BEGIN', 'insert into projects(name) values (?)', 'COMMIT']);

    await expect(adapter.transaction(async () => {
      throw new Error('failure');
    })).rejects.toThrow('failure');
    expect(calls.slice(3)).toEqual(['BEGIN', 'ROLLBACK']);
  });

  it('closes the injected handle and supports numeric IDs when requested', async () => {
    const { database } = createFakeSQLite();
    const adapter = createSQLiteAdapter(database, { stringifyBigIntIds: false });
    expect((await adapter.execute('insert into projects default values')).insertId).toBe(12);
    await adapter.close?.();
    expect(database.close).toHaveBeenCalledTimes(1);
  });
});
