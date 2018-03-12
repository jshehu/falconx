const path = require('path');
const each = require('each.js');
const DependencyFormatter = require('./DependencyFormatter');
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
   * @param servicesPath
   * @param dependencyFormatter
   */
  constructor(servicesPath, dependencyFormatter) {
    validations.classConstructor(servicesPath, dependencyFormatter);
    this._servicesPath = servicesPath;
    this._dependencyFormatter = dependencyFormatter;
    this._services = new Map();
    return InstanceProxy(this, validations);
  }

  /**
   * Set services path.
   * @param servicesPath
   */
  setPath(servicesPath) {
    this._servicesPath = servicesPath;
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

  // async _get(serviceName, parents = new Set(), injectClass = false) {
  //   if (parents.has(serviceName)) {
  //     throw new Error(`Dependency rotation found (${Object.keys(parents).join(' <= ')}).`);
  //   } else if (!(serviceName in this._services)) {
  //     throw new Error(`Service '${serviceName}' not found.`);
  //   }
  //   // resolve service
  //   const service = this._services[serviceName];
  //   parents.add(serviceName);
  //   // if its only class dependency
  //   if (injectClass) {
  //     return service.Class;
  //   }
  //   // if service is singleton and initiated
  //   if (service.singletonInstance) {
  //     return service.singletonInstance;
  //   }
  //   // resolve dependencies, (update service dependencies adding exported)
  //   const args = await each.series(service.di.constructor_resolved, (dependency) => {
  //     if (dependency.type === 'service') {
  //       dependency.exported = this._startService(dependency.name, parents, dependency.injectClass);
  //     }
  //     return dependency.exported;
  //   });
  //   // create instance
  //   const instance = new service.exported(...args); // eslint-disable-line
  //   // execute after constructor method
  //   if (service.di.after) {
  //     if (typeof instance[service.di.after] !== 'function') throw new Error(`After constructor method '${service.di.after}' not found in service '${serviceName}' instance.`);
  //     await instance[service.di.after]();
  //   }
  //   // save singleton
  //   if (service.singleton) {
  //     service.singletonInstance = instance;
  //   }
  //   return instance;
  // }

  /**
   * Add service.
   * @param service
   * @return {Promise<{}>}
   */
  async add(service) {
    if (!service.name && !service.path) {
      throw new Error(`Can't load service because path is missing. '${JSON.stringify(service)}'`);
    }
    // generate and format path
    service.path = service.path || `${(service.namespace ? `${service.namespace}.` : '')}${service.name}`;
    service.path = path.join(this._servicesPath, ...service.path.split('.'));
    // initialize di
    service.di = service.di || {};
    if ( // load class if needed
      !service.name || // load class to get name
      service.resolve // load class flag
    ) {
      service.Class = await helpers.Class.resolve(service.path);
    }
    /**
     * Set missing configs or extend existing ones
     */
    if (service.Class && service.Class.configs) {
      const { Class: { configs } } = service;
      service.name = service.name || configs.name || helpers.Class.extractName(service.Class);
      service.namespace = service.namespace || configs.namespace;
      if (configs.di) {
        if (
          !(service.di.constructor instanceof Array) &&
          configs.di.constructor instanceof Array
        ) {
          service.di.constructor = configs.di.constructor;
        }
        if (
          typeof configs.di.setters === 'object' &&
          !(configs.di.setters instanceof Array)
        ) {
          service.di.setters = Object.assign(({} || service.di.setters), configs.di.setters);
        }
        service.di.after = service.di.after || configs.di.after;
      }
      service.singleton = service.singleton || configs.singleton;
    }
    // remove constructor if its function
    if (typeof service.di.constructor === 'function') {
      delete service.di.constructor;
    }
    /**
     * Validate service configs.
     */
    if (!service.name) {
      throw new Error(`Trying to add a service without a name. ${JSON.stringify(service)}`);
    }
    // TODO: di constructor, setters ...
    // format service dependencies
    if (service.di.constructor) {
      try {
        service.di.constructor_formatted = service.di.constructor.map(this._dependencyFormatter.format.bind(this._dependencyFormatter));
      } catch (err) {
        console.log(err);
      }
    }
    if (service.di.setters) {
      service.di.setters_formatted = {};
      Object.entries(service.di.setters).forEach(([method, injections]) => {
        service.di.setters_formatted[method] = injections.map(this._dependencyFormatter.format.bind(this._dependencyFormatter));
      });
    }
    // check if service is a duplicate
    const key = `${(service.namespace ? `${service.namespace}.` : '')}${service.name}`;
    if (this._services.has(key)) {
      throw new Error(`This service '${key}' is already set.`);
    }
    // save service
    this._services.set(key, service);
    return this._services.get(key);
  }

  // _format(service) {
  //   if (service.di) {
  //     if (service.di.constructor instanceof Array) {
  //       service.di.constructor_resolved = await each.series(service.di.constructor.map(formatDependency), this._resolveDependency.bind(this));
  //     }
  //     if (service.di.setters) {
  //       service.di.setters_resolved = {};
  //       await each.series(Object.entries(service.di.setters), async ([method, injections]) => {
  //         if (method.startsWith('_')) throw new Error(`Invalid dependency private method '${method}'.`);
  //         if (/^[a-zA-Z][a-zA-Z0-9_]*$/.test(method)) throw new Error(`Invalid dependency method '${method}'.`);
  //         service.di.setters_resolved[method] = await each.series(injections.map(formatDependency), this._resolveDependency.bind(this));
  //       });
  //     }
  //   }
  //
  //   if (service.di.constructor) {
  //
  //   }
  //   if (service.di.settters) {
  //
  //   }
  // }
}

/**
 * Validations
 */
validations.classConstructor = (servicesPath, dependencyFormatter) => {
  if (typeof servicesPath === 'undefined') throw new Error('Missing servicesPath argument.');
  if (typeof dependencyFormatter === 'undefined') throw new Error('Missing dependencyFormatter argument.');
  if (typeof servicesPath !== 'string') throw new Error(`Wrong servicesPath argument type ${typeof servicesPath}, expected string.`);
  if (!(dependencyFormatter instanceof DependencyFormatter)) throw new Error(`Wrong dependencyFormatter argument type ${typeof dependencyFormatter}, expected DependencyFormatter.`);
};
validations.setPath = (servicesPath) => {
  if (typeof servicesPath === 'undefined') throw new Error('Missing servicesPath argument.');
  if (typeof servicesPath !== 'string') throw new Error(`Wrong servicesPath argument type ${typeof servicesPath}, expected string.`);
};
validations.add = (service) => {
  if (typeof service === 'undefined') throw new Error('Missing service argument.');
  if (typeof service !== 'object' || service instanceof Array) throw new Error(`Wrong name argument type ${service instanceof Array ? 'array' : typeof service}, expected object.`);
};
validations.get = (service) => {
  if (typeof service === 'undefined') throw new Error('Missing service argument.');
  if (typeof service !== 'object' || service instanceof Array) throw new Error(`Wrong name argument type ${service instanceof Array ? 'array' : typeof service}, expected object.`);
};
ServiceContainer.validations = validations;
/**
 * Errors
 */
ServiceContainer.errors = errors;

module.exports = ServiceContainer;
