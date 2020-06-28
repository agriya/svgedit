this.runExtension = function (name, action, vars) {
    return this.runExtensions(action, vars, false, (n) => n === name);
  };
  /**
  * @typedef {module:svgcanvas.ExtensionMouseDownStatus|module:svgcanvas.ExtensionMouseUpStatus|module:svgcanvas.ExtensionIDsUpdatedStatus|module:locale.ExtensionLocaleData[]|void} module:svgcanvas.ExtensionStatus
  * @tutorial ExtensionDocs
  */
  /**
  * @callback module:svgcanvas.ExtensionVarBuilder
  * @param {string} name The name of the extension
  * @returns {module:svgcanvas.SvgCanvas#event:ext_addLangData}
  */
  /**
  * @callback module:svgcanvas.ExtensionNameFilter
  * @param {string} name
  * @returns {boolean}
  */
  /**
  * @todo Consider: Should this return an array by default, so extension results aren't overwritten?
  * @todo Would be easier to document if passing in object with key of action and vars as value; could then define an interface which tied both together
  * @function module:svgcanvas.SvgCanvas#runExtensions
  * @param {"mouseDown"|"mouseMove"|"mouseUp"|"zoomChanged"|"IDsUpdated"|"canvasUpdated"|"toolButtonStateUpdate"|"selectedChanged"|"elementTransition"|"elementChanged"|"langReady"|"langChanged"|"addLangData"|"onNewDocument"|"workareaResized"} action
  * @param {module:svgcanvas.SvgCanvas#event:ext_mouseDown|module:svgcanvas.SvgCanvas#event:ext_mouseMove|module:svgcanvas.SvgCanvas#event:ext_mouseUp|module:svgcanvas.SvgCanvas#event:ext_zoomChanged|module:svgcanvas.SvgCanvas#event:ext_IDsUpdated|module:svgcanvas.SvgCanvas#event:ext_canvasUpdated|module:svgcanvas.SvgCanvas#event:ext_toolButtonStateUpdate|module:svgcanvas.SvgCanvas#event:ext_selectedChanged|module:svgcanvas.SvgCanvas#event:ext_elementTransition|module:svgcanvas.SvgCanvas#event:ext_elementChanged|module:svgcanvas.SvgCanvas#event:ext_langReady|module:svgcanvas.SvgCanvas#event:ext_langChanged|module:svgcanvas.SvgCanvas#event:ext_addLangData|module:svgcanvas.SvgCanvas#event:ext_onNewDocument|module:svgcanvas.SvgCanvas#event:ext_workareaResized|module:svgcanvas.ExtensionVarBuilder} [vars]
  * @param {boolean} [returnArray]
  * @param {module:svgcanvas.ExtensionNameFilter} nameFilter
  * @returns {GenericArray<module:svgcanvas.ExtensionStatus>|module:svgcanvas.ExtensionStatus|false} See {@tutorial ExtensionDocs} on the ExtensionStatus.
  */
  const runExtensions = this.runExtensions = function (action, vars, returnArray, nameFilter) {
    let result = returnArray ? [] : false;
    $.each(extensions, function (name, ext) {
      if (nameFilter && !nameFilter(name)) {
        return;
      }
      if (ext && action in ext) {
        if (typeof vars === 'function') {
          vars = vars(name); // ext, action
        }
        if (returnArray) {
          result.push(ext[action](vars));
        } else {
          result = ext[action](vars);
        }
      }
    });
    return result;
  };
  
  /**
  * @typedef {PlainObject} module:svgcanvas.ExtensionMouseDownStatus
  * @property {boolean} started Indicates that creating/editing has started
  */
  /**
  * @typedef {PlainObject} module:svgcanvas.ExtensionMouseUpStatus
  * @property {boolean} keep Indicates if the current element should be kept
  * @property {boolean} started Indicates if editing should still be considered as "started"
  * @property {Element} element The element being affected
  */
  /**
  * @typedef {PlainObject} module:svgcanvas.ExtensionIDsUpdatedStatus
  * @property {string[]} remove Contains string IDs (used by `ext-connector.js`)
  */
  
  /**
   * @interface module:svgcanvas.ExtensionInitResponse
   * @property {module:SVGEditor.ContextTool[]|PlainObject<string, module:SVGEditor.ContextTool>} [context_tools]
   * @property {module:SVGEditor.Button[]|PlainObject<Integer, module:SVGEditor.Button>} [buttons]
   * @property {string} [svgicons] The location of a local SVG or SVGz file
  */
  /**
   * @function module:svgcanvas.ExtensionInitResponse#mouseDown
   * @param {module:svgcanvas.SvgCanvas#event:ext_mouseDown} arg
   * @returns {void|module:svgcanvas.ExtensionMouseDownStatus}
   */
  /**
   * @function module:svgcanvas.ExtensionInitResponse#mouseMove
   * @param {module:svgcanvas.SvgCanvas#event:ext_mouseMove} arg
   * @returns {void}
  */
  /**
   * @function module:svgcanvas.ExtensionInitResponse#mouseUp
   * @param {module:svgcanvas.SvgCanvas#event:ext_mouseUp} arg
   * @returns {module:svgcanvas.ExtensionMouseUpStatus}
   */
  /**
   * @function module:svgcanvas.ExtensionInitResponse#zoomChanged
   * @param {module:svgcanvas.SvgCanvas#event:ext_zoomChanged} arg
   * @returns {void}
  */
  /**
   * @function module:svgcanvas.ExtensionInitResponse#IDsUpdated
   * @param {module:svgcanvas.SvgCanvas#event:ext_IDsUpdated} arg
   * @returns {module:svgcanvas.ExtensionIDsUpdatedStatus}
   */
  /**
   * @function module:svgcanvas.ExtensionInitResponse#canvasUpdated
   * @param {module:svgcanvas.SvgCanvas#event:ext_canvasUpdated} arg
   * @returns {void}
  */
  /**
   * @function module:svgcanvas.ExtensionInitResponse#toolButtonStateUpdate
   * @param {module:svgcanvas.SvgCanvas#event:ext_toolButtonStateUpdate} arg
   * @returns {void}
  */
  /**
   * @function module:svgcanvas.ExtensionInitResponse#selectedChanged
   * @param {module:svgcanvas.SvgCanvas#event:ext_selectedChanged} arg
   * @returns {void}
  */
  /**
   * @function module:svgcanvas.ExtensionInitResponse#elementTransition
   * @param {module:svgcanvas.SvgCanvas#event:ext_elementTransition} arg
   * @returns {void}
  */
  /**
   * @function module:svgcanvas.ExtensionInitResponse#elementChanged
   * @param {module:svgcanvas.SvgCanvas#event:ext_elementChanged} arg
   * @returns {void}
  */
  /**
   * @function module:svgcanvas.ExtensionInitResponse#langReady
   * @param {module:svgcanvas.SvgCanvas#event:ext_langReady} arg
   * @returns {void}
  */
  /**
   * @function module:svgcanvas.ExtensionInitResponse#langChanged
   * @param {module:svgcanvas.SvgCanvas#event:ext_langChanged} arg
   * @returns {void}
  */
  /**
   * @function module:svgcanvas.ExtensionInitResponse#addLangData
   * @param {module:svgcanvas.SvgCanvas#event:ext_addLangData} arg
   * @returns {Promise<module:locale.ExtensionLocaleData>} Resolves to {@link module:locale.ExtensionLocaleData}
  */
  /**
   * @function module:svgcanvas.ExtensionInitResponse#onNewDocument
   * @param {module:svgcanvas.SvgCanvas#event:ext_onNewDocument} arg
   * @returns {void}
  */
  /**
   * @function module:svgcanvas.ExtensionInitResponse#workareaResized
   * @param {module:svgcanvas.SvgCanvas#event:ext_workareaResized} arg
   * @returns {void}
  */
  /**
   * @function module:svgcanvas.ExtensionInitResponse#callback
   * @this module:SVGEditor
   * @param {module:svgcanvas.SvgCanvas#event:ext_callback} arg
   * @returns {void}
  */
  
  /**
  * @callback module:svgcanvas.ExtensionInitCallback
  * @this module:SVGEditor
  * @param {module:svgcanvas.ExtensionArgumentObject} arg
  * @returns {Promise<module:svgcanvas.ExtensionInitResponse|void>} Resolves to [ExtensionInitResponse]{@link module:svgcanvas.ExtensionInitResponse} or `undefined`
  */
  /**
  * @typedef {PlainObject} module:svgcanvas.ExtensionInitArgs
  * @property {external:jQuery} $
  * @property {module:SVGEditor~ImportLocale} importLocale
  */
  /**
  * Add an extension to the editor.
  * @function module:svgcanvas.SvgCanvas#addExtension
  * @param {string} name - String with the ID of the extension. Used internally; no need for i18n.
  * @param {module:svgcanvas.ExtensionInitCallback} [extInitFunc] - Function supplied by the extension with its data
  * @param {module:svgcanvas.ExtensionInitArgs} initArgs
  * @fires module:svgcanvas.SvgCanvas#event:extension_added
  * @throws {TypeError|Error} `TypeError` if `extInitFunc` is not a function, `Error`
  *   if extension of supplied name already exists
  * @returns {Promise<void>} Resolves to `undefined`
  */
  this.addExtension = async function (name, extInitFunc, {$: jq, importLocale}) {
    if (typeof extInitFunc !== 'function') {
      throw new TypeError('Function argument expected for `svgcanvas.addExtension`');
    }
    if (name in extensions) {
      throw new Error('Cannot add extension "' + name + '", an extension by that name already exists.');
    }
    // Provide private vars/funcs here. Is there a better way to do this?
    /**
     * @typedef {module:svgcanvas.PrivateMethods} module:svgcanvas.ExtensionArgumentObject
     * @property {SVGSVGElement} svgroot See {@link module:svgcanvas~svgroot}
     * @property {SVGSVGElement} svgcontent See {@link module:svgcanvas~svgcontent}
     * @property {!(string|Integer)} nonce See {@link module:draw.Drawing#getNonce}
     * @property {module:select.SelectorManager} selectorManager
     * @property {module:SVGEditor~ImportLocale} importLocale
     */
    /**
     * @type {module:svgcanvas.ExtensionArgumentObject}
     * @see {@link module:svgcanvas.PrivateMethods} source for the other methods/properties
     */
    const argObj = $.extend(canvas.getPrivateMethods(), {
      $: jq,
      importLocale,
      svgroot,
      svgcontent,
      nonce: getCurrentDrawing().getNonce(),
      selectorManager
    });
    const extObj = await extInitFunc(argObj);
    if (extObj) {
      extObj.name = name;
    }
  
    extensions[name] = extObj;
    return call('extension_added', extObj);
  };

  // Set scope for these functions

