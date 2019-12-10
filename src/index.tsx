let verbose = false

class OrderedSet<T> {
  public value:T
  constructor() {}
}

class State<T> {
  public context: Context<T>
  constructor() {}
}

console.log("1")
console.log("2")
console.log("3")
console.log("4")
console.log("5")
console.log("6")
console.log("7")
console.log("8")
console.log("9")
console.log("10")

// HERE IS THE LINE WITH THE CURSE
function UsersBox(props: {list: State<OrderedSet<string>>>, label:string}) {

}