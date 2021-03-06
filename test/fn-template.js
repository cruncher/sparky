
import { Observer, test as group } from '../../fn/module.js';
import Sparky from '../module.js';

group('[sparky-fn="template:hash"]', function(test, log, fixture) {
	var node   = fixture.children[0];
	var sparky = Sparky(node);
	var data   = Observer({
		property: 'Hello'
	});

	test('[sparky-fn="template:hash"]', function(equals, done) {
		equals('Default content.', node.innerHTML);

		sparky.push(data);
		data.property = 'Goodbye';

		requestAnimationFrame(function() {
			equals('Goodbye', node.getAttribute('class'));
			equals('Template: Goodbye', node.innerHTML);

			data.property = 'Hello again';

			equals('Goodbye', node.getAttribute('class'));
			equals('Template: Goodbye', node.innerHTML);

			requestAnimationFrame(function() {
				equals('Hello again', node.getAttribute('class'));
				equals('Template: Hello again', node.innerHTML);

				done();
			});
		});
	}, 7);
}, function() {/*

	<p class="{[property]}" sparky-fn="template:'#test-template'">Default content.</p>
	<template id="test-template">Template: {[property]}</template>

*/});

group('[sparky-fn="template:hash"]', function(test, log, fixture) {
	var node   = fixture.children[0];
	var sparky = Sparky(node);
	var data   = Observer({
		property: 'Hello'
	});

	test('[sparky-fn="template:hash"]', function(equals, done) {
		equals('Default content.', node.innerHTML);

		requestAnimationFrame(function() {
			requestAnimationFrame(function() {
				equals('Default content.', node.innerHTML);
				sparky.push(data);
				data.property = 'Goodbye';

				//equals('Hello', node.getAttribute('class'));
				//equals('Template: Hello', node.innerHTML);

				requestAnimationFrame(function() {
					equals('Goodbye', node.getAttribute('class'));
					equals('Template: Goodbye', node.innerHTML);
					done();
				});
			});
		});
	}, 4);
}, function() {/*

	<p class="{[property]}" sparky-fn="template:'#test-template'">Default content.</p>
	<template id="test-template">Template: {[property]}</template>

*/});


group('svg > [sparky-fn="template:hash"]', function(test, log, fixture) {
	// Note that this tests something that cannot be done – inserting SVG
	// elements from a <template>. Template children will always be HTML.

	var svg    = fixture.children[0];
	var sparky = Sparky(svg);

	test('svg > [sparky-fn="template:hash"]', function(equals, done) {
		sparky.push(Observer({}));

		requestAnimationFrame(function() {
			equals(true, !fixture.querySelector('svg > g > circle'), 'The <g> should not contain a <circle>.');
			equals(true, !!fixture.querySelector('svg > g > rect'), 'The <g> should contain a <rect>.');
			done();
		});
	}, 2);
}, function() {/*

<svg viewbox="0 0 100 100">
	<g sparky-fn="template:'#g-template'">
		<circle cx="50" cy="50" r="50"></circle>
	</g>
</svg>

<template id="g-template">
	<rect x="0" y="0" width="100" height="100"></rect>
</template>

*/});

group('[sparky-fn="template:hash"] nested templates', function(test, log, fixture) {
	test('[sparky-fn="template:hash"] nested templates', function(equals, done) {
		var node   = fixture.children[0];
		var sparky = Sparky(node);
		var data   = Observer({
			property: 'should-appear',
			scope: {
				message:  'Should appear'
			}
		});

		equals('Default content.', node.innerHTML);
		sparky.push(data);

		requestAnimationFrame(function() {
			requestAnimationFrame(function() {
				equals(2, node.children.length);
				var span = node.querySelector('span');
				equals('Template 2 content: Should appear.', span.innerHTML);
				done();
			});
		});
	}, 3);

	test('[sparky-fn="template:hash"] nested templates, async sub-data', function(equals, done) {
		var node   = fixture.children[1];
		var sparky = Sparky(node);
		var data   = Observer({
			property: 'should-appear'
		});

		equals('Default content.', node.innerHTML);
		sparky.push(data);

		requestAnimationFrame(function() {
			var span = node.querySelector('span');
			equals(true, !!span);
			equals('Template 1 content.', span.innerHTML);

			data.scope = {
				message: 'Should appear'
			};

			requestAnimationFrame(function() {
				equals('Template 2 content: Should appear.', span.innerHTML);
				done();
			});
		});
	}, 4);
}, function() {/*
	<p class="{[property]}" sparky-fn="template:'#test-template-1'">Default content.</p>
	<p class="{[property]}" sparky-fn="template:'#test-template-1'">Default content.</p>

	<template id="test-template-1">
		Template: {[property]}<br/>
		<span sparky-fn="get:'scope' template:'#test-template-2'">Template 1 content.</span>
	</template>

	<template id="test-template-2">Template 2 content: {[message]}.</template>
*/});
