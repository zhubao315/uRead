/**
 * IndexedDB 本地优先存储封装。
 *
 * 设计要点：
 * - 唯一入口 `openDatabase()`，含显式版本迁移表，便于后续 schema 演进；
 * - 仓储层（repository.ts）只依赖这里暴露的通用操作，不直接接触 IDB 事件；
 * - 浏览器不可用时（例如 SSR / 测试未注入 fake-indexeddb）抛出明确错误，
 *   不做静默降级，避免「看起来保存成功其实没存」。
 */

export const DB_NAME = 'uread';
export const DB_VERSION = 1;

export const STORES = [
  'books',
  'readingSessions',
  'highlights',
  'annotations',
  'notes',
  'booklists',
  'knowledgeCards',
  'knowledgeRelations',
] as const;

export type StoreName = (typeof STORES)[number];

export const STORE_KEYS: Record<StoreName, string> = {
  books: 'id',
  readingSessions: 'id',
  highlights: 'id',
  annotations: 'id',
  notes: 'id',
  booklists: 'id',
  knowledgeCards: 'id',
  knowledgeRelations: 'id',
};

/** 索引定义，供后续版本迁移使用。 */
export const INDEXES: Partial<Record<StoreName, { name: string; keyPath: string }[]>> = {
  books: [{ name: 'by_status', keyPath: 'status' }],
  notes: [
    { name: 'by_book', keyPath: 'book_id' },
    { name: 'by_kind', keyPath: 'note_kind' },
  ],
  highlights: [{ name: 'by_book', keyPath: 'book_id' }],
  annotations: [{ name: 'by_book', keyPath: 'book_id' }],
  knowledgeCards: [{ name: 'by_book', keyPath: 'book_id' }],
  knowledgeRelations: [{ name: 'by_source', keyPath: 'source_id' }],
};

type Migration = (db: IDBDatabase, tx: IDBTransaction) => void;

/** 版本号 → 迁移函数。新增版本时在此登记，保证升级路径可追溯。 */
export const MIGRATIONS: Record<number, Migration> = {
  1: (db, tx) => {
    STORES.forEach((store) => {
      if (!db.objectStoreNames.contains(store)) {
        const objectStore = db.createObjectStore(store, { keyPath: STORE_KEYS[store] });
        (INDEXES[store] ?? []).forEach((index) => {
          objectStore.createIndex(index.name, index.keyPath);
        });
      }
    });
    void tx;
  },
};

let dbPromise: Promise<IDBDatabase> | null = null;

function getIndexedDB(): IDBFactory {
  if (typeof indexedDB === 'undefined') {
    throw new Error('当前环境不支持 IndexedDB（浏览器隐私模式或测试未注入 fake-indexeddb）');
  }
  return indexedDB;
}

export class IndexedDbBlockedError extends Error {
  /** reason=blocked：另一标签页持有旧版本连接；reason=timeout：打开迟迟不返回。 */
  constructor(readonly reason: 'blocked' | 'timeout') {
    super(
      reason === 'blocked'
        ? 'IndexedDB 打开被其他标签页占用（通常是另一个窗口还开着旧版本页面）'
        : 'IndexedDB 打开超时（可能被浏览器存储权限或隐私设置拦截）',
    );
    this.name = 'IndexedDbBlockedError';
  }
}

/** 等待打开的时限。没有它，`blocked` 会让全站永远停在骨架屏（实测）。 */
export const OPEN_TIMEOUT_MS = 8000;

/** 打开（或复用）数据库连接。 */
export function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = getIndexedDB().open(DB_NAME, DB_VERSION);
    let settled = false;
    const fail = (error: Error): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      // 失败必须让下一次调用重试：缓存一个永不落定的 Promise
      // 会把之后每一次读写一起拖死（骨架屏转圈到宇宙尽头）。
      dbPromise = null;
      reject(error);
    };
    const timer = setTimeout(() => fail(new IndexedDbBlockedError('timeout')), OPEN_TIMEOUT_MS);
    request.onblocked = () => fail(new IndexedDbBlockedError('blocked'));
    request.onupgradeneeded = (event) => {
      const db = request.result;
      const tx = request.transaction;
      const from = event.oldVersion;
      for (let version = from + 1; version <= DB_VERSION; version += 1) {
        const migration = MIGRATIONS[version];
        if (migration) migration(db, tx as IDBTransaction);
      }
    };
    request.onsuccess = () => {
      if (settled) {
        // 超时之后才成功的连接必须关掉，否则会泄漏一个没人认得的句柄
        try {
          request.result.close();
        } catch {
          /* 已经关了就算了 */
        }
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve(request.result);
    };
    request.onerror = () => fail(request.error ?? new Error('无法打开 IndexedDB'));
  });
  return dbPromise;
}

/** 关闭连接（测试与「恢复备份」场景使用）。 */
export function closeDatabase(): void {
  if (!dbPromise) return;
  void dbPromise.then((db) => db.close()).catch(() => undefined);
  dbPromise = null;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB 请求失败'));
  });
}

/** 读取整表。 */
export async function getAll<T>(store: StoreName): Promise<T[]> {
  const db = await openDatabase();
  const tx = db.transaction(store, 'readonly');
  return requestToPromise(tx.objectStore(store).getAll()) as Promise<T[]>;
}

/** 按主键读取单条。 */
export async function getById<T>(store: StoreName, id: string): Promise<T | undefined> {
  const db = await openDatabase();
  const tx = db.transaction(store, 'readonly');
  return requestToPromise(tx.objectStore(store).get(id)) as Promise<T | undefined>;
}

/** 新增或覆盖一条记录。 */
export async function put<T extends { id: string }>(store: StoreName, value: T): Promise<T> {
  const db = await openDatabase();
  const tx = db.transaction(store, 'readwrite');
  await requestToPromise(tx.objectStore(store).put(value));
  return value;
}

/** 批量写入。 */
export async function putMany<T extends { id: string }>(
  store: StoreName,
  values: T[],
): Promise<void> {
  if (values.length === 0) return;
  const db = await openDatabase();
  const tx = db.transaction(store, 'readwrite');
  const objectStore = tx.objectStore(store);
  values.forEach((value) => {
    objectStore.put(value);
  });
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('批量写入失败'));
    tx.onabort = () => reject(tx.error ?? new Error('批量写入被中止'));
  });
}

/** 删除一条记录。 */
export async function remove(store: StoreName, id: string): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(store, 'readwrite');
  await requestToPromise(tx.objectStore(store).delete(id));
}

/** 清空一张表。 */
export async function clear(store: StoreName): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(store, 'readwrite');
  await requestToPromise(tx.objectStore(store).clear());
}

/** 按索引读取。 */
export async function getByIndex<T>(
  store: StoreName,
  indexName: string,
  value: IDBValidKey,
): Promise<T[]> {
  const db = await openDatabase();
  const tx = db.transaction(store, 'readonly');
  const index = tx.objectStore(store).index(indexName);
  return requestToPromise(index.getAll(value)) as Promise<T[]>;
}
