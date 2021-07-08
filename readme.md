# Node LRU SQLi cache

Lightweight and simple LRU Caching mechanism. Cache your key value pair in sqli database which will be stored in filesystem.

## Install

```
npm i node-lru-sqli-cache
```

## Usgae

```javascript

const cache = require('node-lru-sqli-cache')

const cache = nnew Cache({
  directory: 'cache',	// (string) directory to store sqlite db, 		default => 'cache'
  maxKeys: 500,		// (number) Maximum items that can be cached, 	default => 500
})

// Set key value pair to cache (both key and value must be string)
await cache.set('foo', 'bar')

// Get a value from cache
const value = cache.get('foo')

// Check if a key is cached
const isCached = await cache.has('foo')

// Update a key access time
await cache.updateAccessTime('foo', Date.now())

// Get array of all cached keys
const keys = await cache.keys()

// Remove a specific key from cache
await cache.delete('foo')

// Manually remove least accessed key
await cache.refresh();

// Remove all keys from cache
await cache.clear();

```
