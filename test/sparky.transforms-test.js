import { test as group } from '../../fn/module.js';
import { transforms, transformers } from '../modules/transforms.js';

group('Sparky.transformers', function(test, log) {
	var key, filter;
	var expected = {
		add: [
			{ input: 3.5, expected: 9, params: [5.5] }
		],

		slugify: [
			{ input: '',  expected: '' },
			{ input: 'Pardon mE sir', expected: 'pardon-me-sir' }
		]
	};

	for (key in expected) {
		(function(key, filter, tests) {
			test("Sparky.transformers." + key + "()", function(equals, done) {
				tests.forEach(function(data) {
					var tx = data.params ?
						filter.apply(filter, data.params) :
						filter ;

					equals(data.expected, tx(data.input), key);
				});

				done();
			});
		})(
			key,

			transformers[key] ?
				transformers[key].tx :
				transforms[key],

			expected[key]
		);
	}

	test("Sparky.transformers.add", function(equals, done) {
		equals(9, transformers.add.tx(5.5, 3.5));
		done();
	});

	test("Sparky.transformers.slugify", function(equals, done) {
		equals('pardon-me-sir', transforms.slugify('Pardon Me sir'));
		done();
	});

	test("Sparky.transformers.yesno", function(equals, done) {
		equals('1', transforms.yesno('1', '2', true));
		equals('1', transforms.yesno('1', '2', {}));
		equals('2', transforms.yesno('1', '2', false));
		equals('2', transforms.yesno('1', '2', undefined));
		equals('2', transforms.yesno('1', '2', null));
		done();
	});
});


//	capfirst
//	cut
//	prepad
//	postpad
//	date
//	decimals: Number.prototype.toFixed,
//
//	// .default() can't work, because Sparky does not send undefined or null
//	// values to be filtered.
//	//'default'
//	//dictsort
//	//dictsortreversed
//	//divisibleby
//
//	escape
//	first
//	floatformat
//	//get_digit
//	//iriencode
//	join
//	json
//	last
//	length
//	//length_is
//	//linebreaks
//	linebreaksbr
//	//linenumbers
//	lower
//	lowercase
//	//make_list
//	multiply
//	parseint
//	//phone2numeric
//	pluralize
//	//pprint
//	random
//	//raw
//	//removetags
//	replace
//	//reverse
//	safe
//	//safeseq
//	slice
//	slugify
//	//sort
//	//stringformat
//	striptags
//	striptagsexcept
//	time
//	//timesince
//	//timeuntil
//	//title
//	truncatechars
//	//truncatewords
//	//truncatewords_html
//	//unique
//	unordered_list
//	//urlencode
//	//urlize
//	//urlizetrunc
//	//wordcount
//	//wordwrap
