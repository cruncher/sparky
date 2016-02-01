module('Controller', function(fixture) {
	console.log('Test Sparky()...');

	asyncTest("ctrl found in Sparky.fn and {{tag}} replaced with scope property", function(assert) {
		var node = fixture.querySelector('div');

		expect(2);

		Sparky.fn['test-ctrl'] = function(node, model) {
			ok(model === undefined, model);
			return { property: 'peas' };
		};

		Sparky(node);

		window.requestAnimationFrame(function functionName() {
			ok(node.innerHTML === 'peas', node.innerHTML);
			QUnit.start();
		});
	});

	asyncTest("ctrl passed in as fn parameter and {{tag}} replaced with scope property", function(assert) {
		var node = fixture.querySelector('div');

		expect(2);

		Sparky(node, undefined, function(node, model, sparky) {
			ok(model === undefined, model);
			return { property: 'peas' };
		});

		window.requestAnimationFrame(function functionName() {
			ok(node.innerHTML === 'peas', node.innerHTML);
			QUnit.start();
		});
	});
}, function() {/*

<div data-fn="test-ctrl">{{property}}</div>

*/});


module('Live tags', function(fixture) {
	asyncTest("{{tag}} is replaced with model property", function(assert) {
		var node = fixture.querySelector('div');

		expect(1);

		Sparky.data['test-model'] = { property: 'juice' };
		Sparky(node);

		window.requestAnimationFrame(function functionName() {
			ok(node.innerHTML === 'juice');
			QUnit.start();
		});
	});
}, function() {/*

<div data-scope="test-model">{{property}}</div>

*/});

//module('Static tags', function(fixture) {
//	asyncTest("{{{tag}}} is replaced with model property", function() {
//		expect(1);
//
//		var node = fixture.querySelector('div');
//
//		Sparky.data['test-model'] = { property: 'juice' };
//		Sparky(node);
//
//		window.requestAnimationFrame(function() {
//			ok(node.innerHTML === 'juice', 'node.innerHTML expected "juice", actually "' + node.innerHTML + '"');
//			QUnit.start();
//		});
//	});
//}, function() {/*
//
//<div data-scope="test-model">{{{property}}}</div>
//
//*/});

