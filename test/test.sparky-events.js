
module('Test Sparky events... 1', function(test) {
	test("'scope' and 'render' order", function(assert, done, fixture) {
		assert.expect(3);

		var n = 0;
		var sparky;

		Sparky.fn['fn-1'] = function(node, scopes) {
			scopes
			.tap(function() {
				assert.ok(++n === 1, 'This event should be called 1st. Actually: ' + n);
			});

			this
			.on('dom-add', function() {
				assert.ok(++n === 2, 'This event should be called 2nd. Actually: ' + n);
			});
		};

		Sparky.fn['fn-2'] = function() {};

		var node1 = document.querySelector('.node-1');
		var node2 = document.querySelector('.node-2');
		var sparky = Sparky(node1, {property: 9});

		window.requestAnimationFrame(function() {
			assert.ok(node2.innerHTML === '9', 'Node 2 should be populated: ' + node2.innerHTML);
			done();
		});
	});
}, function() {/*

<div class="node-1" data-fn="fn-1">
	<div class="node-2" data-fn="fn-2">{[property]}</div>
</div>

*/});



//module('Test Sparky events... 2', function(test) {
//	asyncTest("", function(assert) {
//		assert.expect(4);
//
//		var n = 0;
//		var sparky;
//
//		Sparky.fn['fn-1'] = function(node, scopes) {
//			scopes.tap(function() {
//				assert.ok(++n === 1, 'This event should be called 1st. Actually: ' + n);
//			});
//
//			this.on('dom-add', function() {
//				assert.ok(++n === 3, 'This event should be called 2nd. Actually: ' + n);
//			});
//		};
//
//		Sparky.fn['fn-2'] = function(node, scopes) {
//			scopes.tap(function() {
//				assert.ok(++n === 2, 'This event should be called 3rd. Actually: ' + n);
//			});
//		};
//
//		var node1 = document.querySelector('.node-1');
//		var node2 = document.querySelector('.node-2');
//		var sparky = Sparky(node1, {property: 9});
//
//		window.requestAnimationFrame(function() {
//			assert.ok(node2.innerHTML === '9', 'Node 2 should be populated: ' + node2.innerHTML);
//			done();
//		});
//	});
//}, function() {/*
//
//<div class="node-1" data-fn="fn-1">
//	<div class="node-2" data-fn="fn-2">{[property]}</div>
//</div>
//
//*/});




module('Test Sparky events... 2', function(test) {
	test("", function(assert, done, fixture) {
		assert.expect(5);

		var n = 0;
		var sparky;

		Sparky.fn['fn-1'] = function(node, scopes) {
			scopes.tap(function() {
				assert.ok(++n === 1, 'This event should be called 1st. Actually: ' + n);
			});
		};

		Sparky.fn['fn-2'] = function(node, scopes) {
			scopes.tap(function() {
				assert.ok(++n === 2, 'This event should be called 3rd. Actually: ' + n);
			});
		};

		var node1 = document.querySelector('.node-1');
		var node2 = document.querySelector('.node-2');
		var sparky = Sparky(node1, {property: 9});

		setTimeout(function functionName() {
			n = 0;
			// Should send events again!
			sparky.scope({property: 10});

			window.requestAnimationFrame(function() {
				assert.ok(node2.innerHTML === '10', 'Node 2 should be populated: ' + node2.innerHTML);
				done();
			});
		}, 100);
	});
}, function() {/*

<div class="node-1" data-fn="fn-1">
	<div class="node-2" data-fn="fn-2">{[property]}</div>
</div>

*/});
