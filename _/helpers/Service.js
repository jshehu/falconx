const Dependency = require('./Dependency');
const Class = require('./Class');
const each = require('each.js');
const path = require('path');
const crypto = require('crypto');

const Service = {
  /**
   * Extract class name.
   * @param service
   * @param directoryResolver
   * @return {*}
   */
  formatPath(service, directoryResolver) {
    if (typeof service === 'undefined') throw new Error('Missing service argument.');
    if (typeof directoryResolver === 'undefined') throw new Error('Missing directoryResolver argument.');
    if (typeof service !== 'object') throw new Error(`Wrong service argument type ${typeof service}, expected object.`);
    if (typeof directoryResolver !== 'function') throw new Error(`Wrong directoryResolver argument type ${typeof directoryResolver}, expected function.`);
    // don't know what service to load
    if (!service.name && !service.path) {
      throw new Error(`Can't load service because path is missing. '${JSON.stringify(service)}'`);
    }
    if (!service.path) {
      service.path = `${(service.namespace ? `${service.namespace}.` : '')}${service.name}`;
    }
    let directory;
    try {
      directory = directoryResolver(service.from || 'service');
    } catch (err) {
      throw new Error(`Invalid service from '${service.from}'.`);
    }
    service.path = path.join(directory, ...service.path.split('.'));
    return service;
  },
  /**
   * Extract service configs from class.
   * @param service
   * @return {*}
   */
  extractConfigsFromClass(service) {
    if (typeof service === 'undefined') throw new Error('Missing service argument.');
    if (typeof service !== 'object') throw new Error(`Wrong service argument type ${typeof service}, expected object.`);
    if (service.Class) {
      if (!service.name) {
        service.name = service.Class['@name'] || Class.extractName(service.Class);
        service.namespace = service.Class['@namespace'] || '';
      }
      if (service.isInstance) {
        service.singleton = true;
      } else {
        if (!service.di) {
          service.di = service.Class['@di'];
        }
        if (service.Class['@singleton']) {
          service.singleton = service.Class['@singleton'];
        }
      }
    }
    return service;
  },
  /**
   * Format service di.
   * @param service
   * @return {*}
   */
  formatDI(service) {
    if (typeof service === 'undefined') throw new Error('Missing service argument.');
    if (typeof service !== 'object') throw new Error(`Wrong service argument type ${typeof service}, expected object.`);
    if (service.di) {
      service.diFormatted = {};
      // format service constructor dependencies
      if (service.di.constructor instanceof Array) {
        service.diFormatted.constructor = service.di.constructor.map(Dependency.format);
      }
      // format service setter dependencies
      if (service.di.setters) {
        service.diFormatted.setters = {};
        const entries = Object.entries(service.di.setters);
        entries.forEach(([method, injections]) => {
          if (method.startsWith('_')) {
            throw new Error(`Invalid dependency '${service.name}' private method '${method}'.`);
          }
          if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(method)) {
            throw new Error(`Invalid dependency '${service.name}' method '${method}'.`);
          }
          service.diFormatted.setters[method] = injections.map(Dependency.format);
        });
      }
      // pass after
      if (service.di.after) {
        service.diFormatted.after = service.di.after;
      }
    }
    return service;
  },
  /**
   * Generate identifier.
   * @param service
   * @return {*}
   */
  generateIdentifier(service) {
    if (typeof service === 'undefined') throw new Error('Missing service argument.');
    if (typeof service !== 'object') throw new Error(`Wrong service argument type ${typeof service}, expected object.`);
    service.realIdentifier = `${(service.namespace ? `${service.namespace}.` : '')}${service.name}`;
    service.identifier = service.identifier || service.realIdentifier;
    return service;
  },
  /**
   * Resolve di.
   * @param service
   * @param dependencyResolver
   * @return {Promise<void>}
   */
  async eachDI(service, dependencyResolver) {
    if (typeof service === 'undefined') throw new Error('Missing service argument.');
    if (typeof service !== 'object') throw new Error(`Wrong service argument type ${typeof service}, expected object.`);
    if (service.diFormatted) {
      service.diResolved = {};
      // resolve service constructor dependencies
      if (service.diFormatted.constructor instanceof Array) {
        service.diResolved.constructor = await each.series(service.diFormatted.constructor, dependencyResolver);
      }
      // resolve service setter dependencies
      if (service.diFormatted.setters) {
        service.diResolved.setters = {};
        const entries = Object.entries(service.diFormatted.setters);
        await each.series(entries, async ([method, injections]) => {
          service.diResolved.setters[method] = await each.series(injections, dependencyResolver);
        });
      }
      // pass after
      if (service.diFormatted.after) {
        service.diResolved.after = service.diFormatted.after;
      }
    }
    return service;
  },
  /**
   * Resolve service.
   * @param path
   * @return {*}
   */
  async resolve(path) {
    if (typeof path === 'undefined') throw new Error('Missing path argument.');
    if (typeof path !== 'string') throw new Error(`Wrong path argument type ${typeof path}, expected string.`);
    let service;
    try {
      service = await require(path);
    } catch (err) {
      //
      throw err;
    }
    return service;
  },
  /**
   * Is service resolved correctly?
   * @param service
   */
  resolvedCorrectly(service) {
    if (typeof service === 'undefined') throw new Error('Missing service argument.');
    if (typeof service !== 'object') throw new Error(`Wrong service argument type ${typeof service}, expected object.`);
    if (
      typeof service.Class !== 'function' ||
      (
        !service.Class.toString().startsWith('class') &&
        !service.Class.toString().startsWith('function')
      )
    ) {
      throw new Error(`Service '${service.path}' is not a class.`);
    }
    return true;
  },
  /**
   * Get random identifier.
   * @return {string}
   */
  randomIdentifier() {
    return `${crypto.randomBytes(16).toString('hex')}-${Date.now()}`;
  },
};

module.exports = Service;
