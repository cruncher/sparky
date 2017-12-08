(function(window) {
    var DEBUG   = window.DEBUG;
    var axios   = window.axios;
    var jQuery  = window.jQuery;
    var Fn      = window.Fn;
    var Sparky  = window.Sparky;
    var Stream  = window.Stream;

    var assign  = Object.assign;
    var fetch   = window.fetch;
    var get     = Fn.get;
    var getData = get('data');

    var cache   = {};

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
            var path  = params[0];

            if (DEBUG && !path) {
                throw new Error('Sparky: ' + Sparky.attributePrefix + 'fn="import:url" requires a url.');
            }

            // If the resource is cached, return it as an shiftable
            if (cache[path]) {
                return Stream.of(cache[path]);
            }

            var scopes = Stream.of();

            request(path)
            .then(function(data) {
                if (!data) { return; }
                cache[path] = data;
                scopes.push(data);
            })
            .catch(function(error) {
                throw error;
            });

            return scopes;
        }
    });
})(this);
