// ModelManager.js
class ModelManager {
  constructor(config = {}) {
    // Parse URL parameters
    const urlParams = new URLSearchParams(window.location.search);

    this.config = {
      baseUrl: config.baseUrl || "/api",
      credentials: config.credentials || {},
      modelversion:
        urlParams.get("modelversion") || config.modelversion || "1.0.0",
      taskid: urlParams.get("taskid") || config.taskid || "1000",
    };
  }

  /**
   * Fetches the BPMN model data for a specific task
   * @returns {Promise<Object>} Task definition data
   */
  async getTaskDefinition() {
    try {
      const url = `${this.config.baseUrl}/model/${this.config.modelversion}/tasks/${this.config.taskid}?format=xml&items=dataobjects,workflow.abstract,documentation`;
      return await this._fetchXMLData(url);
    } catch (error) {
      console.error("Error fetching task definition:", error);
      throw error;
    }
  }

  /**
   * Fetches available events for a specific task
   * @returns {Promise<Array>} List of available events
   */
  async getTaskEvents() {
    try {
      const url = `${this.config.baseUrl}/model/${this.config.modelversion}/tasks/${this.config.taskid}/events?format=xml&items=eventid,workflow.public,name`;
      console.debug("Fetching events from URL:", url);

      const result = await this._fetchXMLData(url);
      console.debug("Raw result from _fetchXMLData:", result);
      console.debug("Result type:", typeof result);
      console.debug("Is Array:", Array.isArray(result));

      // Ensure we have an array to work with
      const events = Array.isArray(result) ? result : [result];
      console.debug("Events array after conversion:", events);

      // Filter nur öffentliche Events mit Namen
      const filteredEvents = events.filter((event) => {
        console.debug("Processing event:", event);
        const isValid =
          event && event["workflow.public"] === true && event.name;
        console.debug("Is valid event:", isValid);
        return isValid;
      });

      console.debug("Final filtered events:", filteredEvents);
      return filteredEvents;
    } catch (error) {
      console.error("Error fetching task events:", error);
      throw error;
    }
  }

  /**
   * Fetches and parses XML data from a given URL
   * @param {string} url - The URL to fetch from
   * @returns {Promise<Object|Array>} Parsed data
   * @private
   */
  async _fetchXMLData(url) {
    const response = await fetch(url, {
      headers: {
        Accept: "application/xml",
        ...(this.config.credentials.username && {
          Authorization:
            "Basic " +
            btoa(
              `${this.config.credentials.username}:${this.config.credentials.password}`
            ),
        }),
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const xmlText = await response.text();
    return this._parseXMLDocument(xmlText);
  }

  /**
   * Parses an XML document and converts it to a JavaScript object/array
   * @param {string} xmlText - The XML text to parse
   * @returns {Object|Array} Parsed data
   * @private
   */
  _parseXMLDocument(xmlText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");

    // Check if we have multiple documents
    const documents = xmlDoc.getElementsByTagName("document");
    if (documents.length > 1) {
      // Return array of parsed documents
      return Array.from(documents).map((doc) => this._parseItems(doc));
    } else if (documents.length === 1) {
      // Return single parsed document
      return this._parseItems(documents[0]);
    }

    // Fallback: parse root element if no document tags found
    return this._parseItems(xmlDoc.documentElement);
  }

  /**
   * Parses all item elements within a node
   * @param {Element} node - The XML node to parse
   * @returns {Object} Parsed data object
   * @private
   */
  _parseItems(node) {
    console.debug("Parsing items from node:", node);
    const result = {};
    const items = node.getElementsByTagName("item");

    for (let item of items) {
      const name = item.getAttribute("name");
      if (!name) continue;

      // Get all values for this item
      const values = item.getElementsByTagName("value");
      if (values.length === 0) {
        result[name] = null;
        continue;
      }

      // Parse values based on their type
      const parsedValues = Array.from(values).map((value) => {
        const type = value.getAttribute("xsi:type");
        const content = value.innerHTML; // Using innerHTML to get nested XML for xmlItem
        return this._parseValue(content, type);
      });

      // If only one value, don't return an array
      result[name] = parsedValues.length === 1 ? parsedValues[0] : parsedValues;
      console.debug(`Parsed item "${name}":`, result[name]);
    }

    return result;
  }

  /**
   * Parses a value based on its type
   * @param {string} content - The content to parse
   * @param {string} type - The XML schema type
   * @returns {any} Parsed value
   * @private
   */
  _parseValue(content, type) {
    console.debug("_parseValue called with:", { content, type });

    // Handle xsi:nil="true"
    if (content === null || content === "") {
      return null;
    }

    if (type === "xmlItem") {
      // Hole die inneren value-Elemente
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(
        `<root>${content}</root>`,
        "text/xml"
      );
      const valueElements = xmlDoc.getElementsByTagName("value");

      // Nur die value-Elemente verarbeiten und als einzelnes Array zurückgeben
      return Array.from(valueElements).map((element) => {
        const valueType = element.getAttribute("xsi:type");
        const valueContent = element.textContent;
        return this._parseValue(valueContent, valueType);
      });
    }

    // Handle other types
    switch (type) {
      case "xs:boolean":
        return content.toLowerCase() === "true";
      case "xs:int":
      case "xs:long":
        return parseInt(content, 10);
      case "xs:double":
      case "xs:decimal":
        return parseFloat(content);
      default:
        return content;
    }
  }

  /**
   * Extracts the form definition from task data
   * @param {Object} taskData - The parsed task data
   * @returns {string|null} The form definition XML or null if not found
   */
  getFormDefinition(taskData) {
    console.debug("Extracting form definition from:", taskData);

    if (
      !taskData ||
      !taskData.dataobjects ||
      !Array.isArray(taskData.dataobjects[0])
    ) {
      console.debug("No valid dataobjects found in task data");
      return null;
    }

    // Das erste Element ist das Array mit den zwei Werten [type, content]
    const [type, formDefinition] = taskData.dataobjects[0];

    if (type === "Form" && formDefinition) {
      // Unescape XML content
      const unescapedContent = formDefinition
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&");

      console.debug("Found and unescaped form definition");
      return unescapedContent;
    }

    console.debug("No valid form definition found in dataobjects");
    return null;
  }
}
