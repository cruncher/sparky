
module('Event propogation', function(fixture) {
	console.log('Test event propogation...');

	test("Tests .destroy() of sparky's children", function(assert) {
		expect(5);

		var n = 0;
		var sparky1;

		// Reset Sparky
		Sparky.data = {};

		Sparky.ctrl['test-ctrl'] = function(node, model) {
			this.on('boo', function(sparky) {
				ok(sparky === this, 'sparky is target');
				ok(n++ === 0, 'This event called first');
			});

			return {};
		};

		Sparky.ctrl['test-ctrl-1'] = function(node, model) {
			sparky1 = this;

			this.on('boo', function(sparky) {
				ok(sparky !== this, 'sparky is not target');
				ok(n++ === 1, 'This event called second');
			});

			return {};
		};

		Sparky.ctrl['test-ctrl-2'] = function(node, model) {
			return {};
		};

		var div = fixture.querySelector('[data-ctrl="test-ctrl"]');
		var p1  = fixture.querySelector('[data-ctrl="test-ctrl-1"]');
		var sparky = Sparky(div);

		ok(sparky !== sparky1)

		sparky
		.trigger('boo')
		.destroy()
		.trigger('boo');

		sparky1.on('boo', function(sparky) {
			ok(false, 'This should never be called');
		});

		// Should not call sparky1 handlers, as propagation should have
		// been destroyed.
		sparky.trigger('boo');
	});
}, function() {/*

<div data-ctrl="test-ctrl">
	<p data-ctrl="test-ctrl-1">{{property}}</p>
	<p data-ctrl="test-ctrl-2">{{property}}</p>
</div>

*/});


module('Event propogation ready event', function(fixture) {
	test("Tests ready event", function(assert) {
		expect(8);

		var n = 0;
		var sparky, sparky1, sparky2;

		// Reset Sparky
		Sparky.data = {};

		Sparky.ctrl['test-ctrl'] = function(node, model) {
			sparky = this;

			this.on('ready', function() {
				ok(sparky === this, 'sparky is target');
				ok(n++ === 2, 'This event called third');
			});

			return {};
		};

		Sparky.ctrl['test-ctrl-1'] = function(node, model) {
			sparky1 = this;

			this.on('ready', function() {
				ok(sparky1 === this, 'sparky1 is target');
				ok(n++ === 0, 'This event called first');
			});

			return {};
		};

		Sparky.ctrl['test-ctrl-2'] = function(node, model) {
			sparky2 = this;

			this.on('ready', function() {
				ok(sparky2 === this, 'sparky2 is target');
				ok(n++ === 1, 'This event called second');
			});

			return {};
		};

		var node  = fixture.querySelector('[data-ctrl="test-ctrl"]');
		var node1 = fixture.querySelector('[data-ctrl="test-ctrl-1"]');
		var node2 = fixture.querySelector('[data-ctrl="test-ctrl-2"]');

		sparky = Sparky(node);

		ok(sparky !== sparky1);
		ok(sparky !== sparky2);
	});
}, function() {/*

<div data-ctrl="test-ctrl">
	<p data-ctrl="test-ctrl-1">{{property}}</p>
	<p data-ctrl="test-ctrl-2">{{property}}</p>
</div>

*/});




module('Event propogation insert event', function(fixture) {
	asyncTest("Tests insert event", function(assert) {
		expect(8);

		var n = 0;
		var sparky, sparky1, sparky2;

		// Reset Sparky
		Sparky.data = {};

		Sparky.ctrl['test-ctrl'] = function(node, model) {
			sparky = this;

			this.on('insert', function() {
				ok(sparky === this, 'sparky is target');
				ok(n++ === 2, 'This event called third');
			});

			return {};
		};

		Sparky.ctrl['test-ctrl-1'] = function(node, model) {
			sparky1 = this;

			this.on('insert', function() {
				ok(sparky1 === this, 'sparky1 is target');
				ok(n++ === 0, 'This event called first');
			});

			return {};
		};

		Sparky.ctrl['test-ctrl-2'] = function(node, model) {
			sparky2 = this;

			this.on('insert', function() {
				ok(sparky2 === this, 'sparky2 is target');
				ok(n++ === 1, 'This event called second');
			});

			return {};
		};

		var node  = fixture.querySelector('[data-ctrl="test-ctrl"]');
		var node1 = fixture.querySelector('[data-ctrl="test-ctrl-1"]');
		var node2 = fixture.querySelector('[data-ctrl="test-ctrl-2"]');

		sparky = Sparky(node);

		ok(sparky !== sparky1);
		ok(sparky !== sparky2);

		QUnit.start();
	});
}, function() {/*

<div data-ctrl="test-ctrl">
	<p data-ctrl="test-ctrl-1">{{property}}</p>
	<p data-ctrl="test-ctrl-2">{{property}}</p>
</div>

*/});




