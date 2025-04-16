export class WorklistManager {
    constructor(dataManager, containerId) {
        this.dataManager = dataManager;
        this.containerId = containerId;
    }

    /**
     * Renders the worklist in the specified container
     * @returns {Promise<void>}
     */
    async renderWorklist() {
        try {
            // Load worklist data
            await this.dataManager.loadWorklist();

            // Get container element
            const container = document.getElementById(this.containerId);
            if (!container) {
                console.error(
                    `Container element with id '${this.containerId}' not found`
                );
                return;
            }

            // Create worklist table
            const table = document.createElement("table");
            table.className = "imixs-worklist";

            // Create table header
            const thead = document.createElement("thead");
            const headerRow = document.createElement("tr");

            ["Workflow", "Summary", "Last Update", "Status", "Action"].forEach(
                (headerText) => {
                    const th = document.createElement("th");
                    th.textContent = headerText;
                    headerRow.appendChild(th);
                }
            );

            thead.appendChild(headerRow);
            table.appendChild(thead);

            // Create table body
            const tbody = document.createElement("tbody");

            // Get all documents (workitems) from the worklist
            const workitems = Array.from(
                this.dataManager.worklistXML.getElementsByTagName("document")
            );

            // If no workitems found, show message
            if (workitems.length === 0) {
                const emptyRow = document.createElement("tr");
                const emptyCell = document.createElement("td");
                emptyCell.colSpan = 4;
                emptyCell.textContent = "No tasks found";
                emptyCell.className = "empty-worklist";
                emptyRow.appendChild(emptyCell);
                tbody.appendChild(emptyRow);
            } else {
                // Process each workitem
                workitems.forEach((workitem) => {
                    const group =
                        this.dataManager.getItemValue(
                            "$workflowgroup",
                            workitem
                        )?.value || "-";

                    const status =
                        this.dataManager.getItemValue(
                            "$workflowstatus",
                            workitem
                        )?.value || "-";
                    const summary =
                        this.dataManager.getItemValue(
                            "$workflowsummary",
                            workitem
                        )?.value || "-";
                    const modified =
                        this.dataManager.getItemValue("$modified", workitem)
                            ?.value || "-";
                    const uniqueId = this.dataManager.getItemValue(
                        "$uniqueid",
                        workitem
                    )?.value;

                    // Format date if available
                    const formattedDate =
                        modified !== "-" ? this._formatDate(modified) : "-";

                    const row = document.createElement("tr");

                    // Group cell
                    const groupCell = document.createElement("td");
                    groupCell.textContent = group;
                    groupCell.style = "text-align:center";
                    row.appendChild(groupCell);

                    // Summary cell
                    const summaryCell = document.createElement("td");
                    summaryCell.textContent = summary;

                    row.appendChild(summaryCell);

                    // Modified date cell
                    const modifiedCell = document.createElement("td");
                    modifiedCell.textContent = formattedDate;
                    modifiedCell.style = "text-align:center";
                    row.appendChild(modifiedCell);

                    // Status cell
                    const statusCell = document.createElement("td");
                    statusCell.textContent = status;
                    statusCell.style = "text-align:center";
                    row.appendChild(statusCell);

                    // Action cell with open button
                    const actionCell = document.createElement("td");
                    if (uniqueId) {
                        const openButton = document.createElement("button");
                        openButton.textContent = "Open";
                        openButton.className = "imixs-worklist-open-button";
                        openButton.onclick = () => this._openWorkitem(uniqueId);
                        actionCell.appendChild(openButton);
                    }
                    actionCell.style = "text-align:center";
                    row.appendChild(actionCell);

                    tbody.appendChild(row);
                });
            }

            table.appendChild(tbody);

            // Clear container and append table
            container.innerHTML = "";
            container.appendChild(table);
        } catch (error) {
            console.error("Error rendering worklist:", error);
            throw error;
        }
    }

    /**
     * Format date string to localized date
     * @param {string} dateString - ISO date string
     * @returns {string} Formatted date string
     * @private
     */
    _formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString() + " " + date.toLocaleTimeString();
        } catch (e) {
            return dateString;
        }
    }

    /**
     * Open a workitem
     * @param {string} uniqueId - The workitem's unique ID
     * @private
     */
    _openWorkitem(uniqueId) {
        // Construct new URL with workitem ID
        const url = new URL(window.location.href);
        url.searchParams.set("workitem", uniqueId);

        // Remove unnecessary parameters
        url.searchParams.delete("showWorklist");
        url.searchParams.delete("modelversion");
        url.searchParams.delete("taskid");

        // Perform redirect
        window.location.href = url.toString();
    }
}
