/**
* @typedef {PlainObject} module:svgcanvas.SVGAsJSON
* @property {string} element
* @property {PlainObject<string, string>} attr
* @property {module:svgcanvas.SVGAsJSON[]} children
*/

/**
* @function module:svgcanvas.SvgCanvas#getContentElem
* @param {Text|Element} data
* @returns {module:svgcanvas.SVGAsJSON}
*/
export const getJsonFromSvgElement = function (data) {
  // Text node
  if (data.nodeType === 3) return data.nodeValue;

  const retval = {
    element: data.tagName,
    // namespace: nsMap[data.namespaceURI],
    attr: {},
    children: []
  };

  // Iterate attributes
  for (let i = 0, attr; (attr = data.attributes[i]); i++) {
    retval.attr[attr.name] = attr.value;
  }

  // Iterate children
  for (let i = 0, node; (node = data.childNodes[i]); i++) {
    retval.children[i] = getJsonFromSvgElement(node);
  }

  return retval;
};

/**
  * This should really be an intersection implementing all rather than a union.
  * @name module:svgcanvas.SvgCanvas#addSVGElementFromJson
  * @type {module:utilities.EditorContext#addSVGElementFromJson|module:path.EditorContext#addSVGElementFromJson}
  */
export const addSVGElementFromJson = this.addSVGElementFromJson = function (data) {
  if (typeof data === 'string') return this.svgdoc.createTextNode(data);

  let shape = getElem(data.attr.id);
  // if shape is a path but we need to create a rect/ellipse, then remove the path
  const currentLayer = getCurrentDrawing().getCurrentLayer();
  if (shape && data.element !== shape.tagName) {
    shape.remove();
    shape = null;
  }
  if (!shape) {
    const ns = data.namespace || NS.SVG;
    shape = this.svgdoc.createElementNS(ns, data.element);
    if (currentLayer) {
      (currentGroup || currentLayer).append(shape);
    }
  }
  if (data.curStyles) {
    assignAttributes(shape, {
      fill: curShape.fill,
      stroke: curShape.stroke,
      'stroke-width': curShape.stroke_width,
      'stroke-dasharray': curShape.stroke_dasharray,
      'stroke-linejoin': curShape.stroke_linejoin,
      'stroke-linecap': curShape.stroke_linecap,
      'stroke-opacity': curShape.stroke_opacity,
      'fill-opacity': curShape.fill_opacity,
      opacity: curShape.opacity / 2,
      style: 'pointer-events:inherit'
    }, 100);
  }
  assignAttributes(shape, data.attr, 100);
  cleanupElement(shape);

  // Children
  if (data.children) {
    data.children.forEach((child) => {
      shape.append(addSVGElementFromJson(child));
    });
  }

  return shape;
};
