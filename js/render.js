(function(window) {

	var Sparky = window.Sparky;

	function multiline(fn) {
		return fn.toString()
			.replace(/^function.+\{\s*\/\*\s*/, '')
			.replace(/\s*\*\/\s*\}$/, '');
	}

	function replaceStringFn(obj) {
		return function($0, $1) {
			// $1 is the template key. Don't render falsy values like undefined.
			var value = obj[$1];

			return value instanceof Array ?
				value.join(', ') :
				value === undefined || value === null ? '' :
				value ;
		};
	}

	function replaceRegexFn(obj) {
		return function($0, $1, $2) {
			// $1 is the template key in {{key}}, while $2 exists where
			// the template tag is followed by a repetition operator.
			var r = obj[$1];

			if (r === undefined || r === null) { throw new Error("Exception: attempting to build RegExp but obj['"+$1+"'] is undefined."); }

			// Strip out beginning and end matchers
			r = r.source.replace(/^\^|\$$/g, '');

			// Return a non-capturing group when $2 exists, or just the source.
			return $2 ? ['(?:', r, ')', $2].join('') : r ;
		};
	}

	Sparky.render = function render(template, obj) {
		return typeof template === 'function' ?
			multiline(template).replace(Sparky.rsimpletags, replaceStringFn(obj)) :

		template instanceof RegExp ?
			RegExp(template.source
				.replace(/\{\{\s*(\w+)\s*\}\}(\{\d|\?|\*|\+)?/g, replaceRegexFn(obj)),
				(template.global ? 'g' : '') +
				(template.ignoreCase ? 'i' : '') +
				(template.multiline ? 'm' : '')
			) :

			template.replace(Sparky.rsimpletags, replaceStringFn(obj));
	};
})(this);
