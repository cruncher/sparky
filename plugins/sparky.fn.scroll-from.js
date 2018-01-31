(function(window) {
    "use strict";

    // fn="scrolltop-from: id, property-name"
    // fn="scrollleft-from: id, property-name"
    //
    // Where id references a target node that must be in the DOM at run time,
    // and optional property-name is a string naming the property on the output
    // scope.


    var Fn         = window.Fn;
    var dom        = window.dom;
    var Observable = window.Observable;
    var set        = Fn.set;

    function scrollFrom(property, node, stream, params) {
        var target = params[0] === 'window' ? dom.view :
            params[0] === 'this' ? node :
            dom.get(params[0]) ;
        var name = params[1] || 'scrolltop';

        if (!target) {
            throw new Error('Sparky.fn.scroll-from: no element found for selector "' + params[0] + '"');
        }

        var eventTarget = params[0] === 'window' ? window : target ;
        var scope = {};

        function getScroll() { return target[property]; }

        scope[name] = target[property];

        dom
        .events('scroll', eventTarget)
        .map(getScroll)
        .each(set(name, Observable(scope)));

        return Fn.of(scope);
    }

    Sparky.fn['scrolltop-from'] = function(node, stream, params) {
        return scrollFrom('scrollTop', node, stream, params);
    };

    Sparky.fn['scrollleft-from'] = function(node, stream, params) {
        return scrollFrom('scrollLeft', node, stream, params);
    };
})(this);
