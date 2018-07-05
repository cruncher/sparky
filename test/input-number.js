import Sparky from '../sparky.js';


group('input[type="number"]', function(test, log, fixture) {
	var inputEvent = new CustomEvent('input', { bubbles: true });

	test('input[type="number"]', function(equals, done) {
		var node  = fixture.querySelector('.node-1');
		var model = { property: 0 };

		Sparky(node, model);

		requestAnimationFrame(function() {
			equals('0', node.value);

			node.value = '';
			node.dispatchEvent(inputEvent);
			equals(undefined, model.property);

			node.value = '1';
			node.dispatchEvent(inputEvent);
			equals(1, model.property);

			Observable(model).property = false;

			requestAnimationFrame(function() {
				equals('', node.value);
				done();
			});
		});
	});

	test('input[type="number", value]', function(equals, done) {
		var node  = fixture.querySelector('.node-2');
		var model = {};

		Sparky(node, model);

		requestAnimationFrame(function() {
			equals(0, model.property);
			node.value = '';
			node.dispatchEvent(inputEvent);
			equals(undefined, model.property);
			done();
		});
	});

	test('input[type="number", value, min, max]', function(equals, done) {
		var node  = fixture.querySelector('.node-3');
		var model = {
			min: 1,
			max: 2
		};

		Sparky(node, model);

		requestAnimationFrame(function() {
			equals(0, model.property);
			node.value = '';
			node.dispatchEvent(inputEvent);
			equals(undefined, model.property);
			done();
		});
	});
}, function() {/*

<input class="node-1" type="number" sparky-value="{[property]}" />
<input class="node-2" type="number" sparky-value="{[property]}" value="0" />
<input class="node-3" type="number" sparky-value="{[property]}" value="0" min="{[min]}" max="{[max]}" />

*/});
