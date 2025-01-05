/**
 * The ModelManager class is used to load and parse BPMN Model entries
 */

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
   * Fetches the BPMN model data for a specific task and extracts the form definition
   * @returns {Promise<Object>} Form definition and metadata
   */
  async getTaskDefinition() {
    try {
      const url = `${this.config.baseUrl}/model/${this.config.modelversion}/tasks/${this.config.taskid}?format=xml&items=dataobjects,workflow.abstract,documentation`;

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
      return this._parseModelData(xmlText);
    } catch (error) {
      console.error("Error fetching task definition:", error);
      throw error;
    }
  }

  /**
   * Parses the XML response and extracts form definition and metadata
   * @param {string} xmlText - The XML response from the API
   * @returns {Object} Parsed model data
   * @private
   */
  _parseModelData(xmlText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");

    const result = {
      formDefinition: null,
      documentation: null,
      abstract: null,
    };

    // Extract documentation
    const docElement = xmlDoc.querySelector('item[name="documentation"] value');
    if (docElement) {
      result.documentation = docElement.textContent;
    }

    // Extract workflow abstract
    const abstractElement = xmlDoc.querySelector(
      'item[name="workflow.abstract"] value'
    );
    if (abstractElement) {
      result.abstract = abstractElement.textContent;
    }

    // Find form definition in dataobjects
    const dataObjects = xmlDoc.querySelector('item[name="dataobjects"] value');
    if (dataObjects) {
      const values = dataObjects.getElementsByTagName("value");
      for (let value of values) {
        const content = value.textContent.trim();
        if (content.includes("<imixs-form>")) {
          result.formDefinition = content;
          break;
        }
      }
    }

    if (!result.formDefinition) {
      throw new Error("No form definition found in model data");
    }

    return result;
  }
}
