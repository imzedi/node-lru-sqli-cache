const sqlite3 = require("sqlite3");
const sqlite = require("sqlite");
const fs = require("fs");

const defaultOptions = {
  directory: "cache",
  maxKeys: 500,
};

class Cache {
  constructor(options) {
    this.options = {
      ...defaultOptions,
      ...options,
    };
  }

  async open_sqlite() {
    // Prepare cache directory and DB if not available
    try {
      if (!this.db) {
        if (!fs.existsSync(this.options.directory)) {
          fs.mkdirSync(this.options.directory);
        }

        this.db = await sqlite.open({
          filename: this.options.directory + "/lru-database.db",
          driver: sqlite3.cached.Database,
        });

        // Create columns => cache_key, cache_value, access_time
        await this.db.exec(
          'CREATE TABLE IF NOT EXISTS LRUCache ("cache_key" TEXT, "cache_value" JSON, "access_time" INTEGER)'
        );
        await this.db.exec(
          "CREATE UNIQUE INDEX IF NOT EXISTS idx_cache_key ON LRUCache (cache_key);"
        );
        await this.db.exec(
          "CREATE INDEX IF NOT EXISTS idx_cache_value ON LRUCache (cache_value);"
        );
        await this.db.exec(
          "CREATE INDEX IF NOT EXISTS idx_access_time ON LRUCache (access_time);"
        );
      }
    } catch (e) {
      throw e;
    }
  }

  async keys() {
    // Get all keys in db
    try {
      await this.open_sqlite();
      const results = await this.db.all("SELECT cache_key FROM LRUCache");
      return results.map((x) => x.cache_key);
    } catch (e) {
      throw e;
    }
  }

  async has(key) {
    // Check existence of specific key
    try {
      await this.open_sqlite();
      const result = await this.db.get(
        "SELECT cache_key FROM LRUCache WHERE cache_key = ?",
        key
      );
      return !!result;
    } catch (e) {
      throw e;
    }
  }

  async set(key, value) {
    // Set key value pair to db
    try {
      await this.open_sqlite();
      const result = await this.db.run(
        `INSERT OR REPLACE INTO LRUCache(cache_key,cache_value,access_time) VALUES (?,?,?)`,
        [key, value, Date.now()]
      );
      await this.refresh();
      return result;
    } catch (e) {
      console.log(e);
    }
  }

  async get(key) {
    //   Get value of specific key
    try {
      await this.open_sqlite();
      const result = await this.db.get(
        "SELECT cache_value FROM LRUCache WHERE cache_key = ?",
        key
      );

      if (!!result) {
        await this.updateAccessTime(key);
        return result.cache_value;
      } else {
        return null;
      }
    } catch (e) {
      throw e;
    }
  }

  async updateAccessTime(key, access_time) {
    // Update access time of specific key
    try {
      await this.open_sqlite();
      if (await this.has(key)) {
        await this.db.exec(
          `UPDATE LRUCache SET access_time = ${
            access_time ? access_time : Date.now()
          } WHERE cache_key = "${key}"`
        );
        return true;
      } else {
        throw "KEY NOT FOUND";
      }
    } catch (e) {
      throw e;
    }
  }

  async delete(key) {
    //   Delete specific key
    try {
      await this.open_sqlite();
      if (await this.has(key)) {
        await this.db.run(`DELETE FROM LRUCache WHERE cache_key = ?`, key);
        return true;
      } else {
        throw "KEY NOT FOUND";
      }
    } catch (e) {
      throw e;
    }
  }

  async clear() {
    // Remove whole database
    try {
      await this.open_sqlite();
      await this.db.run("DELETE FROM LRUCache");
      this.db = null;
      return "deleted";
    } catch (e) {
      throw e;
    }
  }

  async refresh() {
    // Remove least accessed files if cache exceed its limit
    try {
      if (this.options.maxKeys) {
        const result = await this.db.get(
          `SELECT COUNT(*) as count FROM LRUCache`
        );
        if (result.count > this.options.maxKeys) {
          // Least used item
          const luItem = await this.db.get(
            "SELECT cache_key from LRUCache ORDER BY access_time ASC LIMIT 1"
          );
          await this.delete(luItem.cache_key);
        }
      }
    } catch (e) {
      throw e;
    }
  }
}

module.exports = Cache;
