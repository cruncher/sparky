
// Sparky.Throttle(fn)

(function(window) {
	"use strict";

	// Import

	var Fn     = window.Fn;
	var Sparky = window.Sparky;

	// Utility functions

	var noop = Fn.noop;

	function Throttle(fn) {
		var queued, context, args;

		function update() {
			queued = false;
			fn.apply(context, args);
		}

		function cancel() {
			// Don't permit further changes to be queued
			queue = noop;

			// If there is an update queued apply it now
			if (queued) { update(); }

			// Make the queued update do nothing
			fn = noop;
		}

		function queue() {
			// Don't queue update if it's already queued
			if (queued) { return; }

			// Queue update
			window.requestAnimationFrame(update);
			queued = true;
		}

		function throttle() {
			// Store the latest context and arguments
			context = this;
			args = arguments;

			// Queue the update
			queue();
		}

		throttle.cancel = cancel;
		//update();

		return throttle;
	}

	Sparky.Throttle = Throttle;
})(this);
