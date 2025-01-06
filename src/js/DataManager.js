// DataManager.js
class DataManager {
    constructor(config = {}) {
        // Parse URL parameters for common workflow parameters
        const urlParams = new URLSearchParams(window.location.search);

        // Initialize base configuration
        this.config = {
            baseUrl: config.baseUrl || "/api",
            credentials: config.credentials || {},
            workflowEndpoint: config.workflowEndpoint || "workflow/workitem",
            mockMode: config.mockMode || false,
        };

        // Store workitem ID if present
        this.workitemId = urlParams.get("workitem");

        // If no workitem ID, use direct parameters
        if (!this.workitemId) {
            this.config.modelversion =
                urlParams.get("modelversion") || config.modelversion || "1.0.0";
            this.config.taskid =
                urlParams.get("taskid") || config.taskid || "1000";
            this.config.eventid =
                urlParams.get("eventid") || config.eventid || "10";
        }

        // XML namespaces required for Imixs-Workflow
        this.namespaces = {
            xsi: "http://www.w3.org/2001/XMLSchema-instance",
            xs: "http://www.w3.org/2001/XMLSchema",
        };

        // Initialize XML document holders
        this.taskXML = null; // Current BPMN task definition
        this.eventsXML = null; // Available events for current task
        this.workitemXML = null; // Current workitem data (if exists)
    }

    /**
     * Initializes the DataManager by loading necessary data
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.workitemId) {
            // Load existing workitem
            await this.loadWorkitem(this.workitemId);

            // Extract modelversion and taskid from workitem
            this.config.modelversion = this.getItemValue(
                "$modelversion",
                this.workitemXML
            )?.value;
            this.config.taskid = this.getItemValue(
                "$taskid",
                this.workitemXML
            )?.value;
        } else {
            // Create empty workitem document for new processes
            this.workitemXML = this.createDocument();
        }

        // Load task definition
        await this.loadTaskDefinition();

        // Load available events
        await this.loadTaskEvents();
    }

    /**
     * Loads the current task definition
     * @returns {Promise<Document>} Task definition XML
     */
    async loadTaskDefinition() {
        try {
            const url = this.getApiUrl(
                `model/${this.config.modelversion}/tasks/${this.config.taskid}?format=xml&items=dataobjects,workflow.abstract,documentation`
            );
            const response = await this.fetchData(url);
            const xmlText = await response.text();

            this.taskXML = this.parseXMLString(xmlText);
            return this.taskXML;
        } catch (error) {
            console.error("Error loading task definition:", error);
            throw error;
        }
    }

    /**
     * Loads available events for current task
     * @returns {Promise<Document>} Events XML
     */
    async loadTaskEvents() {
        try {
            const url = this.getApiUrl(
                `model/${this.config.modelversion}/tasks/${this.config.taskid}/events?format=xml&items=eventid,workflow.public,name`
            );
            const response = await this.fetchData(url);
            const xmlText = await response.text();

            this.eventsXML = this.parseXMLString(xmlText);
            return this.eventsXML;
        } catch (error) {
            console.error("Error loading task events:", error);
            throw error;
        }
    }

    /**
     * Loads a workitem by its uniqueid
     * @param {string} uniqueId - The uniqueid of the workitem
     * @returns {Promise<Document>} Workitem XML
     */
    async loadWorkitem(uniqueId) {
        try {
            const url = this.getApiUrl(`workflow/workitem/${uniqueId}`);
            const response = await this.fetchData(url);
            const xmlText = await response.text();

            this.workitemXML = this.parseXMLString(xmlText);
            return this.workitemXML;
        } catch (error) {
            console.error("Error loading workitem:", error);
            throw error;
        }
    }

