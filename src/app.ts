// App code goes here

// Add source map support for node
// @ts-ignore 
import sourceMapSupport from 'source-map-support'
sourceMapSupport.install()

import { Command } from 'commander';
const program = new Command();

program
	.version("0.0.1")
	.option('-o, --option <word>', 'Example option')
	.option('-f, --flag', 'Example flag')
	.arguments("<file>")
	.parse()

function fail(x:any) { console.error(x); process.exit(1) }
if (program.args.length > 1)
	fail("error: too many files specified, at the moment the limit is 1")

const opts = program.opts()

console.log(`File ${program.args[0]}${opts.option || opts.flag ? " with ":""}${opts.flag?"flag":""}${opts.option && opts.flag ? ", ": ""}${opts.option || ""}`)
