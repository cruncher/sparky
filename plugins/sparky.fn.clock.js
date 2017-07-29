(function(window) {
	"use strict";

	var Sparky     = window.Sparky;
	var Observable = window.Observable;
	var Fn         = window.Fn;

	Sparky.fn.clock = function(node, scopes, params) {
		var observable = Observable({
			time: new Date()
		});

		return Stream.clock(params && params[0] || 1).map(function() {
			observable.time = new Date();
			return observable;
		});
	};
})(this);
