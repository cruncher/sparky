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