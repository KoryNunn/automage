
## automage - available methods

```
automage.pressKey // press a key
automage.pressKeys // press many keys
automage.findAll // find all matching elements with a semantic selector
automage.find // find the first matching element with a semantic selector
automage.get // find exactly one matching element with a semantic selector
automage.click // click exactly one matching element with a semantic selector
automage.typeInto // type into exactly one matching element with a semantic selector
automage.getFocusedElement // get the element that currently has focus in the document
automage.focus // focus an element matching a semantic selector
automage.changeValue // change value of exactly one matching element with a semantic selector, then blur the focused element
automage.blur // blur the currently focused element
automage.waitFor // wait for exactly one matching element with a semantic selector, and custom timeout
```


## automage.get - select a heading

```
var window = await loadWindow();

var pageHeading = await automage.get(window.document.body, 'My test page', 'heading');

pageHeading // Page heading was found
```


## automage.get - if a single matching element isn\'t found, an error is thrown

```
var window = await loadWindow();

try {
    await automage.get(window.document.body, 'I don\'t exist', 'heading');
} catch (error) {
    error.message === 'element was not found matching "I don\'t exist"' 
}
```


## automage.click - click a button

```
var window = await loadWindow();

await automage.click(window.document.body, 'I make UI', 'button');

var newHeading = await automage.get(window.document.body, 'New Ui', 'heading');

newHeading // New heading was created upon button click
```


## automage.click - if a single matching element isn\'t found, an error is thrown

```
var window = await loadWindow();

try {
    await automage.click(window.document.body, 'I don\'t exist', 'button');
} catch (error) {
    error.message === 'could not find clickable element matching "I don\'t exist"' 
}
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
    error.message === 'element was not found matching "I don\'t exist"' 
}
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
    error.message === 'Timed out attempting to find element matching "New Async UI"' 
}
```


## automage.pressKey - type into the current element with focus

```
var window = await loadWindow();

var element = window.document.querySelector('[autofocus]');
element.focus();

element.addEventListener('keydown', () => // recieved keydown event);
element.addEventListener('keyup', () => // recieved keyup event);
element.addEventListener('keypress', () => // recieved keypress event);
element.addEventListener('input', () => // recieved input event);

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

element.addEventListener('keydown', () => // recieved keydown event);
element.addEventListener('keyup', () => // recieved keyup event);
element.addEventListener('keypress', () => // recieved keypress event);
element.addEventListener('input', () => // recieved input event);

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

newFocuesedElement !== previouslyFocuesedElement // previously focused element lost focus
```


## automage.changeValue - set the value of an element

```
var window = await loadWindow();

var input = await automage.get(window.document.body, 'Input with placeholder', 'field');

input.addEventListener('keydown', () => // recieved keydown event);
input.addEventListener('keyup', () => // recieved keyup event);
input.addEventListener('keypress', () => // recieved keypress event);
input.addEventListener('input', () => // recieved input event);

var input = await automage.changeValue(window.document.body, 'Input with placeholder', 'field', 'abc');

input.value === 'abc'
```
