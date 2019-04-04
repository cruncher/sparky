
import { Fn, test as group, Observer } from '../../fn/module.js';
import Sparky from '../module.js';

//Sparky.fn['ctrl'] = function(node, scopes) {
//	return Fn.of({ property: 'peas' });
//};
//
//group('Render scope from sparky-fn', function(test, log, fixture) {
//	var node = fixture.children[0];
//
//	test("[sparky-fn]", function(equals, done) {
//		var sparky = Sparky(node);
//
//		requestAnimationFrame(function functionName() {
//			equals('peas some text peas some text', node.innerHTML);
//			equals(true, !!node.getAttribute('class').match(/peas/));
//			done(2);
//		});
//	});
//}, function() {/*
//
//<div sparky-fn="ctrl" class=" nothing {[property]} ">{[property]} some text {[property]} some text</div>
//
//*/});

group('Child sparky', function(test, log, fixture) {
	var frame = window.requestAnimationFrame;

	var obj1 = { property: 'prop1' };
	var obj2 = { property: 'prop2' };

	Sparky.fn['ctrl'] = function(node, scopes) {
		return Fn.of({
			'sub-1': obj1,
			'sub-2': obj2
		});
	};

	Sparky.fn['ctrl-1'] = function(node, scopes) {
		return Fn.of({ property: 'value1' });
	};

	Sparky.fn['ctrl-2'] = function(node, scopes) {
		return Fn.of({ property: 'value2' });
	};

	test('[sparky-fn] > [sparky-fn]', function(equals, done) {
		var div = fixture.querySelector('[sparky-fn="ctrl"]');
		var p1  = fixture.querySelector('[sparky-fn="ctrl-1"]');
		var p2  = fixture.querySelector('[sparky-fn="ctrl-2"]');
		var p3  = fixture.querySelector('[sparky-fn="get:\'sub-1\'"]');
		var p4  = fixture.querySelector('[sparky-fn="get:\'sub-2\'"]');

		var sparky = Sparky(div);

		frame(function() {
			equals('value1', p1.innerHTML);
			equals('value2', p2.innerHTML);
			equals('prop1',  p3.innerHTML);
			equals('prop2',  p4.innerHTML);

			Observer(obj1).property = 'newprop1';

			frame(function() {
				equals('newprop1', p3.innerHTML);
				equals('prop2',    p4.innerHTML);

				sparky.stop();

				Observer(obj1).property = 'stopprop1';
				Observer(obj2).property = 'stopprop2';

				frame(function() {
					equals('newprop1', p3.innerHTML);
					equals('prop2',    p4.innerHTML);
					done();
				});
			});
		});
	}, 8);

}, function() {/*

<div sparky-fn="ctrl">
	<p sparky-fn="ctrl-1">{[ property]}</p>
	<p sparky-fn="ctrl-2">{[property ]}</p>
	<p sparky-fn="get:'sub-1'">{[  property]}</p>
	<p sparky-fn="get:'sub-2'">{[property  ]}</p>
</div>

*/});

//group('[class]', function(test, log, fixture) {
//	test("[class]", function(equals, done) {
//		var node = fixture.querySelector('div');
//		var model = Observer({ property: 'peas' });
//
//		Sparky(node).push(model);
//		equals(true, !!node.classList.contains('peas'),  'Classes expected to contain "peas", actual: ' + node.getAttribute('class'));
//
//		node.classList.add('hello');
//
//		window.requestAnimationFrame(function() {
//			equals(true, !!node.classList.contains('peas'),  'Classes expected to contain "peas", actual: ' + node.getAttribute('class'));
//			equals(true, !!node.classList.contains('hello'), 'Classes expected to contain "hello", actual: ' + node.getAttribute('class'));
//
//			model.property = 'ice';
//
//			window.requestAnimationFrame(function() {
//				equals(true, !node.classList.contains('peas'), 'Classes expected to not contain "peas", actual: "' + node.getAttribute('class') + '"');
//				equals(true, !!node.classList.contains('hello'), 'Classes expected to contain "hello", actual: "' + node.getAttribute('class') + '"');
//				done(5);
//			});
//		});
//	});
//}, function() {/*
//
//<div class="class-1 class-2 {[property]}">{[property]}</div>
//
//*/});

//group('Test tags in class attributes...', function(test, log, fixture) {
//	test("Tags is class attributes", function(equals, done) {
//		var node = fixture.querySelector('div');
//		var model = { property: 'peas' };
//
//		Sparky.data.model = model;
//		Sparky(node).push(model);
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
//<div sparky-scope="model" class="class-1 class-2 {[ property ]}">{[property]}</div>
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
//		Sparky(node).push(model);
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
