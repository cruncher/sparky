<img src="images/logo.png?raw=true" width="346" height="auto" align="center" />

<strong>Sparky is a live data binding template-view-controller layer for HTML5
projects.</strong>

<p>Sparky enhances the existing DOM with declarative data bindings,
passes data properties through Django-style template filters
and renders multiple changes in batches on browser animation frames.</p>

## Quick start

JS:

    Sparky.data['my-data'] = {
        title: 'My data',
        type: 'data'
    };

    Sparky.controllers['my-ctrl'] = function(node, model) {
        
    };

HTML:

    <div class="{{type}}-block block" data-ctrl="my-ctrl" data-model="my-data">
        <p>{{title}}</p>
    </div>

Sparky is now observing changes to <code>Sparky.data['my-data']</code>.
When a change is made, Sparky re-renders only those text nodes and attributes
that depend on the data being changed. Sparky manipulates the DOM on browser
animation frames, so multiple changes to the same data cause just a single
re-rendering of the DOM.

Sparky also understands how to bind to SVG placed inside HTML.

## data-model

First let's give Sparky some data:

    Sparky.data.text = {
        title: "Sparky loves you",
        lang: "en",
        date: "2014-04-15",
        meta: {
            author: "stephband",
            word_count: 140,
            contributors: [{
                name: "Sparky",
                username: "sparky",
                url: "http://github.com/cruncher/sparky"
            }, {
                name: "Marco",
                username: "mbi",
                url: "http://cruncher.ch"
            }]
        }
    };

### Bind a DOM node to some data

Bind some text to the <code>title</code> property:

    <h1 data-model="text">{{ title }}</h1>

Sparky looks for the model <code>text</code> inside <code>Sparky.data</code> and
renders the sparky tag <code>{{ title }}</code> from <code>text.title</code>.
Whenever <code>text.title</code> is changed, the <code>{{ title }}</code> tag is
re-rendered.

Bind a class to the <code>lang</code> property:

    <h1 class="language-{{lang}}" data-model="text">{{title}}</h1>

Sparky renders template tags found in text nodes or in DOM element attributes.
Normally, Sparky looks in the attributes <code>href</code>, <code>title</code>,
<code>id</code>, <code>style</code>, <code>value</code>, <code>src</code> and
<code>alt</code>. You can change the list of attributes by modifying to the
array <code>Sparky.attributes</code>.

### Absolute paths

The data-model attribute understands absolute paths to models inside
<code>Sparky.data</code>:

    <p data-model="text.meta">author: {{author}}, words: {{word_count}}</p>
    <h2>First contributor</h2>
    <p data-model="text.meta.contributors[0]">{{name}}</p>

The paths are standard JavaScript object notation. Use dots <code>.prop</code>
for string properties and brackets <code>[0]</code> for numbered keys.

### Relative paths

The data-model attribute also understands relative paths to models inside
parent models:

    <div class="language-{{lang}}" data-model="text">
        <p data-model=".meta">author: {{author}}, words: {{word_count}}</p>
    </div>

