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

    // Initialize DataManager
    this.dataManager = new DataManager();
  }

  /**
   * Fetches the BPMN model data for a specific task
   * @returns {Promise<Document>} Task definition as XML document
   */
  async getTaskDefinition() {
    try {
      const url = `${this.config.baseUrl}/model/${this.config.modelversion}/tasks/${this.config.taskid}?format=xml&items=dataobjects,workflow.abstract,documentation`;
      const response = await this._fetchData(url);

      // Parse and load the XML response
      const xmlDoc = this.dataManager.parseXMLString(response);
      this.dataManager.loadXMLDocument(xmlDoc);

      return xmlDoc;
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
      const response = await this._fetchData(url);

      // Parse and load the XML response
      const xmlDoc = this.dataManager.parseXMLString(response);
      this.dataManager.loadXMLDocument(xmlDoc);

      // Get all documents (events) and transform them into event objects
      return this.dataManager
        .getDocuments()
        .map((docElement) => {
          const context = docElement;
          return {
            eventid: this.dataManager.getItemValue("eventid", context)?.value,
            name: this.dataManager.getItemValue("name", context)?.value,
            "workflow.public":
              this.dataManager.getItemValue("workflow.public", context)
                ?.value === "true",
          };
        })
        .filter((event) => event.name && event["workflow.public"]);
    } catch (error) {
      console.error("Error fetching task events:", error);
      throw error;
    }
  }

  /**
   * Extracts the form definition from task data
   * @param {Document} xmlDoc - The XML document containing task data
   * @returns {string|null} The form definition XML or null if not found
   */
  getFormDefinition(xmlDoc) {
    this.dataManager.loadXMLDocument(xmlDoc);

    // Get the dataobjects item containing form definition
    const dataObjects = this.dataManager.getItemValue("dataobjects");
    if (!dataObjects || !Array.isArray(dataObjects)) {
      console.debug("No valid dataobjects found in task data");
      return null;
    }

    // Get the first dataobject array
    const formData = Array.isArray(dataObjects) ? dataObjects[0] : dataObjects;
    if (!formData || !formData.value || formData.value.length < 2) {
      console.debug("Invalid form data structure");
      return null;
    }

    // Extract type and definition
    const [type, definition] = formData.value;

    if (type === "Form" && definition) {
      // Unescape XML content
      const unescapedContent = definition
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

  /**
   * Fetches data from a URL
   * @param {string} url - The URL to fetch from
   * @returns {Promise<string>} The response text
   * @private
   */
  async _fetchData(url) {
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

    return await response.text();
  }
}
