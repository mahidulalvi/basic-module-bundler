const fs = require('fs');
const babylon = require('babylon');
const traverse = require('babel-traverse').default;
const path = require('path');
const babel = require('babel-core');

let Id = 0;

const createAsset = (fileName) => {
 const content = fs.readFileSync(fileName, 'utf-8');

 const ast = babylon.parse(content, { sourceType: 'module' });

 const dependencies = [];

 traverse(ast, {
	 ImportDeclaration: ({ node }) => {
		 dependencies.push(node.source.value);
	 }
 })

 const id = Id++;

 const { code } = babel.transformFromAst(ast, null, {
	 presets: ['env']
 });

 /*
 	*
  * console.log({
	*  id,
	*  fileName,
	*  dependencies,
	*  code,
 	* }, 'asset');
	*
	*/

 return {
	 id,
	 fileName,
	 dependencies,
	 code,
 }
}

const createGraph = (entry) => {
	const mainAsset = createAsset(entry);

	const queue = [mainAsset];

	for (const asset of queue) {
		const dirName = path.dirname(asset.fileName);

		asset.mapping = {};

		asset.dependencies.forEach(relativePath => {
			const absolutePath = path.join(dirName, relativePath);

			const child = createAsset(absolutePath);

			asset.mapping[relativePath] = child.id;

			queue.push(child);
		});
	}

	// console.log(queue, 'assetQueue');

	return queue;
}

const bundle = graph => {
	let modules = '';

	graph.forEach(assetModule => {
		modules += `${assetModule.id}: [
			(require, module, exports) => {
				${assetModule.code}
			},
			${JSON.stringify(assetModule.mapping)},
		],`;
	});

	const textJs = `
		(modules => {
			const require = (id) => {
				const [moduleInvokeFunction, dependencyMapping] = modules[id];

				const localRequire = relativePath => require(dependencyMapping[relativePath]);

				const module = { exports: {} };

				moduleInvokeFunction(localRequire, module, module.exports);

				return module.exports;
			}

			require(0);
		})({${modules}})
	`

	return textJs;
}

const graph = createGraph('./src/entry.js');
// console.log(graph);
const result = bundle(graph);

console.log(result);
