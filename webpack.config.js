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
        publicPath: '/'
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env', '@babel/preset-react']
                    }
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
        new webpack.ProvidePlugin({
            React: 'react'
        })
    ],
    resolve: {
        extensions: ['.js', '.jsx'],
        modules: ['node_modules', 'src'],
        alias: {
            '@': path.resolve(__dirname, 'src'),
            '@components': path.resolve(__dirname, 'src/actual-components/components'),
            '@core': path.resolve(__dirname, 'src/actual-components/core'),
            '@utils': path.resolve(__dirname, 'src/actual-components/utils'),
            '@integration': path.resolve(__dirname, 'src/actual-components/integration')
        },
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
        port: 3001,
        hot: true,
        open: true,
        historyApiFallback: true,
        client: {
            overlay: true,
            progress: true
        }
    },
    devtool: 'source-map'
};
