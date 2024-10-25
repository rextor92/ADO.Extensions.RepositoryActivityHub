const path = require("path");
const fs = require("fs");
const CopyWebpackPlugin = require("copy-webpack-plugin");

// Webpack entry points. Mapping from resulting bundle name to the source file entry.
const entries = {};

// Loop through subfolders in the "Samples" folder and add an entry for each one
const samplesDir = path.join(__dirname, "src/Contributions");
fs.readdirSync(samplesDir).filter((dir) => {
	if (fs.statSync(path.join(samplesDir, dir)).isDirectory()) {
		entries[dir] =
			"./" + path.relative(process.cwd(), path.join(samplesDir, dir, dir));
	}
});

module.exports = (env, argv) => ({
	entry: entries,
	output: {
		filename: "[name]/[name].js",
	},
	resolve: {
		extensions: [".tsx", ".ts", ".jsx", ".js"],
		alias: {
			"azure-devops-extension-sdk": path.resolve(
				"node_modules/azure-devops-extension-sdk"
			),
		},
		// fallback: {
		// 	process: require.resolve("process/browser"),
		// 	zlib: require.resolve("browserify-zlib"),
		// 	stream: require.resolve("stream-browserify"),
		// 	util: require.resolve("util"),
		// 	buffer: require.resolve("buffer"),
		// 	assert: require.resolve("assert"),
		// },
	},
	stats: {
		warnings: false,
	},
	module: {
		rules: [
			{
				test: /\.(ts|tsx)$/,
				exclude: /node_modules/,
				loader: "ts-loader",
				options: {
					transpileOnly: true,
				},
			},
			{
				test: /\.scss$/,
				use: ["style-loader", "css-loader", "sass-loader"],
			},
			{
				test: /\.css$/,
				use: ["style-loader", "css-loader"],
			},
			{
				test: /\.(woff|woff2|eot|ttf|otf)$/,
				type: "asset/inline",
			},
			{
				test: /\.html$/,
				type: "asset/resource",
			},
		],
	},
	plugins: [
		new CopyWebpackPlugin({
			patterns: [{ from: "**/*.html", context: "src/contributions" }],
		}),
	],
	...(env.WEBPACK_SERVE
		? {
				devtool: "inline-source-map",
				devServer: {
					server: "https",
					port: 3000,
				},
		  }
		: {}),
});
