module.exports = {
  Class: require('./Class'),
  Dependency: require('./Dependency'),
  Service: require('./Service'),
  getObjectProperty(obj, propertyChain) {
    if (typeof obj === 'undefined') throw new Error('Missing obj argument.');
    if (typeof propertyChain === 'undefined') throw new Error('Missing propertyChain argument.');
    if (typeof obj !== 'object') throw new Error(`Wrong obj argument type ${typeof obj}, expected object.`);
    if (typeof propertyChain !== 'string') throw new Error(`Wrong propertyChain argument type ${typeof propertyChain}, expected string.`);
    if (!propertyChain) { // empty property
      return obj;
    }
    return propertyChain.split('.').reduce((obj, property) => {
      if (typeof obj[property] === 'undefined') {
        throw new Error(`Property '${property}' not found in object.`);
      }
      return obj[property];
    }, obj);
  },
};
