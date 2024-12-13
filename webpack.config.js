const path = require('path');
const webpack = require('webpack');
const Dotenv = require('dotenv-webpack');

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
          loader: 'babel-loader'
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx'],
    fallback: {
      "path": require.resolve("path-browserify")
    }
  },
  plugins: [
    new Dotenv({
      systemvars: true,
      allowEmptyValues: false
    })
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    hot: true,
    port: 8080,
    historyApiFallback: true
  }
};
