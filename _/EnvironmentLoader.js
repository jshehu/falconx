const path = require('path');
const InstanceProxy = require('./InstanceProxy');

const validations = {};
const errors = {};

/**
 * Representing service container.
 */
class EnvironmentLoader {
  /**
   * @constructor
   * @param environmentsPath
   */
  constructor(environmentsPath) {
    validations.classConstructor(environmentsPath);
    this._environmentsPath = environmentsPath;
    this._name = null;
    this._path = null;
    this._environment = null;
    return InstanceProxy(this, validations);
  }

  /**
   * Set environments path.
   * @param environmentsPath
   */
  setPath(environmentsPath) {
    this._environmentsPath = environmentsPath;
  }

  /**
   * Load environment.
   * @param name
   * @return {Promise<void>}
   */
  async load(name) {
    const _path = path.join(this._environmentsPath, name);
    let env;
    try {
      env = await require(_path);
    } catch (err) {
      err.message = `Can't load environment '${name}' using path '${_path}'. Message: ${err.message}`;
      throw err;
    }
    // overwrite default values
    Object.assign(env, process.env);
    // set unset values
    Object.assign(process.env, env);
    this._path = _path;
    this._name = name;
    this._environment = env;
  }

  /**
   * Get environment name.
   * @return {null|*}
   */
  name() {
    return this._name;
  }

  /**
   * Get environment.
   * @return {null|*}
   */
  get() {
    return this._environment;
  }
}

/**
 * Validations
 */
validations.classConstructor = (environmentsPath) => {
  if (typeof environmentsPath === 'undefined') throw new Error('Missing environmentsPath argument.');
  if (typeof environmentsPath !== 'string') throw new Error(`Wrong environmentsPath argument type ${typeof environmentsPath}, expected string.`);
};
validations.setPath = (environmentsPath) => {
  if (typeof environmentsPath === 'undefined') throw new Error('Missing environmentsPath argument.');
  if (typeof environmentsPath !== 'string') throw new Error(`Wrong environmentsPath argument type ${typeof environmentsPath}, expected string.`);
};
EnvironmentLoader.validations = validations;
/**
 * Errors
 */
EnvironmentLoader.errors = errors;

module.exports = EnvironmentLoader;
