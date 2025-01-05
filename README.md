# Imixs Forms

A lightweight, framework-agnostic form generator for the Imixs-Workflow engine.

## Features

- Generates web forms from XML definitions
- No external dependencies
- Grid-based layout system
- Easy integration with Imixs-Workflow
- Extensible architecture
- Modern error handling with user feedback

## Architecture

Imixs-Forms consists of three main components that work together to create and manage dynamic forms:

### ModelManager

The ModelManager is responsible for loading BPMN model data from the Imixs-Workflow engine. It:

- Fetches task definitions via REST API
- Extracts form definitions and metadata
- Handles model versioning and task IDs

### FormManager

The FormManager handles the form lifecycle including:

- Parsing XML form definitions
- Generating dynamic HTML forms
- Managing the form submission process
- Emitting form events

### ErrorManager

The ErrorManager provides a centralized error handling mechanism with:

- User-friendly error messages
- Different message types (Error, Warning, Info)
- Animated notifications
- Automatic message dismissal

## Quick Start

1. Include the required files:

```html
<link rel="stylesheet" href="src/css/styles.css" />
<script src="./js/ErrorManager.js"></script>
<script src="./js/ModelManager.js"></script>
<script src="./js/FormManager.js"></script>
```

2. Initialize the managers:

```javascript
const errorManager = new ErrorManager();
const modelManager = new ModelManager({
  baseUrl: "/api",
  modelversion: "1.0.0",
  taskid: "1000",
});

const formManager = new FormManager({
  baseUrl: "/api",
  workflowEndpoint: "workflow/workitem",
});
```

3. Load and render a form:

```javascript
try {
  // Get task definition from model
  const modelData = await modelManager.getTaskDefinition();

  // Generate form from definition
  const formStructure = await formManager.parseFormDefinition(
    modelData.formDefinition
  );
  formManager.renderForm(formStructure, "form-container");
} catch (error) {
  errorManager.handleError(error);
}
```

## Form Definition

Forms are defined using a simple XML format:

```xml
<?xml version="1.0"?>
<imixs-form>
  <imixs-form-section label="Address:">
    <item name="zip" type="text" label="ZIP:" span="2" />
    <item name="city" type="text" label="City:" span="6" />
  </imixs-form-section>
</imixs-form>
```

## Development

Imixs-Forms is a lightweight framework that can be tested with any HTTP server. The framework consists of pure HTML, JavaScript and CSS files, so you don't need any build tools or complex development environment.
You can run your app in any Web Server or you can deploy it directly into the Imixs Workflow Server.

### Docker Integration

To integrate Imixs-Forms into your Imixs-Workflow project, you can use the [Imixs-Microservice](https://github.com/imixs/imixs-microservice/) as a Docker container. You just need to have Docker installed on your system:

- **Windows/Mac**: Install [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **Linux**: Install [Docker Engine](https://docs.docker.com/engine/install/) and [Docker Compose](https://docs.docker.com/compose/install/)

After installation, start the Imixs-Workflow service with:

    $ docker compose up

During development your local application code is mapped automatically by a docker volume in your `docker-compose.yml` file:

```yaml
services:
  app:
    image: imixs/imixs-microservice
    volumes:
      - ./src/:/opt/jboss/wildfly/standalone/deployments/imixs-microservice.war/app/
    ports:
      - "8080:8080"
    ...
```

The application will be available at:

    http://localhost:8080/app/

When you make changes to your code, simply refresh your browser window to see the updates during development.

### Development Server

During development, you can also use VS Code's Live Server for quick testing and debugging:

1. Install [Visual Studio Code](https://code.visualstudio.com/) if not already installed
2. Open VS Code and install the "Live Server" extension
   - Click the Extensions icon in the left sidebar (or press Ctrl+Shift+X)
   - Search for "Live Server"
   - Click "Install" for the extension by Ritwick Dey
3. Open the Imixs-Forms project folder in VS Code
4. Right-click on `src/index.html` and select "Open with Live Server"

The application will automatically open in your default web browser. Live Server will automatically reload the page whenever you make changes to your files.

### VSCode Settings

This project includes VS Code settings for consistent code formatting and validation. When you open the project in VS Code, it will recommend installing the following extensions:

- Prettier - Code formatter
- ESLint - JavaScript linting
- Live Server - Development server

The project settings will automatically:

- Format code on save
- Validate JavaScript, HTML, and CSS
- Maintain consistent code style
- Remove trailing whitespace
- Ensure consistent line endings

To take full advantage of these features, make sure to:

1. Install the recommended extensions when prompted
2. Use VS Code as your editor
3. Allow the editor to format files on save when asked

## Events

The FormManager emits the following events:

- `formSubmitSuccess`: When form data is successfully submitted
- `formSubmitError`: When an error occurs during submission

## License

[Add your license information here]
