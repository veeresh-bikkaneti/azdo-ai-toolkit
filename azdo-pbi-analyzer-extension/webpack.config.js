const path = require('path');
const webpack = require('webpack');

/** @type WebpackConfig */
const webExtensionConfig = {
    mode: 'production', // Enables built-in optimizations (minification, tree-shaking)
    target: 'webworker', // Extensions run in a node-like environment but 'webworker' or 'node' is fine. For VS Code logic 'node' is often used but let's stick to standard node-extension pattern.
    entry: {
        extension: './src/extension.ts',
    },
    output: {
        path: path.resolve(__dirname, 'dist'), // Output to 'dist' instead of 'out'
        filename: '[name].js',
        libraryTarget: 'commonjs',
        devtoolModuleFilenameTemplate: '../../[resource-path]',
    },
    devtool: false, // CRITICAL: Disable source maps for security/obfuscation
    resolve: {
        mainFields: ['browser', 'module', 'main'],
        extensions: ['.ts', '.js'], // support ts-files and js-files
        fallback: {
            "path": require.resolve("path-browserify"), // Polyfills might be needed if targeting web, but for local node extension simple node target is better.
            "fs": false
        }
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'ts-loader',
                    },
                ],
            },
        ],
    },
    externals: {
        'vscode': 'commonjs vscode', // Don't bundle vscode API
    },
    performance: {
        hints: false,
    },
};

// We will use a Node target configuration for the standard desktop extension
const nodeExtensionConfig = {
    mode: 'production', // Minification ON
    target: 'node', // Target Node.js environment
    entry: {
        extension: './src/extension.ts',
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'extension.js',
        libraryTarget: 'commonjs',
    },
    devtool: false, // NO SOURCE MAPS
    resolve: {
        extensions: ['.ts', '.js'],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'ts-loader',
                    }
                ],
            },
        ],
    },
    externals: {
        'vscode': 'commonjs vscode',
    },
};

module.exports = [nodeExtensionConfig];
