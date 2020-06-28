/**
* Sets the new image URL for the selected image element. Updates its size if
* a new URL is given.
* @function module:svgcanvas.SvgCanvas#setImageURL
* @param {string} val - String with the image URL/path
* @fires module:svgcanvas.SvgCanvas#event:changed
* @returns {void}
*/
this.setImageURL = function (val) {
    const elem = selectedElements[0];
    if (!elem) { return; }
  
    const attrs = $(elem).attr(['width', 'height']);
    const setsize = (!attrs.width || !attrs.height);
  
    const curHref = getHref(elem);
  
    // Do nothing if no URL change or size change
    if (curHref === val && !setsize) {
      return;
    }
  
    const batchCmd = new BatchCommand('Change Image URL');
  
    setHref(elem, val);
    batchCmd.addSubCommand(new ChangeElementCommand(elem, {
      '#href': curHref
    }));
  
    $(new Image()).load(function () {
      const changes = $(elem).attr(['width', 'height']);
  
      $(elem).attr({
        width: this.width,
        height: this.height
      });
  
      selectorManager.requestSelector(elem).resize();
  
      batchCmd.addSubCommand(new ChangeElementCommand(elem, changes));
      addCommandToHistory(batchCmd);
      call('changed', [elem]);
    }).attr('src', val);
  };
  
  /**
  * Sets the new link URL for the selected anchor element.
  * @function module:svgcanvas.SvgCanvas#setLinkURL
  * @param {string} val - String with the link URL/path
  * @returns {void}
  */
  this.setLinkURL = function (val) {
    let elem = selectedElements[0];
    if (!elem) { return; }
    if (elem.tagName !== 'a') {
      // See if parent is an anchor
      const parentsA = $(elem).parents('a');
      if (parentsA.length) {
        elem = parentsA[0];
      } else {
        return;
      }
    }
  
    const curHref = getHref(elem);
  
    if (curHref === val) { return; }
  
    const batchCmd = new BatchCommand('Change Link URL');
  
    setHref(elem, val);
    batchCmd.addSubCommand(new ChangeElementCommand(elem, {
      '#href': curHref
    }));
  
    addCommandToHistory(batchCmd);
  };