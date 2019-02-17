
import { capture, exec, id, noop, nothing, pipe } from '../../fn/fn.js'
import toRenderString from './render.js';

const assign          = Object.assign;
const parseArrayClose = capture(/^\]\s*/, nothing);

//                                        number                                     "string"            'string'                    null   true   false  array function(args)   string      comma
export const parseParams = capture(/^\s*(?:(-?(?:\d*\.?\d+)(?:[eE][-+]?\d+)?)|"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|(null)|(true)|(false)|(\[)|(\w+)\(([^)]+)\)|([\w.\-#/?:\\]+))\s*(,)?\s*/, {
    // number
    1: function(params, tokens) {
        params.push(parseFloat(tokens[1]));
        return params;
    },

    // "string"
    2: function(params, tokens) {
        params.push(tokens[2]);
        return params;
    },

    // 'string'
    3: function(params, tokens) {
        params.push(tokens[3]);
        return params;
    },

    // null
    4: function(params) {
        params.push(null);
        return params;
    },

    // true
    5: function(params) {
        params.push(true);
        return params;
    },

    // false
    6: function(params) {
        params.push(false);
        return params;
    },

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
    10: function(params, tokens) {
        params.push(tokens[10]);
        return params;
    },

    // Comma terminator - more params to come
    11: function(params, tokens) {
        return parseParams(params, tokens);
    }
});


/* Parse function */

import { transformers, transforms } from './transforms.js';

function getTransform(name) {
    return transformers[name] ?
        transformers[name].tx :
        transforms[name] ;
}

export const parsePipe = capture(/^\s*([\w-]+)\s*(:)?\s*/, {
    // Function name '...'
    1: function(fns, tokens) {
        fns.push({
            name: tokens[1],
            args: nothing
        });

        return fns;
    },

    // Params ':'
    2: function(fns, tokens) {
        fns[fns.length - 1].args = parseParams([], tokens);
        return fns;
    },

    close: capture(/^\s*(\|)?\s*/, {
        // More pipe '|'
        1: function(fns, tokens) {
            return parsePipe(fns, tokens);
        }
    })
})

function Tag() {}

assign(Tag.prototype, {
    transform: id,

    // Tags are stored in arrays with any surrounding strings, and joined
    // on render. Array.join() causes .toString() to be called.
    toString: function toString() {
        // Don't pipe undefined
        return toRenderString(
            this.value === undefined || this.value === null ?
                undefined :
                this.transform(this.value)
        );
    },

    valueOf: function valueOf() {
        // Don't pipe undefined
        return this.value === undefined || this.value === null ?
            undefined :
            this.transform(this.value) ;
    }
});

function toFunction(data) {
    const fn = getTransform(data.name);
    if (!fn) { throw new Error('fn ' + data.name + '() not found.'); }

    return data.args && data.args.length ?
        // fn is expected to return a fn
        fn.apply(null, data.args) :
        // fn is used directly
        fn ;
}

function throwError(regex, string) {
    throw new Error('Cannot parse tag "' + string + '" with ' + regex);
}

export const parseTag = capture(/^\s*([\w.-]*)\s*(\|)?\s*/, {
    // Object path 'xxxx.xxx.xx-xxx'
    1: (none, tokens) => {
        const tag = new Tag();
        tag.path = tokens[1];
        return tag;
    },

    // Pipe '|'
    2: function(tag, tokens) {
        tag.pipe = parsePipe([], tokens);
        if (!tag.pipe || !tag.pipe.length) { return tag; }
        tag.transform = pipe.apply(null, tag.pipe.map(toFunction));
        return tag;
    },

    // Tag close ']}'
    close: function(tag, tokens) {
        exec(/^\s*\]\}/, noop, throwError, tokens);
        return tag;
    }
});

export const parseToken = capture(/^\s*(\{\[)/, {
    // Tag opener '{['
    1: function(none, tokens) {
        const tag = parseTag(null, tokens);
        tag.label = tokens.input.slice(tokens.index, tokens.index + tokens[0].length + tokens.consumed);
        return tag;
    },

    close: function(tag, tokens) {
        // Only spaces allowed til end
        exec(/^\s*$/, noop, throwError, tokens);
        return tag;
    },

    // Where nothing is found, don't complain
    catch: id
});

export const parseBoolean = capture(/^\s*(?:(\{\[)|$)/, {
    // Tag opener '{['
    1: function(array, tokens) {
        const tag = parseTag(null, tokens);
        tag.label = tokens.input.slice(tokens.index, tokens.index + tokens[0].length + tokens.consumed);
        array.push(tag);
        return parseBoolean(array, tokens);
    },

    // Where nothing is found, don't complain
    catch: id
});

export const parseText = capture(/^([\S\s]*?)(?:(\{\[)|$)/, {
    // String of text, whitespace and newlines included
    1: (array, tokens) => {
        // If no tags have been found return undefined
        if (!array.length && !tokens[2]) {
            return;
        }

        // If it is not empty, push in leading text
        if (tokens[1]) {
            array.push(tokens[1]);
        }

        return array;
    },

    // Tag opener '{['
    2: function(array, tokens) {
        const tag = parseTag(Tag, tokens);
        tag.label = tokens.input.slice(tokens.index + tokens[1].length, tokens.index + tokens[0].length + tokens.consumed);
        array.push(tag);
        return parseText(array, tokens);
    }
});
