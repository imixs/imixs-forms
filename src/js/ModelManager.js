// ModelManager.js
class ModelManager {
    constructor(dataManager) {
        this.dataManager = dataManager;
    }

    /**
     * Fetches the BPMN model data for a specific task
     * @returns {Promise<Document>} Task definition document
     */
    async getTaskDefinition() {
        try {
            return await this.dataManager.loadTaskDefinition();
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
            await this.dataManager.loadTaskEvents();

            // Get all documents (events) and transform them into event objects
            return Array.from(
                this.dataManager.eventsXML.getElementsByTagName("document")
            )
                .map((docElement) => ({
                    eventid: this.dataManager.getItemValue(
                        "eventid",
                        docElement
                    )?.value,
                    name: this.dataManager.getItemValue("name", docElement)
                        ?.value,
                    "workflow.public":
                        this.dataManager.getItemValue(
                            "workflow.public",
                            docElement
                        )?.value === "true",
                }))
                .filter((event) => event.name && event["workflow.public"]);
        } catch (error) {
            console.error("Error fetching task events:", error);
            throw error;
        }
    }

    /**
     * Gets the form definition from the current task or workitem
     * @returns {string|null} The form definition XML or null if not found
     */
    getFormDefinition() {
        return this.dataManager.getFormDefinition();
    }
}
