const each = require('each.js');
const InstanceProxy = require('./InstanceProxy');
const helpers = require('./helpers');

const validations = {};
const errors = {};

/**
 * Representing service container.
 */
class ServiceContainer {
  /**
   * @constructor
   * @param directory
   * @param dependencyResolver
   */
  constructor(directory, dependencyResolver) {
    validations.classConstructor(directory, dependencyResolver);
    this._init(directory, dependencyResolver);
    return InstanceProxy(this, validations);
  }

  /**
   * Init.
   * @param directory
   * @param dependencyResolver
   * @private
   */
  _init(directory, dependencyResolver) {
    this._directory = directory;
    this._dependencyResolver = dependencyResolver;
    this._services = new Map();
  }

  /**
   * Check if service exists.
   * @param service
   * @return {boolean}
   */
  has(service) {
    return this._services.has(service);
  }

  /**
   * Set service.
   * @param service
   * @return {Promise<*>}
   * @private
   */
  async set(service) {
    helpers.Service.formatPath(service, this._directory);
    if (service.autowire) {
      service.Class = await helpers.Class.resolve(service.path);
      helpers.Service.extractConfigsFromClass(service);
    }
    // validate name
    if (!service.name) {
      throw new Error(`Trying to add a service without a name. ${JSON.stringify(service)}`);
    }
    // TODO: validate di
    helpers.Service.formatDI(service);
    helpers.Service.generateIdentifier(service);
    // verify duplicate
    if (this._services.has(service.identifier)) {
      throw new Error(`Another service '${service.identifier}' is already set.`);
    }
    // set service
    this._services.set(service.identifier, service);
    return this._services.get(service.identifier);
  }

  /**
   * Get service.
   * @param service
   * @return {{}}
   */
  async get(service) {
    if (!this.has(service)) {
      throw new Error(`Service '${service}' not found.`);
    }
    return this._get(service);
  }

  /**
   * Get service.
   * @param serviceName
   * @param parents
   * @param injectClass
   * @return {Promise<*>}
   * @private
   */
  async _get(serviceName, parents = new Set(), injectClass = false) {
    if (parents.has(serviceName)) {
      throw new Error(`Dependency rotation found (${Object.keys(parents).join(' <= ')}).`);
    } else if (!this._services.has(serviceName)) {
      throw new Error(`Service '${serviceName}' not found.`);
    }
    const service = this._services.get(serviceName); // get service
    parents.add(serviceName); // add service name to list
    if (!service.Class) { // load service Class if its not loaded yet
      service.Class = await helpers.Class.resolve(service.path);
    }
    if (injectClass) { // if its only class dependency
      return service.Class;
    }
    if (service.singleton && service.instance) { // if singleton
      return service.instance;
    }
    // resolve dependencies
    await helpers.Service.eachDI(service, async (dependency) => {
      if (dependency.type === 'service') { // resolve service from inside
        return this._get(dependency.service, parents, dependency.injectClass);
      }
      return this._dependencyResolver(dependency); // resolve dependency from FalconX
    });
    // create instance and inject dependencies and call after method
    const instance = await this._instance(service);
    // set instance
    if (service.singleton) {
      service.instance = instance;
    }
    return instance;
  }

  /**
   * Get instance.
   * @param service
   * @return {Promise<void>}
   * @private
   */
  async _instance(service) {
    if (!service.diResolved) {
      return new service.Class();
    }
    if (!(service.diResolved.constructor instanceof Array)) {
      service.diResolved.constructor = [];
    }
    const instance = new service.Class(...service.diResolved.constructor);
    if (service.diResolved.setters) {
      const entities = Object.entries(service.diResolved.setters);
      await each.series(entities, async ([method, args]) => {
        if (typeof instance[method] !== 'function') {
          throw new Error(`Setter method '${method}' not found in service '${service.name}' instance.`);
        }
        await instance[method](...args);
      });
    }
    if (service.diResolved.after) {
      if (typeof instance[service.diResolved.after] !== 'function') {
        throw new Error(`After method '${service.diResolved.after}' not found in service '${service.name}' instance.`);
      }
      await instance[service.diResolved.after]();
    }
    return instance;
  }
}

/**
 * Validations
 */
validations.classConstructor = (directory, dependencyResolver) => {
  if (typeof directory === 'undefined') throw new Error('Missing services directory argument.');
  if (typeof dependencyResolver === 'undefined') throw new Error('Missing dependencyResolver argument.');
  if (typeof directory !== 'string') throw new Error(`Wrong services directory argument type ${typeof directory}, expected string.`);
  if (typeof dependencyResolver !== 'function') throw new Error(`Wrong dependencyResolver argument type ${typeof dependencyResolver}, expected function.`);
};
validations.add = (service) => {
  if (typeof service === 'undefined') throw new Error('Missing service argument.');
  if (typeof service !== 'object' || service instanceof Array) throw new Error(`Wrong name argument type ${service instanceof Array ? 'array' : typeof service}, expected object.`);
};
validations.get = (service) => {
  if (typeof service === 'undefined') throw new Error('Missing service argument.');
  if (typeof service !== 'string') throw new Error(`Wrong service argument type ${typeof service}, expected string.`);
};
ServiceContainer.validations = validations;
/**
 * Errors
 */
ServiceContainer.errors = errors;

module.exports = ServiceContainer;
