const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const commonConfig = {
  entry: path.resolve(__dirname, './index.ts'),
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'build'),
  },
  plugins: [
    new CleanWebpackPlugin(),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'node_modules/@mediapipe/tasks-text/wasm', to: 'wasm' },
        'style.css'
      ]
    }),
    new HtmlWebpackPlugin({
      inject: true,
      // scriptLoading: 'defer',
      template: path.resolve(__dirname, "./index.html")
    }),
  ]
};

const developmentConfig = {
  ...commonConfig,
  devtool: "inline-source-map",
  mode: "development",
  devServer: {
    port: 3000
  }
};

const productionConfig = {
  ...commonConfig,
  mode: "production"
};

module.exports = (env) => {
  return env.WEBPACK_SERVE ? developmentConfig : productionConfig;
};
