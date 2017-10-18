group('[data-template]', function(test, log, fixture) {
	var node   = fixture.children[0];
	var sparky = Sparky(node);

	test('[data-template="id"]', function(equals, done) {
		equals('Default content.', node.innerHTML);

		sparky.push(Observable({
			property: 'Hello'
		}));

		requestAnimationFrame(function() {
			equals('Hello', node.getAttribute('class'));
			equals('Template: Hello', node.innerHTML);
			done();
		});
	}, 3);
}, function() {/*

	<p class="{[property]}" data-template="test-template">Default content.</p>
	<template id="test-template">Template: {[property]}</template>

*/});


group('svg > [data-template]', function(test, log, fixture) {
	// Note that this tests something that cannot be done – inserting SVG
	// elements from a <template>. Template children will always be HTML.

	var svg    = fixture.children[0];
	var sparky = Sparky(svg);

	test('svg > [data-template="id"]', function(equals, done) {
		sparky.push(Observable({}));

		requestAnimationFrame(function() {
			equals(true, !fixture.querySelector('svg > g > circle'), 'The <g> should not contain a <circle>.');
			equals(true, !!fixture.querySelector('svg > g > rect'), 'The <g> should contain a <rect>.');
			done();
		});
	}, 2);
}, function() {/*

<svg viewbox="0 0 100 100">
	<g data-template="g-template">
		<circle cx="50" cy="50" r="50"></circle>
	</g>
</svg>

<template id="g-template">
	<rect x="0" y="0" width="100" height="100"></rect>
</template>

*/});
