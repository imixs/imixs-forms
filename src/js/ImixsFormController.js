/**
 * The ImixsFormController is the main class that can be used to initialize a form in a Single Page Application
 */
import { DataManager } from "./DataManager.js";
import { ModelManager } from "./ModelManager.js";
import { FormManager } from "./FormManager.js";
import { ErrorManager } from "./ErrorManager.js";
import { WorklistManager } from "./WorklistManager.js";

class ImixsFormController {
    constructor(containerId, worklistContainerId, config = {}) {
        this.containerId = containerId;
        this.worklistContainerId = worklistContainerId || null;

        document.addEventListener("DOMContentLoaded", () => this.init(config));
    }

    async init(config) {
        try {
            // Initialize managers
            this.errorManager = new ErrorManager();
            this.dataManager = new DataManager(config);
            this.modelManager = new ModelManager(this.dataManager);
            this.formManager = new FormManager(this.dataManager);

            // Initialize WorklistManager if a container is specified
            if (this.worklistContainerId) {
                this.worklistManager = new WorklistManager(
                    this.dataManager,
                    this.worklistContainerId
                );
            }

            // Setup event handlers
            this._setupEventHandlers();

            // Check if we're in worklist mode
            const urlParams = new URLSearchParams(window.location.search);
            const showWorklist = urlParams.get("showWorklist") === "true";

            if (showWorklist && this.worklistManager) {
                // Show worklist
                await this.worklistManager.renderWorklist();
            } else if (urlParams.get("workitem") || urlParams.get("taskid")) {
                // Initialize and render form
                await this._initializeForm();
            } else if (this.worklistManager) {
                // Default to showing worklist if no parameters are specified
                await this.worklistManager.renderWorklist();
            }
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

        // Add event listener for worklist button if present
        const worklistButton = document.getElementById("show-worklist-button");
        if (worklistButton && this.worklistManager) {
            worklistButton.addEventListener("click", async () => {
                try {
                    await this.worklistManager.renderWorklist();
                    // hide form
                    const formContainer =
                        document.getElementById("form-container");
                    if (formContainer) {
                        formContainer.style.display = "none";
                    }

                    // Update URL to reflect worklist mode
                    const url = new URL(window.location.href);
                    url.searchParams.set("showWorklist", "true");
                    url.searchParams.delete("workitem");
                    url.searchParams.delete("taskid");
                    window.history.pushState({}, "", url);
                } catch (error) {
                    this.errorManager.handleError(error);
                }
            });
        }

        // Add event listener for new task button if present
        const newTaskButton = document.getElementById("new-task-button");
        if (newTaskButton) {
            newTaskButton.addEventListener("click", () => {
                const formContainer = document.getElementById("form-container");
                if (formContainer) {
                    formContainer.style.display = "block";
                }

                // Redirect to new task form
                const url = new URL(window.location.href);
                url.searchParams.delete("workitem");
                url.searchParams.delete("showWorklist");
                url.searchParams.set("taskid", "1000"); // Default task ID
                url.searchParams.set("modelversion", "ticket-en-1.0");
                window.location.href = url.toString();
            });
        }
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

    /**
     * Manually trigger worklist rendering
     * @returns {Promise<void>}
     */
    async showWorklist() {
        if (this.worklistManager) {
            await this.worklistManager.renderWorklist();
            return true;
        }
        return false;
    }
}

export { ImixsFormController };
