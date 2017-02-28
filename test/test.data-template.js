
module('Sparky:templates 1', function(test) {
	console.log('Test <p data-template="id"> ...');

	test('Sparky should replace contents of SVG <g data-template="id">', function(assert, done, fixture) {
		assert.expect(2);

		var sparky = Sparky('#div', {});

		window.requestAnimationFrame(function() {
			assert.ok(!fixture.querySelector('#div > p > span'), 'The <p> should not contain a <span>.');
			assert.ok(!!fixture.querySelector('#div > p > b'), 'The <p> should contain a <b>.');
			done();
		});
	});
}, function() {/*

<div id="div">
	<p data-template="p-template">
		<span>Hello</span>
	</p>
</div>

<template id="p-template">
	<b>Hello</b>
</template>

*/});

module('Sparky:templates 2', function(test) {
	console.log('Test <g data-template="id"> ...');

	test('Sparky should replace contents of SVG <g data-template="id">', function(assert, done, fixture) {
		assert.expect(2);

		var svg    = fixture.querySelector('#svg');
		var sparky = Sparky('#svg', {});

		window.requestAnimationFrame(function() {
			assert.ok(!fixture.querySelector('#svg > g > circle'), 'The <g> should not contain a <circle>.');
			assert.ok(!!fixture.querySelector('#svg > g > rect'), 'The <g> should contain a <rect>.');
			done();
		});
	});
}, function() {/*

<svg viewbox="0 0 100 100" id="svg">
	<g data-template="g-template">
		<circle cx="50" cy="50" r="50"></circle>
	</g>
</svg>

<template id="g-template">
	<rect x="0" y="0" width="100" height="100"></rect>
</template>

*/});

module('Sparky:templates 3', function(test) {
	console.log('Test <g data-template="id"> ...');

	test('Sparky should run fns on top-level elements in templates', function(assert, done, fixture) {
		assert.expect(2);

		Sparky.fn['do-something'] = function(node, scopes) {
			assert.ok(true, 'do-something should be called');
		};

		var sparky = Sparky('#test-template', {});

		window.requestAnimationFrame(function() {
			done();
		});
	});
}, function() {/*

<template id="test-template">
	<p data-fn="do-something">My God, it's full of stars.</p>
	<p data-fn="do-something">My God, it's full of stars.</p>
</template>

*/});