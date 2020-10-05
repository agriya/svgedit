/**
* @name undoMgr
* @memberof module:svgcanvas.SvgCanvas#
* @type {module:history.HistoryEventHandler}
*/
const undoMgr = canvas.undoMgr = new UndoManager({
    /**
     * @param {string} eventType One of the HistoryEvent types
     * @param {module:history.HistoryCommand} cmd Fulfills the HistoryCommand interface
     * @fires module:svgcanvas.SvgCanvas#event:changed
     * @returns {void}
     */
    handleHistoryEvent (eventType, cmd) {
      const EventTypes = HistoryEventTypes;
      // TODO: handle setBlurOffsets.
      if (eventType === EventTypes.BEFORE_UNAPPLY || eventType === EventTypes.BEFORE_APPLY) {
        canvas.clearSelection();
      } else if (eventType === EventTypes.AFTER_APPLY || eventType === EventTypes.AFTER_UNAPPLY) {
        const elems = cmd.elements();
        canvas.pathActions.clear();
        call('changed', elems);
        const cmdType = cmd.type();
        const isApply = (eventType === EventTypes.AFTER_APPLY);
        if (cmdType === MoveElementCommand.type()) {
          const parent = isApply ? cmd.newParent : cmd.oldParent;
          if (parent === svgcontent) {
            draw.identifyLayers();
          }
        } else if (cmdType === InsertElementCommand.type() ||
            cmdType === RemoveElementCommand.type()) {
          if (cmd.parent === svgcontent) {
            draw.identifyLayers();
          }
          if (cmdType === InsertElementCommand.type()) {
            if (isApply) { restoreRefElems(cmd.elem); }
          } else if (!isApply) {
            restoreRefElems(cmd.elem);
          }
          if (cmd.elem && cmd.elem.tagName === 'use') {
            setUseData(cmd.elem);
          }
        } else if (cmdType === ChangeElementCommand.type()) {
          // if we are changing layer names, re-identify all layers
          if (cmd.elem.tagName === 'title' &&
            cmd.elem.parentNode.parentNode === svgcontent
          ) {
            draw.identifyLayers();
          }
          const values = isApply ? cmd.newValues : cmd.oldValues;
          // If stdDeviation was changed, update the blur.
          if (values.stdDeviation) {
            canvas.setBlurOffsets(cmd.elem.parentNode, values.stdDeviation);
          }
          // This is resolved in later versions of webkit, perhaps we should
          // have a featured detection for correct 'use' behavior?
          // ——————————
          // Remove & Re-add hack for Webkit (issue 775)
          // if (cmd.elem.tagName === 'use' && isWebkit()) {
          //  const {elem} = cmd;
          //  if (!elem.getAttribute('x') && !elem.getAttribute('y')) {
          //    const parent = elem.parentNode;
          //    const sib = elem.nextSibling;
          //    elem.remove();
          //    parent.insertBefore(elem, sib);
          //    // Ok to replace above with this? `sib.before(elem);`
          //  }
          // }
        }
      }
    }
  });
  
  /**
  * This should really be an intersection applying to all types rather than a union.
  * @name module:svgcanvas~addCommandToHistory
  * @type {module:path.EditorContext#addCommandToHistory|module:draw.DrawCanvasInit#addCommandToHistory}
  */
  const addCommandToHistory = function (cmd) {
    canvas.undoMgr.addCommandToHistory(cmd);
  };
  