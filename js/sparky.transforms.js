
// Sparky.filter

(function(window) {
	"use strict";

	var Fn        = window.Fn;
	var dom       = window.dom;
	var Sparky    = window.Sparky;
	
	var assign    = Object.assign;
	var curry     = Fn.curry;
	var isDefined = Fn.isDefined;
	var settings  = (Sparky.settings = Sparky.settings || {});

	function createList(ordinals) {
		var array = [], n = 0;

		while (n++ < 31) {
			array[n] = ordinals[n] || ordinals.n;
		}

		return array;
	}

	// Language settings
	settings.en = {
		days:     ('Sunday Monday Tuesday Wednesday Thursday Friday Saturday').split(' '),
		months:   ('January February March April May June July August September October November December').split(' '),
		ordinals: createList({ n: 'th', 1: 'st', 2: 'nd', 3: 'rd', 21: 'st', 22: 'nd', 23: 'rd', 31: 'st' })
	};

	settings.fr = {
		days:     ('dimanche lundi mardi mercredi jeudi vendredi samedi').split(' '),
		months:   ('janvier février mars avril mai juin juillet août septembre octobre novembre décembre').split(' '),
		ordinals: createList({ n: "ième", 1: "er" })
	};

	settings.de = {
		days:     ('Sonntag Montag Dienstag Mittwoch Donnerstag Freitag Samstag').split(' '),
		months:   ('Januar Februar März April Mai Juni Juli Oktober September Oktober November Dezember').split(' '),
		ordinals: createList({ n: "er" })
	};

	settings.it = {
		days:     ('domenica lunedì martedì mercoledì giovedì venerdì sabato').split(' '),
		months:   ('gennaio febbraio marzo aprile maggio giugno luglio agosto settembre ottobre novembre dicembre').split(' '),
		ordinals: createList({ n: "o" })
	};

	// Document language
	var lang = document.documentElement.lang;
	settings.lang = lang && settings[lang] ? lang : 'en';

	function spaces(n) {
		var s = '';
		while (n--) { s += ' '; }
		return s;
	}

	var rletter = /([YMDdHhms]{2,4}|[a-zA-Z])/g;
	//var rtimezone = /(?:Z|[+-]\d{2}:\d{2})$/;
	var rnonzeronumbers = /[1-9]/;

	function createDate(value) {
		// Test the Date constructor to see if it is parsing date
		// strings as local dates, as per the ES6 spec, or as GMT, as
		// per pre ES6 engines.
		// developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse#ECMAScript_5_ISO-8601_format_support
		var date = new Date(value);
		var json = date.toJSON();
		var gmt =
			// It's GMT if the first characters of the json match
			// the value...
			json.slice(0, value.length) === value &&

			// ...and if all remaining numbers in the json are 0.
			!json.slice(value.length).match(rnonzeronumbers) ;

		return typeof value !== 'string' ? new Date(value) :
			// If the Date constructor parses to gmt offset the date by
			// adding the date's offset in milliseconds to get a local
			// date. getTimezoneOffset returns the offset in minutes.
			gmt ? new Date(+date + date.getTimezoneOffset() * 60000) :

			// Otherwise use the local date.
			date ;
	}

	assign(Sparky.transformers = {}, {
		add:      { transform: Fn.add,      invert: curry(function(m, n) { return n - m; }) },
		decibels: { transform: Fn.todB,     invert: Fn.toLevel },
		multiply: { transform: Fn.multiply, invert: curry(function(d, n) { return n / d; }) },
		degrees:  { transform: Fn.toDeg,    invert: Fn.toRad },
		radians:  { transform: Fn.toRad,    invert: Fn.toDeg },
		decimals: { transform: Fn.toFixed,  invert: curry(function(n, str) { return parseFloat(str); }) },
	});

	assign(Sparky.transforms, {

		// Transforms from Fn's map functions

		add:          Fn.add,
		append:       Fn.append,
		contains:     Fn.contains,
		denormalise:  Fn.denormalise,
		diff:         Fn.diff,
		equals:       Fn.equals,
		exp:          Fn.exp,
		factorise:    Fn.factorise,
		gcd:          Fn.gcd,
		get:          Fn.get,
		getPath:      Fn.getPath,
		intersect:    Fn.intersect,
		invoke:       Fn.invoke,
		is:           Fn.is,
		lcm:          Fn.lcm,
		limit:        Fn.limit,
		log:          Fn.log,
		max:          Fn.max,
		min:          Fn.min,
		mod:          Fn.mod,
		multiply:     Fn.multiply,
		normalise:    Fn.normalise,
		not:          Fn.not,
		percent:      Fn.multiply(100),
		pow:          Fn.pow,
		prepend:      Fn.prepend,
		rest:         Fn.rest,
		root:         Fn.nthRoot,
		slugify:      Fn.slugify,
		sort:         Fn.sort,
		take:         Fn.take,
		toCartesian:  Fn.toCartesian,
		toDb:         Fn.toDb,
		toDeg:        Fn.toDeg,
		toLevel:      Fn.toLevel,
		toFixed:      Fn.toFixed,
		toFloat:      Fn.toFloat,
		toPolar:      Fn.toPolar,
		toRad:        Fn.toRad,
		toStringType: Fn.toStringType,
		toType:       Fn.toType,
		unique:       Fn.unique,
		unite:        Fn.unite,


		// Transforms from dom's map functions

		escape:       dom.escape,
		toPx:         dom.toPx,
		toRem:        dom.toRem,


		// Sparky transforms

//		add: function(value, n) {
//			var result = parseFloat(value) + n ;
//			if (Number.isNaN(result)) { return; }
//			return result;
//		},

		capfirst: function(value) {
			return value.charAt(0).toUpperCase() + value.substring(1);
		},

		cut: function(value, string) {
			return Sparky.filter.replace(value, string, '');
		},

		formatdate: (function(settings) {
			var formatters = {
				YYYY: function(date) { return ('000' + date.getFullYear()).slice(-4); },
				YY:   function(date) { return ('0' + date.getFullYear() % 100).slice(-2); },
				MM:   function(date) { return ('0' + (date.getMonth() + 1)).slice(-2); },
				MMM:  function(date) { return this.MMMM(date).slice(0,3); },
				MMMM: function(date) { return settings[lang].months[date.getMonth()]; },
				DD:   function(date) { return ('0' + date.getDate()).slice(-2); },
				d:    function(date) { return '' + date.getDay(); },
				dd:   function(date) { return ('0' + date.getDay()).slice(-2); },
				ddd:  function(date) { return this.dddd(date).slice(0,3); },
				dddd: function(date) { return settings[lang].days[date.getDay()]; },
				HH:   function(date) { return ('0' + date.getHours()).slice(-2); },
				mm:   function(date) { return ('0' + date.getMinutes()).slice(-2); },
				ss:   function(date) { return ('0' + date.getSeconds()).slice(-2); },
				sss:  function(date) { return (date.getSeconds() + date.getMilliseconds() / 1000 + '').replace(/^\d\.|^\d$/, function($0){ return '0' + $0; }); },
			};

			return function formatDate(value, format, lang) {
				if (!value) { return; }

				var date = value instanceof Date ? value : createDate(value) ;

				lang = lang || settings.lang;

				return format.replace(rletter, function($0, $1) {
					return formatters[$1] ? formatters[$1](date, lang) : $1 ;
				});
			};
		})(settings),

		formattime: function(value, format, lang) {
			return Time(value).render(format, lang);
		},

		date: (function(settings) {
			var formatters = {
				a: function(date) { return date.getHours() < 12 ? 'a.m.' : 'p.m.'; },
				A: function(date) { return date.getHours() < 12 ? 'AM' : 'PM'; },
				b: function(date, lang) { return settings[lang].months[date.getMonth()].toLowerCase().slice(0,3); },
				c: function(date) { return date.toISOString(); },
				d: function(date) { return date.getDate(); },
				D: function(date, lang) { return settings[lang].days[date.getDay()].slice(0,3); },
				//e: function(date) { return ; },
				//E: function(date) { return ; },
				//f: function(date) { return ; },
				F: function(date, lang) { return settings[lang].months[date.getMonth()]; },
				g: function(date) { return date.getHours() % 12; },
				G: function(date) { return date.getHours(); },
				h: function(date) { return ('0' + date.getHours() % 12).slice(-2); },
				H: function(date) { return ('0' + date.getHours()).slice(-2); },
				i: function(date) { return ('0' + date.getMinutes()).slice(-2); },
				//I: function(date) { return ; },
				j: function(date) { return date.getDate(); },
				l: function(date, lang) { return settings[lang].days[date.getDay()]; },
				//L: function(date) { return ; },
				m: function(date) { return ('0' + date.getMonth()).slice(-2); },
				M: function(date, lang) { return settings[lang].months[date.getMonth()].slice(0,3); },
				n: function(date) { return date.getMonth(); },
				//o: function(date) { return ; },
				O: function(date) {
					return (date.getTimezoneOffset() < 0 ? '+' : '-') +
						 ('0' + Math.round(100 * Math.abs(date.getTimezoneOffset()) / 60)).slice(-4) ;
				},
				r: function(date) { return date.toISOString(); },
				s: function(date) { return ('0' + date.getSeconds()).slice(-2); },
				S: function(date) { return settings.ordinals[date.getDate()]; },
				//t: function(date) { return ; },
				//T: function(date) { return ; },
				U: function(date) { return +date; },
				w: function(date) { return date.getDay(); },
				//W: function(date) { return ; },
				y: function(date) { return ('0' + date.getFullYear() % 100).slice(-2); },
				Y: function(date) { return date.getFullYear(); },
				//z: function(date) { return ; },
				Z: function(date) { return -date.getTimezoneOffset() * 60; }
			};

			return curry(function formatDate(format, value) {
				if (!value) { return; }

				var date = value instanceof Date ? value : createDate(value) ;

				lang = settings.lang;

				return format.replace(rletter, function($0, $1) {
					return formatters[$1] ? formatters[$1](date, lang) : $1 ;
				});
			});
		})(settings),

		decibels: Fn.todB,
		decimals: Fn.toFixed,

		divide: curry(function(n, value) {
			if (typeof value !== 'number') { return; }
			return value / n;
		}),

		'find-in': curry(function(path, id) {
			if (!isDefined(id)) { return; }
			var collection = Fn.getPath(path, Sparky.data);
			return collection && collection.find(id);
		}),

		first: Fn.get(0),

		floatformat: function(value, n) {
			return typeof value === 'number' ? Number.prototype.toFixed.call(value, n) :
				!isDefined(value) ? '' :
				(Sparky.debug && console.warn('Sparky: filter floatformat: ' + n + ' called on non-number ' + value)) ;
		},

		floor: function(value) {
			return Math.floor(value);
		},

		"greater-than": function(value1, value2) {
			return value1 > value2;
		},

		invert: function(value) {
			return typeof value === 'number' ? 1 / value : !value ;
		},

		join: curry(function(string, value) {
			return Array.prototype.join.call(value, string);
		}),

		json: function(value) {
			return JSON.stringify(value);
		},

		last: function(value) {
			return value[value.length - 1];
		},

		length: function(value) {
			return value.length;
		},

		"less-than": curry(function(value2, str1, str2, value1) {
			return value1 < value2 ? str1 : str2 ;
		}),

		//length_is
		//linebreaks

		//linebreaksbr: (function() {
		//	var rbreaks = /\n/;
		//
		//	return function(value) {
		//		return value.replace(rbreaks, '<br/>')
		//	};
		//})(),

		localise: curry(function(digits, value) {
			var locale = document.documentElement.lang;
			var options = {};

			if (isDefined(digits)) {
				options.minimumFractionDigits = digits;
				options.maximumFractionDigits = digits;
			}

			// Todo: localise value where toLocaleString not supported
			return value.toLocaleString ? value.toLocaleString(locale, options) : value ;
		}),

		lowercase: function(value) {
			if (typeof value !== 'string') { return; }
			return String.prototype.toLowerCase.apply(value);
		},

		map: curry(function(method, path, array) {
			return array && array.map(Sparky.transforms[method](path));
		}),

		mod: curry(function(n, value) {
			if (typeof value !== 'number') { return; }
			return value % n;
		}),

		pluralise: curry(function(str1, str2, lang, value) {
			if (typeof value !== 'number') { return; }

			str1 = str1 || '';
			str2 = str2 || 's';

			// In French, numbers less than 2 are considered singular, where in
			// English, Italian and elsewhere only 1 is singular.
			return lang === 'fr' ?
				(value < 2 && value >= 0) ? str1 : str2 :
				value === 1 ? str1 : str2 ;
		}),

		postpad: curry(function(n, value) {
			var string = isDefined(value) ? value.toString() : '' ;
			var l = string.length;
			var m = parseInt(n, 10);

			return m === l ? value :
				m > l ? string + spaces(m - l) :
				string.substring(0, m) ;
		}),

		prepad: curry(function(n, char, value) {
			var string = isDefined(value) ? value.toString() : '' ;
			var l = string.length;
			var array = [];

			// String is longer then padding: let it through unprocessed
			if (n - l < 1) { return value; }

			array.length = 0;
			array.length = n - l;
			array.push(string);
			return array.join(char || ' ');
		}),

		random: function(value) {
			return value[Math.floor(Math.random() * value.length)];
		},

		reduce: curry(function(name, initialValue, array) {
			return array && array.reduce(Fn[name], initialValue || 0);
		}),

		replace: curry(function(str1, str2, value) {
			if (typeof value !== 'string') { return; }
			return value.replace(RegExp(str1, 'g'), str2);
		}),

		round: Math.round,

		//reverse

		//safe: function(string) {
		//	if (typeof string !== string) { return; }
		//	// Actually, we can't do this here, because we cant return DOM nodes
		//	return;
		//},

		//safeseq

		slice: curry(function(i0, i1, value) {
			return typeof value === 'string' ?
				value.slice(i0, i1) :
				Array.prototype.slice.call(value, i0, i1) ;
		}),

		//sort
		//stringformat

		striptags: (function() {
			var rtag = /<(?:[^>'"]|"[^"]*"|'[^']*')*>/g;

			return function(value) {
				return value.replace(rtag, '');
			};
		})(),

		switch: function(value) {
			if (typeof value === 'string') { value = parseInt(value, 10); }
			if (typeof value !== 'number' || Number.isNaN(value)) { return; }
			return arguments[value + 1];
		},

		symbolise: function(value) {
			// Takes infinity values and convert them to infinity symbol
			var string = value + '';
			var infinity = Infinity + '';

			if (string === infinity) { return '∞'; }
			if (string === ('-' + infinity)) { return '-∞'; }
			return value;
		},

		time: function() {

		},

		//timesince
		//timeuntil
		//title

		trans: (function() {
			var warned = {};

			return function(value) {
				var translations = Sparky.data.translations;
	
				if (!translations) {
					if (!warned.missingTranslations) {
						console.warn('Sparky: Missing lookup object Sparky.data.translations');
						warned.missingTranslations = true;
					}
					return value;
				}
	
				var text = translations[value] ;
	
				if (!text) {
					if (!warned[value]) {
						console.warn('Sparky: Sparky.data.translations contains no translation for "' + value + '"');
						warned[value] = true;
					}
	
					return value;
				}
	
				return text ;
			};
		})(),

		truncatechars: curry(function(n, value) {
			return value.length > n ?
				value.slice(0, n) + '…' :
				value ;
		}),

		type: function(value) {
			return typeof value;
		},

		//truncatewords
		//truncatewords_html
		//unique

		uppercase: function(value) {
			if (typeof value !== 'string') { return; }
			return String.prototype.toUpperCase.apply(value);
		},

		//urlencode
		//urlize
		//urlizetrunc
		//wordcount
		//wordwrap

		yesno: curry(function(truthy, falsy, value) {
			return value ? truthy : falsy ;
		})
	});
})(this);