// Object to contain editor event names and callback functions
const events = {};

canvas.call = call;
/**
 * Array of what was changed (elements, layers).
 * @event module:svgcanvas.SvgCanvas#event:changed
 * @type {Element[]}
 */
/**
 * Array of selected elements.
 * @event module:svgcanvas.SvgCanvas#event:selected
 * @type {Element[]}
 */
/**
 * Array of selected elements.
 * @event module:svgcanvas.SvgCanvas#event:transition
 * @type {Element[]}
 */
/**
 * The Element is always `SVGGElement`?
 * If not `null`, will be the set current group element.
 * @event module:svgcanvas.SvgCanvas#event:contextset
 * @type {null|Element}
 */
/**
 * @event module:svgcanvas.SvgCanvas#event:pointsAdded
 * @type {PlainObject}
 * @property {boolean} closedSubpath
 * @property {SVGCircleElement[]} grips Grips elements
 */

/**
 * @event module:svgcanvas.SvgCanvas#event:zoomed
 * @type {PlainObject}
 * @property {Float} x
 * @property {Float} y
 * @property {Float} width
 * @property {Float} height
 * @property {0.5|2} factor
 * @see module:SVGEditor.BBoxObjectWithFactor
 */
/**
 * @event module:svgcanvas.SvgCanvas#event:updateCanvas
 * @type {PlainObject}
 * @property {false} center
 * @property {module:math.XYObject} newCtr
 */
