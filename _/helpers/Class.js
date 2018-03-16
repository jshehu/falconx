const RegexExtractor = require('../RegexExtractor');

const extractor = new RegexExtractor();
extractor.set('ClassName', new RegExp('^class (.*?)[ {]'));
extractor.set('FunctionName', new RegExp('^function (.*?)[ (]'));

const Class = {
  /**
   * Extract class name.
   * @param ClassObj
   * @return {*}
   */
  extractName(ClassObj) {
    if (typeof Class === 'undefined') throw new Error('Missing Class argument.');
    if (typeof Class !== 'function') throw new Error(`Wrong Class argument type ${typeof Class}, expected class.`);
    if (ClassObj.name) {
      return ClassObj.name;
    }
    const ClassStr = ClassObj.toString();
    let name;
    if (ClassStr.startsWith('class')) {
      [[name]] = extractor.extract(ClassStr, 'ClassName');
    } else if (ClassStr.startsWith('function')) {
      [[name]] = extractor.extract(ClassStr, 'FunctionName');
    }
    return name;
  },
};

module.exports = Class;
