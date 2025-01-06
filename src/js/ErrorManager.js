// ErrorManager.js
export class ErrorManager {
    constructor(config = {}) {
        this.containerId = config.containerId || "error-container";
        this._ensureContainer();
    }

    /**
     * Creates an error container if it doesn't exist
     * @private
     */
    _ensureContainer() {
        if (!document.getElementById(this.containerId)) {
            const container = document.createElement("div");
            container.id = this.containerId;
            container.className = "error-container";
            // Insert at the beginning of the body
            document.body.insertBefore(container, document.body.firstChild);
        }
    }

    /**
     * Shows an error message
     * @param {string} message - The error message to display
     * @param {object} options - Additional options (type, timeout)
     */
    showError(message, options = {}) {
        const container = document.getElementById(this.containerId);
        const errorBox = document.createElement("div");

        errorBox.className = `error-box ${options.type || "error"}`;

        // Create header with title and close button
        const header = document.createElement("div");
        header.className = "error-header";

        const title = document.createElement("span");
        const titleText =
            options.type === "warning"
                ? "Warning"
                : options.type === "info"
                ? "Info"
                : "Error";
        title.textContent = titleText;
        header.appendChild(title);

        const closeButton = document.createElement("button");
        closeButton.innerHTML = "&times;";
        closeButton.onclick = () => errorBox.remove();
        header.appendChild(closeButton);

        errorBox.appendChild(header);

        // Add message
        const messageDiv = document.createElement("div");
        messageDiv.className = "error-message";
        messageDiv.textContent = message;
        errorBox.appendChild(messageDiv);

        container.appendChild(errorBox);

        // Optional auto-hide
        if (options.timeout) {
            setTimeout(() => {
                if (errorBox.parentNode) {
                    errorBox.remove();
                }
            }, options.timeout);
        }

        return errorBox;
    }

    /**
     * Shows a warning message
     * @param {string} message - The warning message to display
     * @param {object} options - Additional options
     */
    showWarning(message, options = {}) {
        return this.showError(message, { ...options, type: "warning" });
    }

    /**
     * Shows an info message
     * @param {string} message - The info message to display
     * @param {object} options - Additional options
     */
    showInfo(message, options = {}) {
        return this.showError(message, { ...options, type: "info" });
    }

    /**
     * Clears all error messages
     */
    clearAll() {
        const container = document.getElementById(this.containerId);
        container.innerHTML = "";
    }

    /**
     * Handles an Error object and displays appropriate message
     * @param {Error} error - The error object to handle
     */
    handleError(error) {
        let message;
        if (
            error.name === "NetworkError" ||
            error.message.includes("Failed to fetch")
        ) {
            message =
                "Network error: Unable to connect to the server. Please check your connection.";
        } else if (error.message.includes("No form definition found")) {
            message =
                "No form definition found for the specified task. Please check model version and task ID.";
        } else {
            message = `An error occurred: ${error.message}`;
        }

        this.showError(message);
    }
}
