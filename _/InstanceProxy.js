/**
 * Protect private properties of instance and add validations.
 * @param instance
 * @param validations
 * @return {*}
 * @constructor
 */
function InstanceProxy(instance, validations = {}) {
  return new Proxy(instance, {
    /**
     * Trap set when get property from instance.
     * @param target
     * @param prop
     * @return {*}
     */
    get(target, prop) {
      // symbol properties
      if (typeof prop !== 'string') {
        return target[prop];
      }
      // private property
      if (prop.startsWith('_')) {
        throw new Error(`Access violation. Trying to access private property or method '${prop}'.`);
      }
      // properties
      if (typeof target[prop] !== 'function') {
        return target[prop];
      }
      // method is async
      if (target[prop].toString().startsWith('async')) {
        return async (...args) => {
          let formatedArgs;
          if (typeof validations[prop] === 'function') {
            try {
              formatedArgs = await validations[prop](...args);
            } catch (err) {
              err.message = `(${instance.constructor.name}.validations.${prop}) ${err.message}`;
              throw err;
            }
          }
          try {
            return await target[prop].bind(target)(...(formatedArgs || args));
          } catch (err) {
            err.message = `(${instance.constructor.name}.${prop}) ${err.message}`;
            throw err;
          }
        };
      }
      // method is not async but validation is
      if (typeof validations[prop] === 'function' && validations[prop].toString().startsWith('async')) {
        throw new Error(`Invalid function async '${prop}' in validationsProxy. Method '${prop}' is not async.`);
      }
      // method is not async
      return (...args) => {
        let formatedArgs;
        if (typeof validations[prop] === 'function') {
          try {
            formatedArgs = validations[prop](...args);
          } catch (err) {
            err.message = `(${instance.constructor.name}.validations.${prop}) ${err.message}`;
            throw err;
          }
        }
        try {
          return target[prop].bind(target)(...(formatedArgs || args));
        } catch (err) {
          err.message = `(${instance.constructor.name}.${prop}) ${err.message}`;
          throw err;
        }
      };
    },
  });
}

module.exports = InstanceProxy;
