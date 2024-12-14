const path = require('path');
const Dotenv = require('dotenv-webpack');
const webpack = require('webpack');
require('dotenv').config();

// Debug environment variables during build
console.log('Building with MAPBOX_TOKEN:', process.env.MAPBOX_TOKEN ? 'Token present' : 'Token missing');

module.exports = {
    entry: './src/main.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.js',
        publicPath: '/'
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader'
                }
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            }
        ]
    },
    plugins: [
        new Dotenv({
            systemvars: true,
            safe: false,
            path: '.env'
        }),
        new webpack.DefinePlugin({
            'process.env.MAPBOX_TOKEN': JSON.stringify(process.env.MAPBOX_TOKEN),
            'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
            'MAPBOX_TOKEN': JSON.stringify(process.env.MAPBOX_TOKEN)
        }),
        new webpack.ProvidePlugin({
            process: 'process/browser',
            Buffer: ['buffer', 'Buffer']
        })
    ],
    resolve: {
        extensions: ['.js', '.jsx'],
        fallback: {
            "path": require.resolve("path-browserify"),
            "stream": require.resolve("stream-browserify"),
            "zlib": require.resolve("browserify-zlib"),
            "crypto": require.resolve("crypto-browserify"),
            "http": require.resolve("stream-http"),
            "https": require.resolve("https-browserify"),
            "assert": require.resolve("assert/"),
            "url": require.resolve("url/"),
            "buffer": require.resolve("buffer/"),
            "process": require.resolve("process/browser")
        }
    },
    devServer: {
        static: {
            directory: path.join(__dirname, 'public')
        },
        compress: true,
        port: 3002,
        hot: true,
        historyApiFallback: true,
        client: {
            overlay: true,
            progress: true
        },
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
            "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
        }
    }
};
