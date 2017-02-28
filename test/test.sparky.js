//module('Controller', function(test) {
//	console.log('Test Sparky()...');
//
//	test("ctrl found in Sparky.fn and {[tag]} replaced with scope property", function(assert, done, fixture) {
//		var node = fixture.querySelector('div');
//
//		assert.expect(1);
//
//		Sparky.fn['test-ctrl'] = function(node, scopes) {
//			return Fn.of({ property: 'peas' });
//		};
//
//		Sparky(node);
//
//		window.requestAnimationFrame(function functionName() {
//			assert.ok(node.innerHTML === 'peas', node.innerHTML);
//			done();
//		});
//	});
//
//	test("ctrl passed in as fn parameter and {[tag]} replaced with scope property", function(assert, done, fixture) {
//		var node = fixture.querySelector('div');
//
//		assert.expect(1);
//
//		Sparky(node, undefined, function(node, scopes, sparky) {
//			return Fn.of({ property: 'peas' });
//		});
//
//		window.requestAnimationFrame(function functionName() {
//			assert.ok(node.innerHTML === 'peas', node.innerHTML);
//			done();
//		});
//	});
//}, function() {/*
//
//<div data-fn="test-ctrl">{[property]}</div>
//
//*/});
//
//
//module('Live tags', function(test) {
//	test("{[tag]} is replaced with model property", function(assert, done, fixture) {
//		var node = fixture.querySelector('div');
//
//		assert.expect(1);
//
//		Sparky.data['test-model'] = { property: 'juice' };
//		Sparky(node);
//
//		window.requestAnimationFrame(function functionName() {
//			assert.ok(node.innerHTML === 'juice');
//			done();
//		});
//	});
//}, function() {/*
//
//<div data-scope="test-model">{[property]}</div>
//
//*/});
//
//module('Live tags, delayed data', function(test) {
//	test("{[tag]} is replaced with model property", function(assert, done, fixture) {
//		var node = fixture.querySelector('div');
//
//		assert.expect(1);
//
//		Sparky(node);
//
//		window.requestAnimationFrame(function() {
//			Sparky.data['test-model'] = { property: 'juice' };
//			window.requestAnimationFrame(function() {
//				assert.ok(node.innerHTML === 'juice');
//				done();
//			});
//		});
//	});
//}, function() {/*
//
//<div data-scope="test-model">{[property]}</div>
//
//*/});







//module('Static tags', function(test) {
//	asyncTest("{[{tag]}} is replaced with model property", function() {
//		assert.expect(1);
//
//		var node = fixture.querySelector('div');
//
//		Sparky.data['test-model'] = { property: 'juice' };
//		Sparky(node);
//
//		window.requestAnimationFrame(function() {
//			assert.ok(node.innerHTML === 'juice', 'node.innerHTML expected "juice", actually "' + node.innerHTML + '"');
//			done();
//		});
//	});
//}, function() {/*
//
//<div data-scope="test-model">{[{property]}}</div>
//
//*/});







