<h1>Sparky</h1>

![alt tag](https://raw.githubusercontent.com/cruncher/sparky/master/images/sparky-logo.png)

<strong>Sparky is a live data binding templating engine that enhances the DOM with declarative tags and composeable templates, updating tags and rendering changes in batches at the browser frame rate for performance.</strong>

<a href="http://labs.cruncher.ch/sparky/">labs.cruncher.ch/sparky/</a>


## Setup

If you just want to clone the repo to use Sparky in a project:

    git clone https://github.com/cruncher/sparky.git

If you're going to develop it, Sparky has submodules. Clone the repo recursively:

    git clone https://github.com/cruncher/sparky.git --recursive

Install node modules for building and testing:

    npm install


## API

### Sparky(node, scope, fn)

    var sparky = Sparky(node, scope, fn)

To bind a node call <code>Sparky</code> with a node or id, a scope
object and/or a function.

<code>node   </code>node | document fragment | string

Required parameter. If it is a DOM node, Sparky parses it for tags. If it is a
string Sparky looks for a DOM node with that id, and if that DOM node is a <code>&lt;template&gt;</code> Sparky extracts the template contents and parses
those.

<code>scope  </code>object | string | undefined

An object who's properties are used to render tags in the node. (Sparky's scope
may also be replaced at a later time via <code>sparky.scope(object)</code>.) If
the <code>scope</code> parameter is a string it defines path to an object in the <code>Sparky.data</code>.

<code>fn     </code>function | string | undefined

A function to run upon instantiating the node, or a string defining a name or
names of function(s) stored in <code>sparky.fn</code> or in
<code>Sparky.fn</code>. Log <code>Sparky.fn</code> in the console to see the
default functions available.

<code>sparky</code>

A sparky object is an array-like object of DOM nodes that have been bound to
data models. It emits lifecycle events and exposes a few methods for
interacting with the template.

### Methods

#### .create()

Creates a new sparky that is a child of the current sparky.

    var child = sparky.create(node, scope, fn);

Parameters are the same as for the <code>Sparky()</code> constructor. Child
sparkies inherit <code>data</code> and <code>fn</code> objects, and are updated
and destroyed along with their parents.

#### .destroy()

The nuke option. Destroys the data bindings, removes nodes from the DOM and
removes any event handlers. Also destroys any child sparkies.

#### .render(path1, path2, ...)

Force all tags to update with current values. This should rarely be needed, as
Sparky handles render updates automatically, but it can be useful in cases where
unobserved data changes and you need to give Sparky a nudge to display it.

If no path arguments are passed in then all tags are updated.

#### .scope(object)

Swap the scope being used by this sparky for a new object. Sparky simply updates
it's DOM with data from the new scope.

#### .interrupt()

Stops Sparky from running functions and parsing it's nodes.
Typically called when content is being replaced,
for eaxmple, the built-in function <code>Sparky.fn.each</code> calls interrupt
before cloning a node for each item in a collection.

Returns a function that calls all functions in the <code>data-fn</code> list
that have not yet been called.

#### .tojQuery()

Where jQuery is available, returns sparky's element nodes (but not text nodes)
wrapped as a jQuery object.

Sparky templates are reasonably tolerant to being manipulated in the DOM.
Nodes in a template will stay bound to data when they are moved around or
removed from the DOM, or when other nodes are inserted between them.

You should be aware, though, that changing text content or attributes of nodes
that had Sparky tags in them when they were bound will likely cause problems –
Sparky will overwrite your changes the next time it's data is updated. The
exception is the <code>class</code> attribute: you can add and remove your own
classes as much as you like without fear of upsetting Sparky.

#### .on(type, fn)

Listen to event <code>type</code> with <code>fn</code>.

#### .off(type, fn)

Stop listening to event <code>type</code> with <code>fn</code>.
All parameters are optional.

### Events

- <code>scope</code>: triggered when scope is initialised or changed
- <code>destroy</code>: triggered when data bindings have been destroyed and
the node removed from the DOM.


### Sparky

#### Sparky.Throttle(fn)

Takes one function and returns a function that throttles calls to the browser
frame rate.

    var throttle = Sparky.Throttle(fn);

Calling <code>throttle()</code> causes <code>fn</code> to be called on the next
browser frame. Multiple calls to <code>throttle()</code> result in just one call
to <code>fn</code> on the next frame. <code>fn</code> is called with the
arguments from the latest call to <code>throttle(arg1, arg2, ...)</code>.

