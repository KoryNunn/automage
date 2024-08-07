# Automage

Interact with DOM like a human.

(hard-fork of [automagic-ui](https://github.com/MatthewLarner/automagic-ui) with the intent to become it's core)

## Usage

Basic example:
```javascript
var automage = require('automage');

var homeLink = await automage.get(document, 'home', 'link');
var enabledSaveButton = await automage.get(document, 'enabled', 'save', 'button');
var thirdRowIsMissing = await automage.isMissing(document, '3rd', 'total', 'row');
var changedUsernameInput = await automage.changeValue(document, 'username', 'input', 'MyUsername');
```

Methods *generally* accept the arguments (target <Dom node>, state? <string [State](./states.js)>, description <string|RegExp>, type <string [ElementType](./elementTypes.js)>, callback?) and resolve an element.

All selection methods accept an optional timeout, eg:

```javascript
automage.get(context, state, description, type, ..., timeout);
```

The default timeout is 100ms (`automage.defaultWaitTimeout`), you can override this globally by setting it to your custom timeout, eg:

```javascript
automage.defaultWaitTimeout = 200;
```

The default retry time is 10ms (`automage.defaultRetryTimeout`), you can override this globally by setting it to your custom timeout, eg:

```javascript
automage.defaultRetryTimeout = 50;
```

All methods either return a promise, or accept an optional callback, eg:

```javascript
await automage.get(context, state, description, type, ...);
// Or
automage.get(context, state, description, type, ..., callback);
```

## select a heading

```javascript
var pageHeading = await automage.get(document.body, 'My test page', 'heading');
```

## click a button

```javascript
await automage.click(document.body, 'I make UI', 'button');
```

By default, the 'state' argument for `click` is set to `'enabled'`, and automage will not attempt to click `[disabled]` elements.

By default, automage will wait for effects for 10ms (`automage.defaultClickWaitTimeout`), you can override this globally by setting it to your custom timeout, eg:

```javascript
automage.defaultClickWaitTimeout = 50;
```

## enter text

```javascript
var input = await automage.typeInto(document.body, 'Input with placeholder', 'field', 'some text');

input.value === 'some text'
```

By default, automage will wait for effects between "keystrokes" for 10ms (`automage.defaultKeyPressWaitTimeout`), you can override this globally by setting it to your custom timeout, eg:

```javascript
automage.defaultKeyPressWaitTimeout = 50;
```

## wait for element

```javascript
await automage.click(document.body, 'I make UI eventually', 'button');
var newHeading = await automage.waitFor(document.body, 'New Async UI', 'heading', 1000);
```

## Check that some UI has been removed

```javascript
await automage.click(document.body, 'I remove UI', 'button');
await automage.isMissing(document.body, 'New UI', 'heading');
```


## Full documentation

[./doc.md](./doc.md)

## Philosophy

automage acts like a human tester, you described things like you would describe them to a human.
If automage can't test your UI, your UI might have some usability issues, especially for users that
are sight-limited.

### Why can't I use class/id/attribute selectors?

Muliple reasons:

 - Users can't see DOM attributes, you woudln't say "Click .foo[bar=3] > *:first-child" to a person.
 - The DOM structure of your application is not coupled to it's usability. When tests use dom-selectors to assert things, they break when the implementation changes, and they often continue to pass even when the UI is broken. If you set a button to `display: none`, a person cannot click it, but your tests will still pass.
 - If you can't target an element by semantic labels, you need to improve your application.

## Debug output

Debug output can be turned on by setting `automage.debug = true`