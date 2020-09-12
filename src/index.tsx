import { h, render, Component } from "preact";
import { List } from "immutable"

let parentNode = document.getElementById("content")
let replaceNode = document.getElementById("initial-loading")

let demoList = List<string>().push("one").push("two")

class Content extends Component<any, any> {
  constructor(props:{}) {
    super(props);
    this.state = {};
  }

  render() {
    const divArray = demoList.map(
      s => {
        console.log("Inside map", typeof(s), s)
        return <div className="Id">{s}</div>
      }
    ).toJS()

    return (
      <div>Hello<br />{divArray}</div>
    )
  }
}

render(
  <Content />,
  parentNode, replaceNode
);
