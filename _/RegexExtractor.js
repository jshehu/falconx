const InstanceProxy = require('./InstanceProxy');

const validations = {};
const errors = {};

/**
 * Representing regex extractor.
 */
class RegexExtractor {
  /**
   * @constructor
   */
  constructor() {
    this._store = {};
    return InstanceProxy(this, validations);
  }

  /**
   * Set predefined regex to use with extractor.
   * @param name
   * @param regex
   */
  set(name, regex) {
    this._store[name] = regex;
  }

  /**
   * Set predefined regex to use with extractor.
   * @param predefinedRegex
   */
  setMany(predefinedRegex) {
    Object.entries(predefinedRegex).forEach(([name, regex]) => {
      this._store[name] = regex;
    });
  }

  /**
   * Extract.
   * @param str
   * @param regex
   * @param withMatch
   * @return {*[]}
   */
  extract(str, regex, withMatch = false) {
    if (typeof regex === 'string') {
      if (!(regex in this._store)) {
        throw new Error(`Predefined regex '${regex}' not found.`);
      }
      return this._extract(str, this._store[regex], withMatch);
    }
    return this._extract(str, regex, withMatch);
  }

  /**
   * Extract.
   * @param str
   * @param regex
   * @param withMatch
   * @return {*[]}
   * @private
   */
  _extract(str, regex, withMatch = false) {
    let response = [];
    let found = false;
    str.replace(regex, (match, ...args) => {
      args.pop();
      args.pop();
      if (regex.global) {
        response.push(withMatch ? [match, ...args] : args);
      } else {
        response = withMatch ? [match, ...args] : args;
      }
      found = true;
    });
    return [response, found];
  }
}

/**
 * Validations
 */
validations.set = (name, regex) => {
  if (typeof name === 'undefined') throw new Error('Missing name argument.');
  if (typeof regex === 'undefined') throw new Error('Missing regex argument.');
  if (typeof name !== 'string') throw new Error(`Wrong name argument type ${typeof name}, expected string.`);
  if (!(regex instanceof RegExp)) throw new Error(`Wrong regex argument type ${typeof regex}, expected RegExp.`);
};
validations.setMany = (predefinedRegex) => {
  if (typeof predefinedRegex === 'undefined') throw new Error('Missing predefinedRegex argument.');
  if (typeof predefinedRegex !== 'object') throw new Error(`Wrong predefinedRegex argument type ${typeof predefinedRegex}, expected object.`);
  Object.entries(predefinedRegex).forEach(([name, regex]) => {
    if (typeof name !== 'string') throw new Error(`Wrong name type ${typeof name}, expected string.`);
    if (!(regex instanceof RegExp)) throw new Error(`Wrong regex '${name}' type ${typeof regex}, expected RegExp.`);
  });
};
validations.extract = (str, regex, withMatch = false) => { // eslint-disable-line
  if (typeof str === 'undefined') throw new Error('Missing str argument.');
  if (typeof str !== 'string') throw new Error(`Wrong str argument type ${typeof str}, expected string.`);
  if (typeof regex === 'undefined') throw new Error('Missing regex argument.');
  if (typeof regex !== 'string' && !(regex instanceof RegExp)) throw new Error(`Wrong regex argument type ${typeof regex}, expected RegExp or string.`);
};
RegexExtractor.validations = validations;
/**
 * Errors
 */
RegexExtractor.errors = errors;

module.exports = RegexExtractor;
