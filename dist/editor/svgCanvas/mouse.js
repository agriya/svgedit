/**
* @name module:svgcanvas.SvgCanvas#getMouseTarget
* @type {module:path.EditorContext#getMouseTarget}
*/
const getMouseTarget = this.getMouseTarget = function (evt) {
    if (isNullish(evt)) {
      return null;
    }
    let mouseTarget = evt.target;
  
    // if it was a <use>, Opera and WebKit return the SVGElementInstance
    if (mouseTarget.correspondingUseElement) { mouseTarget = mouseTarget.correspondingUseElement; }
  
    // for foreign content, go up until we find the foreignObject
    // WebKit browsers set the mouse target to the svgcanvas div
    if ([NS.MATH, NS.HTML].includes(mouseTarget.namespaceURI) &&
      mouseTarget.id !== 'svgcanvas'
    ) {
      while (mouseTarget.nodeName !== 'foreignObject') {
        mouseTarget = mouseTarget.parentNode;
        if (!mouseTarget) { return svgroot; }
      }
    }
  
    // Get the desired mouseTarget with jQuery selector-fu
    // If it's root-like, select the root
    const currentLayer = getCurrentDrawing().getCurrentLayer();
    if ([svgroot, container, svgcontent, currentLayer].includes(mouseTarget)) {
      return svgroot;
    }
  
    const $target = $(mouseTarget);
  
    // If it's a selection grip, return the grip parent
    if ($target.closest('#selectorParentGroup').length) {
      // While we could instead have just returned mouseTarget,
      // this makes it easier to indentify as being a selector grip
      return selectorManager.selectorParentGroup;
    }
  
    while (mouseTarget.parentNode !== (currentGroup || currentLayer)) {
      mouseTarget = mouseTarget.parentNode;
    }
  
    //
    // // go up until we hit a child of a layer
    // while (mouseTarget.parentNode.parentNode.tagName == 'g') {
    //   mouseTarget = mouseTarget.parentNode;
    // }
    // Webkit bubbles the mouse event all the way up to the div, so we
    // set the mouseTarget to the svgroot like the other browsers
    // if (mouseTarget.nodeName.toLowerCase() == 'div') {
    //   mouseTarget = svgroot;
    // }
  
    return mouseTarget;
  };

/**
 * Follows these conditions:
 * - When we are in a create mode, the element is added to the canvas but the
 *   action is not recorded until mousing up.
 * - When we are in select mode, select the element, remember the position
 *   and do nothing else.
 * @param {MouseEvent} evt
 * @fires module:svgcanvas.SvgCanvas#event:ext_mouseDown
 * @returns {void}
 */