module('Event propogation insert event', function(fixture) {
	asyncTest("Tests insert event", function(assert) {
		var n = 0;
		var r = 0;
		var sparky2, sparky3, sparky4, sparky5;

		Sparky.ctrl['test-ctrl-1'] = function(node, model) {

			this

			// Test order of ready and insert events
			.on('ready', function() {
				ok(r++ === 2, 'This event called 1, actually ' + (r-1));
			})
			.on('insert', function() {
				ok(r++ === 3, 'This event called 3, actually ' + (r-1));
			})
			
			// Test order of delegated insert events
			.on('insert', function() {
				ok(n++ === 3, 'This event called 3, actually ' + (n-1));
			});
		};

		Sparky.ctrl['test-ctrl-2'] = function(node, model) {
			sparky2 = this;

			this

			// Test order of ready and insert events
			.on('ready', function() {
				ok(r++ === 0, 'This event called 0, actually ' + (r-1));
			})
			.on('insert', function() {
				ok(r++ === 1, 'This event called 3, actually ' + (r-1));
			})

			// Test order of delegated insert events
			.on('ready', function() {
				ok(n++ === 0, 'This event called 0, actually ' + (n-1));
				sparky3 = Sparky('content-to-insert-1');
				ok(n++ === 1, 'This event called 1, actually ' + (n-1));
				sparky3.appendTo(node);
			})
			.on('insert', function() {
				ok(n++ === 2, 'This event called 2, actually ' + (n-1));
			});
		};

		Sparky.ctrl['test-ctrl-3'] = function(node, model) {
			sparky4 = this;
			console.log('TEST 3');
			this
			.on('ready', function() {
				sparky5 = Sparky('content-to-insert-2');
				sparky5.appendTo(node);
			})
			.on('insert', function(sparky) {
				ok(sparky === sparky3, 'sparky should be sparky3.');
				ok(n++ === 4, 'This event called 4, actually ' + (n-1));
			});
		};

		Sparky.ctrl['test-ctrl-4'] = function(node, model) {
			console.log('TEST 4');
			this
			.on('insert', function(sparky) {
				ok(sparky === sparky5, 'sparky should be sparky5.');
				ok(n++ === 5, 'This event called 5, actually ' + (n-1));
			});
		};

		var node1 = fixture.querySelector('.node-1');
		var node2 = fixture.querySelector('.node-2');
		var sparky1 = Sparky(node1);

		window.requestAnimationFrame(function() {
			QUnit.start();
		});
	});
}, function() {/*

<div class="node-1" data-ctrl="test-ctrl-1">
	<div class="node-2" data-ctrl="test-ctrl-2">{{property}}</div>
</div>

<template id="content-to-insert-1">
	<p class="node-3" data-ctrl="test-ctrl-3">{{property}}</p>
</template>

<template id="content-to-insert-2">
	<p class="node-3" data-ctrl="test-ctrl-4">{{property}}</p>
</template>

*/});





module('Event propogation insert event', function(fixture) {
	asyncTest("Tests insert event", function(assert) {
		expect(9);

		Sparky.data.collection = Sparky.Collection([{ property: 1 }, { property: 2 }]);

		Sparky.ctrl['test-ctrl-1'] = function(node, model) {};
		Sparky.ctrl['test-ctrl-2'] = function(node, model) {
			var n = 0;
			
			this

			// Test order of ready and insert events
			.on('ready', function(sparky) {
				ok(sparky === this, 'This should be sparky. ' + sparky);
				ok(n++ === 0, 'This event called 0, actually ' + (n-1));
			})
			.on('insert', function(sparky) {
				//ok(sparky !== this, 'This should not be sparky. ' + sparky);
				ok(n++ === 1, 'This event called 3, actually ' + (n-1));
			});
		};

		var node1 = fixture.querySelector('.node-1');
		var sparky1 = Sparky(node1);

		Sparky.data.collection.add({
			property: 3
		});

		window.requestAnimationFrame(function() {
			QUnit.start();
		});
	});
}, function() {/*

<div class="node-1" data-ctrl="test-ctrl-1">
	<div class="node-2" data-model="collection" data-ctrl="test-ctrl-2">{{property}}</div>
</div>

*/});

