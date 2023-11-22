

## automage - available methods

```
automage.pressKey // (context, description, type, key[, callback]) press a key
automage.pressKeys // (context, description, type, keys[, callback]) press many keys
automage.findAll // (context, description, type[, timeout, callback]) find all matching elements with a semantic selector sorted by type
automage.find // (context, description, type[, timeout, callback]) find all matching element with a semantic selector and matching type
automage.get // (context, description, type[, timeout, callback]) find exactly one matching element with a semantic selector and matching type
automage.click // (context, description, type[, timeout, callback]) click exactly one matching element with a semantic selector
automage.typeInto // (context, description, type, keys[, timeout, callback]) type into exactly one matching element with a semantic selector
automage.getFocusedElement // (context[, callback]) get the element that currently has focus in the document
automage.focus // (context, description, type[, timeout, callback]) focus an element matching a semantic selector
automage.changeValue // (context, description, type, value, [, timeout, callback]) change value of exactly one matching element with a semantic selector, then blur the focused element
automage.blur // (context[, callback]) blur the currently focused element
automage.waitFor // (context, description, type[, timeout, callback]) wait for exactly one matching element with a semantic selector, and custom timeout
automage.isMissing // (context, description, type[, timeout, callback]) ensure there are no matching elements with a semantic selector and matching type
```


## automage.get - select a heading

```
var window = await loadWindow();

var pageHeading = await automage.get(window.document.body, 'My test page', 'heading');

pageHeading // Page heading was found
```


## automage.get - use a callback

```
var window = await loadWindow();

await new Promise(resolve => {
    automage.get(window.document.body, 'My test page', 'heading', function(error, pageHeading){
        pageHeading // Page heading was found
```


## automage.get - select some text

```
var window = await loadWindow();

var pageHeading = await automage.get(window.document.body, 'My test page', 'text');

pageHeading // Page heading was found
```


## automage.get - cant select text within a [hidden]

```
var window = await loadWindow();

try {
    await automage.get(window.document.body, 'My hidden text', 'text');
} catch (error) {
    error.message === 'text was not found matching "My hidden text" - Retrying timed out after 100ms'
```


## automage.get - cant select aria label within a [hidden]

```
var window = await loadWindow();

try {
    await automage.get(window.document.body, 'hidden text', 'text');
} catch (error) {
    error.message === 'text was not found matching "hidden text" - Retrying timed out after 100ms'
```


## automage.get - select a heading by regex match

```
var window = await loadWindow();

var pageHeading = await automage.get(window.document.body, /My/, 'heading');

pageHeading // Page heading was found
```


## automage.get - select a section by heading match

```
var window = await loadWindow();

var coolContentSection = await automage.get(window.document.body, 'Cool content', 'section');

coolContentSection // Section was found
```


## automage.get - select a form by heading match

```
var window = await loadWindow();

var coolForm = await automage.get(window.document.body, 'My cool form', 'form');

coolForm // Form was found
```


## automage.get - if a single matching element isn\'t found, an error is thrown

```
var window = await loadWindow();

try {
    await automage.get(window.document.body, 'I don\'t exist', 'heading');
} catch (error) {
    error.message === 'heading was not found matching "I don\'t exist" - Retrying timed out after 100ms'
```


## automage.get - select the semantically correct element where multiple matched elements are part of the same component

```
var window = await loadWindow();

var field = await automage.get(window.document.body, 'Some Field', 'field');

field.tagName === 'INPUT' // input field was returned
```


## automage.get - select the semantically correct field where the input has an associated label

```
var window = await loadWindow();

var field = await automage.get(window.document.body, 'Another Field', 'field');

field.tagName === 'INPUT' // input field was returned
```


## automage.get - select an element by text nodes

```
var window = await loadWindow();

var heading = await automage.get(window.document.body, 'Something', 'heading');

heading // heading was found
```


## automage.get - if more than one element is found, an error is thrown

```
var window = await loadWindow();

try {
    await automage.get(window.document.body, 'Button with state', 'button');
} catch (error) {
    error.message === 'More than one button was found matching "Button with state" - Retrying timed out after 100ms'
```


## automage.get - Invalid type

```
var window = await loadWindow();

process.once('uncaughtException', error => {
    error.message.includes('Invalid type: expected one of' , 'Got expected error');
});

await automage.get(window.document.body, 'Button with state', 'not a type');
```


## automage.find - select all matching headings

```
var window = await loadWindow();

var pageHeadings = await automage.find(window.document.body, 'My test page', 'heading');

pageHeadings.length === 1 // Page heading was found
```


## automage.find - if at least one element isn\'t found, an error is thrown

```
var window = await loadWindow();

try {
    await automage.find(window.document.body, 'I don\'t exist', 'heading');
} catch (error) {
    error.message === 'heading was not found matching "I don\'t exist" - Retrying timed out after 100ms'
```


