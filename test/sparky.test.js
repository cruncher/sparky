
Sparky.fn['ctrl'] = function(node, scopes) {
	return Fn.of({ property: 'peas' });
};

group('Controller', function(test, log, fixture) {
	var node = fixture.children[0];

	test("ctrl found in Sparky.fn and {[tag]} replaced with scope property", function(equals, done) {
		var sparky = Sparky(node);

		requestAnimationFrame(function functionName() {
			equals('peas', node.innerHTML, node.innerHTML);
			done(1);
		});
	});
}, function() {/*

<div data-fn="ctrl">{[property]}</div>

*/});


//group('Static tags', function(test, log, fixture) {
//	asyncTest("{[{tag]}} is replaced with model property", function() {
//		
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



group('Child sparky', function(test, log, fixture) {
	var frame = window.requestAnimationFrame;

	var obj1 = { property: 'prop1' };
	var obj2 = { property: 'prop2' };

	Sparky.fn['ctrl-1'] = function(node, scopes) {
		return Fn.of({ property: 'value1' });
	};

	Sparky.fn['ctrl-2'] = function(node, scopes) {
		return Fn.of({ property: 'value2' });
	};

	Sparky.fn['ctrl'] = function(node, scopes) {
		return Fn.of({
			'sub-1': obj1,
			'sub-2': obj2
		});
	};

	test('Children instantiated with correct controllers and models', function(equals, done) {
		var div = fixture.querySelector('[data-fn="ctrl"]');
		var p1  = fixture.querySelector('[data-fn="ctrl-1"]');
		var p2  = fixture.querySelector('[data-fn="ctrl-2"]');
		var p3  = fixture.querySelector('[data-fn="get(\'sub-1\')"]');
		var p4  = fixture.querySelector('[data-fn="get(\'sub-2\')"]');

		var sparky = Sparky(div);

		frame(function() {
			log('frame 1');

			equals('value1', p1.innerHTML);
			equals('value2', p2.innerHTML);
			equals('prop1',  p3.innerHTML);
			equals('prop2',  p4.innerHTML);

			obj1.property = 'newprop1';

			frame(function() {
				log('frame 2');

				equals('newprop1', p3.innerHTML);
				equals('prop2',  p4.innerHTML);

				sparky.stop();
				obj1.property = 'stopprop1';

				frame(function() {
					log('frame 3');

					equals('newprop1', p3.innerHTML);
					equals('prop2',  p4.innerHTML);				
					done(8);
				});
			});
		});
	});

}, function() {/*

<div data-fn="ctrl">
	<p data-fn="ctrl-1">{[property]}</p>
	<p data-fn="ctrl-2">{[property]}</p>
	<p data-fn="get('sub-1')">{[property]}</p>
	<p data-fn="get('sub-2')">{[property]}</p>
</div>

*/});

//group('Test tags in class attributes...', function(test, log, fixture) {
//	log('Test tags in class attributes...');
//
//	test("Tags is class attributes", function(equals, done) {
//		var node = fixture.querySelector('div');
//		var model = { property: 'peas' };
//
//		Sparky.data.model = model;
//		Sparky(node, model);
//		node.classList.add('hello');
//
//		window.requestAnimationFrame(function() {
//			equals(true, !!node.classList.contains('hello'), 'Classes expected to contain "hello", actual: ' + node.getAttribute('class'));
//			equals(true, !!node.classList.contains('peas'),  'Classes expected to contain "peas", actual: ' + node.getAttribute('class'));
//
//			model.property = 'ice';
//
//			window.requestAnimationFrame(function() {
//				equals(true, !node.classList.contains('peas'), 'Classes expected to not contain "peas", actual: "' + node.getAttribute('class') + '"');
//				equals(true, !!node.classList.contains('hello'), 'Classes expected to contain "hello", actual: "' + node.getAttribute('class') + '"');
//				done(4);
//			});
//		});
//	});
//}, function() {/*
//
//<div data-scope="model" class="class-1 class-2 {[ property ]}">{[property]}</div>
//
//*/});
//
//group('Test tags in class attributes...', function(test, log, fixture) {
//	test("Tags is class attributes", function(equals, done) {
//		var node = fixture.querySelector('div');
//		var model = { property: 'peas' };
//
//		Sparky.data.model = model;
//		Sparky(node, model);
//		node.classList.remove('class-2');
//
//		window.requestAnimationFrame(function() {
//			equals(true, !!node.classList.contains('peas'), 'Classes expected to contain "peas", actual: "' + node.getAttribute('class') + '"');
//			equals(true, !node.classList.contains('class-2'), 'Classes not expected to contain "class-2", actual: "' + node.getAttribute('class') + '"');
//
//			model.property = undefined;
//
//			window.requestAnimationFrame(function() {
//				equals(true, !node.classList.contains('peas'), 'Classes not expected to contain "peas", actual: "' + node.getAttribute('class') + '"');
//				done(3);
//			});
//		});
//	});
//}, function() {/*
//
//<div data-scope="model" class="class-1 class-2 {[ property ]}">{[property]}</div>
//
//*/});
//
//group('Test some SVG features of this browser...', function(test, log, fixture) {
//	log('Test some SVG features of this browser...');
//
//	test("SVG features", function(equals, done) {
//		var node = fixture.querySelector('line');
//		var model = { property: 'peas' };
//
//		// ------------------
//
//		// Test some SVG features in this browser. These tests are not directly
//		// Sparky's problem, just a note of what features are supported
//		//log('getAttribute("class")', node.getAttribute('class'));
//		//log('className', node.className);
//		//log('classList', node.classList);
//
//		equals(node.tagName.toLowerCase(), 'line', 'node.tagName should say "line"');
//		equals(typeof node.getAttribute('class'), 'string', 'Not a Sparky problem directly - SVG Node .getAttribute("class") not returning a string in this browser, actually "' + (typeof node.getAttribute('class')) + '"');
//		equals(node.getAttribute('class'), "class-1 class-2", 'Not a Sparky problem directly - SVG Node .getAttribute("class") expecting "class-1 class-2", actual: "' + node.getAttribute('class') + '"');
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
//group('Test tags in SVG class attributes...', function(test, log, fixture) {
//	log('Test tags in SVG class attributes...');
//
//	test("Tags is class attributes", function(equals, done) {
//		var node = fixture.querySelector('line');
//		var model = { property: 'peas' };
//
//		equals(true, !!node.classList, 'classList does not exist');
//
//		Sparky(node, model);
//		node.classList.add('hello');
//
//		window.requestAnimationFrame(function() {
//			equals(4,    node.classList.length,                'Classes expected: "class-1 class-2 peas hello", actual: ' + node.getAttribute('class'));
//			equals(true, !!node.classList.contains('class-1'), 'Classes expected: "class-1 class-2 peas hello", actual: ' + node.getAttribute('class'));
//			equals(true, !!node.classList.contains('class-2'), 'Classes expected: "class-1 class-2 peas hello", actual: ' + node.getAttribute('class'));
//			equals(true, !!node.classList.contains('peas'),    'Classes expected: "class-1 class-2 peas hello", actual: ' + node.getAttribute('class'));
//			equals(true, !!node.classList.contains('hello'),   'Classes expected: "class-1 class-2 peas hello", actual: ' + node.getAttribute('class'));
//
//			model.property = 'ice';
//
//			window.requestAnimationFrame(function() {
//				equals(true, !!node.classList.contains('hello'), 'Classes expected to contain "hello", actual: "' + node.getAttribute('class') + '"');
//				done(7);
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
