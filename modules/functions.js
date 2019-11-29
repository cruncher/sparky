
const DEBUG = window.DEBUG;

export const functions = Object.create(null);

export function register(name, fn) {
    if (DEBUG && functions[name]) {
        throw new Error('Sparky: fn already registered with name "' + name + '"');
    }

    functions[name] = fn;
}
