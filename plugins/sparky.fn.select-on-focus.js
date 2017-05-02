
(function(window) {
	"use strict";

	var Fn       = window.Fn;
	var Sparky   = window.Sparky;
	var throttle = Fn.throttle;

	Sparky.fn['select-on-focus'] = function selectOnFocus(node, scopes) {
		// Safari requires the .select to be delayed, as focus seems to happen
		// on mouseup, while the click that follows it resets the cursor.
		node.addEventListener('focus', throttle(function(e) {
			e.target.select();
		}));
	};
})(this);
