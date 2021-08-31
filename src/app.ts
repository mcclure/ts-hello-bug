// App code goes here

// Add source map support for node
// @ts-ignore 
import sourceMapSupport from 'source-map-support'
sourceMapSupport.install()

import { Command } from 'commander';
const program = new Command();

import { parseTree, modify, getNodePath, applyEdits, Node, Edit } from 'jsonc-parser'

program
	.version("0.0.1")
	.option('-o, --output <file>', 'Where to write (default stdout')
	.option('-i, --in-place', 'If true alter input file')
	.option('-f, --flag', 'Example flag')
	.option('-d, --delete <prop>', 'Property name to delete')
	.arguments("<file>")
	.parse()

function fail(x:any) { console.error(x); process.exit(1) }

if (program.args.length > 1)
	fail("error: too many files specified, at the moment the limit is 1")

const opts = program.opts()
const fromStdin = program.args[0] == "-"

if (opts.output && opts.inPlace)
	fail("error: options -o and -i at once does not make sense")
if (fromStdin && opts.inPlace)
	fail("error: option -i does not make sense with stdin")

import fs from 'fs'

let contents = fs.readFileSync(fromStdin ? 0 : program.args[0], 'utf-8')

let edits:Edit[] = []

let tree = parseTree(contents)

interface StackNode { readonly node:Node; idx?:number }

let stack:StackNode[] = [{node:tree}]
//tree = null

function pushAll<T>(a:T[], b:T[]) {
	for(const v of b) {
		a.push(v)
	}
}

// ONLY USED FOR DEMONSTRATING GETNODEPATH BUG -- REMOVE THIS NEXT LINE
import { findNodeAtLocation } from 'jsonc-parser'

while (stack.length) {
	const at = stack[stack.length-1]

	if (at.idx == null) {
		let haltDescent

		// PERFORM OPERATIONS HERE -- TODO SPLIT OUT
		// console.warn(at.node.offset, at.node.type, at.node.value)
		if (at.node.type == "property" && at.node.children && at.node.children[0].type == "string" && at.node.children[0].value == opts.delete) {
			console.warn("Match at", at.node.offset)

			// Printouts to demonstrate property getNodePath bug
			console.warn("DELETING", at.node)
			console.warn("WITH PATH", getNodePath(at.node))
			console.warn("BUT REALLY DELETING", findNodeAtLocation(tree, getNodePath(at.node)))

			// Remove the property
			pushAll(edits, modify(contents, getNodePath(at.node), undefined, {})) // No replacement value

break; // TO HELP DEMONSTRATE BUG -- REMOVE THIS LINE

			haltDescent = true
		}
		// OPERATIONS DONE

		if (haltDescent) // Don't examine children
			stack.pop()
		else
			at.idx = 0
	} else {
		if (!at.node.children || at.idx >= at.node.children.length) {
			stack.pop()
		} else {
			stack.push({node:at.node.children[at.idx]})
			at.idx++
		}
	}
}

if (edits.length) {
	contents = applyEdits(contents, edits)
	edits = null
} else {
	if (opts.inPlace) {
		process.exit(0) // Nothing to do
	}
}

const outFile = opts.inPlace ? program.args[0] : (opts.output == null || opts.output == "-" ? 1 : opts.output)

fs.writeFileSync(outFile, contents)
