(function(window) {
	"use strict";

	var Sparky     = window.Sparky;
	var Collection = window.Collection;
	var MIDI       = window.MIDI;

	//var collection = Sparky.data['midi-nodes'] = Collection();

	// Note: was "midi-scope"
	Sparky.fn['midi'] = function(node, scopes) {
		return MIDI;
	};

	Sparky.fn['if-midi'] = function(node, scopes) {
		MIDI.request.then(undefined, function() {
			Sparky.dom.remove(node);
		});
	};

	Sparky.fn['if-not-midi'] = function(node, scopes) {
		MIDI.request.then(function() {
			Sparky.dom.remove(node);
		});
	};
})(window);
