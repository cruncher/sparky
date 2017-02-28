var module = (function(QUnit) {
	var rcomment = /\s*\/\*([\s\S]*)\*\/\s*/;

	function multiline(fn) {
		if (typeof fn !== 'function') { throw new TypeError('multiline(fn) expects a function.'); }
		var match = rcomment.exec(fn.toString());
		if (!match) { throw new TypeError('Multiline comment missing.'); }
		return match[1];
	}

	function getFixture() {
		return document.getElementById('qunit-fixture');
	}

	return function module(name, fn1, fn2) {
		QUnit.module(name, {
			beforeEach: function() {
				if (fn2) { getFixture().innerHTML = multiline(fn2); }
			}
		});

		if (fn1) {
			fn1(function test(name, fn) {
				QUnit.test(name, function(assert) {
					var done = assert.async();
					var fixture = getFixture();
					fn(assert, done, fixture);
				});
			});
		}
	}
})(QUnit);
