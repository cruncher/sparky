
// Sparky.filter

(function(window) {
	"use strict";

	var Fn        = window.Fn;
	var Sparky    = window.Sparky;
	var isDefined = Fn.isDefined;
	var settings  = (Sparky.settings = Sparky.settings || {});

	// A reuseable array.
	var array = [];

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

	Sparky.filter = {
		add: function(value, n) {
			var result = parseFloat(value) + n ;
			if (Number.isNaN(result)) { return; }
			return result;
		},

		capfirst: function(value) {
			return value.charAt(0).toUpperCase() + value.substring(1);
		},

		cut: function(value, string) {
			return Sparky.filter.replace(value, string, '');
		},

		date: (function(settings) {
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

			var rletter = /([YMDdHhms]{2,4}|[a-zA-Z])/g;
			var rtimezone = /(?:Z|[+-]\d{2}:\d{2})$/;
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

			return function formatDate(value, format, lang) {
				if (!value) { return; }

				var date = value instanceof Date ? value : createDate(value) ;

				lang = lang || settings.lang;

				return format.replace(rletter, function($0, $1) {
					return formatters[$1] ? formatters[$1](date, lang) : $1 ;
				});
			};
		})(settings),

		decibels: function(value) {
			if (typeof value !== 'number') { return; }
			return 20 * Math.log10(value);
		},

		decimals: function(value, n) {
			if (typeof value !== 'number') { return; }
			return Number.prototype.toFixed.call(value, n);
		},

		divide: function(value, n) {
			if (typeof value !== 'number') { return; }
			return value / n;
		},

		escape: (function() {
			var pre = document.createElement('pre');
			var text = document.createTextNode('');

			pre.appendChild(text);

			return function(value) {
				text.textContent = value;
				return pre.innerHTML;
			};
		})(),

		'find-in': function(id, path) {
			if (!isDefined(id)) { return; }
			var collection = Fn.getPath(path, Sparky.data);
			return collection && collection.find(id);
		},

		first: function(value) {
			return value[0];
		},

		floatformat: function(value, n) {
			return typeof value === 'number' ? Number.prototype.toFixed.call(value, n) :
				!isDefined(value) ? '' :
				(Sparky.debug && console.warn('Sparky: filter floatformat: ' + n + ' called on non-number ' + value)) ;
		},

		floor: function(value) {
			return Math.floor(value);
		},

		get: function(value, name) {
			return isDefined(value) ? Fn.get(name, value) : undefined ;
		},

		"greater-than": function(value1, value2) {
			return value1 > value2;
		},

		contains: function(array, value) {
			return (array && array.indexOf(value) > -1);
		},

		invert: function(value) {
			return typeof value === 'number' ? 1 / value : !value ;
		},

		is: Fn.is,
		equals: Fn.equals,

		join: function(value, string) {
			return Array.prototype.join.call(value, string);
		},

		json: function(value) {
			return JSON.stringify(value);
		},

		last: function(value) {
			return value[value.length - 1];
		},

		length: function(value) {
			return value.length;
		},

		"less-than": function(value1, value2, str1, str2) {
			return value1 < value2 ? str1 : str2 ;
		},

		//length_is
		//linebreaks

		//linebreaksbr: (function() {
		//	var rbreaks = /\n/;
		//
		//	return function(value) {
		//		return value.replace(rbreaks, '<br/>')
		//	};
		//})(),

		localise: function(value, digits) {
			var locale = document.documentElement.lang;
			var options = {};

			if (isDefined(digits)) {
				options.minimumFractionDigits = digits;
				options.maximumFractionDigits = digits;
			}

			// Todo: localise value where toLocaleString not supported
			return value.toLocaleString ? value.toLocaleString(locale, options) : value ;
		},

		lowercase: function(value) {
			if (typeof value !== 'string') { return; }
			return String.prototype.toLowerCase.apply(value);
		},

		map: function(array, method, path) {
			return array && array.map(Fn[method](path));
		},

		mod: function(value, n) {
			if (typeof value !== 'number') { return; }
			return value % n;
		},

		multiply: function(value, n) {
			return value * n;
		},

		not: Fn.not,

		parseint: function(value) {
			return parseInt(value, 10);
		},

		percent: function(value) {
			return value * 100;
		},

		pluralise: function(value, str1, str2, lang) {
			if (typeof value !== 'number') { return; }

			str1 = str1 || '';
			str2 = str2 || 's';

			// In French, numbers less than 2 are considered singular, where in
			// English, Italian and elsewhere only 1 is singular.
			return lang === 'fr' ?
				(value < 2 && value >= 0) ? str1 : str2 :
				value === 1 ? str1 : str2 ;
		},

		postpad: function(value, n) {
			var string = isDefined(value) ? value.toString() : '' ;
			var l = string.length;
			var m = parseInt(n, 10);

			return m === l ? value :
				m > l ? string + spaces(m - l) :
				string.substring(0, m) ;
		},

		prepad: function(value, n, char) {
			var string = isDefined(value) ? value.toString() : '' ;
			var l = string.length;

			// String is longer then padding: let it through unprocessed
			if (n - l < 1) { return value; }

			array.length = 0;
			array.length = n - l;
			array.push(string);
			return array.join(char || ' ');
		},

		random: function(value) {
			return value[Math.floor(Math.random() * value.length)];
		},

		reduce: function(array, name, initialValue) {
			return array && array.reduce(Fn[name], initialValue || 0);
		},

		replace: function(value, str1, str2) {
			if (typeof value !== 'string') { return; }
			return value.replace(RegExp(str1, 'g'), str2);
		},

		round: function(value) {
			if (typeof value !== 'number') { return; }
			return Math.round(value);
		},

		//reverse

		//safe: function(string) {
		//	if (typeof string !== string) { return; }
		//	// Actually, we can't do this here, because we cant return DOM nodes
		//	return;
		//},

		//safeseq

		slice: function(value, i0, i1) {
			return typeof value === 'string' ?
				value.slice(i0, i1) :
				Array.prototype.slice.call(value, i0, i1) ;
		},

		slugify: function(value) {
			if (typeof value !== 'string') { return; }
			return value.trim().toLowerCase().replace(/\W/g, '-').replace(/[_]/g, '-');
		},

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

		truncatechars: function(value, n) {
			return value.length > n ?
				value.slice(0, n) + '…' :
				value ;
		},

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

		yesno: function(value, truthy, falsy) {
			return value ? truthy : falsy ;
		}
	};
})(this);
