
(function(window) {
	"use strict";

	var Fn      = window.Fn;
	var Sparky  = window.Sparky;
	var rest    = Fn.rest;

	function analyse(category, action, label, value) {
		window.ga && window.ga('send', 'event', category, action, label, value);
	}

	function analyseTime(category, action, label, time) {
		// Time should be an integer, in milliseconds
		time = Math.round(time || window.performance.now());
		window.ga && window.ga('send', 'timing', category, action, time, label);
	}

	Sparky.fn['analyse-on'] = function stickToTop(node, scopes, params) {
		node.addEventListener(params[0], function(e) {
			analyse.apply(null, rest(1, params));
		});
	};
})(this);
