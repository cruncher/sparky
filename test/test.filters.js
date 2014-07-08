module('Sparky.filters', function(fixture) {
	test("Sparky.filters.add", function() {
		ok(Sparky.filters.add.call('5.5', 3.5) === 9);
	});

	test("Sparky.filters.slugify", function() {
		ok(Sparky.filters.slugify.call('Pardon Me sir') === 'pardon-me-sir');
	});

	test("Sparky.filters.yesno", function() {
		ok(Sparky.filters.yesno.call(true, '1', '2') === '1');
		ok(Sparky.filters.yesno.call({}, '1', '2') === '1');
		ok(Sparky.filters.yesno.call(false, '1', '2') === '2');
		ok(Sparky.filters.yesno.call(undefined, '1', '2') === '2');
		ok(Sparky.filters.yesno.call(null, '1', '2') === '2');
	});

	test("Sparky.filters.prepad", function() {
		ok(Sparky.filters.prepad.call('barf', '9') === '     barf');
		// TODO: This is failing - FIX in filter fn!
		//ok(Sparky.filters.prepad.call('barf', '2') === 'barf');
	});

	test("Sparky.filters.postpad", function() {
		ok(Sparky.filters.postpad.call('barf', '9') === 'barf     ');
		ok(Sparky.filters.postpad.call('barf', '4') === 'barf');
		ok(Sparky.filters.postpad.call('barf', '2') === 'ba');
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


