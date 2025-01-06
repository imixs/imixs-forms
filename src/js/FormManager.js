// FormManager.js
class FormManager {
    constructor(dataManager) {
        this.dataManager = dataManager;
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
            console.error(
                `Container element with id '${containerId}' not found`
            );
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
                // Load existing value if available
                const existingValue = this.dataManager.getItemValue(
                    item.name,
                    this.dataManager.workitemXML
                )?.value;
                if (existingValue) {
                    input.value = existingValue;
                }
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
            defaultButton.dataset.eventid = this.dataManager.config.eventid;
            buttonContainer.appendChild(defaultButton);
        }

        form.appendChild(buttonContainer);

        // Bind submit handler
        form.addEventListener("submit", (e) => {
            const submitButton = e.submitter;
            const eventId =
                submitButton?.dataset?.eventid ||
                this.dataManager.config.eventid;
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
            // Update existing workitem
            this.dataManager.setItemValue(
                "$modelversion",
                this.dataManager.config.modelversion,
                null,
                this.dataManager.workitemXML
            );
            this.dataManager.setItemValue(
                "$taskid",
                this.dataManager.config.taskid,
                null,
                this.dataManager.workitemXML
            );
            this.dataManager.setItemValue(
                "$eventid",
                eventId,
                null,
                this.dataManager.workitemXML
            );

            // Add form data
            for (let [name, value] of formData.entries()) {
                this.dataManager.setItemValue(
                    name,
                    value,
                    null,
                    this.dataManager.workitemXML
                );
            }

            // Handle mock mode
            if (this.dataManager.config.mockMode) {
                console.log("Form Data:", Object.fromEntries(formData));
                console.log("Event ID:", eventId);
                const xmlString = this.dataManager.toXMLString(
                    this.dataManager.workitemXML
                );
                console.log("XML Document:", xmlString);

                this._triggerEvent("formSubmitSuccess", {
                    formData: Object.fromEntries(formData),
                    xmlDocument: xmlString,
                    eventId: eventId,
                });
                return;
            }

            // Send to server
            const url = this.dataManager.getApiUrl(
                this.dataManager.config.workflowEndpoint
            );
            const response = await this.dataManager.fetchData(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/xml",
                },
                body: this.dataManager.toXMLString(
                    this.dataManager.workitemXML
                ),
            });

            // Parse the response to get the uniqueid
            const result = await response.text();
            const resultXML = this.dataManager.parseXMLString(result);

            // Get uniqueid for redirect
            const uniqueId = this.dataManager.getItemValue(
                "$uniqueid",
                resultXML
            )?.value;
            if (uniqueId) {
                // Construct new URL with workitem ID
                const url = new URL(window.location.href);
                url.searchParams.set("workitem", uniqueId);

                // Remove unnecessary parameters
                url.searchParams.delete("eventid");
                url.searchParams.delete("modelversion");
                url.searchParams.delete("taskid");

                // Trigger success event before redirect
                this._triggerEvent("formSubmitSuccess", {
                    result,
                    uniqueId,
                    redirectUrl: url.toString(),
                });

                // Perform redirect
                window.location.href = url.toString();
            } else {
                console.error("No uniqueid found in response");
                this._triggerEvent("formSubmitError", {
                    error: new Error("No uniqueid found in response"),
                });
            }
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
