/**
* Wraps all the selected elements in a group (`g`) element.
* @function module:svgcanvas.SvgCanvas#groupSelectedElements
* @param {"a"|"g"} [type="g"] - type of element to group into, defaults to `<g>`
* @param {string} [urlArg]
* @returns {void}
*/
this.groupSelectedElements = function (type, urlArg) {
    if (!type) { type = 'g'; }
    let cmdStr = '';
    let url;
  
    switch (type) {
    case 'a': {
      cmdStr = 'Make hyperlink';
      url = urlArg || '';
      break;
    } default: {
      type = 'g';
      cmdStr = 'Group Elements';
      break;
    }
    }
  
    const batchCmd = new BatchCommand(cmdStr);
  
    // create and insert the group element
    const g = addSVGElementFromJson({
      element: type,
      attr: {
        id: getNextId()
      }
    });
    if (type === 'a') {
      setHref(g, url);
    }
    batchCmd.addSubCommand(new InsertElementCommand(g));
  
    // now move all children into the group
    let i = selectedElements.length;
    while (i--) {
      let elem = selectedElements[i];
      if (isNullish(elem)) { continue; }
  
      if (elem.parentNode.tagName === 'a' && elem.parentNode.childNodes.length === 1) {
        elem = elem.parentNode;
      }
  
      const oldNextSibling = elem.nextSibling;
      const oldParent = elem.parentNode;
      g.append(elem);
      batchCmd.addSubCommand(new MoveElementCommand(elem, oldNextSibling, oldParent));
    }
    if (!batchCmd.isEmpty()) { addCommandToHistory(batchCmd); }
  
    // update selection
    selectOnly([g], true);
  };
  
  /**
  * Pushes all appropriate parent group properties down to its children, then
  * removes them from the group.
  * @function module:svgcanvas.SvgCanvas#pushGroupProperties
  * @param {SVGAElement|SVGGElement} g
  * @param {boolean} undoable
  * @returns {BatchCommand|void}
  */
  const pushGroupProperties = this.pushGroupProperties = function (g, undoable) {
    const children = g.childNodes;
    const len = children.length;
    const xform = g.getAttribute('transform');
  
    const glist = getTransformList(g);
    const m = transformListToTransform(glist).matrix;
  
    const batchCmd = new BatchCommand('Push group properties');
  
    // TODO: get all fill/stroke properties from the group that we are about to destroy
    // "fill", "fill-opacity", "fill-rule", "stroke", "stroke-dasharray", "stroke-dashoffset",
    // "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "stroke-opacity",
    // "stroke-width"
    // and then for each child, if they do not have the attribute (or the value is 'inherit')
    // then set the child's attribute
  
    const gangle = getRotationAngle(g);
  
    const gattrs = $(g).attr(['filter', 'opacity']);
    let gfilter, gblur, changes;
    const drawing = getCurrentDrawing();
  
    for (let i = 0; i < len; i++) {
      const elem = children[i];
  
      if (elem.nodeType !== 1) { continue; }
  
      if (gattrs.opacity !== null && gattrs.opacity !== 1) {
        // const c_opac = elem.getAttribute('opacity') || 1;
        const newOpac = Math.round((elem.getAttribute('opacity') || 1) * gattrs.opacity * 100) / 100;
        changeSelectedAttribute('opacity', newOpac, [elem]);
      }
  
      if (gattrs.filter) {
        let cblur = this.getBlur(elem);
        const origCblur = cblur;
        if (!gblur) { gblur = this.getBlur(g); }
        if (cblur) {
          // Is this formula correct?
          cblur = Number(gblur) + Number(cblur);
        } else if (cblur === 0) {
          cblur = gblur;
        }
  
        // If child has no current filter, get group's filter or clone it.
        if (!origCblur) {
          // Set group's filter to use first child's ID
          if (!gfilter) {
            gfilter = getRefElem(gattrs.filter);
          } else {
            // Clone the group's filter
            gfilter = drawing.copyElem(gfilter);
            findDefs().append(gfilter);
          }
        } else {
          gfilter = getRefElem(elem.getAttribute('filter'));
        }
  
        // Change this in future for different filters
        const suffix = (gfilter.firstChild.tagName === 'feGaussianBlur') ? 'blur' : 'filter';
        gfilter.id = elem.id + '_' + suffix;
        changeSelectedAttribute('filter', 'url(#' + gfilter.id + ')', [elem]);
  
        // Update blur value
        if (cblur) {
          changeSelectedAttribute('stdDeviation', cblur, [gfilter.firstChild]);
          canvas.setBlurOffsets(gfilter, cblur);
        }
      }
  
      let chtlist = getTransformList(elem);
  
      // Don't process gradient transforms
      if (elem.tagName.includes('Gradient')) { chtlist = null; }
  
      // Hopefully not a problem to add this. Necessary for elements like <desc/>
      if (!chtlist) { continue; }
  
      // Apparently <defs> can get get a transformlist, but we don't want it to have one!
      if (elem.tagName === 'defs') { continue; }
  
      if (glist.numberOfItems) {
        // TODO: if the group's transform is just a rotate, we can always transfer the
        // rotate() down to the children (collapsing consecutive rotates and factoring
        // out any translates)
        if (gangle && glist.numberOfItems === 1) {
          // [Rg] [Rc] [Mc]
          // we want [Tr] [Rc2] [Mc] where:
          //  - [Rc2] is at the child's current center but has the
          // sum of the group and child's rotation angles
          //  - [Tr] is the equivalent translation that this child
          // undergoes if the group wasn't there
  
          // [Tr] = [Rg] [Rc] [Rc2_inv]
  
          // get group's rotation matrix (Rg)
          const rgm = glist.getItem(0).matrix;
  
          // get child's rotation matrix (Rc)
          let rcm = svgroot.createSVGMatrix();
          const cangle = getRotationAngle(elem);
          if (cangle) {
            rcm = chtlist.getItem(0).matrix;
          }
  
          // get child's old center of rotation
          const cbox = utilsGetBBox(elem);
          const ceqm = transformListToTransform(chtlist).matrix;
          const coldc = transformPoint(cbox.x + cbox.width / 2, cbox.y + cbox.height / 2, ceqm);
  
          // sum group and child's angles
          const sangle = gangle + cangle;
  
          // get child's rotation at the old center (Rc2_inv)
          const r2 = svgroot.createSVGTransform();
          r2.setRotate(sangle, coldc.x, coldc.y);
  
          // calculate equivalent translate
          const trm = matrixMultiply(rgm, rcm, r2.matrix.inverse());
  
          // set up tlist
          if (cangle) {
            chtlist.removeItem(0);
          }
  
          if (sangle) {
            if (chtlist.numberOfItems) {
              chtlist.insertItemBefore(r2, 0);
            } else {
              chtlist.appendItem(r2);
            }
          }
  
          if (trm.e || trm.f) {
            const tr = svgroot.createSVGTransform();
            tr.setTranslate(trm.e, trm.f);
            if (chtlist.numberOfItems) {
              chtlist.insertItemBefore(tr, 0);
            } else {
              chtlist.appendItem(tr);
            }
          }
        } else { // more complicated than just a rotate
          // transfer the group's transform down to each child and then
          // call recalculateDimensions()
          const oldxform = elem.getAttribute('transform');
          changes = {};
          changes.transform = oldxform || '';
  
          const newxform = svgroot.createSVGTransform();
  
          // [ gm ] [ chm ] = [ chm ] [ gm' ]
          // [ gm' ] = [ chmInv ] [ gm ] [ chm ]
          const chm = transformListToTransform(chtlist).matrix,
            chmInv = chm.inverse();
          const gm = matrixMultiply(chmInv, m, chm);
          newxform.setMatrix(gm);
          chtlist.appendItem(newxform);
        }
        const cmd = recalculateDimensions(elem);
        if (cmd) { batchCmd.addSubCommand(cmd); }
      }
    }
  
    // remove transform and make it undo-able
    if (xform) {
      changes = {};
      changes.transform = xform;
      g.setAttribute('transform', '');
      g.removeAttribute('transform');
      batchCmd.addSubCommand(new ChangeElementCommand(g, changes));
    }
  
    if (undoable && !batchCmd.isEmpty()) {
      return batchCmd;
    }
    return undefined;
  };
  
  /**
  * Unwraps all the elements in a selected group (`g`) element. This requires
  * significant recalculations to apply group's transforms, etc. to its children.
  * @function module:svgcanvas.SvgCanvas#ungroupSelectedElement
  * @returns {void}
  */
  this.ungroupSelectedElement = function () {
    let g = selectedElements[0];
    if (!g) {
      return;
    }
    if ($(g).data('gsvg') || $(g).data('symbol')) {
      // Is svg, so actually convert to group
      convertToGroup(g);
      return;
    }
    if (g.tagName === 'use') {
      // Somehow doesn't have data set, so retrieve
      const symbol = getElem(getHref(g).substr(1));
      $(g).data('symbol', symbol).data('ref', symbol);
      convertToGroup(g);
      return;
    }
    const parentsA = $(g).parents('a');
    if (parentsA.length) {
      g = parentsA[0];
    }
  
    // Look for parent "a"
    if (g.tagName === 'g' || g.tagName === 'a') {
      const batchCmd = new BatchCommand('Ungroup Elements');
      const cmd = pushGroupProperties(g, true);
      if (cmd) { batchCmd.addSubCommand(cmd); }
  
      const parent = g.parentNode;
      const anchor = g.nextSibling;
      const children = new Array(g.childNodes.length);
  
      let i = 0;
      while (g.firstChild) {
        const elem = g.firstChild;
        const oldNextSibling = elem.nextSibling;
        const oldParent = elem.parentNode;
  
        // Remove child title elements
        if (elem.tagName === 'title') {
          const {nextSibling} = elem;
          batchCmd.addSubCommand(new RemoveElementCommand(elem, nextSibling, oldParent));
          elem.remove();
          continue;
        }
  
        if (anchor) {
          anchor.before(elem);
        } else {
          g.after(elem);
        }
        children[i++] = elem;
        batchCmd.addSubCommand(new MoveElementCommand(elem, oldNextSibling, oldParent));
      }
  
      // remove the group from the selection
      clearSelection();
  
      // delete the group element (but make undo-able)
      const gNextSibling = g.nextSibling;
      g.remove();
      batchCmd.addSubCommand(new RemoveElementCommand(g, gNextSibling, parent));
  
      if (!batchCmd.isEmpty()) { addCommandToHistory(batchCmd); }
  
      // update selection
      addToSelection(children);
    }
  };
  
  /**
  * Repositions the selected element to the bottom in the DOM to appear on top of
  * other elements.
  * @function module:svgcanvas.SvgCanvas#moveToTopSelectedElement
  * @fires module:svgcanvas.SvgCanvas#event:changed
  * @returns {void}
  */
  this.moveToTopSelectedElement = function () {
    const [selected] = selectedElements;
    if (!isNullish(selected)) {
      let t = selected;
      const oldParent = t.parentNode;
      const oldNextSibling = t.nextSibling;
      t = t.parentNode.appendChild(t);
      // If the element actually moved position, add the command and fire the changed
      // event handler.
      if (oldNextSibling !== t.nextSibling) {
        addCommandToHistory(new MoveElementCommand(t, oldNextSibling, oldParent, 'top'));
        call('changed', [t]);
      }
    }
  };
  
  /**
  * Repositions the selected element to the top in the DOM to appear under
  * other elements.
  * @function module:svgcanvas.SvgCanvas#moveToBottomSelectedElement
  * @fires module:svgcanvas.SvgCanvas#event:changed
  * @returns {void}
  */
  this.moveToBottomSelectedElement = function () {
    const [selected] = selectedElements;
    if (!isNullish(selected)) {
      let t = selected;
      const oldParent = t.parentNode;
      const oldNextSibling = t.nextSibling;
      let {firstChild} = t.parentNode;
      if (firstChild.tagName === 'title') {
        firstChild = firstChild.nextSibling;
      }
      // This can probably be removed, as the defs should not ever apppear
      // inside a layer group
      if (firstChild.tagName === 'defs') {
        firstChild = firstChild.nextSibling;
      }
      t = t.parentNode.insertBefore(t, firstChild);
      // If the element actually moved position, add the command and fire the changed
      // event handler.
      if (oldNextSibling !== t.nextSibling) {
        addCommandToHistory(new MoveElementCommand(t, oldNextSibling, oldParent, 'bottom'));
        call('changed', [t]);
      }
    }
  };
  
  /**
  * Moves the select element up or down the stack, based on the visibly
  * intersecting elements.
  * @function module:svgcanvas.SvgCanvas#moveUpDownSelected
  * @param {"Up"|"Down"} dir - String that's either 'Up' or 'Down'
  * @fires module:svgcanvas.SvgCanvas#event:changed
  * @returns {void}
  */
  this.moveUpDownSelected = function (dir) {
    const selected = selectedElements[0];
    if (!selected) { return; }
  
    curBBoxes = [];
    let closest, foundCur;
    // jQuery sorts this list
    const list = $(getIntersectionList(getStrokedBBoxDefaultVisible([selected]))).toArray();
    if (dir === 'Down') { list.reverse(); }
  
    $.each(list, function () {
      if (!foundCur) {
        if (this === selected) {
          foundCur = true;
        }
        return true;
      }
      closest = this; // eslint-disable-line consistent-this
      return false;
    });
    if (!closest) { return; }
  
    const t = selected;
    const oldParent = t.parentNode;
    const oldNextSibling = t.nextSibling;
    $(closest)[dir === 'Down' ? 'before' : 'after'](t);
    // If the element actually moved position, add the command and fire the changed
    // event handler.
    if (oldNextSibling !== t.nextSibling) {
      addCommandToHistory(new MoveElementCommand(t, oldNextSibling, oldParent, 'Move ' + dir));
      call('changed', [t]);
    }
  };
  
  /**
  * Moves selected elements on the X/Y axis.
  * @function module:svgcanvas.SvgCanvas#moveSelectedElements
  * @param {Float} dx - Float with the distance to move on the x-axis
  * @param {Float} dy - Float with the distance to move on the y-axis
  * @param {boolean} undoable - Boolean indicating whether or not the action should be undoable
  * @fires module:svgcanvas.SvgCanvas#event:changed
  * @returns {BatchCommand|void} Batch command for the move
  */
  this.moveSelectedElements = function (dx, dy, undoable) {
    // if undoable is not sent, default to true
    // if single values, scale them to the zoom
    if (dx.constructor !== Array) {
      dx /= currentZoom;
      dy /= currentZoom;
    }
    undoable = undoable || true;
    const batchCmd = new BatchCommand('position');
    let i = selectedElements.length;
    while (i--) {
      const selected = selectedElements[i];
      if (!isNullish(selected)) {
        // if (i === 0) {
        //   selectedBBoxes[0] = utilsGetBBox(selected);
        // }
        // const b = {};
        // for (const j in selectedBBoxes[i]) b[j] = selectedBBoxes[i][j];
        // selectedBBoxes[i] = b;
  
        const xform = svgroot.createSVGTransform();
        const tlist = getTransformList(selected);
  
        // dx and dy could be arrays
        if (dx.constructor === Array) {
          // if (i === 0) {
          //   selectedBBoxes[0].x += dx[0];
          //   selectedBBoxes[0].y += dy[0];
          // }
          xform.setTranslate(dx[i], dy[i]);
        } else {
          // if (i === 0) {
          //   selectedBBoxes[0].x += dx;
          //   selectedBBoxes[0].y += dy;
          // }
          xform.setTranslate(dx, dy);
        }
  
        if (tlist.numberOfItems) {
          tlist.insertItemBefore(xform, 0);
        } else {
          tlist.appendItem(xform);
        }
  
        const cmd = recalculateDimensions(selected);
        if (cmd) {
          batchCmd.addSubCommand(cmd);
        }
  
        selectorManager.requestSelector(selected).resize();
      }
    }
    if (!batchCmd.isEmpty()) {
      if (undoable) {
        addCommandToHistory(batchCmd);
      }
      call('changed', selectedElements);
      return batchCmd;
    }
    return undefined;
  };
  
  /**
  * Create deep DOM copies (clones) of all selected elements and move them slightly
  * from their originals.
  * @function module:svgcanvas.SvgCanvas#cloneSelectedElements
  * @param {Float} x Float with the distance to move on the x-axis
  * @param {Float} y Float with the distance to move on the y-axis
  * @returns {void}
  */
  this.cloneSelectedElements = function (x, y) {
    let i, elem;
    const batchCmd = new BatchCommand('Clone Elements');
    // find all the elements selected (stop at first null)
    const len = selectedElements.length;
    /**
     * Sorts an array numerically and ascending.
     * @param {Element} a
     * @param {Element} b
     * @returns {Integer}
     */
    function sortfunction (a, b) {
      return ($(b).index() - $(a).index());
    }
    selectedElements.sort(sortfunction);
    for (i = 0; i < len; ++i) {
      elem = selectedElements[i];
      if (isNullish(elem)) { break; }
    }
    // use slice to quickly get the subset of elements we need
    const copiedElements = selectedElements.slice(0, i);
    this.clearSelection(true);
    // note that we loop in the reverse way because of the way elements are added
    // to the selectedElements array (top-first)
    const drawing = getCurrentDrawing();
    i = copiedElements.length;
    while (i--) {
      // clone each element and replace it within copiedElements
      elem = copiedElements[i] = drawing.copyElem(copiedElements[i]);
      (currentGroup || drawing.getCurrentLayer()).append(elem);
      batchCmd.addSubCommand(new InsertElementCommand(elem));
    }
  
    if (!batchCmd.isEmpty()) {
      addToSelection(copiedElements.reverse()); // Need to reverse for correct selection-adding
      this.moveSelectedElements(x, y, false);
      addCommandToHistory(batchCmd);
    }
  };
  
  /**
  * Aligns selected elements.
  * @function module:svgcanvas.SvgCanvas#alignSelectedElements
  * @param {string} type - String with single character indicating the alignment type
  * @param {"selected"|"largest"|"smallest"|"page"} relativeTo
  * @returns {void}
  */
  this.alignSelectedElements = function (type, relativeTo) {
    const bboxes = []; // angles = [];
    const len = selectedElements.length;
    if (!len) { return; }
    let minx = Number.MAX_VALUE, maxx = Number.MIN_VALUE,
      miny = Number.MAX_VALUE, maxy = Number.MIN_VALUE;
    let curwidth = Number.MIN_VALUE, curheight = Number.MIN_VALUE;
    for (let i = 0; i < len; ++i) {
      if (isNullish(selectedElements[i])) { break; }
      const elem = selectedElements[i];
      bboxes[i] = getStrokedBBoxDefaultVisible([elem]);
  
      // now bbox is axis-aligned and handles rotation
      switch (relativeTo) {
      case 'smallest':
        if (((type === 'l' || type === 'c' || type === 'r') &&
          (curwidth === Number.MIN_VALUE || curwidth > bboxes[i].width)) ||
          ((type === 't' || type === 'm' || type === 'b') &&
          (curheight === Number.MIN_VALUE || curheight > bboxes[i].height))
        ) {
          minx = bboxes[i].x;
          miny = bboxes[i].y;
          maxx = bboxes[i].x + bboxes[i].width;
          maxy = bboxes[i].y + bboxes[i].height;
          curwidth = bboxes[i].width;
          curheight = bboxes[i].height;
        }
        break;
      case 'largest':
        if (((type === 'l' || type === 'c' || type === 'r') &&
          (curwidth === Number.MIN_VALUE || curwidth < bboxes[i].width)) ||
          ((type === 't' || type === 'm' || type === 'b') &&
          (curheight === Number.MIN_VALUE || curheight < bboxes[i].height))
        ) {
          minx = bboxes[i].x;
          miny = bboxes[i].y;
          maxx = bboxes[i].x + bboxes[i].width;
          maxy = bboxes[i].y + bboxes[i].height;
          curwidth = bboxes[i].width;
          curheight = bboxes[i].height;
        }
        break;
      default: // 'selected'
        if (bboxes[i].x < minx) { minx = bboxes[i].x; }
        if (bboxes[i].y < miny) { miny = bboxes[i].y; }
        if (bboxes[i].x + bboxes[i].width > maxx) { maxx = bboxes[i].x + bboxes[i].width; }
        if (bboxes[i].y + bboxes[i].height > maxy) { maxy = bboxes[i].y + bboxes[i].height; }
        break;
      }
    } // loop for each element to find the bbox and adjust min/max
  
    if (relativeTo === 'page') {
      minx = 0;
      miny = 0;
      maxx = canvas.contentW;
      maxy = canvas.contentH;
    }
  
    const dx = new Array(len);
    const dy = new Array(len);
    for (let i = 0; i < len; ++i) {
      if (isNullish(selectedElements[i])) { break; }
      // const elem = selectedElements[i];
      const bbox = bboxes[i];
      dx[i] = 0;
      dy[i] = 0;
      switch (type) {
      case 'l': // left (horizontal)
        dx[i] = minx - bbox.x;
        break;
      case 'c': // center (horizontal)
        dx[i] = (minx + maxx) / 2 - (bbox.x + bbox.width / 2);
        break;
      case 'r': // right (horizontal)
        dx[i] = maxx - (bbox.x + bbox.width);
        break;
      case 't': // top (vertical)
        dy[i] = miny - bbox.y;
        break;
      case 'm': // middle (vertical)
        dy[i] = (miny + maxy) / 2 - (bbox.y + bbox.height / 2);
        break;
      case 'b': // bottom (vertical)
        dy[i] = maxy - (bbox.y + bbox.height);
        break;
      }
    }
    this.moveSelectedElements(dx, dy);
  };