/**
 * @typedef {PlainObject} module:svgcanvas.ExtensionInitResponsePlusName
 * @implements {module:svgcanvas.ExtensionInitResponse}
 * @property {string} name The extension's resolved ID (whether explicit or based on file name)
 */
/**
 * Generalized extension object response of
 * [`init()`]{@link module:svgcanvas.ExtensionInitCallback}
 * along with the name of the extension.
 * @event module:svgcanvas.SvgCanvas#event:extension_added
 * @type {module:svgcanvas.ExtensionInitResponsePlusName|void}
 */
/**
 * @event module:svgcanvas.SvgCanvas#event:extensions_added
 * @type {void}
*/
/**
 * @typedef {PlainObject} module:svgcanvas.Message
 * @property {any} data The data
 * @property {string} origin The origin
 */
/**
 * @event module:svgcanvas.SvgCanvas#event:message
 * @type {module:svgcanvas.Message}
 */
/**
 * SVG canvas converted to string.
 * @event module:svgcanvas.SvgCanvas#event:saved
 * @type {string}
 */
/**
 * @event module:svgcanvas.SvgCanvas#event:setnonce
 * @type {!(string|Integer)}
 */
/**
 * @event module:svgcanvas.SvgCanvas#event:unsetnonce
 * @type {void}
 */
