(function(window) {
	"use strict";

	var dom        = window.dom;
	var Sparky     = window.Sparky;

	var append     = dom.append;
	var clone      = dom.clone;
	var empty      = dom.empty;

	Sparky.fn.template = function each(node, scopes, params) {
        var id = params[0];
        var template = dom.fragmentFromId(id);

        if (!template) {
            throw new Error('Sparky: template ' + id + ' not found.');
        }

        var sparky = this;
        sparky.interrupt();

        scopes
		.clone()
		.take(1)
        .each(function(scope) {
            var fragment = clone(template);
            empty(node);
            append(node, fragment);
			sparky.continue();
        });

		return scopes;
	};
})(this);
