
import { capture, nothing, pipe } from '../../fn/fn.js'


/* Parse parameters */

const parseArrayClose = capture(/^\]\s*/, nothing);

//                                        number                                     "string"                   'string'                    null   true   false  array function(args)   string
export const parseParams = capture(/^\s*(?:(-?(?:\d*\.?\d+)(?:[eE][-+]?\d+)?)|"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|(null)|(true)|(false)|(\[)|(\w+)\(([^)]+)\)|([\w.\-#/?:\\]+))\s*(,)?\s*/, {
    // number
    1: function(params, tokens) { params.push(parseFloat(tokens[1])); return params; },

    // "string"
    2: function(params, tokens) { params.push(tokens[2]); return params; },

    // 'string'
    3: function(params, tokens) { params.push(tokens[3]); return params; },

    // null
    4: function(params) { params.push(null); return params; },

    // true
    5: function(params) { params.push(true); return params; },

    // false
    6: function(params) { params.push(false); return params; },

    // array
    7: function(params, tokens) {
        if (tokens.input[1] === ']') {
            params.push([]);
        }
        else {
            params.push(parseParams([], tokens));
        }

        parseArrayClose(null, tokens);
        return params;
    },

    // Todo: review syntax for nested functions
    // function(args)
    //8: function(params, value, result) {
    //    // Todo: recurse to parseFn for parsing inner functions
    //    value = Sparky.transforms[value].apply(null, JSON.parse('[' + result[9].replace(rsinglequotes, '"') + ']'));
    //    params.push(value);
    //    return params;
    //},

    // string
    10: function(params, tokens) { params.push(tokens[10]); return params; },

    // Comma terminator - more params to come
    11: function(params, tokens) {
        return parseParams(params, tokens);
    }
});


/* Parse function */

export const parseFn = capture(/^\s*([\w-]+)\s*(:)?/, {
    1: function(getFn, tokens) {
        var fn = getFn(tokens[1]);
        if (!fn) { throw new Error('fn ' + tokens[1] + '() not found.'); }
        return fn;
    },

    2: function(fn, tokens) {
        const params = parseParams([], tokens);
        return fn.apply(null, params);
    }
});


/* Parse pipe */


import { transformers, transforms } from './transforms.js';

function getFn(name) {
    return transformers[name] ? transformers[name].tx : transforms[name] ;
}

const parsePipe1 = capture(/^(\|)?\s*/, {
    1: function(array, tokens) {
        array.push(parseFn(getFn, tokens[1]));
        parsePipe1(array, tokens[1]);
        return array;
    }
});

export function parsePipe(string) {
    var data = typeof string === 'string' ? {
        0: '',
        input: string,
        index: 0
    } : string ;

    var array = [];

    array.push(parseFn(getFn, data));
    parsePipe1(array, data);

    // No need to pipe if there is but one function
    return array.length > 1 ?
        pipe.apply(null, array) :
        array[0] ;
}


/* Parse tag */

export const parseTag = capture(/\{\[\s*([^|\s]*)\s*(\|)?\s*/, {
    1: function(object, tokens) {
        object.path = tokens[1];
        return object;
    },

    2: function(object, tokens) {
        object.fn = parsePipe(tokens);
        return object;
    },

    close: capture(/^\s*\]\}/, nothing)
});
