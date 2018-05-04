import Sparky from '../sparky.js';

group('[sparky-fn="range-handle"]', function(test, log, fixture) {
	test('[sparky-fn="each"]', function(equals, done) {
		Sparky('#gogo', {});
		done();
	}, 0);
}, function() {/*

<div sparky-template="test-ranges" id="gogo">
</div>

<template id="test-ranges">
	<input type="range" id="range-input" min="2" />
	<label sparky-fn="range-handle" class="no-wrap block test-bubble bubble" for="range-input">label mr</label>
	<label sparky-fn="range-handle" class="no-wrap block test-bubble bubble" for="range-input">label mr</label>
</template>

*/});
