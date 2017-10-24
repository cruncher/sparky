(function(window) {
    var DEBUG  = window.DEBUG;
    var jQuery = window.jQuery;
    var Sparky = window.Sparky;
    var Stream = window.Stream;

    Sparky.fn.load = function load(node, stream, params) {
        var path  = params[0];

        if (DEBUG && !path) {
            throw new Error('Sparky: data-fn="load:url" requires a url.');
        }

        var scopes = Stream.of();

        jQuery
        .get(path)
        .then(function(response) {
            return response.error ?
                console.warn(response.error) :
                response ;
        })
        .then(scopes.push);

        return scopes;
    };
})(this);
