<h1>Sparky</h1>

<strong>Sparky is a live data binding view-controller layer for your html5 app.</strong>

<p>Sparky enhances the existing DOM with declarative data bindings,
passes data properties through Django-style template filters
and renders multiple changes in batches on browser animation frames.</p>

## Quick start

    <div class="{{type}}-block block" data-ctrl="my-ctrl" data-model="my-data">
        <p>{{title}}</p>
    </div>

    Sparky.data['my-data'] = {
        title: 'My data',
        type: 'data'
    };

    Sparky.controllers['my-ctrl'] = function(node, model) {
        // Return a scope object to use that in place of the model
        // for updating the DOM.
        // var scope = {};
        // return scope;
    };

Sparky is now observing changes to <code>Sparky.data['my-data']</code>.
If a change is made, Sparky will update only those elements in the DOM
that need it. Sparky manipulates the DOM on browser animation frames,
so multiple changes to the same data don't cause multiple changes to
the DOM.

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

### Bind a DOM node to the data

Bind the text of a title to Sparky.data.text.title:

    <h1 data-model="text">{{title}}</h1>

Now when Sparky.data.text.title is changed, the text content
of this h1 is updated. Try it in the console:

    Sparky.data.text.title = 'Sparky huggy you';

Bind a class to the lang property:

    <h1 class="language-{{lang}}" data-model="text">{{title}}</h1>

### Template filters

Display the date, formatted:

    <h1 class="language-{{lang}}" data-model="text">
        {{title}}
        <time>{{date|date:'d M Y'}}</time>
    </h1>

Sparky has a number of filters for modifying and formatting data.
You can also create your own.

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

### Absolute paths

The data-model attribute understands absolute paths:

    <p data-model="text.meta">author: {{author}}, words: {{word_count}}</p>
    <h2>First contributor</h2>
    <p data-model="text.meta.contributors[0]">{{name}}</p>

The paths are standard JavaScript path notation.
Use dots <code>.prop</code> for string properties and brackets <code>[0]</code> for numbered keys.

### Relative paths

The data-model attribute also understands relative paths:

    <div class="language-{{lang}}" data-model="text">
        <p data-model=".meta">author: {{author}}, words: {{word_count}}</p>
        <h2>First contributor</h2>
        <p data-model=".meta.contributors[0]">{{name}}</p>
    </div>

The leading <code>.</code> makes Sparky look for the 'meta' object relative to
the parent object, which in this case is Sparky.data.text. A leading opening
bracket <code>[</code> would do the same thing.

### Using JavaScript

#### Sparky(node, model, ctrl)

A node doesn't have to be in the DOM for Sparky to bind to it. You can bind
it using Sparky, then insert it into the DOM:

    var node = document.createElement('p');
    
    node.innerText = 'Sparky loves you, {{username}}';
    
    Sparky(node, Sparky.data.text);
    
    // Now update the model whenever data comes in, and insert the node
    // into the DOM. Job's a good 'un.
    Sparky.data.text.username = "Marco";
    body.appendChild(node);

Sparky can also take a documentFragment as the first argument.

### Looping over a collection

Sparky has no syntax for looping over a collection.
Instead, if data-model is an array or array-like collection object, Sparky
automatically loops over it, cloning the corresponding DOM node for all the
items in the collection.
So the HTML:

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

The comment nodes are added automatically and are required by Sparky to maintain the collection.


## data-ctrl

All the above examples use the model directly as the context for rendering the DOM.
Sparky uses the model by default, but you can create a scope object to use instead.

    Sparky.controllers['my-controller'] = function(node, model) {
        var scope = {
            problem: 'I seem to be having enormous difficulty with my lifestyle'
        };
        
        // Return the scope object to use it for DOM rendering
        return scope;
    };

Where a controller returns undefined, the model is used as scope.
But where a controller returns an object, that object is used as scope for rendering the DOM.

Tell Sparky to use the controller:

    <p data-ctrl="my-controller" data-model="text">{{ problem }}</p>

The controller is passed the DOM node, and the model where a data-model is defined.
Listen to changes on the model to update the scope:

    Sparky.controllers['my-controller'] = function(node, model) {
        var scope = {};
        
        function updateLang(model) {
            scope.lang = model.lang === 'en' ? 'English' :
                model.lang === 'fr' ? 'French' :
                model.lang === 'dp' ? 'Dolphin' :
                model.lang ;
        }
        
        Sparky.observe(model, 'lang', updateLang);
        
        // Return the scope object to use it for DOM rendering
        return scope;
    };

And take the data-model 'text' and pass it to my-controller:

    <p data-ctrl="my-controller" data-model="text">I speak {{ lang }}</p>

Try updating the model in the console:

    Sparky.data.text.lang = 'dp';

In Sparky scope objects are just objects you create.
You can make them inherit from other scopes and organise them however you like.


### Use a controller to listen to DOM events


### Define a template for a DOM node


### Template filters

###### add
###### capfirst
###### cut
###### date
###### decimals
###### default
###### escape
###### first
###### floatformat
###### join
###### json
###### last
###### length
###### linebreaksbr
###### lower
###### multiply
###### parseint
###### pluralize
###### random	
###### replace
###### safe
###### slice
###### slugify
###### striptags
###### striptagsexcept
###### time
###### truncatechars
###### unordered_list
###### yesno

#### not implemented

###### // dictsort
###### // dictsortreversed
###### // divisibleby
###### // filesizeformat
###### // get_digit
###### // iriencode
###### // length_is
###### // linebreaks
###### // linenumbers
###### // make_list 
###### // phone2numeric
###### // pprint
###### // raw
###### // removetags
###### // reverse
###### // safeseq
###### // sort
###### // stringformat
###### // timesince
###### // timeuntil
###### // title
###### // truncatewords
###### // truncatewords_html
###### // unique
###### // urlencode
###### // urlize
###### // urlizetrunc
###### // wordcount
###### // wordwrap