import { Fn, Stream, invoke, nothing } from '../../fn/module.js';
import Sparky from './sparky.js';

const DEBUG = window.DEBUG;
const fetch = window.fetch;

const fetchOptions = {
    method: 'GET'
};

const cache     = {};

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

export default function(node, stream, params) {
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
