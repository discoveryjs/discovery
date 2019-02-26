# Views

All view's containers get css class `view-<viewId>` and that in `config.className`

## Blocks

* `block`

| Config parameter | Default | Purpose |
| ---------------- | ------- | ------- |
| content          |         | Views to render inside |



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

## Alerts

* `alert`
* `alert-success`
* `alert-danger`
* `alert-warning`

Tag: `div`

| Config parameter | Default | Purpose |
| ---------------- | ------- | ------- |
| content          | text    | Views to render inside |


## Lists

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

## Complex

### Chart

### Sourcecode

### Code editor

### Tree