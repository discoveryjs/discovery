# Views

All view's container get css class `view-<viewId>` and also that in `config.className`

## Blocks

* `block`

Tag: `div`

| Config parameter | Default | Purpose |
| ---------------- | ------- | ------- |
| content          |         | Views to render inside |

--------------------------------------------------

* `section`

Tag: `div`

Renders section with header

| Config parameter | Default | Purpose |
| ---------------- | ------- | ------- |
| header           |         | Views to render inside `header`'s `content` |
| content          |         | Views to render inside |


### Alerts

* `alert`
* `alert-success`
* `alert-danger`
* `alert-warning`

Tag: `div`

| Config parameter | Default | Purpose |
| ---------------- | ------- | ------- |
| content          | text    | Views to render inside |



## Text

* `text` — renders text node

Tag: text node

### Headers
* `header` (rendered as h2)
* `h1`
* `h2`
* `h3`
* `h4`

Tag: corresponding header tag

| Config parameter | Default | Purpose |
| ---------------- | ------- | ------- |
| content          | text    | Views to render inside |

## Lists

* `list` — tag: `div`
* `inline-list` — tag: `div`
* `comma-list` — tag: `div`
* `ol` — tag: `ol`
* `ul` — tag: `ul`


| Config parameter | Default | Purpose |
| ---------------- | ------- | ------- |
| item             | text    | Views to render inside child `list-item`'s |
| limit            | 25      | Views to render inside |
| emptyText        | 'Empty list' | Views to render inside |

`data` Array — data to render list. If not Array will be wrapped to array as element 0

--------------------------------------------------

* `list-item`

Tag: `li`

| Config parameter | Default | Purpose |
| ---------------- | ------- | ------- |
| content          | text    | Views to render inside |


--------------------------------------------------

* `menu`

| Config parameter | Default | Purpose |
| ---------------- | ------- | ------- |
| item             | text    | Views to render inside child `menu-item`'s |
| limit            | 25      | Views to render inside |
| emptyText        | 'No items' | Views to render inside |
| onClick          |         | Function to handle click on `menu-item` |

`data` Array — data to render

--------------------------------------------------

* `menu-item`

Tag: `li`

| Config parameter | Default | Purpose |
| ---------------- | ------- | ------- |
| content          | text    | Views to render inside |
| onClick          |         | Function(data) to handle click |

| Data parameter   | Default | Purpose |
| ---------------- | ------- | ------- |
| text             | 'Untitled item' | Text inside if no `config.content` |
| selected         |                 | Is item selected? Adds `selected` css class |

## Badges

* `badge`
* `pill-badge`

Tag: `a`

| Config parameter | Default | Purpose |
| ---------------- | ------- | ------- |
| content          |         | Views to render inside |

| Data parameter   | Default | Purpose |
| ---------------- | ------- | ------- |
| color            |         | Background color |
| text             |         | Text inside if no `config.content` |
| href             |         | URL to link |
| prefix           |         | Prefix `<span class="prefix">` text |
| postfix          |         | Postfix `<span class="postfix">` text |

If `data` is String `text = data`

## Tabs

* `tabs`

Renders tab buttons and tab content block switching by click on tab button. 

| Config parameter | Default  | Purpose |
| ---------------- | -------  | ------- |
| content          | text     | Views to render inside tab content |
| tabs             |          | Array. Tab buttons to render. Consists of data objects for `tab` views. Can be String, Number or Boolean for simple tabs. |
| value            |          | Initial tab ID |
| name             | 'filter' | Name of context property that gets tab ID for filter data |
| onInit           |          | Function(currentValue, name) to handle tab show initially |
| onChange         |          | Function(currentValue, name) to handle change current tab |

| Context parameter | Default  | Purpose |
| ----------------- | -------  | ------- |
| <name>            |          | Current selected tab ID. You may filter your data by it. Also initial tab ID if no `config.value`. |

--------------------------------------------------

* `tab`

Renders tab button.

Tag: `div`

| Config parameter | Default | Purpose |
| ---------------- | ------- | ------- |
| content          | text    | Views to render inside |
| active           |         | Is tab active? Adds `active` css class |
| onClick          |         | Function(value) to handle click |

| Data parameter   | Default | Purpose |
| ---------------- | ------- | ------- |
| text             |         | Text inside if no `config.content` |
| value            |         | Tab ID. Text inside if no `text`. |


## Table



## Forms

### Button

* `button`
* `button-primary`
* `button-danger`
* `button-warning`

Tag: `button`
Class: `view-button`

| Config parameter | Default | Purpose |
| ---------------- | ------- | ------- |
| content          |         | Views to render inside |
| disabled         | false   | Is button disabled? (Query) |
| onClick          |         | Function to handle click |

| Data parameter   | Default | Purpose |
| ---------------- | ------- | ------- |
| text             |         | Text inside if no `config.content` |

### Select

### Input

## Misc.

* `struct`

Prints JSON formatted

* `signature`

Prints field types of JSON

## Complex

### Chart

### Sourcecode

### Code editor

### Tree

