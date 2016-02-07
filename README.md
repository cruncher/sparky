<h1>Sparky</h1>

![alt tag](https://raw.githubusercontent.com/cruncher/sparky/master/images/sparky-logo.png)

<strong>Sparky is a live data binding templating engine that enhances the DOM with declarative tags and composeable templates, updating tags and rendering changes in batches at the browser frame rate for performance.</strong>

<a href="http://labs.cruncher.ch/sparky/">labs.cruncher.ch/sparky/</a>


## Setup

Sparky has submodules. Clone the repo recursively:

    git clone https://github.com/cruncher/sparky.git --recursive

Install node modules for building and testing:

    npm install


## API

### Sparky(node, scope, fn)

    var sparky = Sparky(node, scope, fn)

To bind a node in JS, call <code>Sparky</code> with a node or id, a scope
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
names of function(s) stored in <code>sparky.fn<code> or in
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