/**
 * @event module:svgcanvas.SvgCanvas#event:zoomDone
 * @type {void}
*/
/**
 * @event module:svgcanvas.SvgCanvas#event:cleared
 * @type {void}
*/

/**
 * @event module:svgcanvas.SvgCanvas#event:exported
 * @type {module:svgcanvas.ImageExportedResults}
 */
/**
 * @event module:svgcanvas.SvgCanvas#event:exportedPDF
 * @type {module:svgcanvas.PDFExportedResults}
 */
/**
 * Creating a cover-all class until {@link https://github.com/jsdoc3/jsdoc/issues/1545} may be supported.
 * `undefined` may be returned by {@link module:svgcanvas.SvgCanvas#event:extension_added} if the extension's `init` returns `undefined` It is also the type for the following events "zoomDone", "unsetnonce", "cleared", and "extensions_added".
 * @event module:svgcanvas.SvgCanvas#event:GenericCanvasEvent
 * @type {module:svgcanvas.SvgCanvas#event:selected|module:svgcanvas.SvgCanvas#event:changed|module:svgcanvas.SvgCanvas#event:contextset|module:svgcanvas.SvgCanvas#event:pointsAdded|module:svgcanvas.SvgCanvas#event:extension_added|module:svgcanvas.SvgCanvas#event:extensions_added|module:svgcanvas.SvgCanvas#event:message|module:svgcanvas.SvgCanvas#event:transition|module:svgcanvas.SvgCanvas#event:zoomed|module:svgcanvas.SvgCanvas#event:updateCanvas|module:svgcanvas.SvgCanvas#event:saved|module:svgcanvas.SvgCanvas#event:exported|module:svgcanvas.SvgCanvas#event:exportedPDF|module:svgcanvas.SvgCanvas#event:setnonce|module:svgcanvas.SvgCanvas#event:unsetnonce|void}
 */

/**
 * The promise return, if present, resolves to `undefined`
 *  (`extension_added`, `exported`, `saved`).
 * @typedef {Promise<void>|void} module:svgcanvas.EventHandlerReturn
*/

/**
* @callback module:svgcanvas.EventHandler
* @param {external:Window} win
* @param {module:svgcanvas.SvgCanvas#event:GenericCanvasEvent} arg
* @listens module:svgcanvas.SvgCanvas#event:GenericCanvasEvent
* @returns {module:svgcanvas.EventHandlerReturn}
*/

/**
* Attaches a callback function to an event.
* @function module:svgcanvas.SvgCanvas#bind
* @param {"changed"|"contextset"|"selected"|"pointsAdded"|"extension_added"|"extensions_added"|"message"|"transition"|"zoomed"|"updateCanvas"|"zoomDone"|"saved"|"exported"|"exportedPDF"|"setnonce"|"unsetnonce"|"cleared"} ev - String indicating the name of the event
* @param {module:svgcanvas.EventHandler} f - The callback function to bind to the event
* @returns {module:svgcanvas.EventHandler} The previous event
*/
bind = function (ev, f) {
  const old = events[ev];
  events[ev] = f;
  return old;
};