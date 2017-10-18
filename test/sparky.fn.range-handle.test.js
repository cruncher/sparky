group('[data-fn="range-handle"]', function(test, log, fixture) {
	test('[data-fn="each"]', function(equals, done) {
		Sparky('#gogo', {});
		done();
	}, 0);
}, function() {/*

<div data-template="test-ranges" id="gogo">
</div>

<template id="test-ranges">
	<input type="range" id="range-input" min="2" />
	<label data-fn="range-handle" class="no-wrap block test-bubble bubble" for="range-input">label mr</label>
	<label data-fn="range-handle" class="no-wrap block test-bubble bubble" for="range-input">label mr</label>
</template>

*/});
