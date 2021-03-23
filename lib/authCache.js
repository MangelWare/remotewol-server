const DEFAULT_CACHE_LIFETIME = 10 * 60 * 1000;

class AuthCache {
  constructor() {
    this._state = new Set();
  }
  add(obj, lifetime) {
    this._state.add(obj);
    if (typeof lifetime === "number") {
      setTimeout(() => {
        this.remove(obj);
      }, lifetime);
    } else if (lifetime !== "infinite") {
      setTimeout(() => {
        this.remove(obj);
      }, DEFAULT_CACHE_LIFETIME);
    }
  }

  has(obj) {
    return this._state.has(obj);
  }

  remove(obj) {
    return this._state.delete(obj);
  }
}

module.exports = AuthCache;
