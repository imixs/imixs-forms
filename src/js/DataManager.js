// DataManager.js
class DataManager {
  constructor() {
    // XML namespaces required for Imixs-Workflow
    this.namespaces = {
      xsi: "http://www.w3.org/2001/XMLSchema-instance",
      xs: "http://www.w3.org/2001/XMLSchema",
    };
  }

  /**
   * Parses an XML string into an XML Document
   * @param {string} xmlString - The XML string to parse
   * @returns {Document} The parsed XML Document
   */
  parseXMLString(xmlString) {
    const parser = new DOMParser();
    return parser.parseFromString(xmlString, "text/xml");
  }

  /**
   * Loads an XML Document
   * @param {Document} xmlDoc - The XML Document to load
   */
  loadXMLDocument(xmlDoc) {
    this.xmlDoc = xmlDoc;
  }

  /**
   * Returns the value of an item
   * @param {string} itemName - The name of the item
   * @param {Element} [context] - Optional context (document node)
   * @returns {Object} Value and type of the item
   */
  getItemValue(itemName, context = this.xmlDoc) {
    const itemElement = context.querySelector(`item[name="${itemName}"]`);
    if (!itemElement) return null;

    const values = Array.from(itemElement.getElementsByTagName("value")).map(
      (valueElement) => ({
        value: valueElement.textContent,
        type: valueElement.getAttribute("xsi:type"),
      })
    );

    // If only one value exists, return it directly
    return values.length === 1 ? values[0] : values;
  }

  /**
   * Sets the value of an item
   * @param {string} itemName - The name of the item
   * @param {string|number|boolean} value - The value to set
   * @param {string} [type] - The data type (optional, automatically determined if not provided)
   * @param {Element} [context] - Optional context (document node)
   */
  setItemValue(itemName, value, type = null, context = this.xmlDoc) {
    // If no type is provided, determine it automatically
    if (!type) {
      type = this._determineXMLType(value);
    }

    let itemElement = context.querySelector(`item[name="${itemName}"]`);

    // Create the item if it doesn't exist
    if (!itemElement) {
      itemElement = context.createElement("item");
      itemElement.setAttribute("name", itemName);
      context.documentElement.appendChild(itemElement);
    } else {
      // Otherwise clear its content
      itemElement.innerHTML = "";
    }

    // Set the value
    const valueElement = context.createElement("value");
    valueElement.setAttribute("xsi:type", type);
    valueElement.textContent = value;
    itemElement.appendChild(valueElement);
  }

  /**
   * Determines the XML Schema type of a value
   * @param {any} value - The value to check
   * @returns {string} The determined XML Schema type
   * @private
   */
  _determineXMLType(value) {
    if (typeof value === "boolean") return "xs:boolean";
    if (typeof value === "number") {
      return Number.isInteger(value) ? "xs:int" : "xs:double";
    }
    return "xs:string";
  }

  /**
   * Converts a string value based on the XML Schema type
   * @param {string} value - The value to convert
   * @param {string} type - The XML Schema type
   * @returns {string|number|boolean} The converted value
   */
  convertValue(value, type) {
    switch (type) {
      case "xs:boolean":
        return value.toLowerCase() === "true";
      case "xs:int":
      case "xs:long":
        return parseInt(value, 10);
      case "xs:double":
      case "xs:decimal":
        return parseFloat(value);
      default:
        return value;
    }
  }

  /**
   * Creates a new document element
   * @returns {Element} The new document element
   */
  createDocument() {
    const doc = new DOMParser().parseFromString("<document/>", "text/xml");
    return doc.documentElement;
  }

  /**
   * Extracts all document elements from the XML
   * @returns {Element[]} Array of document elements
   */
  getDocuments() {
    return Array.from(this.xmlDoc.getElementsByTagName("document"));
  }

  /**
   * Generates an XML string from the current document
   * @param {boolean} [prettyPrint=false] - Whether to format the output
   * @returns {string} The generated XML string
   */
  toXMLString(prettyPrint = false) {
    if (!this.xmlDoc) return "";

    const serializer = new XMLSerializer();
    let xmlString = serializer.serializeToString(this.xmlDoc);

    if (prettyPrint) {
      // Simple formatting - could be enhanced if needed
      xmlString = xmlString.replace(/></g, ">\n<");
    }

    return xmlString;
  }
}