module('Child sparky', function(fixture) {
	asyncTest('Children instantiated with correct controllers and models', function(assert) {
		expect(6);

		Sparky.fn['test-ctrl'] = function(node, model, sparky) {
			return {
				'sub-model-1': { property: 'sub-1' },
				'sub-model-2': { property: 'sub-2' }
			};
		};

		Sparky.fn['test-ctrl-1'] = function(node, model, sparky) {
			return { property: 'value-1' };
		};

		Sparky.fn['test-ctrl-2'] = function(node, model, sparky) {
			return { property: 'value-2' };
		};

		Sparky.data['test-model-1'] = {
			property: 'value-3'
		};

		Sparky.data['test-model-2'] = {
			property: 'value-4'
		};

		var div1 = fixture.querySelector('[data-fn="test-ctrl"]');
		var p1   = fixture.querySelector('[data-fn="test-ctrl-1"]');
		var p2   = fixture.querySelector('[data-fn="test-ctrl-2"]');
		var p3   = fixture.querySelector('[data-scope="{{sub-model-1}}"]');
		var p4   = fixture.querySelector('[data-scope="{{sub-model-2}}"]');

		Sparky(div1);

		window.requestAnimationFrame(function() {
			ok(p1.innerHTML === 'value-1');
			ok(p2.innerHTML === 'value-2');
			ok(p3.innerHTML === 'sub-1');
			ok(p4.innerHTML === 'sub-2');
		});

		var div2 = fixture.querySelector('[data-scope="test-model"]');
		var p5   = fixture.querySelector('[data-scope="test-model-1"]');
		var p6   = fixture.querySelector('[data-scope="test-model-2"]');

		Sparky(div2);

		window.requestAnimationFrame(function() {
			ok(p5.innerHTML === 'value-3');
			ok(p6.innerHTML === 'value-4');
			QUnit.start();
		});
	});

	asyncTest("Test property changes update the DOM on animation frames.", function(assert) {
		// Reset Sparky
		Sparky.data = {};

		var model  = Sparky.data['test-model']   = {};
		var model1 = Sparky.data['test-model-1'] = {};
		var model2 = Sparky.data['test-model-2'] = {
		    	property: 'Boil yer heid'
		    };
		var div2 = fixture.querySelector('[data-scope="test-model"]');
		var p5   = fixture.querySelector('[data-scope="test-model-1"]');
		var p6   = fixture.querySelector('[data-scope="test-model-2"]');

		Sparky(div2);

		window.requestAnimationFrame(function() {
			assert.ok(p5.innerHTML === '', 'p5 is empty.');
			model1.property = 'Hello duckies';
			assert.ok(p5.innerHTML === '', 'DOM is not updated immediately.');

			window.requestAnimationFrame(function() {
				assert.ok(p5.innerHTML === 'Hello duckies', "DOM is updated on animation frame.");
			});

			// TODO: DOM IS updated immediately on call to Sparky(). Not sure this is
			// correct behaviour.
			//assert.ok(p6.innerHTML === '', 'p6 is not updated immediately.');
			model2.property = 'Goodbye friends';

			window.requestAnimationFrame(function() {
				assert.ok(p6.innerHTML === 'Pass the carrot', "DOM is updated to latest value.");
			});

			model2.property = 'Pass the carrot';

			// Restart QUnit
			window.requestAnimationFrame(function() {
				QUnit.start();
			});
		});
	});

	asyncTest("Tests .destroy()", function(assert) {
		expect(2);

		// Reset Sparky
		Sparky.data = {};

		var model  = Sparky.data['test-model']   = {};
		var model1 = Sparky.data['test-model-1'] = {};
		var model2 = Sparky.data['test-model-2'] = {};
		var p5     = fixture.querySelector('[data-scope="test-model-1"]');
		var sparky = Sparky(p5);

		window.requestAnimationFrame(function() {
			assert.ok(p5.innerHTML === '', 'p5 is empty.');

			model1.property = 'Hello duckies';
			sparky.destroy();
			model1.property = 'Poop';

			window.requestAnimationFrame(function() {
				assert.ok(p5.innerHTML === 'Hello duckies', ".destroy()");
			});

			// Restart QUnit
			window.requestAnimationFrame(function() {
				QUnit.start();
			});
		});
	});


	asyncTest("Tests .destroy() of sparky's children", function(assert) {
		expect(2);

		// Reset Sparky
		Sparky.data = {};

		var model  = Sparky.data['test-model']   = {};
		var model1 = Sparky.data['test-model-1'] = {};
		var model2 = Sparky.data['test-model-2'] = {};
		var div2 = fixture.querySelector('[data-scope="test-model"]');
		var p5   = fixture.querySelector('[data-scope="test-model-1"]');
		var sparky = Sparky(div2);

		window.requestAnimationFrame(function() {
			assert.ok(p5.innerHTML === '', 'p5 is empty.');
			model1.property = 'Value 1';
			sparky.destroy();
			model1.property = 'Value 2';

			window.requestAnimationFrame(function() {
				assert.ok(p5.innerHTML === 'Value 1', "Child successfully destroyed. " + p5.innerHTML);
			});

			// Restart QUnit
			window.requestAnimationFrame(function() {
				QUnit.start();
			});
		});
	});

}, function() {/*

<div data-fn="test-ctrl">
	<p data-fn="test-ctrl-1">{{property}}</p>
	<p data-fn="test-ctrl-2">{{property}}</p>

	<p data-scope="{{sub-model-1}}">{{property}}</p>
	<p data-scope="{{sub-model-2}}">{{property}}</p>
</div>

<div data-scope="test-model">
	<p data-scope="test-model-1">{{property}}</p>
	<p data-scope="test-model-2">{{property}}</p>
</div>

*/});

module('Test tags in class attributes...', function(fixture) {
	console.log('Test tags in class attributes...');

	asyncTest("Tags is class attributes", function() {
		expect(4);

		var node = fixture.querySelector('div');
		var model = { property: 'peas' };

		Sparky.data.model = model;
		Sparky(node, model);
		node.classList.add('hello');

		window.requestAnimationFrame(function() {
			ok(node.classList.contains('hello'), 'Classes expected to contain "hello", actual: ' + node.getAttribute('class'));
			ok(node.classList.contains('peas'),  'Classes expected to contain "peas", actual: ' + node.getAttribute('class'));

			model.property = 'ice';

			window.requestAnimationFrame(function() {
				ok(!node.classList.contains('peas'), 'Classes expected to not contain "peas", actual: "' + node.getAttribute('class') + '"');
				ok(node.classList.contains('hello'), 'Classes expected to contain "hello", actual: "' + node.getAttribute('class') + '"');
				QUnit.start();
			});
		});
	});
}, function() {/*

<div data-scope="model" class="class-1 class-2 {{ property }}">{{property}}</div>

*/});

