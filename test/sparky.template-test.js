group('[data-template]', function(test, log, fixture) {
	var node   = fixture.children[0];
	var sparky = Sparky(node);

	test('', function(equals, done) {
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
