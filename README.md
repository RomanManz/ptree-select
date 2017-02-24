# Project Name
ptree-select  
An experimental AngularJS directive to display hierarchical and loosely related data in a different way than the usual tree-views.  
The layout was inspired by the user menu of a popular game console (that's what the P-Stands 3, sorry for).

# Usage
- Load the javascript and css files inside /dist (either version) in your index.html along with your own app (Angular comes first). For example:
```
<link rel="stylesheet" href="/ptree-select/dist/ptree-select.css">
...
<script src="/angular/angular.min.js"></script>
<script src="/your-app/app.min.js"></script>
<script src="/ptree-select/ptree-select.min.js"></script>
...
```
- Define a dependency to 'pTreeSelect' in your Angular module. For example:
```
angular.module('yourApp', [ 'pTreeSelect' ]);
```
- Inside your controller define the required variables that are passed into the pTree-select directive (see below).
- Place a p-tree element in your html code.
Three attributes can be passed:
-- p-tree-data
An Array which contains the actual data. There is sample data in /sample/ptree-data.json.
-- p-tree-cfg (optional)
Which contains global configuration options.
-- p-tree-result (optional)
A (potentially empty) Array where the results are stored in 'selection' mode.
```
<p-tree p-tree-data="data" p-tree-cfg="cfg" p-tree-result="result"></p-tree>
```
# Example App
A fully working example is included in the repository, this is how to run it:
- Have NodeJS installed.
- Run `npm install -g gulp-cli`.
- Clone the repository.
- Run `npm install` inside your clone's project root directory.
- Run `gulp play`.
- Connect a browser (tested with Chrome and Firefox) to port 3000.

# Features overview
(see below for a detailed explanation)
- Displays related data as a list of lists.
- Capable of providing different views of/to the data.
- Identifies gaps in the data and fills it with place holder items with configurable names.
- Filtering on two levels:
-- A list's selection can be used as filter for other lists.
-- There is a simple text based filter on every list to filter its elements.
- Drag and Drop support to change the list ordering on the fly.
- Isolated groups of data can be listed next to each other.
- Selection support to let users select items that can then be submitted for further processing.
- Auto-grouping of items sharing the same 'name' value (see displayField option below).
- Promise support for the input data.
If a Promise object is passed the directive waits until the Promise is resolved before displaying the elements.  
However altering the data by the client after bootstrapping the directive is not supported because of the way the data is used inside.
- Mouse and Keyboard navigation.
Key bindings
-- arrow keys for scrolling
-- ctrl+arrow left/ctrl+arrow right to move the focused line left or right (where enabled)
-- space to select/unselect items
-- slash to enter the text filter
-- escape to clear the filter

# Understanding the display
As said above this is an experimental directive, so there is a word needed to help the intuitivity.
- The focus of the lists remains in the same column.
- Scrolling left and right scrolls the lists but keeps the focus.
- The item below the list's headline/name is the 'focused item' of that list.
- Every list left of the focus shows in bold above the list's headline/name the currently focused value.
- Every list right of the focus shows in selection mode a preview of the currently selected items (with a button to remove the selection).
- Upon scrolling the list that gets the focus is filtered based on the focused items left of it, if there is a relationship defined in the data.

# Options
The following options can be passed both inside the p-tree-cfg object (to apply them globally) or as part of the p-tree-data object. 
Options in the p-tree-data object override the global options.
## Global options
- debug (true|__false__)  
For development purposes, currently used to disable caching (if set to true).
- offsetX (Number, __2__)  
To influence the x-axis' offset (incomplete)
- offsetY (Number, __2__)  
To influence  the y-axis' offset (incomplete)

## List specific options
(can globally passed in the cfg object as well)
- displayField: string  
The name of the attribute that is used to:
-- display the item
-- sort the item
-- unique the item
-- select similar items in cross-product selection mode
- group (string)  
To group lists which will be used in drag and drop mode (movable).
- movable (true/__false__)  
Used to enable drag and drop mode inside named groups.
- isolated (true/__false__)  
Marks the boundary for inheritance selection mode if two unrelated lists are shown next to each other.
- selectMode: {__inherit__|cross-product}  
Sets the selection mode (see selection modes below).
- pageSize (Number, __8__)  
The number of items shown at once (pagination).
- unfiltered (true, __false__)  
If true inserts an item into the list which, when selectd by the user, denotes that no item was selected and therefore does not apply the foreignKey filters for that list.
-  unfilteredName (String, __\* UNFILTERED \*__)  
The value of the inserted item in unfiltered mode.
- emptyName (String, __\* EMPTY \*__)  
If the list has no items to display, the emptyNode item is displayed. The 'emptyName' attribute's value is displayed in this case.
- gapLookup (true, __false__)  
Can be used to enable gapLookup mode (see below).
- noneName (String, __\* NONE \*__)  
This is the name of the noneItem which gets inserted in gapLookup mode if needed.
- foreignKey (String, __name__)  
The lists key which is used inside the other lists' foreignkeyRelationships.
- keyboardCtrl (__true__, false)  
To disable keyboard control (not implemented yet).
- selectable (true, __false__)  
To enable selection mode (see below).
- itemKey (String, __id__)  
The list's primary key.
- selectKey (String, __\_\_selected__)  
The attribute which is used in select mode to store the selection value (boolean as of now).

# Relationships
The data is parsed left to right. When a user scrolls the new focused list is checked against all other lists left to it. The currently selected items on those lists are used to decide which items are filtered and which ones remain.

## Supported relationships
The directive supports two types of relationships:
- foreignKey
Intended to support 'true' hierarchical data that uses foreign keys.
- sharedKey
Intended to support grouping of data by attribute names rather than relationships.

For example (from the sample data) when you list your pets, you can group them by species, color, name, age and so forth. Each of these are attributes rather than relationships to some super normalized tables. ptree-select lets you use those attributes to structure the data. This is what sharedKey relationships are used for.  
The pets' best friends in the family however would be represented as relationships more likely if the data was stored in a database for example. Therefore ptree-select offers the foreignKey relationships to models these real relationships.

For sharedKey relationships in fact you can just use the same input data (the items array) for every list within the same group. Unused fields are just ignored. Items that are missing the displayField attribute are excluded from that list automatically. Please see how it is done in the sample application (/sample/ptree-data.js). 

## Default behaviour
The foreignKey relationships are automatically checked when the lists are parsed. That means the codes checks if the current list's data contains a field that matches the name of any of the lists on the left. If so it assumes that the contained data (value Array or key -> value objects) is supposed to be used for filtering. If no such attribute exists no filtering is applied unless there is an explicit sharedKey relationship defined in the data which would then be evaluated instead.  
This default behaviour of the foreignKey relationship can be overridden by simply providing a foreignKeyRelationships attribute; either just an empty list to disable foreignKey lookups completely or by explicitly listing the relationships that should be applied.

# list filtering
If you put a 'showIf' object inside your data, the list which contains that showIf object is only displayed if all the showIf fields match.  
In the sample app the showIf filter is applied to the 'Details' list which controls the number of attributes which are exposed to the user.

# gapLookup mode
If this is enabled (via the gapLookup flag), then whenever the user scrolls left or right, the list right of the current list is checked if it contains items that do not match any of the current list's possible selections. If at least one such item is found, a noneName item is inserted.  
If that item is selected by the user when they scroll right, then the items of the now selected list are shown that do not match any of the possible selections of the former list.  
This is useful if you have holes in your data, or if some foreignKey relationships can produce such holes.
If you play with the example app, the 'legs' list is an example where gapLookup is enabled. Just drap and drop that list to the very left and you will see this effect in action.

# Selection
## Selection modes
- inherit
This is the default mode, which is the classical tree mode.  
 A selection of an item selects all righties that match the item's selection.
- cross-product
Selection is done on individual nodes only, not including the righties.  

As the items are grouped by displayField value, keep in mind that a user selecting one item can lead to several list items being selected, the ones that share the same displayField value. This happens in the background, but it is important to understand this when the client code inspects the selection values. 

## Selection and movable groups
- inherit mode
A move leads to the removal of the existing selections from the leftmost changed position.
So on move left from the moved node on down to the right (including the moved node), on a move right from the previous position on down to the right.
- cross-product mode
The selections in cross-product mode are not influenced by moves.

## Selection and noMatch nodes
noMatch nodes themselves cannot be selected but the selection is forwarded to the righties.
This happens in both cases, if the 'click' happens directly on the noMatch node and in case a noMatch node is part of the propagation.  
The same applies to the emptyNodes.

## Result set
If you do not pass a result object, but still enable select mode in at least one of the lists, the selection attributes are merged into the data structure that was provided.  
Doing this is no problem, but keep in mind, that
- by passing a result object you will be able to run a 'diff' later to see what has actually changed and
- if you use sharedKey relationships and if you pass references to the same underlying data in more than one list, will result in unpredictable output if you do not pass a result object.

# Sample data
(The data used inside the example app provides a more complete picture.)
```
[
  {
    name: 'list1',
    items: {
      name: 'all',
      id: 1
     }, {
       name: 'some',
       id: 2
     }
  }, {
    name: 'list2',
    items: {
      name: 'Foo',
      id: 1
    }, {
      name: 'Bar',
      id: 2
    },
    unfiltered: true,
    unfilteredName: 'nothing selected' // insert a 'nothing selected' node, so the selection is optional
  }, {
    name: 'list3',
    showIf: {
      list1: 'all' // this list is only displayed if in list1 'all' is selected
    },
    items: {
      // foreignKeyRelationship automatically applied
      list2: [ 'Foo' ], // filter item by list2 selection, not applied if in list2 nothing is selected
      att1: 'val1',
      att2: 'val2',
      id: 1
    }, {
      list2: [ 'Foo', 'Bar' ],
      att1: 'val3',
      att2: 'val4',
      id: 2
    },
    // movable group with drag and drop support
    group: 'foobar',
    movable: true,
    displayField: 'att1', // what is shown to the user
    // sharedKeyRelationships must be defined explicitly, <listname>: <itemKey>
    sharedKeyRelationships: {
      list4: 'id'
    }
  }, {
    name: 'list4',
    items: {
      att1: 'val1',
      att2: 'val2',
      id: 1
    }, {
      att1: 'val3',
      att2: 'val4',
      id: 2
    },
    // movable group with drag and drop support
    group: 'foobar',
    movable: true,
    displayField: 'att2',
    // sharedKeyRelationships must be defined explicitly, <listname>: <itemKey>
    sharedKeyRelationships: {
      list3: 'id'
    }
  }
}
```

# CSS
This is far from being perfect, help from someone who has better CSS knowledge would be required. The same applies to the UX design and experience in general.

However implementing the icons (for scrolling and selecting) in pure CSS was intended to be like this to not depend on a third party library. The elements are simple enough to change this if wanted.  
In general I would be interested to hear if there is a recommendation about how to 'design' icons inside Angular controls.

# Developing
You can use the example app to work on the code. It sources the individual component files located inside /src.  
Gulp watches refresh the templates if the jade files change and livereload reloads the page automatically if anything changed in the filesystem.  
Having that said, pls. use the jade files instead of changing the html files directly.  
The build step (`gulp build`) inlines the html templates into the concatenated (and minified) js file.

# Testing
Run `gulp test` or `gulp tdd` wil run the tests located in /test, either once or in continuous tdd mode.  
The existing tests cover scrolling and drag and drop. Select mode is not covered yet (see bugs).

# Wish list
- Allow for more than one filter item per list; currently only the item underneath the title is implicitly used as filter.
(This can be achieved by turning the 'focus' field into a list.
- Allow the selected lists (the previews maybe) to consist of more than one field; and then group the selected list by those (configurable) fields.
- Allow for dynamic data load callbacks. This could be split between foreignKey relationships load strategies and sharedKey relationships load strategies.

# Bugs
- In select mode when using ShowIf's the resultItems seem to get confused when switching views.
- The same happens also to the selection previews when switching views.

# License
MIT
