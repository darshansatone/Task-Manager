const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Environment configurations
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_ANON_KEY;
const forceMock = process.env.USE_MOCK_SUPABASE === 'true';

// Local storage path for offline / zero-setup persistence
const DATA_DIR = path.join(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'local_db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.warn('[Storage] Could not create data directory:', err.message);
  }
}

// In-Memory / File-Persisted Store
let store = {
  users: [],
  categories: [],
  tasks: [],
  activity_logs: []
};

// Load saved store from disk if available
function loadStore() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      store = {
        users: Array.isArray(parsed.users) ? parsed.users : [],
        categories: Array.isArray(parsed.categories) ? parsed.categories : [],
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
        activity_logs: Array.isArray(parsed.activity_logs) ? parsed.activity_logs : []
      };
    }
  } catch (err) {
    console.warn('[Storage] Could not read local_db.json, starting fresh:', err.message);
  }
}

// Save store to disk
function saveStore() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    console.warn('[Storage] Could not write local_db.json:', err.message);
  }
}

// Initialize store from disk
loadStore();

// Helper to determine if real credentials are configured
const isLiveSupabase = () => {
  if (forceMock) return false;
  if (!supabaseUrl || !supabaseKey) return false;
  if (supabaseUrl.includes('your-project-ref') || supabaseKey.includes('your_supabase')) return false;
  return true;
};

class MockQueryBuilder {
  constructor(tableName) {
    this.tableName = tableName;
    if (!store[tableName]) store[tableName] = [];
    this.table = store[tableName];
    this.filters = [];
    this.orderRules = [];
    this.rangeRule = null;
    this.limitRule = null;
    this.isSingle = false;
    this.isMaybeSingle = false;
    this.action = 'select';
    this.selectedColumns = '*';
    this.countOption = null;
    this.isHead = false;
    this.payload = null;
  }

  select(columns = '*', options = {}) {
    this.selectedColumns = columns;
    if (options.count) this.countOption = options.count;
    if (options.head) this.isHead = Boolean(options.head);
    return this;
  }

  insert(values) {
    this.action = 'insert';
    this.payload = values;
    return this;
  }

