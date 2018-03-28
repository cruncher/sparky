
(function(window) {
	"use strict";

	var Fn       = window.Fn;
	var dom      = window.dom;
	var Sparky   = window.Sparky;

	Sparky.fn['scope-on'] = function scopeOn(node, scopes, params) {
		// Safari requires the .select to be delayed, as focus seems to happen
		// on mouseup, while the click that follows it resets the cursor.
		return dom.events(params[0], node)
        .map(Fn.get('relatedTarget'))
        .map(Sparky.getScope);
	};
})(window);
