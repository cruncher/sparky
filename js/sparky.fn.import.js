(function(window) {
    var DEBUG   = window.DEBUG;
    var axios   = window.axios;
    var jQuery  = window.jQuery;
    var Fn      = window.Fn;
    var dom     = window.dom;
    var Sparky  = window.Sparky;
    var Stream  = window.Stream;

    var assign    = Object.assign;
    var attribute = dom.attribute;
    var events    = dom.events;
    var preventDefault = dom.preventDefault;
    var fetch     = window.fetch;
    var get       = Fn.get;
    var getData   = get('data');

    var cache     = {};

    var request = axios ? function axiosRequest(path) {
        return axios
        .get(path)
        .then(getData);
    } :

    // TODO test these functions

    jQuery ? function jQueryRequest(path) {
        return jQuery
        .get(path)
        .then(getData);
    } :

    fetch ? function fetchRequest(path) {
        return fetch(path)
        .then(getData);
    } :

    function errorRequest(path) {
        throw new Error('Sparky: no axios, jQuery or fetch found for request "' + path + '"');
    } ;

    function importScope(url, scopes) {
        request(url)
        .then(function(data) {
            if (!data) { return; }
            cache[url] = data;
            scopes.push(data);
        })
        .catch(function(error) {
            throw error;
        });
    }

    assign(Sparky.fn, {
        load: function load(node, stream, params) {
            var path = params[0];

            if (DEBUG && !path) {
                throw new Error('Sparky: ' + Sparky.attributePrefix + 'fn="load:url" requires a url.');
            }

            var scopes = Stream.of();

            request(path)
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
        },

        'request-on-submit': function(node, scopes) {
            var type = 'submit';
            var scope;

            events(type, node)
            .tap(preventDefault)
            .each(function(e) {
                var method = attribute('method', node);
                var action = attribute('action', node);

                // Todo: Use request fn from resouce, not from this file!
                request({
                    url:    action,
                    method: method,
                    data:   scope,
                    headers: {
                        // Make Sparky.csrftoken a getter property that gets a cookie...
                        //cookies.get('csrftoken')
                        "X-CSRFToken": Sparky.csrftoken
                    }
                })
                .then(function(object) {
                    //console.log('SUCCESS', method, object);
                    assign(scope, object);
                })
                .catch(function(thing) {
                    //console.log('FAIL', thing, thing.response.data);
                    dom.events.trigger(node, 'dom-error', {
                        detail: thing.response.data
                    });
                });
            });

            return scopes.tap(function(object) {
                scope = object;
            });
        }
    });
})(window);