  update(values) {
    this.action = 'update';
    this.payload = values;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  eq(col, val) {
    this.filters.push((row) => row[col] === val);
    return this;
  }

  neq(col, val) {
    this.filters.push((row) => row[col] !== val);
    return this;
  }

  lt(col, val) {
    this.filters.push((row) => {
      if (!row[col]) return false;
      return new Date(row[col]) < new Date(val);
    });
    return this;
  }

  lte(col, val) {
    this.filters.push((row) => {
      if (!row[col]) return false;
      return new Date(row[col]) <= new Date(val);
    });
    return this;
  }

  gt(col, val) {
    this.filters.push((row) => {
      if (!row[col]) return false;
      return new Date(row[col]) > new Date(val);
    });
    return this;
  }

  gte(col, val) {
    this.filters.push((row) => {
      if (!row[col]) return false;
      return new Date(row[col]) >= new Date(val);
    });
    return this;
  }

  in(col, vals) {
    const set = new Set(vals);
    this.filters.push((row) => set.has(row[col]));
    return this;
  }

  is(col, val) {
    this.filters.push((row) => row[col] === val);
    return this;
  }

  or(filterStr) {
    const clauses = filterStr.split(',').map((c) => c.trim());
    this.filters.push((row) => {
      return clauses.some((clause) => {
        const parts = clause.split('.');
        if (parts.length >= 3 && parts[1] === 'ilike') {
          const col = parts[0];
          const term = parts[2].replace(/%/g, '').toLowerCase();
          const val = (row[col] || '').toString().toLowerCase();
          return val.includes(term);
        }
        return false;
      });
    });
    return this;
  }

  order(col, options = { ascending: true }) {
    this.orderRules.push({ col, ascending: options.ascending !== false });
    return this;
  }

  range(from, to) {
    this.rangeRule = { from, to };
    return this;
  }

  limit(num) {
    this.limitRule = num;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  async then(resolve, reject) {
    try {
      let result;

      if (this.action === 'insert') {
        const items = Array.isArray(this.payload) ? this.payload : [this.payload];
        const created = items.map((item) => {
          const row = {
            id: item.id || crypto.randomUUID(),
            ...item,
            created_at: item.created_at || new Date().toISOString(),
            updated_at: item.updated_at || new Date().toISOString()
          };
          this.table.push(row);
          return row;
        });

        saveStore();

        const populated = created.map((row) => this._populate(row));
        result = {
          data: this.isSingle || !Array.isArray(this.payload) ? populated[0] : populated,
          error: null
        };
      } else if (this.action === 'update') {
        const matched = this.table.filter((row) => this.filters.every((fn) => fn(row)));
        matched.forEach((row) => {
          Object.assign(row, this.payload, { updated_at: new Date().toISOString() });
        });

        if (matched.length > 0) saveStore();

        const populated = matched.map((row) => this._populate(row));
        result = {
          data: this.isSingle ? populated[0] || null : populated,
          error: null
        };
      } else if (this.action === 'delete') {
        const indicesToRemove = [];
        this.table.forEach((row, idx) => {
          if (this.filters.every((fn) => fn(row))) {
            indicesToRemove.push(idx);
          }
        });
        for (let i = indicesToRemove.length - 1; i >= 0; i--) {
          this.table.splice(indicesToRemove[i], 1);
        }

        if (indicesToRemove.length > 0) saveStore();

        result = { data: null, error: null };
      } else {
        // Select
        let rows = this.table.filter((row) => this.filters.every((fn) => fn(row)));
        const totalCount = rows.length;

        if (this.orderRules.length > 0) {
          rows.sort((a, b) => {
            for (const rule of this.orderRules) {
              const valA = a[rule.col];
              const valB = b[rule.col];
              if (valA === valB) continue;
              if (valA === null || valA === undefined) return 1;
              if (valB === null || valB === undefined) return -1;
              if (rule.ascending) {
                return valA > valB ? 1 : -1;
              } else {
                return valA < valB ? 1 : -1;
              }
            }
            return 0;
          });
        }

        if (this.rangeRule) {
          rows = rows.slice(this.rangeRule.from, this.rangeRule.to + 1);
        } else if (this.limitRule) {
          rows = rows.slice(0, this.limitRule);
        }

        const populated = rows.map((row) => this._populate(row));

        if (this.isSingle) {
          if (populated.length === 0) {
            result = { data: null, error: { message: 'Row not found', code: 'PGRST116' } };
          } else {
            result = { data: populated[0], error: null };
          }
        } else if (this.isMaybeSingle) {
          result = { data: populated[0] || null, error: null };
        } else {
          result = {
            data: this.isHead ? null : populated,
            error: null,
            count: this.countOption ? totalCount : undefined
          };
        }
      }

      resolve(result);
    } catch (err) {
      reject(err);
    }
  }

  _populate(row) {
    if (this.tableName === 'tasks' && row.category_id) {
      const cat = store.categories.find((c) => c.id === row.category_id);
      return {
        ...row,
        category: cat ? { id: cat.id, name: cat.name, color: cat.color, icon: cat.icon } : null
      };
    }
    return { ...row };
  }
}

// Cloud state tracker
let liveClient = null;
let liveTablesAvailable = false;
let isProbing = false;

if (isLiveSupabase()) {
  try {
    liveClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  } catch (err) {
    console.error('[Supabase] Failed to instantiate createClient:', err.message);
  }
}

// Probing helper to verify if tables exist in cloud
async function verifyCloudTables() {
  if (!liveClient || isProbing) return;
  isProbing = true;
  try {
    const { data, error } = await liveClient.from('users').select('id').limit(1);
    if (!error) {
      if (!liveTablesAvailable) {
        liveTablesAvailable = true;
        console.log(`[Supabase] Cloud tables verified & active at: ${supabaseUrl}`);
      }
    } else {
      liveTablesAvailable = false;
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        console.log(`[Supabase Auto-Fallback] Cloud tables not found in schema cache.`);
        console.log(`[Supabase Auto-Fallback] Using persistent local database (server/data/local_db.json).`);
        console.log(`[Supabase Auto-Fallback] Registration, login, and all task features are 100% operational.`);
      }
    }
  } catch (err) {
    liveTablesAvailable = false;
  } finally {
    isProbing = false;
  }
}

// Probe cloud status on startup
if (liveClient) {
  verifyCloudTables();
  // Periodically check in background every 30s to detect if user runs SQL in Supabase dashboard
  setInterval(verifyCloudTables, 30000).unref();
}

// Unified client interface with automatic resilience
const supabaseClient = {
  from: (table) => {
    // If live cloud tables are verified and active, use live client with fallback safety
    if (liveClient && liveTablesAvailable) {
      return liveClient.from(table);
    }
    // Otherwise, seamlessly use persistent local mock builder
    return new MockQueryBuilder(table);
  },
  _resetStore: () => {
    store.users = [];
    store.categories = [];
    store.tasks = [];
    store.activity_logs = [];
    saveStore();
  },
  _getStore: () => store,
  isLiveAvailable: () => liveTablesAvailable
};

module.exports = supabaseClient;