    /**
     * Gets form definition from current task or workitem
     * @returns {string|null} The form definition XML or null if not found
     */
    getFormDefinition() {
        let formDefinition = null;

        // First try to get form definition from task
        if (this.taskXML) {
            const dataObjects = this.getItemValue("dataobjects", this.taskXML);
            if (
                dataObjects &&
                dataObjects[0]?.value === "Form" &&
                dataObjects[1]?.value
            ) {
                formDefinition = dataObjects[1].value;
                console.debug("Found form definition in task");

                // If we have a workitem, save the form definition for later use
                if (this.workitemXML) {
                    this.setItemValue(
                        "txtworkfloweditorcustomform",
                        formDefinition,
                        null,
                        this.workitemXML
                    );
                    console.debug("Saved form definition to workitem");
                }
            }
        }

        // If no task definition found, try workitem
        if (!formDefinition && this.workitemXML) {
            const savedForm = this.getItemValue(
                "txtworkfloweditorcustomform",
                this.workitemXML
            );
            if (savedForm?.value) {
                formDefinition = savedForm.value;
                console.debug("Found form definition in workitem");
            }
        }

        // If found, unescape the content
        if (formDefinition) {
            return formDefinition
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/&quot;/g, '"')
                .replace(/&amp;/g, "&");
        }

        return null;
    }

    /**
     * Performs an HTTP request with proper headers
     * @param {string} url - The URL to fetch from
     * @param {Object} options - Additional fetch options
     * @returns {Promise<Response>} The fetch response
     */
    async fetchData(url, options = {}) {
        const headers = {
            Accept: "application/xml",
            ...(options.headers || {}),
        };

        // Add authorization if credentials are provided
        if (this.config.credentials.username) {
            headers.Authorization =
                "Basic " +
                btoa(
                    `${this.config.credentials.username}:${this.config.credentials.password}`
                );
        }

        const response = await fetch(url, {
            ...options,
            headers,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response;
    }

    /**
     * Gets the complete URL for a workflow API endpoint
     * @param {string} path - The path to append to the base URL
     * @returns {string} The complete URL
     */
    getApiUrl(path) {
        return `${this.config.baseUrl}/${path}`;
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
     * Creates a new document element with required namespaces
     * @returns {Document} The new XML document
     */
    createDocument() {
        const xmlString =
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
            '<document xmlns:xsi="' +
            this.namespaces.xsi +
            '" ' +
            'xmlns:xs="' +
            this.namespaces.xs +
            '"/>';

        const doc = new DOMParser().parseFromString(xmlString, "text/xml");
        return doc;
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

        const values = Array.from(
            itemElement.getElementsByTagName("value")
        ).map((valueElement) => {
            const type = valueElement.getAttribute("xsi:type");

            // Handle xmlItem type specially
            if (type === "xmlItem") {
                const nestedValues = Array.from(
                    valueElement.getElementsByTagName("value")
                ).map((nested) => ({
                    value: nested.textContent,
                    type: nested.getAttribute("xsi:type"),
                }));
                return nestedValues;
            }

            return {
                value: valueElement.textContent,
                type: type,
            };
        });

        // Flatten array if it contains xmlItem values
        const flatValues = values.flat();

        // If only one value exists, return it directly
        return flatValues.length === 1 ? flatValues[0] : flatValues;
    }

    /**
     * Sets the value of an item
     * @param {string} itemName - The name of the item
     * @param {string|number|boolean} value - The value to set
     * @param {string} [type] - The data type (optional, automatically determined if not provided)
     * @param {Element} [context] - Optional context (document node)
     */
    setItemValue(itemName, value, type = null, context = this.workitemXML) {
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

        // Trim value and remove line breaks if it's a string
        if (typeof value === "string") {
            value = value.trim();
        }
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
     * Extracts all document elements from the XML
     * @returns {Element[]} Array of document elements
     */
    getDocuments() {
        return Array.from(this.xmlDoc.getElementsByTagName("document"));
    }

    /**
     * Generates an XML string from a document
     * @param {Document} xmlDoc - The XML document to serialize
     * @returns {string} The generated XML string
     */
    toXMLString(xmlDoc) {
        if (!xmlDoc) {
            console.error("No XML document provided to toXMLString");
            return "";
        }

        const serializer = new XMLSerializer();
        return serializer.serializeToString(xmlDoc);
    }
}
