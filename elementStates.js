module.exports = {
    enabled: element => !element.closest('[disabled]'),
    disabled: element => element.closest('[disabled]'),
    labeledBy: (element, otherMatchedElements) => otherMatchedElements.length === 2 && element.previousElementSibling === otherMatchedElements[0],
    first: (element, otherMatchedElements) => otherMatchedElements[0] === element,
    last: (element, otherMatchedElements) => otherMatchedElements[otherMatchedElements.length - 1] === element,
    '(\\d+)(?:st|nd|rd)': (element, otherMatchedElements, parameters) => otherMatchedElements[parseInt(parameters[0]) - 1] === element,
    '(\\d+)(?:st|nd|rd) last': (element, otherMatchedElements, parameters) => otherMatchedElements[otherMatchedElements.length - parseInt(parameters[0])] === element
};