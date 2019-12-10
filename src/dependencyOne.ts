import { DemoClass } from "./dependencyTwo"

function demoFunction() {
	return new DemoClass()
}

export { demoFunction }
