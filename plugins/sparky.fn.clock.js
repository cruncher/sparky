(function(window) {
	"use strict";

	var Sparky     = window.Sparky;
	var Observable = window.Observable;

	Sparky.fn.clock = function(node, scopes, params) {
		var seconds = params ? params[0] : 1 ;

		var scope = {
			time: new Date()
		};

		var observable = Observable(scope);

		setInterval(function() {
			observable.time = new Date();
		}, seconds * 1000);

		return Fn.of(observable);
	};
})(this);
