(function(window) {
	"use strict";

	var Sparky = window.Sparky;
	var MIDI   = window.MIDI;
	var collection = Sparky.data['midi-nodes'] = Collection();

	// Note: was "midi-scope"
	Sparky.fn['midi'] = function(node) {
		return MIDI;
	};

	Sparky.fn['if-midi'] = function(node) {
		MIDI.request.then(undefined, function() {
			Sparky.dom.remove(node);
		});
	};

	Sparky.fn['if-not-midi'] = function(node) {
		MIDI.request.then(function() {
			Sparky.dom.remove(node);
		});
	};
})(window);
