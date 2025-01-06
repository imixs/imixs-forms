/**
 * The ImixsFormController is the main class that can be used to initialize a form in a Single Page Application
 */
class ImixsFormController {
    constructor(containerId, config = {}) {
        this.containerId = containerId;

        document.addEventListener("DOMContentLoaded", () => this.init(config));
    }

    async init(config) {
        try {
            // Initialize managers
            this.errorManager = new ErrorManager();
            this.dataManager = new DataManager(config);
            this.modelManager = new ModelManager(this.dataManager);
            this.formManager = new FormManager(this.dataManager);

            // Setup event handlers
            this._setupEventHandlers();

            // Initialize and render form
            await this._initializeForm();
        } catch (error) {
            this.errorManager.handleError(error);
        }
    }

    _setupEventHandlers() {
        document.addEventListener("formSubmitSuccess", (e) => {
            console.log("Form data:", e.detail);
            this.errorManager.showInfo("Form submitted successfully!", {
                timeout: 3000,
            });
        });

        document.addEventListener("formSubmitError", (e) => {
            this.errorManager.handleError(e.detail.error);
        });
    }

    async _initializeForm() {
        // Initialize DataManager
        await this.dataManager.initialize();

        // Get form definition
        const formDefinition = this.modelManager.getFormDefinition();
        if (!formDefinition) {
            throw new Error(
                "No form definition found in task or workitem data"
            );
        }

        // Get available events
        const events = await this.modelManager.getTaskEvents();

        // Generate and render form
        const formStructure = await this.formManager.parseFormDefinition(
            formDefinition
        );
        this.formManager.renderForm(formStructure, this.containerId, events);
    }
}