#### Sparky.render(template, object)

Where <code>template</code> is a string, replaces the Sparky tags in the string
with matching properties of object.

    Sparky.render('{{ bossname }} loves wooo!', {
        bossname: "Sparky"
    });

    // Returns: 'Sparky loves wooo!'

Where <code>template</code> is a regular expression, composes the regexp with
regexp properties of object.

        Sparky.render(/{{ropen}}\s*(\w+)\s*{{rclose}}/g, {
            ropen:  /\{{2,3}/,
            rclose: /\}{2,3}/
        });

        // Returns: /\{{2,3}\s*(\w+)\s*\}{2,3}/g

Where <code>template</code> is a function, and that function contains a single
JS comment, the contents of the comment are whitespace-cropped and treated as
a template string.

    Sparky.render(function(){/*
        {{ boss }} loves wooo!
    */}, {
        boss: "Sparky"
    });

    // -> 'Sparky loves wooo!'

This is a nice hacky technique for writing multiline templates in JS, although now superseded by ES6 multiline strings.

Note that <code>Sparky.render</code> is not used by Sparky to update the DOM.
Sparky does not treat the DOM as strings, it treats the DOM as the DOM, keeping an internal map of node attributes and text node content bound directly to data changes.

#### Sparky.tags(ropen, rclose)

