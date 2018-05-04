import Sparky from '../sparky.js';

group('input[type="text"]', function(test, log, fixture) {
	var inputEvent = new CustomEvent('input', { bubbles: true });

	test('input[type="text"]', function(equals, done) {
		var node  = fixture.querySelector('.node-1');
		var model = Observable({ property: 'boo' });

		Sparky(node, model);

		requestAnimationFrame(function() {
			equals('boo', node.value);

			node.value = '';
			node.dispatchEvent(inputEvent);
			equals('', model.property);

			node.value = 'boo';
			node.dispatchEvent(inputEvent);
			equals('boo', model.property);

			model.property = false;

			requestAnimationFrame(function() {
				equals('', node.value);
				done();
			});
		});
	});

	test('input[type="text", value]', function(equals, done) {
		var node  = fixture.querySelector('.node-2');
		var model = {};

		Sparky(node, model);

		requestAnimationFrame(function() {
			equals('blabla', model.property);

			node.value = '';
			node.dispatchEvent(inputEvent);
			equals('', model.property);

			done();
		});
	});
}, function() {/*

<input class="node-1" type="text" sparky-value="{[property]}" />
<input class="node-2" type="text" sparky-value="{[property]}" value="blabla" />

*/});



group('input[type="checkbox"]', function(test, log, fixture) {
	var node = fixture.children[0];
	var sparky = Sparky(node);
	var changeEvent = new CustomEvent('change', { bubbles: true });

	test('input[type="checkbox"]', function(equals, done) {
		var node1 = fixture.querySelector('.node-1');
		var model1 = { property: true };

		Sparky(node1, model1);

		requestAnimationFrame(function() {
			equals(true, node1.checked,   'Checkbox 1 should be checked');

			node1.checked = false;
			node1.dispatchEvent(changeEvent);
			equals(false, model1.property, 'model.property should be false');

			node1.checked = true;
			node1.dispatchEvent(changeEvent);
			equals(true, model1.property, 'model.property should be true');

			Observable(model1).property = false;

			requestAnimationFrame(function() {
				equals(false, node1.checked, 'Checkbox 1 should not be checked');
				done();
			});
		});
	});

	test('input[type="checkbox", checked]', function(equals, done) {
		var node2 = fixture.querySelector('.node-2');
		var model2 = { };

		Sparky(node2, model2);

		requestAnimationFrame(function() {
			equals(true, model2.property, 'model2.property should be true');
			equals(true, node2.checked,   'Checkbox 2 should be checked');

			Observable(model2).property = 'eg';

			requestAnimationFrame(function() {
				equals(false, node2.checked, 'Checkbox 2 should not be checked');
				done();
			});
		});
	});

	test('input[type="checkbox", checked, value]', function(equals, done) {
		var node  = fixture.querySelector('.node-3');
		var model = { };

		Sparky(node, model);

		requestAnimationFrame(function() {
			equals('good', model.property);
			equals(true, node.checked);

			node.checked = false;
			node.dispatchEvent(changeEvent);
			equals(undefined, model.property);

			node.checked = true;
			node.dispatchEvent(changeEvent);
			equals('good', model.property);

			Observable(model).property = false;

			requestAnimationFrame(function() {
				equals(false, node.checked);
				done();
			});
		});
	});
}, function() {/*

<input class="node-1" type="checkbox" sparky-value="{[property]}" />
<input class="node-2" type="checkbox" sparky-value="{[property]}" checked="checked" />
<input class="node-3" type="checkbox" sparky-value="{[property]}" checked="checked" value="good" />

*/});



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



group('input[type="range"]', function(test, log, fixture) {
	var inputEvent = new CustomEvent('input', { bubbles: true });

	test('input[type="range"]', function(equals, done) {
		var node  = fixture.querySelector('.node-1');
		var model = { property: 0 };

		Sparky(node, model);

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

		Sparky(node, model);

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

		Sparky(node, model);

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
			min: 0,
			max: 20
		};

		Sparky(node, model);

		requestAnimationFrame(function() {
			equals(-2, model.property);
			equals('0', node.value);

			node.value = '10';
			node.dispatchEvent(inputEvent);

			equals(8, model.property);

			Observable(model).property = 12;

			requestAnimationFrame(function() {
				equals('14', node.value);
				done();
			});
		});
	});
}, function() {/*

<input class="node-1" type="range" sparky-value="{[property]}" />
<input class="node-2" type="range" sparky-value="{[property]}" value="0" />
<input class="node-3" type="range" sparky-value="{[property]}" value="0" min="{[min]}" max="{[max]}" />
<input class="node-4" type="range" sparky-value="{[property|add:2]}" value="0" min="{[min]}" max="{[max]}" />

*/});