The leading <code>.</code> makes Sparky look for the <code>meta</code> object
relative to the parent object <code>text</code>. A leading opening bracket
<code>[</code> has the same effect.

### Sparky(node, model, ctrl)

A node doesn't have to be in the DOM for Sparky to bind to it:

    var node = document.createElement('p');
    var data = {
            username: 'Arthur'
        };
    
    node.innerText = 'Sparky loves you, {{username}}';
    
    // Bind the node to data and insert into the DOM
    Sparky(node, data);
    body.appendChild(node);
    
    // The node is updated whenever data is changed
    data.username = "Marco";

Here we use the <code>Sparky()</code> function to bind the node to the data, and
then insert the node into the DOM. Sparky also accepts a documentFragment as a
first argument.

### Form fields

Inputs, selects and textareas get 2-way data binding.
When the model changes, their values are updated.
When their values are changed, the model is updated.

Bind an <code>input[type="text"]</code> to
<code>Sparky.data.text.username</code>:

    <form class="user-form" data-model="text">
        <input type="text" name="username" value="" />
    </form>

The <code>name</code> attribute is used to tell Sparky which
property of the model to update. Text written into the input
is stored at <code>Sparky.data.text.username</code>, and changes to
Sparky.data.text.username update the input's value.

### Looping over a collection

Sparky has no special syntax for looping over a collection, but where
<code>data-model</code> resolves to an array or array-like collection object,
Sparky automatically loops over it, cloning the corresponding DOM node for all
the items in the collection. So the HTML:

    <ul>
        <li data-model="text.meta.contributors">
            <a href="{{url}}">{{name}}</a>
        </li>
    </ul>

Results in a DOM that looks like this:

    <ul>
        <!-- [Sparky] collection start -->
        <li data-model="text.meta.contributors[0]">
            <a href="http://github.com/cruncher/sparky">Sparky</a>
        </li>
        <li data-model="text.meta.contributors[1]">
            <a href="http://cruncher.ch">Marco</a>
        </li>
        <!-- [Sparky] collection end -->
    </ul>

The comment nodes are added automatically and are required by Sparky to maintain
the collection.

## data-ctrl

All the above examples use the model directly as the context for rendering the
DOM. Sparky uses the model by default, but you can create a scope object to use
instead.

    Sparky.controllers['my-controller'] = function(node, model) {
        var scope = {
            lang: 'No language set'
        };
        
        // Return the scope object to use it for DOM rendering
        return scope;
    };

Where a controller returns undefined, the model is used as scope. But where a
controller returns an object, that object is used as scope for rendering the
DOM.

Tell Sparky to use the controller:

    <p data-ctrl="my-controller" data-model="text">I speak {{ lang }}</p>

The controller is passed the DOM node, and the model (where a
<code>data-model</code> is defined, otherwise model is undefined). Listen to
changes on the model to update the scope:

    Sparky.controllers['my-controller'] = function(node, model) {
        var scope = {
            lang: 'No language set'
        };
        
        function updateLang(model) {
            scope.lang = model.lang === 'en' ? 'English' :
                model.lang === 'fr' ? 'French' :
                model.lang === 'dp' ? 'Dolphin' :
                model.lang ;
        }
        
        // Observe changes to the model
        Sparky.observe(model, 'lang', updateLang);
        
        // Initialise the scope
        updateLang(model);
        
        // Return the scope object to use it for DOM rendering
        return scope;
    };

Try updating the model:

    Sparky.data.text.lang = 'dp';

In Sparky scope objects are just objects you create. You can make them inherit
from other scopes and organise them however you like.

## Template filters

Display the date, formatted:

    <h1 class="language-{{lang}}" data-model="text">
        {{title}}
        <time>{{date|date:'d M Y'}}</time>
    </h1>

Sparky has a number of template filters for modifying and formatting data. You
can also create your own. Sparky template filter syntax is the same as
<a href="http://docs.django.com/templates">Django template</a> filter syntax:

    <p>{{ date|date:'d M Y' }}</p>

Sparky has a subset of the Django filters:

- add
- capfirst
- cut
- date
- decimals
- default
- escape
- first
- floatformat
- join
- json
- last
- length
- linebreaksbr
- lower
- multiply
- parseint
- pluralize
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

### Using Sparky with Django

If you do happen to be using Django, Sparky's template tags will clash with
Django's. To avoid Sparky templates being read by Django, wrap them in Django's
<code>{% verbatim %}</code> tag:

    {% verbatim %}
    <h1 class="language-{{lang}}" data-model="text">
        {{title}}
        <time>{{date|date:'d M Y'}}</time>
    </h1>
    {% endverbatim %}

## Techniques

### Observing

#### Sparky.observe(object, property, fn);

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



