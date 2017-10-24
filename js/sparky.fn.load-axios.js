(function(window) {
    var DEBUG  = window.DEBUG;
    var axios  = window.axios;
    var Sparky = window.Sparky;
    var Stream = window.Stream;

    Sparky.fn.load = function load(node, stream, params) {
        var path  = params[0];

        if (DEBUG && !path) {
            throw new Error('Sparky: data-fn="load:url" requires a url.');
        }

        var scopes = Stream.of();

        axios
        .get(path)
        .then(scopes.push)
        .catch(function (error) {
            console.log(error);
        });

        return scopes;
    };
})(this);
