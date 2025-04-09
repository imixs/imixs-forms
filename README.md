# Imixs Forms

Imixs-Forms is a lightweight, framework-agnostic form generator for building Single Page Applications with [Imixs-Workflow](https://www.imixs.org). Forms and Actions can be defined within a BPMN model and the data is automatically stored in a so called process instances within the Imixs Workflow engine.

## Overview

Imixs Forms helps developers to build custom Single Page Applications based on BPMN models. Using the [Imixs BPMN Modeler](https://www.open-bpmn.org), developers can define their workflow and form definitions directly in the BPMN model while maintaining full control over the application design and implementation. The framework provides all necessary tools for:

-   Form layouts and fields
-   Workflow states and transitions
-   Action buttons and events
-   Business logic

By combining the power of BPMN modeling with custom web development, developers can create tailored workflow applications with minimal overhead while maintaining full flexibility in their implementation.

## Features

-   Generates web forms directly from BPMN models
-   No external dependencies
-   Grid-based layout system
-   Easy integration with Imixs-Workflow
-   Extensible architecture
-   Modern error handling with user feedback
-   Automatic form state management
-   Dynamic action button generation

## Run the Demo

To run the demo application you just need to start the docker compose stack. If not yet installed see the [official install guide](https://docs.docker.com/engine/install/).

Start the demo with:

```
$ docker compose up
```

**Note:** The docker-compose.yaml file expects a data directory `./models/` providing the BPMN models to be automatically imported during startup. So just create a directory `models/` together with your docker-compose file.

```
.
├── docker-compose.yaml
└── models/
    └── ticket-en-1.0.0.bpmn
```

Open the application by defining your Model Entry Point:

```
http://localhost:8080/app/?modelversion=ticket-en-1.0&taskid=1000
```

## Quick Start

The following section gives you a brief overview how to integrate Imixs-Forms into your own Single-Page-Application.

1. Include the required files:

```html
<link rel="stylesheet" href="src/css/imixs-forms.css" />
<script src="./imixs-forms.min.js"></script>
```

2. Add a container element and initialize the form:

```html
<div id="form-container"></div>

<script>
    // Initialize form with default settings
    const form = new ImixsFormController("form-container");
</script>
```

3. Open the application by defining your Model Entry Point:

```
http://localhost:8080/app/?modelversion=ticket-en-1.0&taskid=1000
```

where `modelversion` defines your BPMN model version and `taskid` the start BPMN Task element to start with.

That's it! The form will automatically:

-   Load the BPMN model data
-   Generate the form based on your model
-   Handle form submissions
-   Manage workflow transitions

You can also overwrite the default Rest API parameters for your Imixs-Microservice:

```html
<script>
    // Or with custom configuration
    const form = new ImixsFormController("form-container", {
        baseUrl: "/api",
        credentials: {
            username: "admin",
            password: "password",
        },
    });
</script>
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

You can put in the form definition into your BPMN Model using the [Open-BPMN Modelling Tool](https://www.open-bpmn.org).

<img src="imixs-bpmn-001.png" />

### How to Deploy a BPMN Model

Imixs-Microservice automatically loads a default BPMN model from the location defined by the environment variable 'IMIXS_MODEL' during the startup. You can find example models in the folder `models/`

#### Using curl

To add or update a model created with [Imixs-BPMN](http://www.imixs.org/doc/modelling/index.html) during runtime use the Imixs Rest API. See the following `curl` command example:

    curl --user admin:adminadmin --request POST -Tticket-en-1.0.0.bpmn http://localhost:8080/api/model/bpmn

**NOTE:** cURL isn't installed in Windows by default. See the [Use Curl on Windows](https://stackoverflow.com/questions/9507353/how-do-i-install-and-use-curl-on-windows) discussion on stackoverflow.

#### The Admin Client

You can also use the [Imixs-Admin Client](https://github.com/imixs/imixs-admin) to manage models. The Imixs Admin client allows you to administrate your workflow instance. Just open the admin client in a separate browser window under:

http://localhost:8888/

And login with the following parameters:

-   URL = http://app:8080/api
-   Authentication Method = Basic
-   User-ID = admin
-   Password = adminadmin

<img src="imixs-admin-001.png" />

### Verify Model

To verify if the model was deployed successfully you can check the model repository form your web browser:

    http://localhost:8080/api/model

## Development

Imixs-Forms is an open source project and we welcome developers to join our community. In the section [development](./DEVELOPMENT.md) you can find information about how to get started developing and contributing to this framework.

We're particularly interested in contributions around UBL support, validation features, and performance optimizations.
