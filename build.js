const esbuild = require("esbuild");

// Check if watch mode is enabled
const watch = process.argv.includes("--watch");

// Build configuration
const buildConfig = {
    entryPoints: ["src/js/ImixsFormController.js"],
    bundle: true,
    outfile: "app/imixs-forms.min.js",
    minify: true,
    sourcemap: true,
    format: "iife",
    globalName: "ImixsForms",
    // Bundle all files from src directory
    loader: {
        ".js": "js",
    },
};

// Watch mode
if (watch) {
    // Start build in watch mode
    esbuild.context(buildConfig).then((context) => {
        context.watch();
        console.log("Watching for changes...");
    });
} else {
    // Single build
    esbuild
        .build(buildConfig)
        .then(() => {
            console.log("Build complete");
        })
        .catch(() => process.exit(1));
}