## automage.findAll - select all matching headings

```
var window = await loadWindow();

var pageHeadings = await automage.findAll(window.document.body, 'My test page', 'heading');

pageHeadings.length === 1 // Page heading was found

var shouldBeEmpty = await automage.findAll(window.document.body, 'I don\'t exist', 'heading');

shouldBeEmpty.length === 0 // Page heading was found
```


## automage.click - click a button

```
var window = await loadWindow();

await automage.click(window.document.body, 'I make UI', 'button');

var newHeading = await automage.get(window.document.body, 'New Ui', 'heading');

newHeading // New heading was created upon button click
```


## automage.click - click a button containing a matched label

```
var window = await loadWindow();

var button = await automage.click(window.document.body, 'Button with a label', 'label');

button // button was found
```


## automage.click - if a single matching element isn\'t found, an error is thrown

```
var window = await loadWindow();

try {
    await automage.click(window.document.body, 'I don\'t exist', 'button');
} catch (error) {
    error.message === 'Could not find clickable button matching "I don\'t exist" - Retrying timed out after 100ms'
```


## automage.typeInto - enter text

```
var window = await loadWindow();

var input = await automage.typeInto(window.document.body, 'Input with placeholder', 'field', 'some text');

input.value === 'some text'
```


## automage.typeInto - if a single matching element isn\'t found, an error is thrown

```
var window = await loadWindow();

try {
    await automage.typeInto(window.document.body, 'I don\'t exist', 'field', 'some text');
} catch (error) {
    error.message === 'field was not found matching "I don\'t exist" - Retrying timed out after 100ms'
```


## automage.waitFor - wait for element

```
var window = await loadWindow();

await automage.click(window.document.body, 'I make UI eventually', 'button');
var newHeading = await automage.waitFor(window.document.body, 'New Async UI', 'heading', 1000);

newHeading // New heading was found some time after button click
```


## automage.waitFor - if a matching element isn\'t found within the timeout, an error is thrown

```
var window = await loadWindow();

try {
    await automage.waitFor(window.document.body, 'New Async UI', 'heading', 100);
} catch (error) {
    error.message === 'heading was not found matching "New Async UI" - Retrying timed out after 100ms'
```


## automage.pressKey - type into the current element with focus

```
var window = await loadWindow();

var element = window.document.querySelector('[autofocus]');
element.focus();

element.addEventListener('keydown', () => t.pass('recieved keydown event'));
element.addEventListener('keyup', () => t.pass('recieved keyup event'));
element.addEventListener('keypress', () => t.pass('recieved keypress event'));
element.addEventListener('input', () => t.pass('recieved input event'));

var focuesedElement = await automage.pressKey(window.document.body, 'a');

focuesedElement.value === 'a'
```


## automage.pressKey - if a non-input is focused, it does not set value

```
var window = await loadWindow();

window.document.querySelector('body').focus();

var focuesedElement = await automage.pressKey(window.document.body, 'a');

focuesedElement.value === undefined
```


## automage.pressKeys - type into the current element with focus

```
var window = await loadWindow();

var element = window.document.querySelector('[autofocus]');
element.focus();

element.addEventListener('keydown', () => t.pass('recieved keydown event'));
element.addEventListener('keyup', () => t.pass('recieved keyup event'));
element.addEventListener('keypress', () => t.pass('recieved keypress event'));
element.addEventListener('input', () => t.pass('recieved input event'));

var focuesedElement = await automage.pressKeys(window.document.body, 'abc');

focuesedElement.value === 'abc'
```


## automage.pressKeys - if a non-input is focused, it does not set value

```
var window = await loadWindow();

window.document.querySelector('body').focus();

var focuesedElement = await automage.pressKeys(window.document.body, 'abc');

focuesedElement.value === undefined
```


## automage.getFocusedElement - find the element with focus

```
var window = await loadWindow();

var element = window.document.querySelector('[autofocus]');
element.focus();

var newFocuesedElement = await automage.getFocusedElement(window.document.body);

newFocuesedElement === element // previously focused element lost focus
```


## automage.blur - clear focus from the element with focus

```
var window = await loadWindow();

var element = window.document.querySelector('[autofocus]');
element.focus();

var previouslyFocuesedElement = await automage.blur(window.document.body);
var newFocuesedElement = await automage.getFocusedElement(window.document.body);

newFocuesedElement === previouslyFocuesedElement // Not previously focused element lost focus
```


## automage.changeValue - set the value of an element

```
var window = await loadWindow();

var input = await automage.get(window.document.body, 'Input with placeholder', 'field');

input.addEventListener('keydown', () => t.pass('recieved keydown event'));
input.addEventListener('keyup', () => t.pass('recieved keyup event'));
input.addEventListener('keypress', () => t.pass('recieved keypress event'));
input.addEventListener('input', () => t.pass('recieved input event'));

var input = await automage.changeValue(window.document.body, 'Input with placeholder', 'field', 'abc');

input.value === 'abc'
```


