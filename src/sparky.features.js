
// Sparky.features
// Feature tests for Sparky.

(function(window, Sparky){
	"use strict";

	var dom = Sparky.dom;
	var testEvent = new CustomEvent('featuretest', { bubbles: true });

	// Older browsers don't know about the content property of templates.
	function testTemplate() {
		return 'content' in document.createElement('template');
	}

	// FireFox won't dispatch any events on disabled inputs:
	// https://bugzilla.mozilla.org/show_bug.cgi?id=329509
	function testEventDispatchOnDisabled() {
		var input = document.createElement('input');
		var result = false;

		dom.append(document.body, input);
		input.disabled = true;
		input.addEventListener('featuretest', function(e) { result = true; });
		input.dispatchEvent(testEvent);
		dom.remove(input);

		return result;
	}

	Sparky.features = {
		template: testTemplate(),
		eventDispatchOnDisabled: testEventDispatchOnDisabled()
	};
})(window, window.Sparky);
