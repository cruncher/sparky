import { Observer, test as group } from '../../fn/module.js';
import Sparky from '../module.js';

group('input[type="checkbox"]', function(test, log, fixture) {
	var node = fixture.children[0];
	var sparky = Sparky(node);
	var changeEvent = new CustomEvent('change', { bubbles: true });

	test('input[type="checkbox"]', function(equals, done) {
		var node1 = fixture.querySelector('.node-1');
		var model1 = { property: true };

		Sparky(node1).push(model1);

		requestAnimationFrame(function() {
			equals(true, node1.checked, 'Checkbox 1 should be checked');

			node1.checked = false;
			node1.dispatchEvent(changeEvent);
			equals(false, model1.property, 'model.property should be false');

			node1.checked = true;
			node1.dispatchEvent(changeEvent);
			equals(true, model1.property, 'model.property should be true');

			Observer(model1).property = false;

			requestAnimationFrame(function() {
				equals(false, node1.checked, 'Checkbox 1 should not be checked');
				done();
			});
		});
	});

	test('input[type="checkbox", checked]', function(equals, done) {
		var node2 = fixture.querySelector('.node-2');
		var model2 = { };

		Sparky(node2).push(model2);

		requestAnimationFrame(function() {
			equals(true, model2.property, 'model2.property should be true');
			equals(true, node2.checked,   'Checkbox 2 should be checked');

			Observer(model2).property = 'eg';

			requestAnimationFrame(function() {
				equals(false, node2.checked, 'Checkbox 2 should not be checked');
				done();
			});
		});
	});

	test('input[type="checkbox", checked, value]', function(equals, done) {
		var node  = fixture.querySelector('.node-3');
		var model = { };

		Sparky(node).push(model);

		requestAnimationFrame(function() {
			equals('good', model.property);
			equals(true, node.checked);

			node.checked = false;
			node.dispatchEvent(changeEvent);
			equals(undefined, model.property);

			node.checked = true;
			node.dispatchEvent(changeEvent);
			equals('good', model.property);

			Observer(model).property = false;

			requestAnimationFrame(function() {
				equals(false, node.checked);
				done();
			});
		});
	});
}, function() {/*

<input class="node-1" type="checkbox" :value="{[property]}" />
<input class="node-2" type="checkbox" :value="{[property]}" checked="checked" />
<input class="node-3" type="checkbox" :value="{[property]}" checked="checked" value="good" />

*/});