## automage.changeValue - state

```
var window = await loadWindow();

var input = await automage.get(window.document.body, 'Input with placeholder', 'field');

input.addEventListener('keydown', () => t.pass('recieved keydown event'));
input.addEventListener('keyup', () => t.pass('recieved keyup event'));
input.addEventListener('keypress', () => t.pass('recieved keypress event'));
input.addEventListener('input', () => t.pass('recieved input event'));

var input = await automage.changeValue(window.document.body, 'enabled', 'Input with placeholder', 'field', 'abc');

input.value === 'abc'
```


## automage.changeValue - callback

```
var window = await loadWindow();

var input = await automage.get(window.document.body, 'Input with placeholder', 'field');

input.addEventListener('keydown', () => t.pass('recieved keydown event'));
input.addEventListener('keyup', () => t.pass('recieved keyup event'));
input.addEventListener('keypress', () => t.pass('recieved keypress event'));
input.addEventListener('input', () => t.pass('recieved input event'));

await new Promise(resolve => {
    automage.changeValue(window.document.body, 'Input with placeholder', 'field', 'abc', function(error, input) {
        input.value === 'abc'
```


## automage.changeValue - clear the value of an element

```
var window = await loadWindow();

var input = await automage.changeValue(window.document.body, 'Input with placeholder', 'field', 'abc');
input.value === 'abc' 

input.addEventListener('keydown', () => t.pass('recieved keydown event'));
input.addEventListener('keyup', () => t.pass('recieved keyup event'));
input.addEventListener('keypress', () => t.pass('recieved keypress event'));
input.addEventListener('input', () => t.pass('recieved input event'));

await automage.changeValue(window.document.body, 'Input with placeholder', 'field', '');
input.value === ''
```


## automage.changeValue - set the value of a date field

```
var window = await loadWindow();

var date = new Date();
var select = await automage.changeValue(window.document.body, 'date field', 'field', date);

new Date(select.value).toLocaleDateString() === date.toLocaleDateString( );
```


## automage.changeValue - set the value of a select

```
var window = await loadWindow();

var select = await automage.changeValue(window.document.body, 'select field', 'field', 'Bar');

select.value === 'bar'
```


## automage.changeValue - set the value of a contenteditable

```
var window = await loadWindow();

var editableElement = await automage.changeValue(window.document.body, 'Rich text editor', 'field', 'edited');

editableElement.textContent === 'edited'
```


## automage.focus - Focus an element

```
var window = await loadWindow();

var input = await automage.focus(window.document.body, 'Input with placeholder', 'field');

input === window.document.activeElement
```


## automage.isMissing - ensure something isnt found by the end of the wait time

```
var window = await loadWindow();

await automage.click(window.document.body, 'I make UI', 'button');

var newHeading = await automage.get(window.document.body, 'New Ui', 'heading');

newHeading // New heading was created upon button click

await automage.click(window.document.body, 'I remove UI', 'button');

var headingIsMissing = await automage.isMissing(window.document.body, 'New Ui', 'heading');

headingIsMissing // Heading was removed
```


## automage.get - adjacent cells don\'t label each-other

```
var window = await loadWindow();

var foundElement = await automage.get(window.document.body, 'foo 1 bar 1', 'cell');
foundElement // Element was found
```


## state filtering - enabled

```
var window = await loadWindow();

var foundElement = await automage.get(window.document.body, 'enabled', 'Button with state', 'button');
foundElement // Element was found
```


## state filtering - disabled

```
var window = await loadWindow();

var foundElement = await automage.get(window.document.body, 'disabled', 'Button with state', 'button');
foundElement // Element was found
```


## state filtering - labeledBy

```
var window = await loadWindow();

var foundElement = await automage.get(window.document.body, 'labeledBy', 'Button with state', 'button');
foundElement // Element was found
```


## state filtering - first

```
var window = await loadWindow();

var foundElement = await automage.get(window.document.body, 'labeledBy', 'I label', 'label');
foundElement.textContent === 'this label' // Correct element was found
```


## state filtering - last

```
var window = await loadWindow();

var foundElement = await automage.get(window.document.body, 'last', 'Button with state', 'button');
foundElement // Element was found
```


## state filtering - 2nd

```
var window = await loadWindow();

var foundElement = await automage.get(window.document.body, '2nd', 'Button with state', 'button');
foundElement // Element was found
```


## state filtering - 2nd last

```
var window = await loadWindow();

var foundElement = await automage.get(window.document.body, '2nd last', 'Button with state', 'button');
foundElement // Element was found
```


## state filtering - Invalid state

```
var window = await loadWindow();

process.once('uncaughtException', error => {
    error.message.includes('Invalid state: expected an optional state of' , 'Got expected error');
});

await automage.get(window.document.body, 'not a state', 'Button with state', 'button');
```

