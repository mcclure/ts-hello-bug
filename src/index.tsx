import { h, render, Context, createContext, JSX } from "preact";
import { useContext } from "preact/hooks";
import { OrderedSet } from "immutable"

declare let require:any

let verbose = false

// ---- Helpers ----

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
      inside = <X.context.Provider value={X.value}>{inside}</X.context.Provider>
    }
    return inside
  }
}

// ----- Display -----

let parentNode = document.getElementById("content")
let replaceNode = document.getElementById("initial-loading")

let SelfId = new State("")
let PreconnectList = new State(OrderedSet<string>())
let ConnectList = new State(OrderedSet<string>())

let states = new StateGroup([SelfId, PreconnectList, ConnectList])

function UserBox() {
  const selfId = useContext(SelfId.context)
  return <div>You are {selfId ? selfId : "[pending]"}</div>
}

// HERE IS THE LINE WITH THE CURSE
function UsersBox(props: {list: State<OrderedSet<string>>>, label:string}) {

}