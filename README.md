# Automage

Interact with DOM like a human.

(hard-fork of [automagic-ui](https://github.com/MatthewLarner/automagic-ui) with the intent to become it's core)

## Usage

```javascript
var automage = require('automage');
```

## select a heading

```javascript
var pageHeading = await automage.get(document.body, 'My test page', 'heading');
```
## click a button

```javascript
await automage.click(document.body, 'I make UI', 'button');
```
## enter text

```javascript
var input = await automage.typeInto(document.body, 'Input with placeholder', 'field', 'some text');

input.value === 'some text'
```
## wait for element

```javascript
await automage.click(document.body, 'I make UI eventually', 'button');
var newHeading = await automage.waitFor(document.body, 'New Async UI', 'heading', 1000);
```

## Philosophy

automage acts like a human tester, you described things like you would describe them to a human.
If automage can't test your UI, your UI might have some usability issues, especially for users that
are sight-limited.

### Why can't I use class/id/attribute selectors?

Muliple reasons:

 - Users can't see DOM attributes, you woudln't say "Click .foo[bar=3] > *:first-child" to a person.
 - The DOM structure of your application is not coupled to it's usability. When tests use dom-selectors to assert things, they break when the implementation changes, and they often continue to pass even when the UI is broken. If you set a button to `display: none`, a person cannot click it, but your tests will still pass.
 - If you can't target an element by semantic labels, you need to improve your application.
