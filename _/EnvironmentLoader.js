const { EventEmitter } = require('events');
const path = require('path');
const InstanceProxy = require('./InstanceProxy');

const validations = {};
const errors = {};

/**
 * Representing service container.
 */
class EnvironmentLoader extends EventEmitter {
  /**
   * @constructor
   * @param directory
   */
  constructor(directory) {
    super();
    validations.classConstructor(directory);
    this._init(directory);
    return InstanceProxy(this, validations);
  }

  /**
   * Init.
   * @param directory
   * @private
   */
  _init(directory) {
    this._directory = directory;
    this._name = null;
    this._environment = null;
    this._loaded = false;
  }

  /**
   * Load environment.
   * @param name
   * @return {Promise<void>}
   */
  async load(name) {
    if (this._loaded) {
      throw new Error(`Environment is already loaded '${path.join(this._directory, this._name)}'.`);
    }
    const env = await this._load(name);
    // overwrite default values
    Object.assign(env, process.env);
    // set unset values
    Object.assign(process.env, env);
    this._name = name;
    this._environment = env;
    this._loaded = true;
    this.emit('loaded', this._name, this._environment);
  }

  /**
   * Load environment.
   * @param name
   * @return {Promise<*>}
   * @private
   */
  async _load(name) {
    const fullPath = path.join(this._directory, name);
    try {
      return await require(path.join(this._directory, name));
    } catch (err) {
      err.message = `Can't load environment '${name}' using path '${fullPath}'. Message: ${err.message}`;
      throw err;
    }
  }

  /**
   * Get environment name.
   * @return {string}
   */
  getName() {
    if (!this._loaded) {
      throw new Error('Trying to get environment name without loading it first.');
    }
    return this._name;
  }

  /**
   * Get environment.
   * @return {*}
   */
  getEnvironment() {
    if (!this._loaded) {
      throw new Error('Trying to get environment without loading it first.');
    }
    return this._environment;
  }

  /**
   * Is environment loaded?
   * @return {boolean}
   */
  isLoaded() {
    return this._loaded;
  }
}

/**
 * Validations
 */
validations.classConstructor = (directory) => {
  if (typeof directory === 'undefined') throw new Error('Missing environments directory argument.');
  if (typeof directory !== 'string') throw new Error(`Wrong environments directory argument type ${typeof directory}, expected string.`);
};
EnvironmentLoader.validations = validations;
/**
 * Errors
 */
EnvironmentLoader.errors = errors;

module.exports = EnvironmentLoader;
