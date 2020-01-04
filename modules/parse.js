
/*
tags()

Sparky template tags are made of three parts:

```html
{ [ path|pipe:params ] }
```

Values are read from `path` in the scope object. A path is of
the form `path.to.property-name`. Values are piped through
any number of `pipe` transforms and rendered into the DOM on animation
frames.

```html
{ [ repository.url|prepend:'Repo: ' ] }
```

```html
Repo: https://github.com/cruncher/sparky.git
```

There are a number of built in pipe transforms besides `prepend`,
and you may declare your own in JS.
*/

import { capture, exec, id, noop, nothing } from '../../fn/module.js'
import Value from './value.js';

const parseArrayClose = capture(/^\]\s*/, nothing);

/*
parseParams(array, string)
*/

//                                        number                                     "string"            'string'                    null   true   false  array function(args)  dot  string           comma
export const parseParams = capture(/^\s*(?:(-?(?:\d*\.?\d+)(?:[eE][-+]?\d+)?)|"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|(null)|(true)|(false)|(\[)|(\w+)\(([^)]+)\)|(\.)?([\w.\-#/?:\\]+))\s*(,)?\s*/, {
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
    11: function(params, tokens) {
        if (tokens[10]) {
            params.push(new Value(tokens[11]));
        }
        else {
            params.push(tokens[11]);
        }
        return params;
    },

    // Comma terminator - more params to come
    12: function(params, tokens) {
        return parseParams(params, tokens);
    },

    catch: function(params, string) {
        // string is either the input string or a tokens object
        // from a higher level of parsing
        throw new SyntaxError('Invalid parameter "' + (string.input || string) + '"');
    }
});

/*
parsePipe(array, string)
*/

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
    }),

    catch: function(fns, string) {
        // string is either the input string or a tokens object
        // from a higher level of parsing
        console.log(string.input, string);
        throw new SyntaxError('Invalid pipe "' + (string.input || string) + '"');
    }
});

/*
parseTag(string)
*/

export const parseTag = capture(/^\s*([\w.-]*)\s*(\|)?\s*/, {
    // Object path 'xxxx.xxx.xx-xxx'
    1: (nothing, tokens) => new Value(tokens[1]),

    // Pipe '|'
    2: function(tag, tokens) {
        tag.pipe = parsePipe([], tokens);
        return tag;
    },

    // Tag close ']}'
    close: function(tag, tokens) {
        if (!exec(/^\s*\]\}/, id, tokens)) {
            throw new SyntaxError('Unclosed tag in "' + tokens.input + '"');
        }

        return tag;
    },

    // Where nothing is found, don't complain
    catch: id
}, undefined);

/*
parseToken(string)
*/

export const parseToken = capture(/^\s*(\{\[)/, {
    // Tag opener '{['
    1: function(unused, tokens) {
        const tag = parseTag(tokens);
        tag.label = tokens.input.slice(tokens.index, tokens.index + tokens[0].length + tokens.consumed);
        return tag;
    },

    close: function(tag, tokens) {
        // Only spaces allowed til end
        if (!exec(/^\s*$/, id, tokens)) {
            throw new SyntaxError('Invalid characters after token (only spaces valid) "' + tokens.input + '"');
        }

        return tag;
    },

    // Where nothing is found, don't complain
    catch: id
}, undefined);

/*
parseBoolean(array, string)
*/

export const parseBoolean = capture(/^\s*(?:(\{\[)|$)/, {
    // Tag opener '{['
    1: function(array, tokens) {
        const tag = parseTag(tokens);
        tag.label = tokens.input.slice(tokens.index, tokens.index + tokens[0].length + tokens.consumed);
        array.push(tag);
        return parseBoolean(array, tokens);
    },

    // Where nothing is found, don't complain
    catch: id
});

/*
parseText(array, string)
*/

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
    2: (array, tokens) => {
        const tag = parseTag(tokens);
        tag.label = tokens.input.slice(tokens.index + tokens[1].length, tokens.index + tokens[0].length + tokens.consumed);
        array.push(tag);
        return parseText(array, tokens);
    },

    // Where nothing is found, don't complain
    catch: noop
});
