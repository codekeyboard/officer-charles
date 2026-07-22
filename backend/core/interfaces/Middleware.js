class Middleware {
  // Subclasses may accept options in constructor
  constructor(_opts = {}) {}

  // Must be overridden by subclasses
  handle() {
    throw new Error(`${this.constructor.name} must implement handle(req, res, next)`);
  }
}

module.exports = Middleware;

