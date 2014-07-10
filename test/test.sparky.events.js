module('Event propogation', function(fixture) {
	test("Tests .destroy() of sparky's children", function(assert) {
		expect(1);

		// Reset Sparky
		Sparky.data = {};
		Sparky.ctrl = {};

		Sparky.ctrl['test-ctrl'] = function(node, model, sparky) {
			return {};
		};

		Sparky.ctrl['test-ctrl-1'] = function(node, model, sparky) {
			sparky.on('boo', function(target) {
				ok(true);
//				ok(target !== this, 'target is not this');
			});
			
			return {};
		};

		Sparky.ctrl['test-ctrl-2'] = function(node, model, sparky) {
			return {};
		};

		var div = fixture.querySelector('[data-ctrl="test-ctrl"]');
		var p1  = fixture.querySelector('[data-ctrl="test-ctrl-1"]');
		var sparky = Sparky(div);

		sparky.trigger('boo');
	});
}, function() {/*

<div data-ctrl="test-ctrl">
	<p data-ctrl="test-ctrl-1">{{property}}</p>
	<p data-ctrl="test-ctrl-2">{{property}}</p>
</div>

*/});

