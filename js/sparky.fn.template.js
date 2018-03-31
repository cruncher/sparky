(function(window) {
    "use strict";

    var DEBUG   = window.DEBUG;
    var axios   = window.axios;
    var jQuery  = window.jQuery;
    var Fn      = window.Fn;
    var dom     = window.dom;
    var Sparky  = window.Sparky;

    var assign  = Object.assign;
    var fetch   = window.fetch;
    var get     = Fn.get;
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

        scopes
        .clone()
        .take(1)
        .each(function(scope) {
            var fragment = dom.clone(template);
            dom.empty(node);
            dom.append(node, fragment);
            sparky.continue();
        });
    }

    function templateFromCache(sparky, node, scopes, path, id, template) {
        var doc, elem;

        if (!template) {
            doc  = cache[path][''];
            elem = doc.getElementById(id);

            template = cache[path][id] = doc === document ?
                dom.fragmentFromId(id) :
                elem && dom.fragmentFromHTML(elem.innerHTML) ;
        }

        insertTemplate(sparky, node, scopes, id, template);
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

    function templateFromDocument(sparky, node, scopes, path, id, doc) {
        var template, elem;

        cache[path] = { '': doc };

        if (id) {
            elem = doc.getElementById(id);
            template = cache[path][id] = elem && dom.fragmentFromHTML(elem.innerHTML);
        }
        else {
            throw new Error('Sparky: template url has no hash id ' + path);
        }

        insertTemplate(sparky, node, scopes, id, template);
    }

    assign(Sparky.fn, {
        template: function(node, scopes, params) {
            var url = params[0];
            var parts, path, id;

            // Support legacy ids instead of urls for just now
            if (!/#/.test(url)) {
                console.warn('Deprecated: Sparky template:url url should be a url or hash ref, actually an id: "' + url + '"');
                path = '';
                id   = url;
            }
            // Parse urls
            else {
                parts = url.split('#');
                path  = parts[0] || '';
                id    = parts[1] || '';
            }

            if (DEBUG && !id) {
                throw new Error('Sparky: ' + Sparky.attributePrefix + 'fn="template:url" requires a url with a hash ref. "' + url + '"');
            }

            var sparky = this;

            sparky.interrupt();

            // If the resource is cached, return it as an shiftable
            if (cache[path]) {
                templateFromCache(sparky, node, scopes, path, id, cache[path][id]);
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

            return scopes.tap(function(o) {
                console.log('FART', o)
            });
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
                        var value = Fn.getPath($1, scope);
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
})(window);
