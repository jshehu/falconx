const RegexExtractor = require('../RegexExtractor');

const extractor = new RegexExtractor();
extractor.set('typeWithDependencyRegex', new RegExp('^(config|environment|factory|helper|service)::(.+)$'));
extractor.set('dependencyWithPropRegex', new RegExp('^(?!\\.\\.)((?:(?:[a-zA-Z0-9_-]+\\.)*?)[a-zA-Z0-9_-]+)(?:>((?:(?:[a-zA-Z0-9_-]+\\.)*?)[a-zA-Z0-9_-]+))?$'));
extractor.set('dependencyWithClassRegex', new RegExp('^(?!\\.\\.)((?:(?:[a-zA-Z0-9_-]+\\.)*?)[a-zA-Z0-9_-]+)(?::(class))?$'));
extractor.set('dependencyRegex', new RegExp('^(?!\\.\\.)((?:(?:[a-zA-Z0-9_-]+\\.)*?)[a-zA-Z0-9_-]+)'));
extractor.set('propRegex', new RegExp('^(?!\\.\\.)((?:(?:[a-zA-Z0-9_-]+\\.)*?)[a-zA-Z0-9_-]+)'));

const depFormat = {
  config(dependency) {
    const [[dependencyPath, propPath], found] = extractor.extract(dependency, 'dependencyWithPropRegex');
    if (!found) {
      throw new Error(`Invalid config dependency '${dependency}'.`);
    }
    return { type: 'config', name: dependencyPath, prop: propPath || '' };
  },
  environment(prop) {
    const [[propPath], found] = extractor.extract(prop, 'propRegex');
    if (!found) {
      throw new Error(`Invalid environment dependency '${prop}'.`);
    }
    return { type: 'environment', prop: propPath };
  },
  factory(dependency) {
    const [[dependencyPath], found] = extractor.extract(dependency, 'dependencyRegex');
    if (!found) {
      throw new Error(`Invalid factory dependency '${dependency}'.`);
    }
    return { type: 'factory', name: dependencyPath };
  },
  helper(dependency) {
    const [[dependencyPath, propPath], found] = extractor.extract(dependency, 'dependencyWithPropRegex');
    if (!found) {
      throw new Error(`Invalid helper dependency '${dependency}'.`);
    }
    return { type: 'helper', name: dependencyPath, prop: propPath || '' };
  },
  service(dependency) {
    const [[dependencyPath, injectClass], found] = extractor.extract(dependency, 'dependencyWithClassRegex');
    if (!found) {
      throw new Error(`Invalid service dependency '${dependency}'.`);
    }
    return { type: 'service', service: dependencyPath, injectClass: !!injectClass };
  },
};

const Dependency = {
  /**
   * Format dependency.
   * @param dependency
   * @return {*}
   */
  format(dependency) {
    if (typeof dependency === 'undefined') throw new Error('Missing dependency argument.');
    // if (typeof dependency !== 'string' && typeof dependency !== 'function') throw new Error(`Wrong dependency argument type ${typeof dependency}, expected string or function.`);
    // if (typeof dependency === 'function') {
    //   return dependency;
    // }
    if (typeof dependency !== 'string') {
      return { type: 'static', value: dependency };
    }
    const [[type, dep], found] = extractor.extract(dependency, 'typeWithDependencyRegex');
    if (!found) {
      // throw new Error(`Invalid dependency '${dependency}'.`);
      return { type: 'static', value: dependency };
    }
    const extractedData = depFormat[`${type}`](dep);
    return Object.assign({ type }, extractedData);
  },
};

module.exports = Dependency;
