import { call, observe } from '../../fn/module.js';

function createObserver(path, fn, scope, node) {
    return observe(path, function(value) {
        return fn(scope, value, node);
    }, scope);
}

export default function Observe(paths) {
    return function observeFn(node) {
        const unobservers = [];

        function unobserve() {
            unobservers.forEach(call);
            unobservers.length = 0;
        }

        return this
        .tap(function(scope) {
            unobserve();
            var path;
            for (path in paths) {
                unobservers.push(createObserver(path, paths[path], scope, node));
            }
        })
        .done(unobserve);
    };
}