const mouseDown = function (evt) {
    if (canvas.spaceKey || evt.button === 1) { return; }
  
    const rightClick = evt.button === 2;
  
    if (evt.altKey) { // duplicate when dragging
      canvas.cloneSelectedElements(0, 0);
    }
  
    rootSctm = $('#svgcontent g')[0].getScreenCTM().inverse();
  
    const pt = transformPoint(evt.pageX, evt.pageY, rootSctm),
      mouseX = pt.x * currentZoom,
      mouseY = pt.y * currentZoom;
  
    evt.preventDefault();
  
    if (rightClick) {
      currentMode = 'select';
      lastClickPoint = pt;
    }
  
    // This would seem to be unnecessary...
    // if (!['select', 'resize'].includes(currentMode)) {
    //   setGradient();
    // }
  
    let x = mouseX / currentZoom,
      y = mouseY / currentZoom;
    let mouseTarget = getMouseTarget(evt);
  
    if (mouseTarget.tagName === 'a' && mouseTarget.childNodes.length === 1) {
      mouseTarget = mouseTarget.firstChild;
    }
  
    // realX/y ignores grid-snap value
    const realX = x;
    rStartX = startX = x;
    const realY = y;
    rStartY = startY = y;
  
    if (curConfig.gridSnapping) {
      x = snapToGrid(x);
      y = snapToGrid(y);
      startX = snapToGrid(startX);
      startY = snapToGrid(startY);
    }
  
    // if it is a selector grip, then it must be a single element selected,
    // set the mouseTarget to that and update the mode to rotate/resize
  
    if (mouseTarget === selectorManager.selectorParentGroup && !isNullish(selectedElements[0])) {
      const grip = evt.target;
      const griptype = elData(grip, 'type');
      // rotating
      if (griptype === 'rotate') {
        currentMode = 'rotate';
      // resizing
      } else if (griptype === 'resize') {
        currentMode = 'resize';
        currentResizeMode = elData(grip, 'dir');
      }
      mouseTarget = selectedElements[0];
    }
  
    startTransform = mouseTarget.getAttribute('transform');
  
    const tlist = getTransformList(mouseTarget);
    switch (currentMode) {
    case 'select':
      started = true;
      currentResizeMode = 'none';
      if (rightClick) { started = false; }
  
      if (mouseTarget !== svgroot) {
        // if this element is not yet selected, clear selection and select it
        if (!selectedElements.includes(mouseTarget)) {
          // only clear selection if shift is not pressed (otherwise, add
          // element to selection)
          if (!evt.shiftKey) {
            // No need to do the call here as it will be done on addToSelection
            clearSelection(true);
          }
          addToSelection([mouseTarget]);
          justSelected = mouseTarget;
          pathActions.clear();
        }
        // else if it's a path, go into pathedit mode in mouseup
  
        if (!rightClick) {
          // insert a dummy transform so if the element(s) are moved it will have
          // a transform to use for its translate
          for (const selectedElement of selectedElements) {
            if (isNullish(selectedElement)) { continue; }
            const slist = getTransformList(selectedElement);
            if (slist.numberOfItems) {
              slist.insertItemBefore(svgroot.createSVGTransform(), 0);
            } else {
              slist.appendItem(svgroot.createSVGTransform());
            }
          }
        }
      } else if (!rightClick) {
        clearSelection();
        currentMode = 'multiselect';
        if (isNullish(rubberBox)) {
          rubberBox = selectorManager.getRubberBandBox();
        }
        rStartX *= currentZoom;
        rStartY *= currentZoom;
        // console.log('p',[evt.pageX, evt.pageY]);
        // console.log('c',[evt.clientX, evt.clientY]);
        // console.log('o',[evt.offsetX, evt.offsetY]);
        // console.log('s',[startX, startY]);
  
        assignAttributes(rubberBox, {
          x: rStartX,
          y: rStartY,
          width: 0,
          height: 0,
          display: 'inline'
        }, 100);
      }
      break;
    case 'zoom':
      started = true;
      if (isNullish(rubberBox)) {
        rubberBox = selectorManager.getRubberBandBox();
      }
      assignAttributes(rubberBox, {
        x: realX * currentZoom,
        y: realX * currentZoom,
        width: 0,
        height: 0,
        display: 'inline'
      }, 100);
      break;
    case 'resize': {
      started = true;
      startX = x;
      startY = y;
  
      // Getting the BBox from the selection box, since we know we
      // want to orient around it
      initBbox = utilsGetBBox($('#selectedBox0')[0]);
      const bb = {};
      $.each(initBbox, function (key, val) {
        bb[key] = val / currentZoom;
      });
      initBbox = bb;
  
      // append three dummy transforms to the tlist so that
      // we can translate,scale,translate in mousemove
      const pos = getRotationAngle(mouseTarget) ? 1 : 0;
  
      if (hasMatrixTransform(tlist)) {
        tlist.insertItemBefore(svgroot.createSVGTransform(), pos);
        tlist.insertItemBefore(svgroot.createSVGTransform(), pos);
        tlist.insertItemBefore(svgroot.createSVGTransform(), pos);
      } else {
        tlist.appendItem(svgroot.createSVGTransform());
        tlist.appendItem(svgroot.createSVGTransform());
        tlist.appendItem(svgroot.createSVGTransform());
  
        if (supportsNonScalingStroke()) {
          // Handle crash for newer Chrome and Safari 6 (Mobile and Desktop):
          // https://code.google.com/p/svg-edit/issues/detail?id=904
          // Chromium issue: https://code.google.com/p/chromium/issues/detail?id=114625
          // TODO: Remove this workaround once vendor fixes the issue
          const iswebkit = isWebkit();
  
          let delayedStroke;
          if (iswebkit) {
            delayedStroke = function (ele) {
              const stroke_ = ele.getAttribute('stroke');
              ele.removeAttribute('stroke');
              // Re-apply stroke after delay. Anything higher than 1 seems to cause flicker
              if (stroke_ !== null) setTimeout(function () { ele.setAttribute('stroke', stroke_); }, 0);
            };
          }
          mouseTarget.style.vectorEffect = 'non-scaling-stroke';
          if (iswebkit) { delayedStroke(mouseTarget); }
  
          const all = mouseTarget.getElementsByTagName('*'),
            len = all.length;
          for (let i = 0; i < len; i++) {
            if (!all[i].style) { // mathML
              continue;
            }
            all[i].style.vectorEffect = 'non-scaling-stroke';
            if (iswebkit) { delayedStroke(all[i]); }
          }
        }
      }
      break;
    }
    case 'fhellipse':
    case 'fhrect':
    case 'fhpath':
      start.x = realX;
      start.y = realY;
      controllPoint1 = {x: 0, y: 0};
      controllPoint2 = {x: 0, y: 0};
      started = true;
      dAttr = realX + ',' + realY + ' ';
      // Commented out as doing nothing now:
      // strokeW = parseFloat(curShape.stroke_width) === 0 ? 1 : curShape.stroke_width;
      addSVGElementFromJson({
        element: 'polyline',
        curStyles: true,
        attr: {
          points: dAttr,
          id: getNextId(),
          fill: 'none',
          opacity: curShape.opacity / 2,
          'stroke-linecap': 'round',
          style: 'pointer-events:none'
        }
      });
      freehand.minx = realX;
      freehand.maxx = realX;
      freehand.miny = realY;
      freehand.maxy = realY;
      break;
    case 'image': {
      started = true;
      const newImage = addSVGElementFromJson({
        element: 'image',
        attr: {
          x,
          y,
          width: 0,
          height: 0,
          id: getNextId(),
          opacity: curShape.opacity / 2,
          style: 'pointer-events:inherit'
        }
      });
      setHref(newImage, lastGoodImgUrl);
      preventClickDefault(newImage);
      break;
    } case 'square':
      // TODO: once we create the rect, we lose information that this was a square
      // (for resizing purposes this could be important)
      // Fallthrough
    case 'rect':
      started = true;
      startX = x;
      startY = y;
      addSVGElementFromJson({
        element: 'rect',
        curStyles: true,
        attr: {
          x,
          y,
          width: 0,
          height: 0,
          id: getNextId(),
          opacity: curShape.opacity / 2
        }
      });
      break;
    case 'line': {
      started = true;
      const strokeW = Number(curShape.stroke_width) === 0 ? 1 : curShape.stroke_width;
      addSVGElementFromJson({
        element: 'line',
        curStyles: true,
        attr: {
          x1: x,
          y1: y,
          x2: x,
          y2: y,
          id: getNextId(),
          stroke: curShape.stroke,
          'stroke-width': strokeW,
          'stroke-dasharray': curShape.stroke_dasharray,
          'stroke-linejoin': curShape.stroke_linejoin,
          'stroke-linecap': curShape.stroke_linecap,
          'stroke-opacity': curShape.stroke_opacity,
          fill: 'none',
          opacity: curShape.opacity / 2,
          style: 'pointer-events:none'
        }
      });
      break;
    } case 'circle':
      started = true;
      addSVGElementFromJson({
        element: 'circle',
        curStyles: true,
        attr: {
          cx: x,
          cy: y,
          r: 0,
          id: getNextId(),
          opacity: curShape.opacity / 2
        }
      });
      break;
    case 'ellipse':
      started = true;
      addSVGElementFromJson({
        element: 'ellipse',
        curStyles: true,
        attr: {
          cx: x,
          cy: y,
          rx: 0,
          ry: 0,
          id: getNextId(),
          opacity: curShape.opacity / 2
        }
      });
      break;
    case 'text':
      started = true;
      /* const newText = */ addSVGElementFromJson({
        element: 'text',
        curStyles: true,
        attr: {
          x,
          y,
          id: getNextId(),
          fill: curText.fill,
          'stroke-width': curText.stroke_width,
          'font-size': curText.font_size,
          'font-family': curText.font_family,
          'text-anchor': 'middle',
          'xml:space': 'preserve',
          opacity: curShape.opacity
        }
      });
      // newText.textContent = 'text';
      break;
    case 'path':
      // Fall through
    case 'pathedit':
      startX *= currentZoom;
      startY *= currentZoom;
      pathActions.mouseDown(evt, mouseTarget, startX, startY);
      started = true;
      break;
    case 'textedit':
      startX *= currentZoom;
      startY *= currentZoom;
      textActions.mouseDown(evt, mouseTarget, startX, startY);
      started = true;
      break;
    case 'rotate':
      started = true;
      // we are starting an undoable change (a drag-rotation)
      canvas.undoMgr.beginUndoableChange('transform', selectedElements);
      break;
    default:
      // This could occur in an extension
      break;
    }
  
    /**
     * The main (left) mouse button is held down on the canvas area.
     * @event module:svgcanvas.SvgCanvas#event:ext_mouseDown
     * @type {PlainObject}
     * @property {MouseEvent} event The event object
     * @property {Float} start_x x coordinate on canvas
     * @property {Float} start_y y coordinate on canvas
     * @property {Element[]} selectedElements An array of the selected Elements
    */
    const extResult = runExtensions('mouseDown', /** @type {module:svgcanvas.SvgCanvas#event:ext_mouseDown} */ {
      event: evt,
      start_x: startX,
      start_y: startY,
      selectedElements
    }, true);
  
    $.each(extResult, function (i, r) {
      if (r && r.started) {
        started = true;
      }
    });
  };
  
  // in this function we do not record any state changes yet (but we do update
  // any elements that are still being created, moved or resized on the canvas)
  /**
   *
   * @param {MouseEvent} evt
   * @fires module:svgcanvas.SvgCanvas#event:transition
   * @fires module:svgcanvas.SvgCanvas#event:ext_mouseMove
   * @returns {void}
   */
  const mouseMove = function (evt) {
    if (!started) { return; }
    if (evt.button === 1 || canvas.spaceKey) { return; }
  
    let i, xya, c, cx, cy, dx, dy, len, angle, box,
      selected = selectedElements[0];
    const
      pt = transformPoint(evt.pageX, evt.pageY, rootSctm),
      mouseX = pt.x * currentZoom,
      mouseY = pt.y * currentZoom,
      shape = getElem(getId());
  
    let realX = mouseX / currentZoom;
    let x = realX;
    let realY = mouseY / currentZoom;
    let y = realY;
  
    if (curConfig.gridSnapping) {
      x = snapToGrid(x);
      y = snapToGrid(y);
    }
  
    evt.preventDefault();
    let tlist;
    switch (currentMode) {
    case 'select': {
      // we temporarily use a translate on the element(s) being dragged
      // this transform is removed upon mousing up and the element is
      // relocated to the new location
      if (selectedElements[0] !== null) {
        dx = x - startX;
        dy = y - startY;
  
        if (curConfig.gridSnapping) {
          dx = snapToGrid(dx);
          dy = snapToGrid(dy);
        }
  
        /*
        // Commenting out as currently has no effect
        if (evt.shiftKey) {
          xya = snapToAngle(startX, startY, x, y);
          ({x, y} = xya);
        }
        */
  
        if (dx !== 0 || dy !== 0) {
          len = selectedElements.length;
          for (i = 0; i < len; ++i) {
            selected = selectedElements[i];
            if (isNullish(selected)) { break; }
            // if (i === 0) {
            //   const box = utilsGetBBox(selected);
            //     selectedBBoxes[i].x = box.x + dx;
            //     selectedBBoxes[i].y = box.y + dy;
            // }
  
            // update the dummy transform in our transform list
            // to be a translate
            const xform = svgroot.createSVGTransform();
            tlist = getTransformList(selected);
            // Note that if Webkit and there's no ID for this
            // element, the dummy transform may have gotten lost.
            // This results in unexpected behaviour
  
            xform.setTranslate(dx, dy);
            if (tlist.numberOfItems) {
              tlist.replaceItem(xform, 0);
            } else {
              tlist.appendItem(xform);
            }
  
            // update our internal bbox that we're tracking while dragging
            selectorManager.requestSelector(selected).resize();
          }
  
          call('transition', selectedElements);
        }
      }
      break;
    } case 'multiselect': {
      realX *= currentZoom;
      realY *= currentZoom;
      assignAttributes(rubberBox, {
        x: Math.min(rStartX, realX),
        y: Math.min(rStartY, realY),
        width: Math.abs(realX - rStartX),
        height: Math.abs(realY - rStartY)
      }, 100);
  
      // for each selected:
      // - if newList contains selected, do nothing
      // - if newList doesn't contain selected, remove it from selected
      // - for any newList that was not in selectedElements, add it to selected
      const elemsToRemove = selectedElements.slice(), elemsToAdd = [],
        newList = getIntersectionList();
  
      // For every element in the intersection, add if not present in selectedElements.
      len = newList.length;
      for (i = 0; i < len; ++i) {
        const intElem = newList[i];
        // Found an element that was not selected before, so we should add it.
        if (!selectedElements.includes(intElem)) {
          elemsToAdd.push(intElem);
        }
        // Found an element that was already selected, so we shouldn't remove it.
        const foundInd = elemsToRemove.indexOf(intElem);
        if (foundInd !== -1) {
          elemsToRemove.splice(foundInd, 1);
        }
      }
  
      if (elemsToRemove.length > 0) {
        canvas.removeFromSelection(elemsToRemove);
      }
  
      if (elemsToAdd.length > 0) {
        canvas.addToSelection(elemsToAdd);
      }
  
      break;
    } case 'resize': {
      // we track the resize bounding box and translate/scale the selected element
      // while the mouse is down, when mouse goes up, we use this to recalculate
      // the shape's coordinates
      tlist = getTransformList(selected);
      const hasMatrix = hasMatrixTransform(tlist);
      box = hasMatrix ? initBbox : utilsGetBBox(selected);
      let left = box.x,
        top = box.y,
        {width, height} = box;
      dx = (x - startX);
      dy = (y - startY);
  
      if (curConfig.gridSnapping) {
        dx = snapToGrid(dx);
        dy = snapToGrid(dy);
        height = snapToGrid(height);
        width = snapToGrid(width);
      }
  
      // if rotated, adjust the dx,dy values
      angle = getRotationAngle(selected);
      if (angle) {
        const r = Math.sqrt(dx * dx + dy * dy),
          theta = Math.atan2(dy, dx) - angle * Math.PI / 180.0;
        dx = r * Math.cos(theta);
        dy = r * Math.sin(theta);
      }
  
      // if not stretching in y direction, set dy to 0
      // if not stretching in x direction, set dx to 0
      if (!currentResizeMode.includes('n') && !currentResizeMode.includes('s')) {
        dy = 0;
      }
      if (!currentResizeMode.includes('e') && !currentResizeMode.includes('w')) {
        dx = 0;
      }
  
      let // ts = null,
        tx = 0, ty = 0,
        sy = height ? (height + dy) / height : 1,
        sx = width ? (width + dx) / width : 1;
      // if we are dragging on the north side, then adjust the scale factor and ty
      if (currentResizeMode.includes('n')) {
        sy = height ? (height - dy) / height : 1;
        ty = height;
      }
  
      // if we dragging on the east side, then adjust the scale factor and tx
      if (currentResizeMode.includes('w')) {
        sx = width ? (width - dx) / width : 1;
        tx = width;
      }
  
      // update the transform list with translate,scale,translate
      const translateOrigin = svgroot.createSVGTransform(),
        scale = svgroot.createSVGTransform(),
        translateBack = svgroot.createSVGTransform();
  
      if (curConfig.gridSnapping) {
        left = snapToGrid(left);
        tx = snapToGrid(tx);
        top = snapToGrid(top);
        ty = snapToGrid(ty);
      }
  
      translateOrigin.setTranslate(-(left + tx), -(top + ty));
      if (evt.shiftKey) {
        if (sx === 1) {
          sx = sy;
        } else { sy = sx; }
      }
      scale.setScale(sx, sy);
  
      translateBack.setTranslate(left + tx, top + ty);
      if (hasMatrix) {
        const diff = angle ? 1 : 0;
        tlist.replaceItem(translateOrigin, 2 + diff);
        tlist.replaceItem(scale, 1 + diff);
        tlist.replaceItem(translateBack, Number(diff));
      } else {
        const N = tlist.numberOfItems;
        tlist.replaceItem(translateBack, N - 3);
        tlist.replaceItem(scale, N - 2);
        tlist.replaceItem(translateOrigin, N - 1);
      }
  
      selectorManager.requestSelector(selected).resize();
  
      call('transition', selectedElements);
  
      break;
    } case 'zoom': {
      realX *= currentZoom;
      realY *= currentZoom;
      assignAttributes(rubberBox, {
        x: Math.min(rStartX * currentZoom, realX),
        y: Math.min(rStartY * currentZoom, realY),
        width: Math.abs(realX - rStartX * currentZoom),
        height: Math.abs(realY - rStartY * currentZoom)
      }, 100);
      break;
    } case 'text': {
      assignAttributes(shape, {
        x,
        y
      }, 1000);
      break;
    } case 'line': {
      if (curConfig.gridSnapping) {
        x = snapToGrid(x);
        y = snapToGrid(y);
      }
  
      let x2 = x;
      let y2 = y;
  
      if (evt.shiftKey) {
        xya = snapToAngle(startX, startY, x2, y2);
        x2 = xya.x;
        y2 = xya.y;
      }
  
      shape.setAttribute('x2', x2);
      shape.setAttribute('y2', y2);
      break;
    } case 'foreignObject':
      // fall through
    case 'square':
      // fall through
    case 'rect':
      // fall through
    case 'image': {
      const square = (currentMode === 'square') || evt.shiftKey;
      let
        w = Math.abs(x - startX),
        h = Math.abs(y - startY);
      let newX, newY;
      if (square) {
        w = h = Math.max(w, h);
        newX = startX < x ? startX : startX - w;
        newY = startY < y ? startY : startY - h;
      } else {
        newX = Math.min(startX, x);
        newY = Math.min(startY, y);
      }
  
      if (curConfig.gridSnapping) {
        w = snapToGrid(w);
        h = snapToGrid(h);
        newX = snapToGrid(newX);
        newY = snapToGrid(newY);
      }
  
      assignAttributes(shape, {
        width: w,
        height: h,
        x: newX,
        y: newY
      }, 1000);
  
      break;
    } case 'circle': {
      c = $(shape).attr(['cx', 'cy']);
      ({cx, cy} = c);
      let rad = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
      if (curConfig.gridSnapping) {
        rad = snapToGrid(rad);
      }
      shape.setAttribute('r', rad);
      break;
    } case 'ellipse': {
      c = $(shape).attr(['cx', 'cy']);
      ({cx, cy} = c);
      if (curConfig.gridSnapping) {
        x = snapToGrid(x);
        cx = snapToGrid(cx);
        y = snapToGrid(y);
        cy = snapToGrid(cy);
      }
      shape.setAttribute('rx', Math.abs(x - cx));
      const ry = Math.abs(evt.shiftKey ? (x - cx) : (y - cy));
      shape.setAttribute('ry', ry);
      break;
    }
    case 'fhellipse':
    case 'fhrect': {
      freehand.minx = Math.min(realX, freehand.minx);
      freehand.maxx = Math.max(realX, freehand.maxx);
      freehand.miny = Math.min(realY, freehand.miny);
      freehand.maxy = Math.max(realY, freehand.maxy);
    }
    // Fallthrough
    case 'fhpath': {
      // dAttr += + realX + ',' + realY + ' ';
      // shape.setAttribute('points', dAttr);
      end.x = realX; end.y = realY;
      if (controllPoint2.x && controllPoint2.y) {
        for (i = 0; i < STEP_COUNT - 1; i++) {
          parameter = i / STEP_COUNT;
          nextParameter = (i + 1) / STEP_COUNT;
          bSpline = getBsplinePoint(nextParameter);
          nextPos = bSpline;
          bSpline = getBsplinePoint(parameter);
          sumDistance += Math.sqrt((nextPos.x - bSpline.x) * (nextPos.x - bSpline.x) + (nextPos.y - bSpline.y) * (nextPos.y - bSpline.y));
          if (sumDistance > THRESHOLD_DIST) {
            sumDistance -= THRESHOLD_DIST;
  
            // Faster than completely re-writing the points attribute.
            const point = this.svgContent.createSVGPoint();
            point.x = bSpline.x;
            point.y = bSpline.y;
            shape.points.appendItem(point);
          }
        }
      }
      controllPoint2 = {x: controllPoint1.x, y: controllPoint1.y};
      controllPoint1 = {x: start.x, y: start.y};
      start = {x: end.x, y: end.y};
      break;
    // update path stretch line coordinates
  } case 'path':
    // fall through
    case 'pathedit': {
      x *= currentZoom;
      y *= currentZoom;
  
      if (curConfig.gridSnapping) {
        x = snapToGrid(x);
        y = snapToGrid(y);
        startX = snapToGrid(startX);
        startY = snapToGrid(startY);
      }
      if (evt.shiftKey) {
        const {path} = pathModule;
        let x1, y1;
        if (path) {
          x1 = path.dragging ? path.dragging[0] : startX;
          y1 = path.dragging ? path.dragging[1] : startY;
        } else {
          x1 = startX;
          y1 = startY;
        }
        xya = snapToAngle(x1, y1, x, y);
        ({x, y} = xya);
      }
  
      if (rubberBox && rubberBox.getAttribute('display') !== 'none') {
        realX *= currentZoom;
        realY *= currentZoom;
        assignAttributes(rubberBox, {
          x: Math.min(rStartX * currentZoom, realX),
          y: Math.min(rStartY * currentZoom, realY),
          width: Math.abs(realX - rStartX * currentZoom),
          height: Math.abs(realY - rStartY * currentZoom)
        }, 100);
      }
      pathActions.mouseMove(x, y);
  
      break;
    } case 'textedit': {
      x *= currentZoom;
      y *= currentZoom;
      // if (rubberBox && rubberBox.getAttribute('display') !== 'none') {
      //   assignAttributes(rubberBox, {
      //     x: Math.min(startX, x),
      //     y: Math.min(startY, y),
      //     width: Math.abs(x - startX),
      //     height: Math.abs(y - startY)
      //   }, 100);
      // }
  
      textActions.mouseMove(mouseX, mouseY);
  
      break;
    } case 'rotate': {
      box = utilsGetBBox(selected);
      cx = box.x + box.width / 2;
      cy = box.y + box.height / 2;
      const m = getMatrix(selected),
        center = transformPoint(cx, cy, m);
      cx = center.x;
      cy = center.y;
      angle = ((Math.atan2(cy - y, cx - x) * (180 / Math.PI)) - 90) % 360;
      if (curConfig.gridSnapping) {
        angle = snapToGrid(angle);
      }
      if (evt.shiftKey) { // restrict rotations to nice angles (WRS)
        const snap = 45;
        angle = Math.round(angle / snap) * snap;
      }
  
      canvas.setRotationAngle(angle < -180 ? (360 + angle) : angle, true);
      call('transition', selectedElements);
      break;
    } default:
      break;
    }
  
    /**
    * The mouse has moved on the canvas area.
    * @event module:svgcanvas.SvgCanvas#event:ext_mouseMove
    * @type {PlainObject}
    * @property {MouseEvent} event The event object
    * @property {Float} mouse_x x coordinate on canvas
    * @property {Float} mouse_y y coordinate on canvas
    * @property {Element} selected Refers to the first selected element
    */
    runExtensions('mouseMove', /** @type {module:svgcanvas.SvgCanvas#event:ext_mouseMove} */ {
      event: evt,
      mouse_x: mouseX,
      mouse_y: mouseY,
      selected
    });
  }; // mouseMove()
  
  // - in create mode, the element's opacity is set properly, we create an InsertElementCommand
  // and store it on the Undo stack
  // - in move/resize mode, the element's attributes which were affected by the move/resize are
  // identified, a ChangeElementCommand is created and stored on the stack for those attrs
  // this is done in when we recalculate the selected dimensions()
  /**
   *
   * @param {MouseEvent} evt
   * @fires module:svgcanvas.SvgCanvas#event:zoomed
   * @fires module:svgcanvas.SvgCanvas#event:changed
   * @fires module:svgcanvas.SvgCanvas#event:ext_mouseUp
   * @returns {void}
   */
  const mouseUp = function (evt) {
    if (evt.button === 2) { return; }
    const tempJustSelected = justSelected;
    justSelected = null;
    if (!started) { return; }
    const pt = transformPoint(evt.pageX, evt.pageY, rootSctm),
      mouseX = pt.x * currentZoom,
      mouseY = pt.y * currentZoom,
      x = mouseX / currentZoom,
      y = mouseY / currentZoom;
  
    let element = getElem(getId());
    let keep = false;
  
    const realX = x;
    const realY = y;
  
    // TODO: Make true when in multi-unit mode
    const useUnit = false; // (curConfig.baseUnit !== 'px');
    started = false;
    let attrs, t;
    switch (currentMode) {
    // intentionally fall-through to select here
    case 'resize':
    case 'multiselect':
      if (!isNullish(rubberBox)) {
        rubberBox.setAttribute('display', 'none');
        curBBoxes = [];
      }
      currentMode = 'select';
      // Fallthrough
    case 'select':
      if (!isNullish(selectedElements[0])) {
        // if we only have one selected element
        if (isNullish(selectedElements[1])) {
          // set our current stroke/fill properties to the element's
          const selected = selectedElements[0];
          switch (selected.tagName) {
          case 'g':
          case 'use':
          case 'image':
          case 'foreignObject':
            break;
          default:
            curProperties.fill = selected.getAttribute('fill');
            curProperties.fill_opacity = selected.getAttribute('fill-opacity');
            curProperties.stroke = selected.getAttribute('stroke');
            curProperties.stroke_opacity = selected.getAttribute('stroke-opacity');
            curProperties.stroke_width = selected.getAttribute('stroke-width');
            curProperties.stroke_dasharray = selected.getAttribute('stroke-dasharray');
            curProperties.stroke_linejoin = selected.getAttribute('stroke-linejoin');
            curProperties.stroke_linecap = selected.getAttribute('stroke-linecap');
          }
  
          if (selected.tagName === 'text') {
            curText.font_size = selected.getAttribute('font-size');
            curText.font_family = selected.getAttribute('font-family');
          }
          selectorManager.requestSelector(selected).showGrips(true);
  
          // This shouldn't be necessary as it was done on mouseDown...
          // call('selected', [selected]);
        }
        // always recalculate dimensions to strip off stray identity transforms
        recalculateAllSelectedDimensions();
        // if it was being dragged/resized
        if (realX !== rStartX || realY !== rStartY) {
          const len = selectedElements.length;
          for (let i = 0; i < len; ++i) {
            if (isNullish(selectedElements[i])) { break; }
            if (!selectedElements[i].firstChild) {
              // Not needed for groups (incorrectly resizes elems), possibly not needed at all?
              selectorManager.requestSelector(selectedElements[i]).resize();
            }
          }
        // no change in position/size, so maybe we should move to pathedit
        } else {
          t = evt.target;
          if (selectedElements[0].nodeName === 'path' && isNullish(selectedElements[1])) {
            pathActions.select(selectedElements[0]);
          // if it was a path
          // else, if it was selected and this is a shift-click, remove it from selection
          } else if (evt.shiftKey) {
            if (tempJustSelected !== t) {
              canvas.removeFromSelection([t]);
            }
          }
        } // no change in mouse position
  
        // Remove non-scaling stroke
        if (supportsNonScalingStroke()) {
          const elem = selectedElements[0];
          if (elem) {
            elem.removeAttribute('style');
            walkTree(elem, function (el) {
              el.removeAttribute('style');
            });
          }
        }
      }
      return;
    case 'zoom': {
      if (!isNullish(rubberBox)) {
        rubberBox.setAttribute('display', 'none');
      }
      const factor = evt.shiftKey ? 0.5 : 2;
      call('zoomed', {
        x: Math.min(rStartX, realX),
        y: Math.min(rStartY, realY),
        width: Math.abs(realX - rStartX),
        height: Math.abs(realY - rStartY),
        factor
      });
      return;
    } case 'fhpath': {
      // Check that the path contains at least 2 points; a degenerate one-point path
      // causes problems.
      // Webkit ignores how we set the points attribute with commas and uses space
      // to separate all coordinates, see https://bugs.webkit.org/show_bug.cgi?id=29870
      sumDistance = 0;
      controllPoint2 = {x: 0, y: 0};
      controllPoint1 = {x: 0, y: 0};
      start = {x: 0, y: 0};
      end = {x: 0, y: 0};
      const coords = element.getAttribute('points');
      const commaIndex = coords.indexOf(',');
      if (commaIndex >= 0) {
        keep = coords.includes(',', commaIndex + 1);
      } else {
        keep = coords.includes(' ', coords.indexOf(' ') + 1);
      }
      if (keep) {
        element = pathActions.smoothPolylineIntoPath(element);
      }
      break;
    } case 'line':
      attrs = $(element).attr(['x1', 'x2', 'y1', 'y2']);
      keep = (attrs.x1 !== attrs.x2 || attrs.y1 !== attrs.y2);
      break;
    case 'foreignObject':
    case 'square':
    case 'rect':
    case 'image':
      attrs = $(element).attr(['width', 'height']);
      // Image should be kept regardless of size (use inherit dimensions later)
      keep = (attrs.width || attrs.height) || currentMode === 'image';
      break;
    case 'circle':
      keep = (element.getAttribute('r') !== '0');
      break;
    case 'ellipse':
      attrs = $(element).attr(['rx', 'ry']);
      keep = (attrs.rx || attrs.ry);
      break;
    case 'fhellipse':
      if ((freehand.maxx - freehand.minx) > 0 &&
        (freehand.maxy - freehand.miny) > 0) {
        element = addSVGElementFromJson({
          element: 'ellipse',
          curStyles: true,
          attr: {
            cx: (freehand.minx + freehand.maxx) / 2,
            cy: (freehand.miny + freehand.maxy) / 2,
            rx: (freehand.maxx - freehand.minx) / 2,
            ry: (freehand.maxy - freehand.miny) / 2,
            id: getId()
          }
        });
        call('changed', [element]);
        keep = true;
      }
      break;
    case 'fhrect':
      if ((freehand.maxx - freehand.minx) > 0 &&
        (freehand.maxy - freehand.miny) > 0) {
        element = addSVGElementFromJson({
          element: 'rect',
          curStyles: true,
          attr: {
            x: freehand.minx,
            y: freehand.miny,
            width: (freehand.maxx - freehand.minx),
            height: (freehand.maxy - freehand.miny),
            id: getId()
          }
        });
        call('changed', [element]);
        keep = true;
      }
      break;
    case 'text':
      keep = true;
      selectOnly([element]);
      textActions.start(element);
      break;
    case 'path': {
      // set element to null here so that it is not removed nor finalized
      element = null;
      // continue to be set to true so that mouseMove happens
      started = true;
  
      const res = pathActions.mouseUp(evt, element, mouseX, mouseY);
      ({element} = res);
      ({keep} = res);
      break;
    } case 'pathedit':
      keep = true;
      element = null;
      pathActions.mouseUp(evt);
      break;
    case 'textedit':
      keep = false;
      element = null;
      textActions.mouseUp(evt, mouseX, mouseY);
      break;
    case 'rotate': {
      keep = true;
      element = null;
      currentMode = 'select';
      const batchCmd = canvas.undoMgr.finishUndoableChange();
      if (!batchCmd.isEmpty()) {
        addCommandToHistory(batchCmd);
      }
      // perform recalculation to weed out any stray identity transforms that might get stuck
      recalculateAllSelectedDimensions();
      call('changed', selectedElements);
      break;
    } default:
      // This could occur in an extension
      break;
    }
  
    /**
    * The main (left) mouse button is released (anywhere).
    * @event module:svgcanvas.SvgCanvas#event:ext_mouseUp
    * @type {PlainObject}
    * @property {MouseEvent} event The event object
    * @property {Float} mouse_x x coordinate on canvas
    * @property {Float} mouse_y y coordinate on canvas
    */
    const extResult = runExtensions('mouseUp', /** @type {module:svgcanvas.SvgCanvas#event:ext_mouseUp} */ {
      event: evt,
      mouse_x: mouseX,
      mouse_y: mouseY
    }, true);
  
    $.each(extResult, function (i, r) {
      if (r) {
        keep = r.keep || keep;
        ({element} = r);
        started = r.started || started;
      }
    });
  
    if (!keep && !isNullish(element)) {
      getCurrentDrawing().releaseId(getId());
      element.remove();
      element = null;
  
      t = evt.target;
  
      // if this element is in a group, go up until we reach the top-level group
      // just below the layer groups
      // TODO: once we implement links, we also would have to check for <a> elements
      while (t && t.parentNode && t.parentNode.parentNode && t.parentNode.parentNode.tagName === 'g') {
        t = t.parentNode;
      }
      // if we are not in the middle of creating a path, and we've clicked on some shape,
      // then go to Select mode.
      // WebKit returns <div> when the canvas is clicked, Firefox/Opera return <svg>
      if ((currentMode !== 'path' || !drawnPath) &&
        t && t.parentNode &&
        t.parentNode.id !== 'selectorParentGroup' &&
        t.id !== 'svgcanvas' && t.id !== 'svgroot'
      ) {
        // switch into "select" mode if we've clicked on an element
        canvas.setMode('select');
        selectOnly([t], true);
      }
    } else if (!isNullish(element)) {
      /**
      * @name module:svgcanvas.SvgCanvas#addedNew
      * @type {boolean}
      */
      canvas.addedNew = true;
  
      if (useUnit) { convertAttrs(element); }
  
      let aniDur = 0.2;
      let cAni;
      if (opacAni.beginElement && Number.parseFloat(element.getAttribute('opacity')) !== curShape.opacity) {
        cAni = $(opacAni).clone().attr({
          to: curShape.opacity,
          dur: aniDur
        }).appendTo(element);
        try {
          // Fails in FF4 on foreignObject
          cAni[0].beginElement();
        } catch (e) {}
      } else {
        aniDur = 0;
      }
  
      // Ideally this would be done on the endEvent of the animation,
      // but that doesn't seem to be supported in Webkit
      setTimeout(function () {
        if (cAni) { cAni.remove(); }
        element.setAttribute('opacity', curShape.opacity);
        element.setAttribute('style', 'pointer-events:inherit');
        cleanupElement(element);
        if (currentMode === 'path') {
          pathActions.toEditMode(element);
        } else if (curConfig.selectNew) {
          selectOnly([element], true);
        }
        // we create the insert command that is stored on the stack
        // undo means to call cmd.unapply(), redo means to call cmd.apply()
        addCommandToHistory(new InsertElementCommand(element));
  
        call('changed', [element]);
      }, aniDur * 1000);
    }
  
    startTransform = null;
  };
  
  const dblClick = function (evt) {
    const evtTarget = evt.target;
    const parent = evtTarget.parentNode;
  
    let mouseTarget = getMouseTarget(evt);
    const {tagName} = mouseTarget;
  
    if (tagName === 'text' && currentMode !== 'textedit') {
      const pt = transformPoint(evt.pageX, evt.pageY, rootSctm);
      textActions.select(mouseTarget, pt.x, pt.y);
    }
  
    // Do nothing if already in current group
    if (parent === currentGroup) { return; }
  
    if ((tagName === 'g' || tagName === 'a') &&
      getRotationAngle(mouseTarget)
    ) {
      // TODO: Allow method of in-group editing without having to do
      // this (similar to editing rotated paths)
  
      // Ungroup and regroup
      pushGroupProperties(mouseTarget);
      mouseTarget = selectedElements[0];
      clearSelection(true);
    }
    // Reset context
    if (currentGroup) {
      draw.leaveContext();
    }
  
    if ((parent.tagName !== 'g' && parent.tagName !== 'a') ||
      parent === getCurrentDrawing().getCurrentLayer() ||
      mouseTarget === selectorManager.selectorParentGroup
    ) {
      // Escape from in-group edit
      return;
    }
    draw.setContext(mouseTarget);
  };
  
  // prevent links from being followed in the canvas
  const handleLinkInCanvas = function (e) {
    e.preventDefault();
    return false;
  };
  
  // Added mouseup to the container here.
  // TODO(codedread): Figure out why after the Closure compiler, the window mouseup is ignored.
  $(container).mousedown(mouseDown).mousemove(mouseMove).click(handleLinkInCanvas).dblclick(dblClick).mouseup(mouseUp);
  // $(window).mouseup(mouseUp);
  
  // TODO(rafaelcastrocouto): User preference for shift key and zoom factor
  $(container).bind(
    'mousewheel DOMMouseScroll',
    /**
     * @param {Event} e
     * @fires module:svgcanvas.SvgCanvas#event:updateCanvas
     * @fires module:svgcanvas.SvgCanvas#event:zoomDone
     * @returns {void}
     */
    function (e) {
      if (!e.shiftKey) { return; }
  
      e.preventDefault();
      const evt = e.originalEvent;
  
      rootSctm = $('#svgcontent g')[0].getScreenCTM().inverse();
  
      const workarea = $('#workarea');
      const scrbar = 15;
      const rulerwidth = curConfig.showRulers ? 16 : 0;
  
      // mouse relative to content area in content pixels
      const pt = transformPoint(evt.pageX, evt.pageY, rootSctm);
  
      // full work area width in screen pixels
      const editorFullW = workarea.width();
      const editorFullH = workarea.height();
  
      // work area width minus scroll and ruler in screen pixels
      const editorW = editorFullW - scrbar - rulerwidth;
      const editorH = editorFullH - scrbar - rulerwidth;
  
      // work area width in content pixels
      const workareaViewW = editorW * rootSctm.a;
      const workareaViewH = editorH * rootSctm.d;
  
      // content offset from canvas in screen pixels
      const wOffset = workarea.offset();
      const wOffsetLeft = wOffset.left + rulerwidth;
      const wOffsetTop = wOffset.top + rulerwidth;
  
      const delta = (evt.wheelDelta) ? evt.wheelDelta : (evt.detail) ? -evt.detail : 0;
      if (!delta) { return; }
  
      let factor = Math.max(3 / 4, Math.min(4 / 3, (delta)));
  
      let wZoom, hZoom;
      if (factor > 1) {
        wZoom = Math.ceil(editorW / workareaViewW * factor * 100) / 100;
        hZoom = Math.ceil(editorH / workareaViewH * factor * 100) / 100;
      } else {
        wZoom = Math.floor(editorW / workareaViewW * factor * 100) / 100;
        hZoom = Math.floor(editorH / workareaViewH * factor * 100) / 100;
      }
      let zoomlevel = Math.min(wZoom, hZoom);
      zoomlevel = Math.min(10, Math.max(0.01, zoomlevel));
      if (zoomlevel === currentZoom) {
        return;
      }
      factor = zoomlevel / currentZoom;
  
      // top left of workarea in content pixels before zoom
      const topLeftOld = transformPoint(wOffsetLeft, wOffsetTop, rootSctm);
  
      // top left of workarea in content pixels after zoom
      const topLeftNew = {
        x: pt.x - (pt.x - topLeftOld.x) / factor,
        y: pt.y - (pt.y - topLeftOld.y) / factor
      };
  
      // top left of workarea in canvas pixels relative to content after zoom
      const topLeftNewCanvas = {
        x: topLeftNew.x * zoomlevel,
        y: topLeftNew.y * zoomlevel
      };
  
      // new center in canvas pixels
      const newCtr = {
        x: topLeftNewCanvas.x - rulerwidth + editorFullW / 2,
        y: topLeftNewCanvas.y - rulerwidth + editorFullH / 2
      };
  
      canvas.setZoom(zoomlevel);
      $('#zoom').val((zoomlevel * 100).toFixed(1));
  
      call('updateCanvas', {center: false, newCtr});
      call('zoomDone');
    }
  );
  }());