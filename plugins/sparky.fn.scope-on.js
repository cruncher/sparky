
(function(window) {
	"use strict";

	var Fn       = window.Fn;
	var Sparky   = window.Sparky;
	var throttle = Fn.throttle;

	Sparky.fn['scope-on'] = function scopeOn(node, scopes, params) {
		// Safari requires the .select to be delayed, as focus seems to happen
		// on mouseup, while the click that follows it resets the cursor.
		return dom.event(params[0], node)
        .map(Fn.get('relatedTarget'))
        .map(Sparky.getScope);
	};
})(this);
