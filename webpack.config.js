const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const Dotenv = require('dotenv-webpack');
const webpack = require('webpack');

module.exports = {
    mode: 'development',
    entry: './src/main.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.js',
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
        new HtmlWebpackPlugin({
            template: './public/index.html',
            inject: true
        }),
        new Dotenv(),
        new webpack.DefinePlugin({
            'process.env.REACT_APP_MAPBOX_TOKEN': JSON.stringify(process.env.REACT_APP_MAPBOX_TOKEN)
        })
    ],
    resolve: {
        extensions: ['.js', '.jsx'],
        fallback: {
            "stream": require.resolve("stream-browserify"),
            "buffer": require.resolve("buffer/"),
            "util": require.resolve("util/"),
            "assert": require.resolve("assert/"),
            "http": require.resolve("stream-http"),
            "url": require.resolve("url/"),
            "https": require.resolve("https-browserify"),
            "os": require.resolve("os-browserify/browser"),
            "zlib": require.resolve("browserify-zlib")
        }
    },
    devServer: {
        static: {
            directory: path.join(__dirname, 'public'),
        },
        compress: true,
        port: 5000,
        hot: true,
        open: true,
        client: {
            overlay: true,
            progress: true
        }
    },
    devtool: 'source-map'
};
