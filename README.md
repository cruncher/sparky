<h1>Sparky</h1>

![alt tag](https://raw.githubusercontent.com/cruncher/sparky/master/images/sparky-logo.png)

<strong>Sparky is a live data binding template and view layer for HTML/JS.
Sparky enhances the DOM with declarative data bindings, passes data through
Django-style template filters and renders DOM changes in batches at the browser
frame rate for performance.</strong>

## Quick Start

Sparky wires up the DOM automatically on <code>DOMContentLoad</code>. It binds
nodes with a <code>data-scope</code> attribute to data objects stored in
<code>Sparky.data</code>, and passes nodes with a <code>data-fn</code>
attribute to controller functions stored in <code>Sparky.fn</code>.

    <div data-scope="my-data" data-fn="my-fn">
        <input type="text" name="{{title}}" />
        <p>{{title|uppercase}} loves you!</p>
    </div>

    Sparky.data['my-data'] = {
        title: 'Sparky'
    };

    Sparky.fn['my-fn'] = function(node, scope) {
        // Do something with the node and/or scope
    };

When the data changes, the DOM is kept up-to-date. Typing text into the input
updates <code>title</code>, and thus also the text in the paragraph.

Sparky does not make scope objects for you, you create them where you need them.
A <code>fn</code> can return an object to have Sparky use that object as scope.
Sparky can also be instantiated via JS:

    <template id="">
        <p>{{time|date:'m s'}}</p>
    </template>

    var sparky = Sparky('clock', { time: new Date() });

## Sparky templates

#### data-scope

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


#### data-fn

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
textareas are 2-way wired up to the corresponding data. When the scope changes,
their values are updated, and when their values are changed, the scope is
updated.

    <form class="user-form {{valid|yesno:'bg-green'}}" data-scope="{{user}}">
        <input type="text" name="{{name}}" placeholder="Sparky" />
        <input type="number" name="{{age}}" />
    </form>

By default Sparky is strict about type in form elements. The first input above
is <code>type="text"</code> and it will only get the <code>title</code>
property if that property is a string. Other types will display as an empty.

    model.title = 'Sparky loves you'; // input.value is 'Sparky loves you'
    model.title = 3;                  // input.value is ''

Similarly, <code>type="number"</code> and <code>type="range"</code> will only
get and set numbers, and if the value attribute is not given
<code>type="checkbox"</code> will only get and set <code>true</code> or
<code>false</code>. (If the value attribute is given, the property must be a
string matching the value attribute for the checkbox to be checked).


#### data-fn="value-int"

To get and set other types, give the element one of Sparky's value functions:

- <code>value-string</code> gets and sets strings
- <code>value-float</code> gets and sets numbers
- <code>value-int</code> gets and sets integer numbers, rounding if necessary
- <code>value-bool</code> gets and sets <code>true</code> or <code>false</code>
- <code>value-any</code> gets any type, sets strings

Here are some examples. Radio inputs that sets scope.property to number
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


#### data-fn="each"

Sparky has no special syntax for looping over a collection, but where
<code>data-scope</code> resolves to an array or array-like object
Sparky automatically loops over it, cloning the corresponding DOM node for all
the items in the collection. So this...

    <ul>
        <li data-scope="contributors">
            <a href="{{url}}">{{name}}</a>
        </li>
    </ul>

    Sparky.data.contributors = Sparky.Collection([
        { name: "Sparky",   url: "http://github.com/cruncher/sparky" },
        { name: "Cruncher", url: "http://cruncher.ch" }
    ]);

...results in a DOM that looks like this<a href="#-note">*<sup>note</note></a>:

    <ul>
        <li>
            <a href="http://github.com/cruncher/sparky">Sparky</a>
        </li>
        <li>
            <a href="http://cruncher.ch">Marco</a>
        </li>
    </ul>


## Sparky(node, scope, fn)

    var sparky = Sparky(node, scope, fn)

To bind a node in JS, call <code>Sparky</code> with a node or id, a scope
object and/or a function.

#### parameters

<code>node</code>: DOM node | document fragment | string

A string defines the <code>id</code> of a <code>&lt;template&gt;</code>.
<code>node</code> is a required parameter.

<code>scope</code>: object | string | undefined

A string defines a path to an object in <code>Sparky.data</code> using dot
notation.

<code>fn</code>: function | string | undefined

A string defines a name, or a space-separated list of names of ctrl functions
stored in <code>Sparky.fn</code>.

#### return

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
removes any event handlers. Also destroys any children.

#### .scope(object)

Swap the scope being used by this sparky for a new object. Sparky simply updates
it's DOM with data from the new scope.

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

### Events

- <code>ready</code>: triggered after Sparky first updates the node
- <code>insert</code>: triggered when the node is inserted into the DOM (CURRENTLY UNRELIABLE)
- <code>destroy</code>: triggered when the node has been unbound from the model
and removed from the DOM



## API

#### Define a ctrl function

Functions are stored in <code>Sparky.fn</code>. A controller is a function
that is run just before sparky data-binds the node. The return value of the
controller is used as scope to update the tags in the sparky template. In Sparky
scope objects are just plain objects you create.

    Sparky.fn['my-ctrl-1'] = function(node, model) {
        var scope = { day: 'unknown'; };

        // Listen for changes on a model
        Sparky.observe(model, 'date', function() {
            if (model.date === '2014-12-25') {
                // Update the scope
                scope.day = 'Christmas!';
            }
        });

        return scope;
    };

Where the <code>ctrl</code> function returns <code>undefined</code>, Sparky uses
the model as scope.

Controllers are called with a <code>sparky</code> object as their context
<code>this</code>. It's common to listen to lifecycle events inside a
controller:

    Sparky.fn['my-ctrl-2'] = function myCtrl2(node, model) {
        var scope = { day: 'unknown'; };

        this.on('ready', function() {
            // The node has bound and has been populated with any
            // existing model data.
        });

        this.on('insert', function() {
            // The node has been inserted into the DOM.
        });

        this.on('destroy', function() {
            // The node has been unbound from the model and
            // removed from the DOM
        });

        return scope;
    };

Where multiple controllers are defined in <code>data-fn</code> they are all
called with the same <code>sparky</code> object as context.

#### Define a data object

Data objects are stored in <code>Sparky.data</code>. A model is an object that
Sparky watches for changes.

    Sparky.data['my-model'] = {
        date: new Date()
    };

#### Sparky.Throttle(fn)

Takes one function and returns a function that throttles calls to the browser
frame rate.

    var throttle = Sparky.Throttle(fn);

Calling <code>throttle()</code> causes <code>fn</code> to be called on the next
browser frame. Multiple calls to <code>throttle()</code> result in just one call
to <code>fn</code> on the next frame. <code>fn</code> is called with the
arguments from the latest call to <code>throttle(arg1, arg2, ...)</code>.


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

### Sparky.filters

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

Sparky has a subset of the Django filters:

- add
- capfirst
- cut
- date
- default
- escape
- first
- floatformat: number
- join
- json
- last
- length
- linebreaksbr
- lower
- multiply: number
- parseint
- pluralize:
- random
- replace
- safe
- slice
- slugify
- striptags
- striptagsexcept
- time
- truncatechars
- unordered_list
- yesno

And some of it's own:

- decibels: number – Takes a number as a ratio of powers and performs 20log10(number) to render it on the decibel scale. Useful when working with WebAudio parameters.
- decimals – Alias of floatformat.
- get:'propertyName' – Takes an object and renders the named property.
- lowercase – Alias of lower.
- percent – Takes a number and multiplies by 100 to render it as a percentage.
- prepad: n, 'character' –
- postpad: n, 'character' –
- symbolise – Converts common values to symbolic equivalents: JavaScript's number Infinity becomes '∞'.

## Notes

#### Using Sparky with Django

If you do happen to be using Django, Sparky's template tags will clash with
Django's. To avoid Sparky templates being read by Django, wrap them in Django's
<code>{% verbatim %}</code> tag:

    {% verbatim %}
    <h1 class="language-{{lang}}" data-scope="text">
        {{title}}
        <time>{{date|date:'d M Y'}}</time>
    </h1>
    {% endverbatim %}

## Sparky says thankwoo

to Mariana Alt (<a href="http://www.alt-design.ch/">www.alt-design.ch</a>) for drawing me for my logo.


<!--#### Sparky.observe(object, property, fn);

Sparky.observe observes changes to the property of an object by
reconfiguring it as a getter/setter. This is very fast but has a
limitation or two.

Sparky.observe can't listen for changes to the length of an array,
as arrays don't allow the length property to be configured. But it
can listen for changes to the length of a collection object:

    var collection = Sparky.Collection(array);

(Sparky can handle arrays, but uses dirty checking internally to observe
the length. You get better performance from a collection object.)

#### Sparky.unobserve(object, property, fn);

Unbind an observer fn from the object property.

#### Adapt Sparky to your data models

If you want to use a different means of observing changes to data,
overwrite Sparky.observe and Sparky.unobserve with your own functions.
Say your models emit events, and you bind to them with .on() and .off()
methods:

   Sparky.observe = function(object, property, fn) {
       object.on(property, fn);
   };

Don't forget the unobserver:

   Sparky.unobserve = function(object, property, fn) {
       object.off(property, fn);
   }
-->
