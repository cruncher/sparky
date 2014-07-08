module('Controller', function(fixture) {
	test("ctrl found in Sparky.controllers and {{tag}} replaced with scope property", function() {
		var node = fixture.querySelector('div');
		
		Sparky.controllers['test-ctrl'] = function(node, model, sparky) {
			ok(model === undefined);
			return { property: 'peas' };
		};
		Sparky(node);

		ok(node.innerHTML === 'peas');
	});

	test("ctrl passed in as fn parameter and {{tag}} replaced with scope property", function() {
		var node = fixture.querySelector('div');
	
		Sparky(node, undefined, function(node, model, sparky) {
			ok(model === undefined);
			return { property: 'peas' };
		});

		ok(node.innerHTML === 'peas');
	});
}, function() {/*

<div data-ctrl="test-ctrl">{{property}}</div>

*/});


module('Model', function(fixture) {
	test("{{tag}} is replaced with model property", function() {
		var node = fixture.querySelector('div');
		
		Sparky.data['test-model'] = { property: 'juice' };
		Sparky(node);

		ok(node.innerHTML === 'juice');
	});
}, function() {/*

<div data-model="test-model">{{property}}</div>

*/});

module('Child sparky', function(fixture) {
	test('Children instantiated with correct controllers and models', function() {
		Sparky.controllers['test-ctrl'] = function(node, model, sparky) {
			return {
				'sub-model-1': { property: 'sub-1' },
				'sub-model-2': { property: 'sub-2' }
			};
		};

		Sparky.controllers['test-ctrl-1'] = function(node, model, sparky) {
			return { property: 'value-1' };
		};

		Sparky.controllers['test-ctrl-2'] = function(node, model, sparky) {
			return { property: 'value-2' };
		};

		Sparky.data['test-model-1'] = {
			property: 'value-3'
		};

		Sparky.data['test-model-2'] = {
			property: 'value-4'
		};

		var div1 = fixture.querySelector('[data-ctrl="test-ctrl"]');
		var p1   = fixture.querySelector('[data-ctrl="test-ctrl-1"]');
		var p2   = fixture.querySelector('[data-ctrl="test-ctrl-2"]');

		Sparky(div1);

		ok(p1.innerHTML === 'value-1');
		ok(p2.innerHTML === 'value-2');

		var p3   = fixture.querySelector('[data-model="{{sub-model-1}}"]');
		var p4   = fixture.querySelector('[data-model="{{sub-model-2}}"]');

		ok(p3.innerHTML === 'sub-1');
		ok(p4.innerHTML === 'sub-2');

		var div2 = fixture.querySelector('[data-model="test-model"]');
		var p5   = fixture.querySelector('[data-model="test-model-1"]');
		var p6   = fixture.querySelector('[data-model="test-model-2"]');

		Sparky(div2);

		ok(p5.innerHTML === 'value-3');
		ok(p6.innerHTML === 'value-4');
	});



	asyncTest( "asynchronous test: one second later!", function(assert) {
		setTimeout(function() {
			assert.ok( true, "Passed and ready to resume!" );
			QUnit.start();
		}, 1000);
	});




}, function() {/*

<div data-ctrl="test-ctrl">
	<p data-ctrl="test-ctrl-1">{{property}}</p>
	<p data-ctrl="test-ctrl-2">{{property}}</p>

	<p data-model="{{sub-model-1}}">{{property}}</p>
	<p data-model="{{sub-model-2}}">{{property}}</p>
</div>

<div data-model="test-model">
	<p data-model="test-model-1">{{property}}</p>
	<p data-model="test-model-2">{{property}}</p>
</div>

*/});

