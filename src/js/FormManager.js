// FormManager.js
class FormManager {
  constructor(config = {}) {
    // Parse URL parameters
    const urlParams = new URLSearchParams(window.location.search);

    // Default configuration with URL parameters
    this.config = {
      // API Configuration
      baseUrl: config.baseUrl || "/api",
      workflowEndpoint: config.workflowEndpoint || "workflow/workitem",

      credentials: config.credentials || {},
      mockMode: config.mockMode || false,
      // Workflow specific parameters
      modelversion:
        urlParams.get("modelversion") || config.modelversion || "1.0.0",
      taskid: urlParams.get("taskid") || config.taskid || "1000",
      eventid: urlParams.get("eventid") || config.eventid || "10",
    };

    // Initialize DataManager
    this.dataManager = new DataManager();

    // Construct full API URL
    this.apiUrl = `${this.config.baseUrl}/${this.config.workflowEndpoint}`;
    console.debug("FormManager initialized with config:", this.config);
    console.debug("API URL:", this.apiUrl);
  }

  /**
   * Parse XML form definition into a structured format
   * @param {string} xmlString - The XML form definition string
   * @returns {Promise<Array>} Form structure array
   */
  async parseFormDefinition(xmlString) {
    const xmlDoc = this.dataManager.parseXMLString(xmlString);
    const sections = xmlDoc.getElementsByTagName("imixs-form-section");
    const formStructure = [];

    for (let section of sections) {
      const sectionData = {
        label: section.getAttribute("label"),
        items: [],
      };

      const items = section.getElementsByTagName("item");
      for (let item of items) {
        sectionData.items.push({
          name: item.getAttribute("name"),
          type: item.getAttribute("type"),
          label: item.getAttribute("label"),
          span: parseInt(item.getAttribute("span")) || 12,
        });
      }
      formStructure.push(sectionData);
    }
    return formStructure;
  }

  /**
   * Render form HTML based on form structure and events
   * @param {Array} formStructure - The form structure array
   * @param {string} containerId - The container element ID
   * @param {Array} events - Optional array of workflow events
   */
  renderForm(formStructure, containerId, events = []) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container element with id '${containerId}' not found`);
      return;
    }

    const form = document.createElement("form");
    form.className = "imixs-form";

    // Render form sections
    formStructure.forEach((section) => {
      const sectionDiv = document.createElement("div");
      sectionDiv.className = "imixs-form-section";

      const sectionTitle = document.createElement("h3");
      sectionTitle.textContent = section.label;
      sectionDiv.appendChild(sectionTitle);

      const itemsContainer = document.createElement("div");
      itemsContainer.className = "imixs-form-items";

      section.items.forEach((item) => {
        const itemDiv = document.createElement("div");
        itemDiv.className = `imixs-form-item span-${item.span}`;

        const label = document.createElement("label");
        label.textContent = item.label;
        itemDiv.appendChild(label);

        const input = this._createInputElement(item);
        itemDiv.appendChild(input);

        itemsContainer.appendChild(itemDiv);
      });

      sectionDiv.appendChild(itemsContainer);
      form.appendChild(sectionDiv);
    });

    // Create button container
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "imixs-form-buttons";

    // Add event buttons
    events.forEach((event) => {
      if (event && event["workflow.public"] === true && event.name) {
        const button = document.createElement("button");
        button.type = "submit";
        button.className = "imixs-submit-button";
        button.textContent = event.name;
        button.dataset.eventid = event.eventid;
        buttonContainer.appendChild(button);
      }
    });

    // If no events provided, add default submit button
    if (events.length === 0) {
      const defaultButton = document.createElement("button");
      defaultButton.type = "submit";
      defaultButton.className = "imixs-submit-button";
      defaultButton.textContent = "Submit";
      defaultButton.dataset.eventid = this.config.eventid;
      buttonContainer.appendChild(defaultButton);
    }

    form.appendChild(buttonContainer);

    // Bind submit handler
    form.addEventListener("submit", (e) => {
      const submitButton = e.submitter;
      const eventId = submitButton?.dataset?.eventid || this.config.eventid;
      this._handleSubmit(e, eventId);
    });

    container.innerHTML = "";
    container.appendChild(form);
  }

  /**
   * Create input element based on type
   * @param {Object} item - The form item configuration
   * @returns {HTMLElement} The created input element
   * @private
   */
  _createInputElement(item) {
    let input;
    switch (item.type) {
      case "html":
        input = document.createElement("textarea");
        break;
      case "currency":
        input = document.createElement("input");
        input.type = "number";
        input.step = "0.01";
        break;
      case "text":
      default:
        input = document.createElement("input");
        input.type = "text";
    }
    input.name = item.name;
    input.className = "imixs-input";
    return input;
  }

  /**
   * Handle form submission
   * @param {Event} event - The submit event
   * @param {string} eventId - The workflow event ID
   * @private
   */
  async _handleSubmit(event, eventId) {
    event.preventDefault();
    const formData = new FormData(event.target);

    try {
      // Create new document
      const xmlDoc = this.dataManager.parseXMLString("<document/>");
      this.dataManager.loadXMLDocument(xmlDoc);

      // Add required workflow properties
      this.dataManager.setItemValue("$modelversion", this.config.modelversion);
      this.dataManager.setItemValue("$taskid", this.config.taskid);
      this.dataManager.setItemValue("$eventid", eventId);

      // Add form data
      for (let [name, value] of formData.entries()) {
        this.dataManager.setItemValue(name, value);
      }

      // Handle mock mode
      if (this.config.mockMode) {
        console.log("Form Data:", Object.fromEntries(formData));
        console.log("Event ID:", eventId);
        const xmlString = this.dataManager.toXMLString(true);
        console.log("XML Document:", xmlString);

        this._triggerEvent("formSubmitSuccess", {
          formData: Object.fromEntries(formData),
          xmlDocument: xmlString,
          eventId: eventId,
        });
        return;
      }

      // Send to server
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/xml",
          Accept: "application/xml",
          Authorization: this.config.credentials.username
            ? "Basic " +
              btoa(
                `${this.config.credentials.username}:${this.config.credentials.password}`
              )
            : "",
        },
        body: this.dataManager.toXMLString(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.text();
      this._triggerEvent("formSubmitSuccess", { result });
    } catch (error) {
      console.error("Submit error:", error);
      this._triggerEvent("formSubmitError", { error });
    }
  }

  /**
   * Trigger a custom event
   * @param {string} name - Event name
   * @param {Object} detail - Event detail object
   * @private
   */
  _triggerEvent(name, detail) {
    const event = new CustomEvent(name, { detail });
    document.dispatchEvent(event);
  }
}
