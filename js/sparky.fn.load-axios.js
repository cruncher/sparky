(function(window) {
    var DEBUG   = window.DEBUG;
    var axios   = window.axios;
    var Fn      = window.Fn;
    var Sparky  = window.Sparky;
    var Stream  = window.Stream;

    var compose = Fn.compose;
    var get     = Fn.get;
    var getData = get('data');

    Sparky.fn.load = function load(node, stream, params) {
        var path  = params[0];

        if (DEBUG && !path) {
            throw new Error('Sparky: data-fn="load:url" requires a url.');
        }

        var scopes = Stream.of();
        var update = compose(scopes.push, getData);

        axios
        .get(path)
        .then(function(value) {
            console.log(value);
            return value;
        })
        .then(update)
        .catch(function (error) {
            console.warn(error);
        });

        return scopes;
    };
})(this);
