/**
* Check whether selected element is bold or not.
* @function module:svgcanvas.SvgCanvas#getBold
* @returns {boolean} Indicates whether or not element is bold
*/
this.getBold = function () {
    // should only have one element selected
    const selected = selectedElements[0];
    if (!isNullish(selected) && selected.tagName === 'text' &&
      isNullish(selectedElements[1])) {
      return (selected.getAttribute('font-weight') === 'bold');
    }
    return false;
  };
  
  /**
  * Make the selected element bold or normal.
  * @function module:svgcanvas.SvgCanvas#setBold
  * @param {boolean} b - Indicates bold (`true`) or normal (`false`)
  * @returns {void}
  */
  this.setBold = function (b) {
    const selected = selectedElements[0];
    if (!isNullish(selected) && selected.tagName === 'text' &&
      isNullish(selectedElements[1])) {
      changeSelectedAttribute('font-weight', b ? 'bold' : 'normal');
    }
    if (!selectedElements[0].textContent) {
      textActions.setCursor();
    }
  };
  
  /**
  * Check whether selected element is in italics or not.
  * @function module:svgcanvas.SvgCanvas#getItalic
  * @returns {boolean} Indicates whether or not element is italic
  */
  this.getItalic = function () {
    const selected = selectedElements[0];
    if (!isNullish(selected) && selected.tagName === 'text' &&
      isNullish(selectedElements[1])) {
      return (selected.getAttribute('font-style') === 'italic');
    }
    return false;
  };
  
  /**
  * Make the selected element italic or normal.
  * @function module:svgcanvas.SvgCanvas#setItalic
  * @param {boolean} i - Indicates italic (`true`) or normal (`false`)
  * @returns {void}
  */
  this.setItalic = function (i) {
    const selected = selectedElements[0];
    if (!isNullish(selected) && selected.tagName === 'text' &&
      isNullish(selectedElements[1])) {
      changeSelectedAttribute('font-style', i ? 'italic' : 'normal');
    }
    if (!selectedElements[0].textContent) {
      textActions.setCursor();
    }
  };
  
  /**
  * @function module:svgcanvas.SvgCanvas#getFontFamily
  * @returns {string} The current font family
  */
  this.getFontFamily = function () {
    return curText.font_family;
  };
  
  /**
  * Set the new font family.
  * @function module:svgcanvas.SvgCanvas#setFontFamily
  * @param {string} val - String with the new font family
  * @returns {void}
  */
  this.setFontFamily = function (val) {
    curText.font_family = val;
    changeSelectedAttribute('font-family', val);
    if (selectedElements[0] && !selectedElements[0].textContent) {
      textActions.setCursor();
    }
  };
  
  /**
  * Set the new font color.
  * @function module:svgcanvas.SvgCanvas#setFontColor
  * @param {string} val - String with the new font color
  * @returns {void}
  */
  this.setFontColor = function (val) {
    curText.fill = val;
    changeSelectedAttribute('fill', val);
  };
  
  /**
  * @function module:svgcanvas.SvgCanvas#getFontColor
  * @returns {string} The current font color
  */
  this.getFontColor = function () {
    return curText.fill;
  };
  
  /**
  * @function module:svgcanvas.SvgCanvas#getFontSize
  * @returns {Float} The current font size
  */
  this.getFontSize = function () {
    return curText.font_size;
  };
  
  /**
  * Applies the given font size to the selected element.
  * @function module:svgcanvas.SvgCanvas#setFontSize
  * @param {Float} val - Float with the new font size
  * @returns {void}
  */
  this.setFontSize = function (val) {
    curText.font_size = val;
    changeSelectedAttribute('font-size', val);
    if (!selectedElements[0].textContent) {
      textActions.setCursor();
    }
  };