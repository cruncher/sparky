var module = (function(QUnit) {
	var fixture = document.createElement('div');
	var rcomment = /\s*\/\*([\s\S]*)\*\/\s*/;

	function multiline(fn) {
		if (typeof fn !== 'function') { throw new TypeError('multiline(fn) expects a function.'); }
		var match = rcomment.exec(fn.toString());
		if (!match) { throw new TypeError('Multiline comment missing.'); }
		return match[1];
	}

	fixture.id = 'qunit-fixture';
	document.body.appendChild(fixture);

	return function module(name, fn1, fn2) {
		QUnit.module(name, {
			setup: function() {
				if (fn1) { fixture.innerHTML = multiline(fn1); }
			}
		});
		
		if (fn2) { fn2(fixture); }
	}
})(QUnit);


module('Controller', function() {
/*
	<div data-ctrl="test-ctrl">{{property}}</div>
*/
}, function(fixture) {
	test("ctrl passed in as fn parameter and {{tag}} replaced with scope property", function() {
		var node = fixture.querySelector('div');
	
		Sparky(node, undefined, function(node, model, sparky) {
			ok(model === undefined);
			return { property: 'peas' };
		});
	
		ok(node.innerHTML === 'peas');
	});
	
	test("ctrl found in Sparky.controllers and {{tag}} replaced with scope property", function() {
		var node = fixture.querySelector('div');
		
		Sparky.controllers['test-ctrl'] = function(node, model, sparky) {
			ok(model === undefined);
			return { property: 'peas' };
		};
		
		Sparky(node);
		ok(node.innerHTML === 'peas');
	});
});


module('Model', function() {
/*
	<div data-model="test-model">{{property}}</div>
*/
}, function(fixture) {
	Sparky.data['test-model'] = {
		property: 'juice'
	};
	
	test("{{tag}} is replaced with model property", function() {
		var node = fixture.querySelector('div');
		Sparky(node);
		ok(node.innerHTML === 'juice');
	});
});

