(function(window) {
	"use strict";

	var Fn     = window.Fn;
	var Sparky = window.Sparky;
	var set    = Fn.set;

	Sparky.fn.html = function each(node, scopes, params) {
        return scopes.tap(set('innerHTML', node));
	};
})(window);
