let verbose = false

// ---- Helpers ----

namespace JSX { export class Element {} }
class Context<T> { constructor( public value: T) }
function createContext<T>(x : T) { return new Context(x) }
function useContext(x : Context<T>) { return x.value }

class OrderedSet<T> {
  public value:T
  constructor() {}
}

class Refresher {
  private refreshed = true
  public refresh:()=>void
  constructor(refreshCallback :()=>void, dontRenderYet?:boolean) {
    this.refresh = () => {
      this.refreshed = true
      refreshCallback()
    }
    if (!dontRenderYet)
      this.refresh()
  }
  request() {
     if (this.refreshed) {
      this.refreshed = false
      requestAnimationFrame(this.refresh)
    }
  }
}

class State<T> {
  public context: Context<T>
  constructor(public value:T) {
    this.context = createContext(value)
  }
}

class StateGroup {
  constructor(public states:State<any>[]) {}
  render(inside:JSX.Element) {
    for (let X of this.states) {
      inside = new JSX.Element()
    }
    return inside
  }
}

// ----- Display -----

let parentNode = document.getElementById("content")
let replaceNode = document.getElementById("initial-loading")

let SelfId = new State("")
let PreconnectList = new State(new OrderedSet<string>())
let ConnectList = new State(new OrderedSet<string>())

let states = new StateGroup([SelfId, PreconnectList, ConnectList])

function UserBox() {
  const selfId = useContext(SelfId.context)
  return 3
}

// HERE IS THE LINE WITH THE CURSE
function UsersBox(props: {list: State<OrderedSet<string>>>, label:string}) {

}