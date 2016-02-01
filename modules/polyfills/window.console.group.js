(function(window) {
	"use strict";
	
	if (window.console && !window.console.group) {
		window.console.group = window.console.log;
		window.console.groupEnd = function groupEnd() {};
	}
})(window);