Change the opening and closing template tag brackets. <code>ropen</code> and <code>rclose</code> must be regexps.

    Sparky.tags(/\{{2,3}/, /\{{2,3}/)

The regular expressions used to test for tags (<code>Sparky.rtags</code>,
<code>Sparky.rsimpletags</code>) are updated with the new opening and closing
tags. <code>Sparky.rtags</code> and <code>Sparky.rsimpletags</code> are
read-only properties.

#### Sparky.observe(object, property, fn)

#### Sparky.unobserve(object, property, fn)

#### Sparky.observePath(object, path, fn)

#### Sparky.observePathOnce(object, path, fn)

#### Sparky.unobservePath(object, path, fn)

#### Sparky.get(object, path)

Gets value from <code>'path.to.value'</code> inside <code>object</code>.

    var object = { path: { to: { value: 3 }}};
    var value = Sparky.getPath(object, 'path.to.value')  // Returns 3

If any object in the path does not exist, <code>getPath</code> returns <code>undefined</code>

#### Sparky.set(object, path, value)

#### Sparky.template(id)

Given the id of a template tag in the DOM, <code>Sparky.template(id)</code>
returns the cloned contents of that template as a document fragment.

Supports older browsers where <code>&lt;template&gt;</code> does not have the
associated JavaScript property <code>template.content</code>.


### Sparky.dom

A small library of DOM helper functions.

- <code>.query(node, selector)</code> -
- <code>.tag(node)</code> - Returns the element's tag name
- <code>.create(type, text)</code> - Creates a 'text', 'comment', 'fragment' or element node
- <code>.append(parent, node || collection)</code> - Append node to parent
- <code>.after(node1, node2)</code> -
- <code>.before(node1, node2)</code> -
- <code>.empty(node)</code> -
- <code>.remove(node || collection)</code> -
- <code>.closest(node, selector [, root])</code> - Finds closest ancestor matching selector
- <code>.matches(node, selector)</code> -
- <code>.classes(node)</code> - Returns a classList object
- <code>.style(node, name)</code> - Returns the computed style for named CSS property
- <code>.fragmentFromTemplate(id)</code> - Returns cloned fragment from a template's content
- <code>.fragmentFromContent(node)</code> - Returns a fragment containing a node's content or children

Nodes

- <code>.isElementNode(node)</code> -
- <code>.isTextNode(node)</code> -
- <code>.isCommentNode(node)</code> -
- <code>.isFragmentNode(node)</code> -

Events

- <code>.on(node, type, fn)</code> -
- <code>.off(node, type, fn)</code> -
- <code>.trigger(node, type)</code> -
- <code>.delegate(selector, fn)</code> -
- <code>.isPrimaryButton(e)</code> -


### Sparky.attributes

An array of attributes where Sparky looks for template tags.

- <code>class</code>
- <code>href</code>
- <code>title</code>
- <code>id</code>
- <code>style</code>
- <code>src</code>
- <code>alt</code>

For labels, inputs, selects and textareas Sparky also looks in:

- <code>for</code>
- <code>name</code>
- <code>value</code>
- <code>max</code>
- <code>min</code>

### Sparky.rsimpletags

A Regular expression matching tags of the form <code>{{ path.to.property }}</code>.
The path is stored in capturing group 1.

### Sparky.rtags

A Regular expression matching tags of the form
<code>{{ path.to.property|filter:'param' }}</code>. The opening brackets, the path
and the filter string are stored in capturing groups 1,2 and 3.

### Sparky.filter

An object containing template filters.

Display the date, formatted:

    <h1 class="language-{{lang}}" data-scope="text">
        {{title}}
        <time>{{date|date:'d M Y'}}</time>
    </h1>

Sparky has a number of template filters for modifying and formatting data. You
can also create your own. Sparky template filter syntax is similar to
<a href="http://docs.django.com/templates">Django template</a> filter syntax:

    <p>{{ date|date:'d M Y' }}</p>

- add
- capfirst
- cut: string – cuts matching string from a value
- date
- decibels – Takes a number as a ratio of powers and performs 20log10(number) to render it on the decibel scale.
- decimals: number – Alias of floatformat.
- divide: number – Divides by number.
- escape
- first –
- floatformat: number –
- floor
- get: string – Takes an object and renders the named property.
- greater-than: value, stringTrue, stringFalse
- invert – Returns 1/property.
- is: value, stringTrue, stringFalse – Compares property to value.
- join
- json
- last
- length
- less-than: value, stringTrue, stringFalse
- lower
- lowercase – Alias of lower.
- mod: number – Performs value % number.
- multiply: number
- parseint
- percent: number – Takes a number and multiplies by 100 to render it as a percentage.
- pluralize: stringSingular, stringPlural, lang –
- postpad: number, string –
- prepad: number, string –
- random
- replace
- round
- slice
- slugify
- striptags
- switch: string, &hellip; – Takes a number and returns the string at that index.
- symbolise – Converts common values to symbolic equivalents: JavaScript's number Infinity becomes '∞'.
- truncatechars
- type – Returns type of value
- uppercase –
- yesno


## Templates

#### [data-scope]

The <code>data-scope</code> attribute is a path to an object to be used as
scope to render the tags in this elements. Paths are written in dot notation.

    <div data-scope="path.to.object">
        <h1>{{title}}</h1>
    </div>

This will look for the object in the current sparky's <code>sparky.data</code>
object, or in the global data object <code>Sparky.data</code>. A tagged path
makes Sparky look for an object in the current scope.

    <div data-scope="{{path.to.object}}">
        <h1>{{title}}</h1>
    </div>

If no object is found at <code>path.to.object</code>, the
<code>&lt;div&gt;</code> is removed from the DOM. Sparky puts it back as soon
as the path can be resolved to an object. Sparky even updates the DOM if any of
the objects in the path are swapped for new objects.

Object names can contain <code>-</code> characters, or be numbers.

    {{path.0.my-object}}


#### [data-fn]

The <code>data-fn</code> attribute tells Sparky to run one or more functions
when it wires up this element.

    <form data-fn="submit-validate">...</form>

Sparky looks for functions in the current sparky's <code>sparky.fn</code> store,
or in the global function store <code>Sparky.fn</code>. Functions are powerful.
They can modify or replace the scope, change and listen to the DOM, define new
<code>data</code> and <code>fn</code> stores and so on. Sparky deliberately
permits anything in a function so that you may organise your app as you please.

More than one <code>fn</code> can be defined. They are run in order.

    <form data-fn="my-app-scope validate-on-submit">...</form>

The return value of each function is passed along the chain as the
<code>scope</code> argument of the next.

<a href="#define-a-controller-function">Define a ctrl function</a>.


#### {{tag}}

Sparky replaces template tags with data, and updates them when the data changes.

    <h1 data-scope="object">{{ first-page.title }}</h1>

The text in the <code>&lt;h1&gt;</code> is now updated whenever
<code>object.first-page.title</code> changes.

Sparky will find tags in text nodes, <code>class</code>, <code>href</code>, <code>title</code>, <code>id</code>, <code>style</code>, <code>src</code>,
<code>alt</code>, <code>for</code>, <code>value</code>, <code>min</code>, <code>max</code> and <code>name</code> attributes. This list can be modified
by pushing to <code>Sparky.attributes</code>.

Sparky treats tags in the <code>class</code> attribute as individual tokens, so
it is safe to modify the <code>class</code> attribute outside of Sparky. Sparky
avoids overwriting any new classes that are added.


#### {{tag|filter}}

Modify scope values with filters:

    <h1 data-scope="my-model" class="{{selected|yesno:'active','inactive'}}">
        {{title|uppercase}}
    </h1>

More about <a href="#sparky-template-filters">filters</a>.


#### {{{tag}}}

A triple bracket tag updates from the scope once only.

    <h1 data-scope="my-model">{{{ title }}}</h1>

These tags are updated once from the scope (in this case my-model), but they
don't live bind to changes. If you know where you can do it, this can be good
for performance.


#### Input, select and textarea elements

By putting a Sparky tag in the <code>name</code> attribute, inputs, selects and
textareas are 2-way bound to a scope property. When the scope changes, the
input's values is updated, and when the input is changed the scope property is
updated.

    <form class="user-form" data-scope="{{user}}">
        <input type="text" name="{{username}}" placeholder="Sparky" />
        <input type="number" name="{{age}}" />
    </form>

By default Sparky is strict about type in form elements. The first input above
is <code>type="text"</code> and it will only display the <code>username</code>
property if that property is a string. Other types will display as an empty value.

    scope.username = 'Sparky';    // input.value === 'Sparky'
    scope.username = 3;           // input.value === ''

The second input is <code>type="number"</code>. It will only display the
<code>age</code> property if that property is a number.

    scope.age = 'Fourteen';       // input.value === ''
    scope.age = 32;               // input.value === '32'

Similarly, <code>type="range"</code> only gets and sets numbers, and
<code>type="checkbox"</code> only gets and sets booleans unless the value
attribute contains a string (in which case the property must be a string
matching the value for the input to be checked). Other types get and set strings
by default. To force the input to get and set a different type use one of
Sparky's <code>value-<i>xxx</i></code> functions&hellips;

#### data-fn="value-<i>xxx</i>"

To data-bind a specific type, give the element one of Sparky's value functions:

- <code>value-string</code> sets a string
- <code>value-float</code> sets a float
- <code>value-float-log</code> sets a float with a <code>log x</code> transform
- <code>value-float-pow-2</code> sets a float with a <code>x<sup>2</sup></code> transform
- <code>value-float-pow-3</code> sets a float with a <code>x<sup>3</sup></code> transform
- <code>value-int</code> sets an integer, rounding where necessary
- <code>value-int-log</code> sets an integer with a log transform
- <code>value-bool</code> sets <code>true</code> or <code>false</code>
- <code>value-any</code> gets any type, sets strings

Here are some examples. Radio inputs that sets scope.property to integers
<code>1</code> or <code>2</code>:

    <input type="radio" data-fn="value-int" name="{{property}}" value="1" />
    <input type="radio" data-fn="value-int" name="{{property}}" value="2" />

A select that sets scope.property to <code>true</code> or <code>false</code>:

    <select data-fn="value-bool" name="{{property}}">
        <option value="true">Yes</option>
        <option value="false">No</option>
    </select>

A checkbox that is checked when <code>scope.property === 3</code>:

    <input type="checkbox" data-fn="value-int" name="{{property}}" value="3" />

A range slider that sets scope.property as a string:

    <input type="range" data-fn="value-string" name="{{property}}" min="0" max="1" step="any" />

A range slider that sets scope.property as a float, with a logarithmic transform
across it's range from 1 to 10:

    <input type="range" data-fn="value-string" name="{{property}}" min="1" max="10" step="any" />

#### data-fn="each"

The <code>each</code> function loops over a scope that is a collection or array, cloning a new node for each item in the collection. This...

    <ul id="list">
        <li data-scope="{{contributors}}" data-fn="each">
            <a href="{{url}}">{{name}}</a>
        </li>
    </ul>

    Sparky('list', {
        contributors: Collection([
            { name: "Sparky", url: "http://github.com/cruncher/sparky" },
            { name: "Cruncher", url: "http://cruncher.ch" }
        ])
    });

...results in a DOM that looks like this:

    <ul id="list">
        <li>
            <a href="http://github.com/cruncher/sparky">Sparky</a>
        </li>
        <li>
            <a href="http://cruncher.ch">Cruncher</a>
        </li>
    </ul>



## Sparky says thankwoo

to Mariana Alt (<a href="http://www.alt-design.ch/">www.alt-design.ch</a>) for drawing me for my logo.
