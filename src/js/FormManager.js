// FormManager.js
class FormManager {
  constructor(config = {}) {
    // Parse URL parameters
    const urlParams = new URLSearchParams(window.location.search);

    // Default configuration with URL parameters

    this.config = {
      // API Configuration
      baseUrl: config.baseUrl || "/api",
      // Optional workflow context
      workflowEndpoint: config.workflowEndpoint || "workflow/workitem",

      credentials: config.credentials || {},
      mockMode: config.mockMode || false,
      // Workflow specific parameters
      modelversion:
        urlParams.get("modelversion") || config.modelversion || "1.0.0",
      taskid: urlParams.get("taskid") || config.taskid || "1000",
      eventid: urlParams.get("eventid") || config.eventid || "10",
    };
    // Construct full API URL
    this.apiUrl = `${this.config.baseUrl}/${this.config.workflowEndpoint}`;
    console.debug("FormManager initialized with config:", this.config);
    console.debug("API URL:", this.apiUrl);
  }

  // Parse XML form definition
  async parseFormDefinition(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");
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

  // Render form HTML
  renderForm(formStructure, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container element with id '${containerId}' not found`);
      return;
    }

    const form = document.createElement("form");
    form.className = "imixs-form";

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

    const submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.textContent = "Save";
    form.appendChild(submitButton);

    // Bind submit handler with the correct 'this' context
    form.addEventListener("submit", (e) => this._handleSubmit(e));

    container.innerHTML = "";
    container.appendChild(form);
  }

  // Create input elements based on type
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

  // Handle form submission
  async _handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);

    try {
      // Im Test-Modus nur Daten ausgeben
      if (this.config.mockMode) {
        console.log("Form Data:", Object.fromEntries(formData));
        const xmlDocument = this._createXMLDocument(formData);
        console.log("XML Document:", xmlDocument);

        this._triggerEvent("formSubmitSuccess", {
          formData: Object.fromEntries(formData),
          xmlDocument: xmlDocument,
        });
        return;
      }

      // Normaler API-Modus
      const xmlDocument = this._createXMLDocument(formData);
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/xml",
          Accept: "application/xml",
          Authorization:
            "Basic " +
            btoa(
              `${this.config.credentials.username}:${this.config.credentials.password}`
            ),
        },
        body: xmlDocument,
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

  // Create XML document from form data
  _createXMLDocument(formData) {
    let xmlString = '<?xml version="1.0"?>\n';
    xmlString +=
      '<document xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xs="http://www.w3.org/2001/XMLSchema">\n';

    // Add required workflow properties
    xmlString +=
      '  <item name="$modelversion"><value xsi:type="xs:string">1.0</value></item>\n';
    xmlString +=
      '  <item name="$taskid"><value xsi:type="xs:int">1000</value></item>\n';
    xmlString +=
      '  <item name="$eventid"><value xsi:type="xs:int">10</value></item>\n';

    // Add form data
    for (let [name, value] of formData.entries()) {
      const type = this._determineXMLType(value);
      xmlString += `  <item name="${name}"><value xsi:type="xs:${type}">${value}</value></item>\n`;
    }

    xmlString += "</document>";
    return xmlString;
  }

  // Determine XML schema type
  _determineXMLType(value) {
    if (!isNaN(value) && value.includes(".")) return "double";
    if (!isNaN(value)) return "int";
    return "string";
  }

  // Event handling
  _triggerEvent(name, detail) {
    const event = new CustomEvent(name, { detail });
    document.dispatchEvent(event);
  }
}
