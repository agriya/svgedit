/**
* Clears the selection. The 'selected' handler is then optionally called.
* @name module:svgcanvas.SvgCanvas#clearSelection
* @type {module:draw.DrawCanvasInit#clearSelection|module:path.EditorContext#clearSelection}
* @fires module:svgcanvas.SvgCanvas#event:selected
*/
const clearSelection = this.clearSelection = function (noCall) {
    selectedElements.forEach((elem) => {
      if (isNullish(elem)) {
        return;
      }
      selectorManager.releaseSelector(elem);
    });
    selectedElements = [];
  
    if (!noCall) { call('selected', selectedElements); }
  };
  
  /**
  * Adds a list of elements to the selection. The 'selected' handler is then called.
  * @name module:svgcanvas.SvgCanvas#addToSelection
  * @type {module:path.EditorContext#addToSelection}
  * @fires module:svgcanvas.SvgCanvas#event:selected
  */
  const addToSelection = this.addToSelection = function (elemsToAdd, showGrips) {
    if (!elemsToAdd.length) { return; }
    // find the first null in our selectedElements array
  
    let j = 0;
    while (j < selectedElements.length) {
      if (isNullish(selectedElements[j])) {
        break;
      }
      ++j;
    }
  
    // now add each element consecutively
    let i = elemsToAdd.length;
    while (i--) {
      let elem = elemsToAdd[i];
      if (!elem) { continue; }
      const bbox = utilsGetBBox(elem);
      if (!bbox) { continue; }
  
      if (elem.tagName === 'a' && elem.childNodes.length === 1) {
        // Make "a" element's child be the selected element
        elem = elem.firstChild;
      }
  
      // if it's not already there, add it
      if (!selectedElements.includes(elem)) {
        selectedElements[j] = elem;
  
        // only the first selectedBBoxes element is ever used in the codebase these days
        // if (j === 0) selectedBBoxes[0] = utilsGetBBox(elem);
        j++;
        const sel = selectorManager.requestSelector(elem, bbox);
  
        if (selectedElements.length > 1) {
          sel.showGrips(false);
        }
      }
    }
    if (!selectedElements.length) {
      return;
    }
    call('selected', selectedElements);
  
    if (selectedElements.length === 1) {
      selectorManager.requestSelector(selectedElements[0]).showGrips(showGrips);
    }
  
    // make sure the elements are in the correct order
    // See: https://www.w3.org/TR/DOM-Level-3-Core/core.html#Node3-compareDocumentPosition
  
    selectedElements.sort(function (a, b) {
      if (a && b && a.compareDocumentPosition) {
        return 3 - (b.compareDocumentPosition(a) & 6); // eslint-disable-line no-bitwise
      }
      if (isNullish(a)) {
        return 1;
      }
      return 0;
    });
  
    // Make sure first elements are not null
    while (isNullish(selectedElements[0])) {
      selectedElements.shift(0);
    }
  };