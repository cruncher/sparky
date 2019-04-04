import { Observer, test as group } from '../../fn/module.js';
import Sparky from '../module.js';

group('input[type="range"]', function(test, log, fixture) {
	var inputEvent = new CustomEvent('input', { bubbles: true });

	test('input[type="range"]', function(equals, done) {
		var node  = fixture.querySelector('.node-1');
		var model = { property: 0 };

		Sparky(node).push(model);

		requestAnimationFrame(function() {
			equals('0', node.value);

			node.value = '1';
			node.dispatchEvent(inputEvent);

			equals(1, model.property);
			done();
		});
	});

	test('input[type="range", value]', function(equals, done) {
		var node  = fixture.querySelector('.node-2');
		var model = {};

		Sparky(node).push(model);

		requestAnimationFrame(function() {
			equals(0, model.property);
			done();
		});
	});

	test('input[type="range", value, min, max]', function(equals, done) {
		var node  = fixture.querySelector('.node-3');
		var model = {
			min: 1,
			max: 2
		};

		Sparky(node).push(model);

		requestAnimationFrame(function() {
			equals('1', node.min);
			equals('2', node.max);
			equals(1, model.property);
			done();
		});
	});

	test('input[type="range", value, min, max] | add:2', function(equals, done) {
		var node  = fixture.querySelector('.node-4');
		var model = {
			//min: 0,
			//max: 20
		};

		Sparky(node).push(model);

		requestAnimationFrame(function() {
			equals(-2, model.property);
			equals('0', node.value);

			node.value = '10';
			node.dispatchEvent(inputEvent);

			equals(8, model.property);

			Observer(model).property = 12;

			requestAnimationFrame(function() {
				equals('14', node.value);
				equals(12, model.property);
				done();
			});
		});
	});
}, function() {/*

<input class="node-1" type="range" :value="{[property]}" />
<input class="node-2" type="range" :value="{[property]}" value="0" />
<input class="node-3" type="range" :value="{[property]}" value="0" min="{[min]}" max="{[max]}" />
<input class="node-4" type="range" :value="{[property|add:2]}" value="0" min="{[min]}" max="{[max]}" />

*/});
