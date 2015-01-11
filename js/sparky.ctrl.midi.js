(function(Sparky, MIDI) {
	"use strict";

	var collection = Sparky.data['midi-nodes'] = Sparky.Collection();

	function remove(node) {
		node.parentNode && node.parentNode.removeChild(node);
	}

	Sparky.ctrl['midi-scope'] = function(node, model) {
		return MIDI;
	};

	Sparky.ctrl['if-midi'] = function(node, model) {
		MIDI.request.then(undefined, function() {
			remove(node);
		});
	};

	Sparky.ctrl['if-not-midi'] = function(node, model) {
		MIDI.request.then(function() {
			remove(node);
		});
	};
})(window.Sparky, window.MIDI);
