const path = require('path');
const EnvironmentLoader = require('./_/EnvironmentLoader');
const ServiceContainer = require('./_/ServiceContainer');
const InstanceProxy = require('./_/InstanceProxy');
const helpers = require('./_/helpers');

const validations = {};
const errors = {};

/**
 * Representing Falconx.
 */
class Falconx {
  /**
   * @constructor
   */
  constructor(configs = {}) {
    validations.classConstructor(configs);
    this._init(configs);
    return InstanceProxy(this, validations);
  }

  /**
   * Init.
   * @param configs
   * @private
   */
  _init(configs) {
    this._setConfigs(configs);
    this._environmentLoader = new EnvironmentLoader(this.getDirectory('environment'));
    this._serviceContainer = new ServiceContainer(this.getDirectory.bind(this), this._dependencyResolver.bind(this));
  }

  /**
   * Setup configs.
   * @param configs
   * @private
   */
  _setConfigs(configs) {
    this._root = configs.root || __dirname;
    this._directories = {
      command: configs.commands || 'commands',
      config: configs.configs || 'configs',
      environment: configs.environments || 'environments',
      factory: configs.factories || 'factories',
      helper: configs.helpers || 'helpers',
      service: configs.services || 'services',
      test: configs.tests || 'tests',
    };
    // format directories
    Object.keys(this._directories).forEach((entity) => {
      this._directories[entity] = path.join(this._root, ...this._directories[entity].split('.'));
    });
  }

  /**
   * Get root.
   * @return {*}
   */
  getRoot() {
    return this._root;
  }

  /**
   * Get directory.
   * @param entity
   * @return {*}
   */
  getDirectory(entity) {
    if (!(entity in this._directories)) {
      throw new Error(`Trying to get directory on unknown entity '${entity}'.`);
    }
    return this._directories[entity];
  }

  /**
   * Load environment.
   * @param name
   * @return {Promise<void>}
   */
  async loadEnvironment(name) {
    return this._environmentLoader.load(name);
  }

  /**
   * Set service.
   * @param service
   * @return {Promise<*>}
   */
  async addService(service) {
    if (!this._environmentLoader.isLoaded()) {
      throw new Error('Trying to access service container without loading environment first.');
    }
    return this._serviceContainer.set(service);
  }

  /**
   * Get service.
   * @param serviceName
   * @return {Promise<{}>}
   */
  async getService(serviceName) {
    if (!this._environmentLoader.isLoaded()) {
      throw new Error('Trying to access service container without loading environment first.');
    }
    return this._serviceContainer.get(serviceName);
  }

  /**
   * Resolve dependency.
   * @param dependency
   * @return {Promise<*>}
   * @private
   */
  async _dependencyResolver(dependency) {
    if (dependency.exported) { // if resolved before
      return dependency.exported;
    }
    if (dependency.type === 'environment') {
      dependency.exported = this._environment;
    } else { // generate path and resolve dependency
      dependency.path = path.join(this._directories[dependency.type], ...dependency.name.split('.'));
      try {
        dependency.exported = await require(dependency.path);
      } catch (err) {
        err.message = `Can't load ${dependency.type} '${dependency.name}' using path '${dependency.path}'. Message: ${err.message}`;
        throw err;
      }
    }
    // resolve dependency prop
    try {
      dependency.exported = helpers.getObjectProperty(dependency.exported, dependency.prop);
    } catch (err) {
      throw new Error(`${dependency.type.charAt(0).toUpperCase()}${dependency.type.substring(1)} '${dependency.name}' property '${dependency.prop}' not found.`);
    }
    return dependency.exported;
  }
}

/**
 * Validations
 */
validations.classConstructor = (configs) => { // eslint-disable-line
  // TODO: validations
};
Falconx.validations = validations;
/**
 * Errors
 */
Falconx.errors = errors;

module.exports = Falconx;
