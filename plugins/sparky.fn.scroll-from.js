(function(window) {
    "use strict";

    var Fn         = window.Fn;
    var dom        = window.dom;
    var Observable = window.Observable;

    Sparky.fn['scroll-from'] = function(node, stream, params) {
        var target = params[0] === 'window' ? dom.view :
            params[0] === 'this' ? node :
            dom.query(params[0])[0] ;

        if (!target) {
            throw new Error('Sparky.fn.scroll-from: no element found for selector "' + params[0] + '"');
        }

        var eventTarget = params[0] === 'window' ? window : target ;
        var scope  = Observable({
            scrollTop:  target.scrollTop,
            scrollLeft: target.scrollLeft
        });

        dom
        .event('scroll', eventTarget)
        .each(function() {
            scope.scrollTop  = target.scrollTop;
            scope.scrollLeft = target.scrollLeft;
        });

        return Fn.of(scope);
    };
})(this);
