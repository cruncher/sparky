import { Functor as Fn, Stream, get, invoke, nothing } from '../../fn/fn.js';
import Sparky from './sparky.js';

const fetchOptions = {
    method: 'GET'
};

(function(window) {
    var DEBUG   = window.DEBUG;
    var axios   = window.axios;
    var jQuery  = window.jQuery;

    var assign    = Object.assign;
    var fetch     = window.fetch;
    var getData   = get('data');

    var cache     = {};

    function fetchJSON(url) {
        return fetch(url, fetchOptions)
        .then(invoke('json', nothing));
    }

    function importScope(url, scopes) {
        fetchJSON(url)
        .then(function(data) {
            if (!data) { return; }
            cache[url] = data;
            scopes.push(data);
        })
        .catch(function(error) {
            console.warn('Sparky: no data found at', url);
            //throw error;
        });
    }

    assign(Sparky.fn, {
        load: function load(node, stream, params) {
            var path = params[0];

            if (DEBUG && !path) {
                throw new Error('Sparky: ' + Sparky.attributePrefix + 'fn="load:url" requires a url.');
            }

            var scopes = Stream.of();

            fetchJSON(url)
            .then(scopes.push)
            .catch(function (error) {
                console.warn(error);
            });

            return scopes;
        },

        import: function(node, stream, params) {
            var path = params[0];

            if (DEBUG && !path) {
                throw new Error('Sparky: ' + Sparky.attributePrefix + 'fn="import:url" requires a url.');
            }

            var scopes = Stream.of();

            if (/\$\{(\w+)\}/.test(path)) {
                stream.each(function(scope) {
                    var url = path.replace(/\$\{(\w+)\}/g, function($0, $1) {
                        return scope[$1];
                    });

                    // If the resource is cached...
                    if (cache[url]) {
                        scopes.push(cache[url]);
                    }
                    else {
                        importScope(url, scopes);
                    }
                });

                return scopes;
            }

            // If the resource is cached, return it as a readable
            if (cache[path]) {
                return Fn.of(cache[path]);
            }

            importScope(path, scopes);
            return scopes;
        }
    });
})(window);