module('Child sparky', function(test) {
//	test('Children instantiated with correct controllers and models', function(assert, done, fixture) {
//		assert.expect(6);
//
//		Sparky.fn['test-ctrl'] = function(node, scopes) {
//			return Fn.of({
//				'sub-model-1': { property: 'sub-1' },
//				'sub-model-2': { property: 'sub-2' }
//			});
//		};
//
//		Sparky.fn['test-ctrl-1'] = function(node, scopes) {
//			return Fn.of({ property: 'value-1' });
//		};
//
//		Sparky.fn['test-ctrl-2'] = function(node, scopes) {
//			return Fn.of({ property: 'value-2' });
//		};
//
//		Sparky.data['test-model-1'] = {
//			property: 'value-3'
//		};
//
//		Sparky.data['test-model-2'] = {
//			property: 'value-4'
//		};
//
//		var div1 = fixture.querySelector('[data-fn="test-ctrl"]');
//		var p1   = fixture.querySelector('[data-fn="test-ctrl-1"]');
//		var p2   = fixture.querySelector('[data-fn="test-ctrl-2"]');
//		var p3   = fixture.querySelector('[data-scope="{[sub-model-1]}"]');
//		var p4   = fixture.querySelector('[data-scope="{[sub-model-2]}"]');
//
//		Sparky(div1);
//
//		window.requestAnimationFrame(function() {
//			assert.ok(p1.innerHTML === 'value-1');
//			assert.ok(p2.innerHTML === 'value-2');
//			assert.ok(p3.innerHTML === 'sub-1');
//			assert.ok(p4.innerHTML === 'sub-2');
//		});
//
//		var div2 = fixture.querySelector('[data-scope="test-model"]');
//		var p5   = fixture.querySelector('[data-scope="test-model-1"]');
//		var p6   = fixture.querySelector('[data-scope="test-model-2"]');
//
//		Sparky(div2);
//
//		window.requestAnimationFrame(function() {
//			assert.ok(p5.innerHTML === 'value-3');
//			assert.ok(p6.innerHTML === 'value-4');
//			done();
//		});
//	});
//
//	test("Test property changes update the DOM on animation frames.", function(assert, done, fixture) {
//		// Reset Sparky
//		Sparky.data = {};
//
//		var model  = Sparky.data['test-model']   = {};
//		var model1 = Sparky.data['test-model-1'] = {};
//		var model2 = Sparky.data['test-model-2'] = {
//		    	property: 'Boil yer heid'
//		    };
//		var div2 = fixture.querySelector('[data-scope="test-model"]');
//		var p5   = fixture.querySelector('[data-scope="test-model-1"]');
//		var p6   = fixture.querySelector('[data-scope="test-model-2"]');
//
//		Sparky(div2);
//
//		window.requestAnimationFrame(function() {
//			assert.ok(p5.innerHTML === '', 'p5 is empty.');
//			model1.property = 'Hello duckies';
//			assert.ok(p5.innerHTML === '', 'DOM is not updated immediately.');
//
//			window.requestAnimationFrame(function() {
//				assert.ok(p5.innerHTML === 'Hello duckies', "DOM is updated on animation frame.");
//			});
//
//			// TODO: DOM IS updated immediately on call to Sparky(). Not sure this is
//			// correct behaviour.
//			//assert.ok(p6.innerHTML === '', 'p6 is not updated immediately.');
//			model2.property = 'Goodbye friends';
//
//			window.requestAnimationFrame(function() {
//				assert.ok(p6.innerHTML === 'Pass the carrot', "DOM is updated to latest value.");
//			});
//
//			model2.property = 'Pass the carrot';
//
//			// Restart QUnit
//			window.requestAnimationFrame(function() {
//				done();
//			});
//		});
//	});

	test("Tests .destroy()", function(assert, done, fixture) {
		assert.expect(2);

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
				assert.ok(p5.innerHTML === 'Hello duckies', "" + p5.innerHTML);
			});

			// Restart QUnit
			window.requestAnimationFrame(function() {
				done();
			});
		});
	});

//	test("Tests .destroy() of sparky's children", function(assert, done, fixture) {
//		assert.expect(2);
//
//		// Reset Sparky
//		Sparky.data = {};
//
//		var model  = Sparky.data['test-model']   = {};
//		var model1 = Sparky.data['test-model-1'] = {};
//		var model2 = Sparky.data['test-model-2'] = {};
//		var div2 = fixture.querySelector('[data-scope="test-model"]');
//		var p5   = fixture.querySelector('[data-scope="test-model-1"]');
//		var sparky = Sparky(div2);
//
//		window.requestAnimationFrame(function() {
//			assert.ok(p5.innerHTML === '', 'p5 is empty.');
//			model1.property = 'Value 1';
//			sparky.destroy();
//			model1.property = 'Value 2';
//
//			window.requestAnimationFrame(function() {
//				assert.ok(p5.innerHTML === 'Value 1', "Child successfully destroyed. " + p5.innerHTML);
//			});
//
//			// Restart QUnit
//			window.requestAnimationFrame(function() {
//				done();
//			});
//		});
//	});
}, function() {/*

<div data-fn="test-ctrl">
	<p data-fn="test-ctrl-1">{[property]}</p>
	<p data-fn="test-ctrl-2">{[property]}</p>

	<p data-scope="{[sub-model-1]}">{[property]}</p>
	<p data-scope="{[sub-model-2]}">{[property]}</p>
</div>

<div data-scope="test-model">
	<p data-scope="test-model-1">{[property]}</p>
	<p data-scope="test-model-2">{[property]}</p>
</div>

*/});