module('Test tags in class attributes...', function(fixture) {
	asyncTest("Tags is class attributes", function() {
		expect(3);

		var node = fixture.querySelector('div');
		var model = { property: 'peas' };

		Sparky.data.model = model;
		Sparky(node, model);
		node.classList.remove('class-2');

		window.requestAnimationFrame(function() {
			ok(node.classList.contains('peas'), 'Classes expected to contain "peas", actual: "' + node.getAttribute('class') + '"');
			ok(!node.classList.contains('class-2'), 'Classes not expected to contain "class-2", actual: "' + node.getAttribute('class') + '"');

			model.property = undefined;

			window.requestAnimationFrame(function() {
				ok(!node.classList.contains('peas'), 'Classes not expected to contain "peas", actual: "' + node.getAttribute('class') + '"');
				QUnit.start();
			});
		});
	});
}, function() {/*

<div data-scope="model" class="class-1 class-2 {{ property }}">{{property}}</div>

*/});

module('Test some SVG features of this browser...', function(fixture) {
	console.log('Test some SVG features of this browser...');

	test("SVG features", function() {
		var node = fixture.querySelector('line');
		var model = { property: 'peas' };

		// ------------------

		// Test some SVG features in this browser. These tests are not directly
		// Sparky's problem, just a note of what features are supported
		//console.log('getAttribute("class")', node.getAttribute('class'));
		//console.log('className', node.className);
		//console.log('classList', node.classList);

		ok(node.tagName.toLowerCase() === 'line', 'node.tagName should say "line"');
		ok(typeof node.getAttribute('class') === 'string', 'Not a Sparky problem directly - SVG Node .getAttribute("class") not returning a string in this browser, actually "' + (typeof node.getAttribute('class')) + '"');
		ok(node.getAttribute('class') === "class-1 class-2", 'Not a Sparky problem directly - SVG Node .getAttribute("class") expecting "class-1 class-2", actual: "' + node.getAttribute('class') + '"');

		// ------------------
	});
}, function() {/*

<div>
	<svg x="0px" y="0px" width="20px" height="20px" viewBox="0 0 20 20">
		<line class="class-1 class-2" x1="0" y1="0" x2="0" y2="0"></line>
	</svg>
</div>

*/});

module('Test tags in SVG class attributes...', function(fixture) {
	console.log('Test tags in SVG class attributes...');

	asyncTest("Tags is class attributes", function() {
		expect(7);

		var node = fixture.querySelector('line');
		var model = { property: 'peas' };

		ok(node.classList, 'classList does not exist');

		Sparky(node, model);
		node.classList.add('hello');

		window.requestAnimationFrame(function() {
			ok(node.classList.length === 4,        'Classes expected: "class-1 class-2 peas hello", actual: ' + node.getAttribute('class'));
			ok(node.classList.contains('class-1'), 'Classes expected: "class-1 class-2 peas hello", actual: ' + node.getAttribute('class'));
			ok(node.classList.contains('class-2'), 'Classes expected: "class-1 class-2 peas hello", actual: ' + node.getAttribute('class'));
			ok(node.classList.contains('peas'),    'Classes expected: "class-1 class-2 peas hello", actual: ' + node.getAttribute('class'));
			ok(node.classList.contains('hello'),   'Classes expected: "class-1 class-2 peas hello", actual: ' + node.getAttribute('class'));

			model.property = 'ice';

			window.requestAnimationFrame(function() {
				ok(node.classList.contains('hello'), 'Classes expected to contain "hello", actual: "' + node.getAttribute('class') + '"');
				QUnit.start();
			});
		});
	});
}, function() {/*

<div>
	<svg x="0px" y="0px" width="20px" height="20px" viewBox="0 0 20 20">
		<line class="class-1 class-2 {{property}}" x1="0" y1="0" x2="0" y2="0"></line>
	</svg>
</div>

*/});
