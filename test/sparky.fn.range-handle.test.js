group('[data-fn="range-handle"]', function(test, log, fixture) {
	test('[data-fn="each"]', function(equals, done) {
		var sparky = Sparky('#gogo', {});

		done();
	}, 8);
}, function() {/*

<div id="gogo" data-template="test-ranges">
</div>

<template id="test-ranges">
	<input type="range" id="range-input" min="2" />
	<label data-fn="range-handle" class="block" for="range-input">label mr</label>
	<label data-fn="range-handle" class="block" for="range-input">label mr</label>
</template>

*/});
