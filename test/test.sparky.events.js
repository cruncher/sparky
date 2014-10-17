module('Event propogation', function(fixture) {
	console.log('Test event propogation...');

	test("Tests .destroy() of sparky's children", function(assert) {
		expect(5);

		var n = 0;
		var sparky1;

		// Reset Sparky
		Sparky.data = {};
		Sparky.ctrl = {};

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

