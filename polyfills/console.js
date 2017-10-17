(function(window, isIE) {
	"use strict";

	if (window.console && !window.console.group) {
		console.log('Polyfill: console.group');
		window.console.group          = window.console.log;
		window.console.groupCollapsed = window.console.group;
		window.console.groupEnd       = function() {
			window.console.log('---');
		};
	}

	if (window.console && !window.console.table) {
		console.log('Polyfill: console.table');
		window.console.table          = window.console.log;
	}
})(
	window,
	// Detect IE
	!!(document.all && document.compatMode || window.navigator.msPointerEnabled)
);