//module('Test tags in class attributes...', function(test) {
//	console.log('Test tags in class attributes...');
//
//	test("Tags is class attributes", function(assert, done, fixture) {
//		assert.expect(4);
//
//		var node = fixture.querySelector('div');
//		var model = { property: 'peas' };
//
//		Sparky.data.model = model;
//		Sparky(node, model);
//		node.classList.add('hello');
//
//		window.requestAnimationFrame(function() {
//			assert.ok(node.classList.contains('hello'), 'Classes expected to contain "hello", actual: ' + node.getAttribute('class'));
//			assert.ok(node.classList.contains('peas'),  'Classes expected to contain "peas", actual: ' + node.getAttribute('class'));
//
//			model.property = 'ice';
//
//			window.requestAnimationFrame(function() {
//				assert.ok(!node.classList.contains('peas'), 'Classes expected to not contain "peas", actual: "' + node.getAttribute('class') + '"');
//				assert.ok(node.classList.contains('hello'), 'Classes expected to contain "hello", actual: "' + node.getAttribute('class') + '"');
//				done();
//			});
//		});
//	});
//}, function() {/*
//
//<div data-scope="model" class="class-1 class-2 {[ property ]}">{[property]}</div>
//
//*/});
//
//module('Test tags in class attributes...', function(test) {
//	test("Tags is class attributes", function(assert, done, fixture) {
//		assert.expect(3);
//
//		var node = fixture.querySelector('div');
//		var model = { property: 'peas' };
//
//		Sparky.data.model = model;
//		Sparky(node, model);
//		node.classList.remove('class-2');
//
//		window.requestAnimationFrame(function() {
//			assert.ok(node.classList.contains('peas'), 'Classes expected to contain "peas", actual: "' + node.getAttribute('class') + '"');
//			assert.ok(!node.classList.contains('class-2'), 'Classes not expected to contain "class-2", actual: "' + node.getAttribute('class') + '"');
//
//			model.property = undefined;
//
//			window.requestAnimationFrame(function() {
//				assert.ok(!node.classList.contains('peas'), 'Classes not expected to contain "peas", actual: "' + node.getAttribute('class') + '"');
//				done();
//			});
//		});
//	});
//}, function() {/*
//
//<div data-scope="model" class="class-1 class-2 {[ property ]}">{[property]}</div>
//
//*/});
//
//module('Test some SVG features of this browser...', function(test) {
//	console.log('Test some SVG features of this browser...');
//
//	test("SVG features", function(assert, done, fixture) {
//		var node = fixture.querySelector('line');
//		var model = { property: 'peas' };
//
//		// ------------------
//
//		// Test some SVG features in this browser. These tests are not directly
//		// Sparky's problem, just a note of what features are supported
//		//console.log('getAttribute("class")', node.getAttribute('class'));
//		//console.log('className', node.className);
//		//console.log('classList', node.classList);
//
//		assert.ok(node.tagName.toLowerCase() === 'line', 'node.tagName should say "line"');
//		assert.ok(typeof node.getAttribute('class') === 'string', 'Not a Sparky problem directly - SVG Node .getAttribute("class") not returning a string in this browser, actually "' + (typeof node.getAttribute('class')) + '"');
//		assert.ok(node.getAttribute('class') === "class-1 class-2", 'Not a Sparky problem directly - SVG Node .getAttribute("class") expecting "class-1 class-2", actual: "' + node.getAttribute('class') + '"');
//
//		done();
//
//		// ------------------
//	});
//}, function() {/*
//
//<div>
//	<svg x="0px" y="0px" width="20px" height="20px" viewBox="0 0 20 20">
//		<line class="class-1 class-2" x1="0" y1="0" x2="0" y2="0"></line>
//	</svg>
//</div>
//
//*/});
//
//module('Test tags in SVG class attributes...', function(test) {
//	console.log('Test tags in SVG class attributes...');
//
//	test("Tags is class attributes", function(assert, done, fixture) {
//		assert.expect(7);
//
//		var node = fixture.querySelector('line');
//		var model = { property: 'peas' };
//
//		assert.ok(node.classList, 'classList does not exist');
//
//		Sparky(node, model);
//		node.classList.add('hello');
//
//		window.requestAnimationFrame(function() {
//			assert.ok(node.classList.length === 4,        'Classes expected: "class-1 class-2 peas hello", actual: ' + node.getAttribute('class'));
//			assert.ok(node.classList.contains('class-1'), 'Classes expected: "class-1 class-2 peas hello", actual: ' + node.getAttribute('class'));
//			assert.ok(node.classList.contains('class-2'), 'Classes expected: "class-1 class-2 peas hello", actual: ' + node.getAttribute('class'));
//			assert.ok(node.classList.contains('peas'),    'Classes expected: "class-1 class-2 peas hello", actual: ' + node.getAttribute('class'));
//			assert.ok(node.classList.contains('hello'),   'Classes expected: "class-1 class-2 peas hello", actual: ' + node.getAttribute('class'));
//
//			model.property = 'ice';
//
//			window.requestAnimationFrame(function() {
//				assert.ok(node.classList.contains('hello'), 'Classes expected to contain "hello", actual: "' + node.getAttribute('class') + '"');
//				done();
//			});
//		});
//	});
//}, function() {/*
//
//<div>
//	<svg x="0px" y="0px" width="20px" height="20px" viewBox="0 0 20 20">
//		<line class="class-1 class-2 {[property]}" x1="0" y1="0" x2="0" y2="0"></line>
//	</svg>
//</div>
//
//*/});
