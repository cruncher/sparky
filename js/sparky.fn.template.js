import { get, getPath, id, noop, overload, Stream, toType, Observable as ObservableStream } from '../../fn/fn.js';
import { default as dom, before, remove, fragmentFromHTML } from '../../dom/dom.js';
import { cue } from './frame.js';
import Sparky from './sparky.js';

var DEBUG   = false;
var axios   = window.axios;
var jQuery  = window.jQuery;

var assign  = Object.assign;
var fetch   = window.fetch;
var getData = get('data');
var parseHTML = dom.parse('html');

var cache   = {
    '': {
        '': document
    }
};

var request = axios ? function axiosRequest(url, id) {
    return axios
    .get(url)
    .then(getData)
    .then(parseHTML);
} :

// TODO test these functions

jQuery ? function jQueryRequest(url, id) {
    return jQuery
    .get(url)
    .then(getData)
    .then(parseHTML);
} :

fetch ? function fetchRequest(url, id) {
    return fetch(url)
    .then(getData)
    .then(parseHTML);
} :

function errorRequest(url, id) {
    throw new Error('Sparky: no axios, jQuery or fetch found for request "' + url + '"');
} ;

function insertTemplate(sparky, node, scopes, id, template) {
    if (!template) {
        throw new Error('Sparky: template ' + id + ' not found.');
    }

    var run = function first() {
        run = noop;
        var fragment = dom.clone(template);
        dom.empty(node);
        dom.append(node, fragment);
        if (DEBUG) { console.log('Sparky fn=template:', node); }
        sparky.continue();
    };

    var stream = Stream.of();

    scopes.each(function(scope) {
        cue(function() {
            run();
            stream.push(scope);
        });
    });

    return stream;
}

function templateFromCache(sparky, node, scopes, path, id) {
    var doc, elem;

    var template = cache[path][id];

    if (!template) {
        doc  = cache[path][''];
        elem = doc.getElementById(id);

        template = cache[path][id] = doc === document ?
            dom.fragmentFromId(id) :
            elem && dom.fragmentFromHTML(elem.innerHTML) ;
    }

    return insertTemplate(sparky, node, scopes, id, template);
}

function templateFromCache2(sparky, node, scopes, path, id, template) {
    var doc, elem;

    if (!template) {
        doc  = cache[path][''];
        elem = doc.getElementById(id);

        template = cache[path][id] = doc === document ?
            dom.fragmentFromId(id) :
            elem && dom.fragmentFromHTML(elem.innerHTML) ;
    }

    if (!template) {
        throw new Error('Sparky: template ' + id + ' not found.');
    }

    //return scopes.tap(function(scope) {
        var fragment = dom.clone(template);
        dom.empty(node);
        dom.append(node, fragment);
        sparky.continue();
    //});
}

function templateFromDocument(sparky, node, scopes, path, id) {
    var stream = Stream.of();

    request(path)
    .then(function(doc) {
        if (!doc) { return; }
        var tapped = templateFromDocument2(sparky, node, scopes, path, id, doc);
        sparky.continue();
        tapped.each(stream.push);
    })
    .catch(function(error) {
        console.warn(error);
    });

    return stream;
}

function templateFromDocument2(sparky, node, scopes, path, id, doc) {
    var template, elem;

    cache[path] = { '': doc };

    if (id) {
        elem = doc.getElementById(id);
        template = cache[path][id] = elem && dom.fragmentFromHTML(elem.innerHTML);
    }
    else {
        throw new Error('Sparky: template url has no hash id ' + path);
    }

    return insertTemplate(sparky, node, scopes, id, template);
}

assign(Sparky.fn, {
    template: function(node, scopes, params) {
        var name = params[0];
        var parts, path, hash;

        // If name is not a URL assume it's a path and get html from scope
        if (!/#/.test(name)) {
            stop = noop;

            return scopes.map(function(scope) {
                stop();

                stop = ObservableStream(name, scope)
                .map(overload(toType, {
                    string:  fragmentFromHTML,
                    default: id
                }))
                .each(function(fragment) {
console.log('TEMPLATE', node);
                    dom.empty(node);
                    dom.append(node, fragment);
                })
                .stop;
            });
        }

        // Parse urls
        parts = name.split('#');
        path  = parts[0] || '';
        hash  = parts[1] || '';

        if (DEBUG && !hash) {
            throw new Error('Sparky: ' + Sparky.attributePrefix + 'fn="template:url" requires a url with a hash ref. "' + name + '"');
        }

        var sparky = this;
        sparky.interrupt();

        // If the resource is cached, return it as an shiftable
        return cache[path] ?
            templateFromCache(sparky, node, scopes, path, hash) :
            templateFromDocument(sparky, node, scopes, path, hash) ;
    },

    replace: function(node, scopes, params) {
        var name = params[0];
        var parts, path, hash, stop;

        // If name is not a URL assume it's a path and get html from scope
        if (!/#/.test(name)) {
            stop = noop;

            return scopes.map(function(scope) {
                stop();

                stop = ObservableStream(name, scope)
                .map(overload(toType, {
                    string:  fragmentFromHTML,
                    default: id
                }))
                .each(function(fragment) {
                    before(node, fragment);
                    remove(node);
                })
                .stop;
            });
        }

        parts = name.split('#');
        path  = parts[0] || '';
        hash  = parts[1] || '';

        if (DEBUG && !hash) {
            throw new Error('Sparky: ' + Sparky.attributePrefix + 'fn="template:url" requires a url with a hash ref. "' + name + '"');
        }

        var sparky = this;
        sparky.interrupt();

        // If the resource is cached, return it as an shiftable
        return cache[path] ?
            templateFromCache(sparky, node, scopes, path, hash) :
            templateFromDocument(sparky, node, scopes, path, hash) ;
    },


    // TODO: Do this, but better

    'template-from': function(node, scopes, params) {
        var string = params[0];
        var sparky = this;
        var outputScopes = Stream.of();
        sparky.interrupt();

        if (/\$\{([\w._]+)\}/.test(string)) {
            scopes.each(function(scope) {
                var notParsed = false;
                var url = string.replace(/\$\{([\w._]+)\}/g, function($0, $1) {
                    var value = getPath($1, scope);
                    if (value === undefined) { notParsed = true; }
                    return value;
                });

                if (notParsed) {
                    console.log('Sparky: template-from not properly assembled from scope', string, scope);
                    return;
                }

                var parts = url.split('#');
                var path  = parts[0] || '';
                var id    = parts[1] || '';

                if (DEBUG && !id) {
                    throw new Error('Sparky: ' + Sparky.attributePrefix + 'fn="template:url" requires a url with a hash ref. "' + url + '"');
                }

                // If the resource is cached, return it as an shiftable
                if (cache[path]) {
                    templateFromCache2(sparky, node, scopes, path, id, cache[path][id]);
                    outputScopes.push(scope);
                }
                else {
                    request(path)
                    .then(function(doc) {
                        if (!doc) { return; }
                        templateFromDocument(sparky, node, scopes, path, id, doc);
                    })
                    .catch(function(error) {
                        console.warn(error);
                    });
                }
            });

            return outputScopes;
        }

        throw new Error('Sparky: template-from must have ${prop} in the url string');
    }
});
