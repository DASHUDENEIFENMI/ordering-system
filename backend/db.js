const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const DB_PATH = path.join(DATA_DIR, 'data.db');

let db;
let SQL;

// Create a wrapper that provides better-sqlite3 compatible API
function createWrapper(sqlDb) {
  return {
    prepare(sql) {
      return {
        all(...params) {
          const stmt = sqlDb.prepare(sql);
          if (params.length > 0) stmt.bind(params);
          const rows = [];
          while (stmt.step()) {
            rows.push(stmt.getAsObject());
          }
          stmt.free();
          return rows;
        },
        get(...params) {
          const stmt = sqlDb.prepare(sql);
          if (params.length > 0) stmt.bind(params);
          let result = null;
          if (stmt.step()) {
            result = stmt.getAsObject();
          }
          stmt.free();
          return result;
        },
        run(...params) {
          const stmt = sqlDb.prepare(sql);
          if (params.length > 0) stmt.bind(params);
          stmt.step();
          stmt.free();
          saveDb(sqlDb);
          return {
            lastInsertRowid: sqlDb.exec("SELECT last_insert_rowid() as id")[0].values[0][0],
            changes: sqlDb.getRowsModified()
          };
        }
      };
    },
    exec(sql) {
      const result = sqlDb.exec(sql);
      saveDb(sqlDb);
      return result;
    },
    transaction(fn) {
      return (...args) => {
        sqlDb.exec('BEGIN');
        try {
          const result = fn(...args);
          sqlDb.exec('COMMIT');
          saveDb(sqlDb);
          return result;
        } catch (e) {
          sqlDb.exec('ROLLBACK');
          throw e;
        }
      };
    }
  };
}

function saveDb(sqlDb) {
  const data = sqlDb.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function loadDb() {
  if (fs.existsSync(DB_PATH)) {
    const data = fs.readFileSync(DB_PATH);
    return new SQL.Database(data);
  }
  return new SQL.Database();
}

function initTables(wrapper) {
  wrapper.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      sort_order INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      description TEXT DEFAULT '',
      image TEXT DEFAULT '',
      category_id INTEGER,
      available INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT NOT NULL UNIQUE,
      table_no TEXT DEFAULT '',
      note TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      total_price REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      menu_item_id INTEGER,
      item_name TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      price REAL NOT NULL,
      note TEXT DEFAULT '',
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );
  `);

  const count = wrapper.prepare('SELECT COUNT(*) as cnt FROM categories').get();
  if (count.cnt === 0) {
    const insert = wrapper.prepare('INSERT INTO categories (name, sort_order) VALUES (?, ?)');
    const categories = [['热菜', 1], ['凉菜', 2], ['主食', 3], ['饮品', 4], ['汤品', 5]];
    for (const [name, order] of categories) {
      insert.run(name, order);
    }
  }
}

async function getDb() {
  if (!db) {
    if (!SQL) SQL = await initSqlJs();
    const sqlDb = loadDb();
    db = createWrapper(sqlDb);
    initTables(db);
  }
  return db;
}

module.exports = { getDb };
