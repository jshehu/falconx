const path = require('path');
// const each = require('each.js');
const RegexExtractor = require('./_/RegexExtractor');
const EnvironmentLoader = require('./_/EnvironmentLoader');
const DependencyFormatter = require('./_/DependencyFormatter');
const ServiceContainer = require('./_/ServiceContainer');
const InstanceProxy = require('./_/InstanceProxy');

const validations = {};
const errors = {};

/**
 * Representing Falconx.
 */
class Falconx {
  /**
   * @constructor
   */
  constructor(options = {}) {
    const { root = __dirname, paths = {} } = options;
    // save path as node modules
    this._root = root;
    // relative from root
    this._paths = {
      command: 'commands',
      config: 'configs',
      environment: 'environments',
      factory: 'factories',
      helper: 'helpers',
      service: 'services',
      test: 'tests',
    };
    Object.assign(this._paths, paths);
    this._updateFullPaths();
    // environment
    this._environment = new EnvironmentLoader(this._fullPaths.environment);
    // service container
    const extractor = new RegexExtractor();
    const dependencyFormatter = new DependencyFormatter(extractor);
    this._serviceContainer = new ServiceContainer(this._fullPaths.service, dependencyFormatter);
    // proxy
    return InstanceProxy(this, validations);
  }

  /**
   * Set root.
   * @param root
   */
  setRoot(root) {
    this._root = root;
    // update full paths with new root
    this._updateFullPaths();
    // update environments path
    this._environment.setPath(this._fullPaths.environment);
    // update services path
    this._serviceContainer.setPath(this._fullPaths.service);
  }

  /**
   * Set full paths.
   * @private
   */
  _updateFullPaths() {
    this._fullPaths = Object.entries(this._paths).reduce((acc, [entity, entityPath]) => {
      acc[entity] = path.join(this._root, entityPath);
      return acc;
    }, {});
  }

  /**
   * Get environment loader.
   * @return {EnvironmentLoader}
   */
  environment() {
    return this._environment;
  }

  /**
   * Get service container.
   * @return {ServiceContainer}
   */
  container() {
    return this._serviceContainer;
  }
}

/**
 * Validations
 */
validations.classConstructor = (options) => { // eslint-disable-line
  // TODO: validations
};
validations.setRoot = (root) => {
  if (typeof root === 'undefined') throw new Error('Missing root argument.');
  if (typeof root !== 'string') throw new Error(`Wrong root type ${typeof root}, expected string.`);
};
validations.setEnvironment = (envName) => {
  if (typeof envName === 'undefined') throw new Error('Missing envName argument.');
  if (typeof envName !== 'string') throw new Error(`Wrong envName type ${typeof envName}, expected string.`);
};
Falconx.validations = validations;
/**
 * Errors
 */
Falconx.errors = errors;

module.exports = Falconx;
