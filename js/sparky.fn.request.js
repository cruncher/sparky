(function(window) {
    "use strict";

    var DEBUG          = window.DEBUG;

    var dom            = window.dom;
    var Sparky         = window.Sparky;

    var assign         = Object.assign;
    var attribute      = dom.attribute;
    var events         = dom.events;
    var preventDefault = dom.preventDefault;

    function getCookie(name) {
        var cookieValue = null;
        var cookies, cookie, i;

        if (document.cookie && document.cookie !== '') {
            cookies = document.cookie.split(';');
            for (i = 0; i < cookies.length; i++) {
                cookie = cookies[i] && cookies[i].trim();
                // Does this cookie string begin with the name we want?
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    assign(Sparky.fn, {
        'request-on-submit': function(node, scopes) {
            var type = 'submit';
            var scope;

            events(type, node)
            .tap(preventDefault)
            .each(function(e) {
                var method = attribute('method', node);
                var action = attribute('action', node);

                // Todo: Use request fn from resouce
                request({
                    url:    action,
                    method: method,
                    data:   scope,
                    headers: {
                        "X-CSRFToken": getCookie('csrftoken')
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