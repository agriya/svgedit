/**
* Removes all selected elements from the DOM and adds the change to the
* history stack.
* @function module:svgcanvas.SvgCanvas#deleteSelectedElements
* @fires module:svgcanvas.SvgCanvas#event:changed
* @returns {void}
*/
this.deleteSelectedElements = function () {
    const batchCmd = new BatchCommand('Delete Elements');
    const len = selectedElements.length;
    const selectedCopy = []; // selectedElements is being deleted
  
    for (let i = 0; i < len; ++i) {
      const selected = selectedElements[i];
      if (isNullish(selected)) { break; }
  
      let parent = selected.parentNode;
      let t = selected;
  
      // this will unselect the element and remove the selectedOutline
      selectorManager.releaseSelector(t);
  
      // Remove the path if present.
      pathModule.removePath_(t.id);
  
      // Get the parent if it's a single-child anchor
      if (parent.tagName === 'a' && parent.childNodes.length === 1) {
        t = parent;
        parent = parent.parentNode;
      }
  
      const {nextSibling} = t;
      t.remove();
      const elem = t;
      selectedCopy.push(selected); // for the copy
      batchCmd.addSubCommand(new RemoveElementCommand(elem, nextSibling, parent));
    }
    selectedElements = [];
  
    if (!batchCmd.isEmpty()) { addCommandToHistory(batchCmd); }
    call('changed', selectedCopy);
    clearSelection();
  };
  
  /**
  * Removes all selected elements from the DOM and adds the change to the
  * history stack. Remembers removed elements on the clipboard.
  * @function module:svgcanvas.SvgCanvas#cutSelectedElements
  * @returns {void}
  */
  this.cutSelectedElements = function () {
    canvas.copySelectedElements();
    canvas.deleteSelectedElements();
  };
  
  const CLIPBOARD_ID = 'svgedit_clipboard';
  
  /**
  * Flash the clipboard data momentarily on localStorage so all tabs can see.
  * @returns {void}
  */
  function flashStorage () {
    const data = sessionStorage.getItem(CLIPBOARD_ID);
    localStorage.setItem(CLIPBOARD_ID, data);
    setTimeout(function () {
      localStorage.removeItem(CLIPBOARD_ID);
    }, 1);
  }
  
  /**
  * Transfers sessionStorage from one tab to another.
  * @param {!Event} ev Storage event.
  * @returns {void}
  */
  function storageChange (ev) {
    if (!ev.newValue) return; // This is a call from removeItem.
    if (ev.key === CLIPBOARD_ID + '_startup') {
      // Another tab asked for our sessionStorage.
      localStorage.removeItem(CLIPBOARD_ID + '_startup');
      flashStorage();
    } else if (ev.key === CLIPBOARD_ID) {
      // Another tab sent data.
      sessionStorage.setItem(CLIPBOARD_ID, ev.newValue);
    }
  }
  
  // Listen for changes to localStorage.
  window.addEventListener('storage', storageChange, false);
  // Ask other tabs for sessionStorage (this is ONLY to trigger event).
  localStorage.setItem(CLIPBOARD_ID + '_startup', Math.random());
  
  /**
  * Remembers the current selected elements on the clipboard.
  * @function module:svgcanvas.SvgCanvas#copySelectedElements
  * @returns {void}
  */
  this.copySelectedElements = function () {
    const data =
        JSON.stringify(selectedElements.map((x) => getJsonFromSvgElement(x)));
    // Use sessionStorage for the clipboard data.
    sessionStorage.setItem(CLIPBOARD_ID, data);
    flashStorage();
  
    const menu = $('#cmenu_canvas');
    // Context menu might not exist (it is provided by editor.js).
    if (menu.enableContextMenuItems) {
      menu.enableContextMenuItems('#paste,#paste_in_place');
    }
  };
  
  /**
  * @function module:svgcanvas.SvgCanvas#pasteElements
  * @param {"in_place"|"point"|void} type
  * @param {Integer|void} x Expected if type is "point"
  * @param {Integer|void} y Expected if type is "point"
  * @fires module:svgcanvas.SvgCanvas#event:changed
  * @fires module:svgcanvas.SvgCanvas#event:ext_IDsUpdated
  * @returns {void}
  */
  this.pasteElements = function (type, x, y) {
    let clipb = JSON.parse(sessionStorage.getItem(CLIPBOARD_ID));
    if (!clipb) return;
    let len = clipb.length;
    if (!len) return;
  
    const pasted = [];
    const batchCmd = new BatchCommand('Paste elements');
    // const drawing = getCurrentDrawing();
    /**
    * @typedef {PlainObject<string, string>} module:svgcanvas.ChangedIDs
    */
    /**
     * @type {module:svgcanvas.ChangedIDs}
     */
    const changedIDs = {};
  
    // Recursively replace IDs and record the changes
    /**
     *
     * @param {module:svgcanvas.SVGAsJSON} elem
     * @returns {void}
     */
    function checkIDs (elem) {
      if (elem.attr && elem.attr.id) {
        changedIDs[elem.attr.id] = getNextId();
        elem.attr.id = changedIDs[elem.attr.id];
      }
      if (elem.children) elem.children.forEach(checkIDs);
    }
    clipb.forEach(checkIDs);
  
    // Give extensions like the connector extension a chance to reflect new IDs and remove invalid elements
    /**
    * Triggered when `pasteElements` is called from a paste action (context menu or key).
    * @event module:svgcanvas.SvgCanvas#event:ext_IDsUpdated
    * @type {PlainObject}
    * @property {module:svgcanvas.SVGAsJSON[]} elems
    * @property {module:svgcanvas.ChangedIDs} changes Maps past ID (on attribute) to current ID
    */
    runExtensions(
      'IDsUpdated',
      /** @type {module:svgcanvas.SvgCanvas#event:ext_IDsUpdated} */
      {elems: clipb, changes: changedIDs},
      true
    ).forEach(function (extChanges) {
      if (!extChanges || !('remove' in extChanges)) return;
  
      extChanges.remove.forEach(function (removeID) {
        clipb = clipb.filter(function (clipBoardItem) {
          return clipBoardItem.attr.id !== removeID;
        });
      });
    });
  
    // Move elements to lastClickPoint
    while (len--) {
      const elem = clipb[len];
      if (!elem) { continue; }
  
      const copy = addSVGElementFromJson(elem);
      pasted.push(copy);
      batchCmd.addSubCommand(new InsertElementCommand(copy));
  
      restoreRefElems(copy);
    }
  
    selectOnly(pasted);
  
    if (type !== 'in_place') {
      let ctrX, ctrY;
  
      if (!type) {
        ctrX = lastClickPoint.x;
        ctrY = lastClickPoint.y;
      } else if (type === 'point') {
        ctrX = x;
        ctrY = y;
      }
  
      const bbox = getStrokedBBoxDefaultVisible(pasted);
      const cx = ctrX - (bbox.x + bbox.width / 2),
        cy = ctrY - (bbox.y + bbox.height / 2),
        dx = [],
        dy = [];
  
      $.each(pasted, function (i, item) {
        dx.push(cx);
        dy.push(cy);
      });
  
      const cmd = canvas.moveSelectedElements(dx, dy, false);
      if (cmd) batchCmd.addSubCommand(cmd);
    }
  
    addCommandToHistory(batchCmd);
    call('changed', pasted);
  };
  