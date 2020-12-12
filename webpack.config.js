const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

const clientConfig = {
    target: 'web',
    entry: './src/index.ts',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    output: {
        publicPath: '/',

        filename: 'index.js',
        path: path.resolve(__dirname, 'dist/public'),
    },
    resolve: {
        extensions: ['.js', '.json', '.vue', '.ts', 'js.map'],
        alias: {
            '@': path.resolve(__dirname),
            '~': path.resolve(__dirname),
        },
        modules: [
            'node_modules',
        ]
    },
    devtool: 'source-map',

    plugins: [
        new CopyPlugin({ patterns: [
                {
                    from: 'public',
                    to: path.resolve(__dirname, 'dist/public'),
                    toType: 'dir',
                },
            ]}),
    ],
};

const serverConfig = {
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },

    target: 'node',
    externals: {
        "node-hid": 'commonjs node-hid'
    },
    node: {
        global: false,
        __dirname: false,
        __filename: false,
    },
    entry: './src/app.ts',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'app.js'
    },
    resolve: {
        extensions: ['.js', '.ts', 'js.map'],
        alias: {
            '@': path.resolve(__dirname),
            '~': path.resolve(__dirname),
        },
        modules: [
            'node_modules',
        ]
    },

    devtool: 'source-map',
};

module.exports = [ serverConfig, clientConfig ];

