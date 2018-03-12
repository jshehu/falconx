const RegexExtractor = require('./RegexExtractor');
const InstanceProxy = require('./InstanceProxy');

const errors = {};
const validations = {};

/**
 * Representing dependency formatter
 */
class DependencyFormatter {
  /**
   * @constructor
   */
  constructor(extractor) {
    validations.classConstructor(extractor);
    this._extractor = extractor;
    this._extractor.set('typeWithDependencyRegex', new RegExp('^(config|environment|factory|helper|service)::(.+)$'));
    this._extractor.set('dependencyWithPropRegex', new RegExp('^(?!\\.\\.)((?:(?:[a-zA-Z0-9_-]+\\.)*?)[a-zA-Z0-9_-]+)(?:>((?:(?:[a-zA-Z0-9_-]+\\.)*?)[a-zA-Z0-9_-]+))?$'));
    this._extractor.set('dependencyWithClassRegex', new RegExp('^(?!\\.\\.)((?:(?:[a-zA-Z0-9_-]+\\.)*?)[a-zA-Z0-9_-]+)(?::(class))?$'));
    this._extractor.set('dependencyRegex', new RegExp('^(?!\\.\\.)((?:(?:[a-zA-Z0-9_-]+\\.)*?)[a-zA-Z0-9_-]+)'));
    this._extractor.set('propRegex', new RegExp('^(?!\\.\\.)((?:(?:[a-zA-Z0-9_-]+\\.)*?)[a-zA-Z0-9_-]+)'));
    return InstanceProxy(this, validations);
  }

  /**
   * Format dependency.
   * @param dependency
   * @return {{type} & any}
   */
  format(dependency) {
    const [[type, dep], found] = this._extractor.extract(dependency, 'typeWithDependencyRegex');
    if (!found) {
      throw new errors.InvalidDependencyError(`Invalid dependency '${dependency}'.`);
    }
    const extractedData = this[`_${type}`](dep);
    return Object.assign({ type }, extractedData);
  }

  _config(dependency) {
    const [[dependencyPath, propPath], found] = this._extractor.extract(dependency, 'dependencyWithPropRegex');
    if (!found) {
      throw new errors.InvalidConfigDependencyError(`Invalid config dependency '${dependency}'.`);
    }
    return { type: 'config', name: dependencyPath, prop: propPath || '' };
  }

  _environment(prop) {
    const [[propPath], found] = this._extractor.extract(prop, 'propRegex');
    if (!found) {
      throw new errors.InvalidEnvironmentDependencyError(`Invalid environment dependency '${prop}'.`);
    }
    return { type: 'environment', prop: propPath };
  }

  _factory(dependency) {
    const [[dependencyPath], found] = this._extractor.extract(dependency, 'dependencyRegex');
    if (!found) {
      throw new errors.InvalidFactoryDependencyError(`Invalid factory dependency '${dependency}'.`);
    }
    return { type: 'factory', name: dependencyPath };
  }

  _helper(dependency) {
    const [[dependencyPath, propPath], found] = this._extractor.extract(dependency, 'dependencyWithPropRegex');
    if (!found) {
      throw new errors.InvalidHelperDependencyError(`Invalid helper dependency '${dependency}'.`);
    }
    return { type: 'helper', name: dependencyPath, prop: propPath || '' };
  }

  _service(dependency) {
    const [[dependencyPath, injectClass], found] = this._extractor.extract(dependency, 'dependencyWithClassRegex');
    if (!found) {
      throw new errors.InvalidServiceDependencyError(`Invalid service dependency '${dependency}'.`);
    }
    return { type: 'service', name: dependencyPath, injectClass: !!injectClass };
  }
}

/**
 * Validations
 */
validations.classConstructor = (extractor) => {
  if (typeof extractor === 'undefined') throw new Error('Missing extractor argument.');
  if (!(extractor instanceof RegexExtractor)) throw new Error(`Wrong extractor argument type ${typeof extractor}, expected RegexExtractor.`);
};
validations.format = (dependency) => {
  if (typeof dependency === 'undefined') throw new Error('Missing dependency argument.');
  if (typeof dependency !== 'string') throw new Error(`Wrong dependency argument type ${typeof dependency}, expected string.`);
};
DependencyFormatter.validations = validations;
/**
 * Errors
 */
errors.InvalidDependencyError = class InvalidDependencyError extends Error {};
errors.InvalidConfigDependencyError = class InvalidConfigDependencyError extends errors.InvalidDependencyError {};
errors.InvalidEnvironmentDependencyError = class InvalidEnvironmentDependencyError extends errors.InvalidDependencyError {};
errors.InvalidFactoryDependencyError = class InvalidFactoryDependencyError extends errors.InvalidDependencyError {};
errors.InvalidHelperDependencyError = class InvalidHelperDependencyError extends errors.InvalidDependencyError {};
errors.InvalidServiceDependencyError = class InvalidServiceDependencyError extends errors.InvalidDependencyError {};
DependencyFormatter.errors = errors;

module.exports = DependencyFormatter;
