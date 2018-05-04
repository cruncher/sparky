
import Sparky from '../sparky.js';

group('textarea', function(test, log, fixture) {
	var inputEvent = new CustomEvent('input', { bubbles: true });

	test('textarea empty', function(equals, done) {
		var node  = fixture.querySelector('.node-1');
		var model = { property: 'boo' };

		Sparky(node, model);

		requestAnimationFrame(function() {
			equals('boo', node.value);

			node.value = '';
			node.dispatchEvent(inputEvent);
			equals('', model.property);

			node.value = 'baa';
			node.dispatchEvent(inputEvent);
			equals('baa', model.property);

			Observable(model).property = false;

			requestAnimationFrame(function() {
				equals('', node.value);
				done();
			});
		});
	});

	test('textarea bla bla', function(equals, done) {
		var node  = fixture.querySelector('.node-2');
		var model = {};

		Sparky(node, model);

		requestAnimationFrame(function() {
			equals('bla bla', model.property);
			node.value = '';
			node.dispatchEvent(inputEvent);
			equals('', model.property);
			done();
		});
	});
}, function() {/*

<textarea class="node-1" sparky-value="{[property]}"></textarea>
<textarea class="node-2" sparky-value="{[property]}">bla bla</textarea>

*/});
