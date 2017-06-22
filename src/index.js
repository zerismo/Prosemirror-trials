import {EditorView} from "prosemirror-view"
import {fromHTML} from "prosemirror/dist/format"
//import {CSchema} from "./cschema"
import "prosemirror/dist/inputrules/autoinput"
import {menuBar,wrapItem, blockTypeItem, DropdownSubmenu, joinUpItem, liftItem,
       selectParentNodeItem, undoItem, redoItem, icons, MenuItem} from "prosemirror-menu"
// import {buildMenuItems} from "prosemirror-example-setup"
//import applyDevTools from "prosemirror-dev-tools"
import {EditorState} from "prosemirror-state"
import {Schema} from "prosemirror-model"
import {nodes, marks} from 'prosemirror-schema-basic'
import {orderedList, bulletList, listItem, wrapInList} from 'prosemirror-schema-list'
import {toggleMark, baseKeymap} from "prosemirror-commands"
import {keymap} from "prosemirror-keymap"
const crel = require("crel")
const prefix = "ProseMirror-menu"

//const {wrapInList} = require("prosemirror-schema-list")

let {paragraph, heading, horizontal_rule, text, hard_break, code_block} = nodes
let {em, strong, link,code} = marks

window.blah=null

let lastMenuEvent = {time: 0, node: null}
function markMenuEvent(e) {
  lastMenuEvent.time = Date.now()
  lastMenuEvent.node = e.target
  console.log(lastMenuEvent)
  // console.log(e.target)
}
function isMenuEvent(wrapper) {
	// console.log("Hello")
	// console.log(wrapper)
  return Date.now() - 100 < lastMenuEvent.time &&
    lastMenuEvent.node && wrapper.contains(lastMenuEvent.node)
}
function add (obj, props) {
  let copy = {}
  for (let prop in obj) copy[prop] = obj[prop]
  for (let prop in props) copy[prop] = props[prop]
  return copy
}
function translate(view, text) {
  return view._props.translate ? view._props.translate(text) : text
}


class Dropdown {
  // :: ([MenuElement], ?Object)
  // Create a dropdown wrapping the elements. Options may include
  // the following properties:
  //
  // **`label`**`: string`
  //   : The label to show on the drop-down control.
  //
  // **`title`**`: string`
  //   : Sets the
  //     [`title`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/title)
  //     attribute given to the menu control.
  //
  // **`class`**`: string`
  //   : When given, adds an extra CSS class to the menu control.
  //
  // **`css`**`: string`
  //   : When given, adds an extra set of CSS styles to the menu control.
  constructor(content, options,property_type) {
    this.options = options || {}
    this.content = Array.isArray(content) ? content : [content]
    this.property_type = property_type
    console.log(property_type)

  }


  // :: (EditorView) → dom.Node
  // Returns a node showing the collapsed menu, which expands when clicked.
  render(view) {
  	
    // console.dir(this.options)
    // console.log(this.content)
    let propo = null



	function getComputedStyleProperty(el, propName) {
	    if (window.getComputedStyle) {
	        return window.getComputedStyle(el, null)[propName];
	    } else if (el.currentStyle) {
	        return el.currentStyle[propName];
	    }
	}

	function reportColourAndFontSize(property_type) {
	    var containerEl, sel;
	    if (window.getSelection) {
	        sel = window.getSelection();
	        if (sel.rangeCount) {
	            containerEl = sel.getRangeAt(0).commonAncestorContainer;
	            // Make sure we have an element rather than a text node
	            if (containerEl.nodeType == 3) {
	                containerEl = containerEl.parentNode;
	            }
	        }
	    } else if ( (sel = document.selection) && sel.type != "Control") {
	        containerEl = sel.createRange().parentElement();
	    }
	    
	    if (containerEl) {
	        propo = getComputedStyleProperty(containerEl, property_type);
	        //colour = getComputedStyleProperty(containerEl, "color");
	        // alert("Colour: " + colour + ", font size: " + fontSize);
	    }
	}


	reportColourAndFontSize(this.property_type)





    let items = renderDropdownItems(this.content, view)
    if (!items.length) return null



	
    let label = crel("div", {class: prefix + "-dropdown " + (this.options.class || ""),
                             style: this.options.css,
                             title: this.options.title && translate(view, this.options.title)},
                    translate(view, this.label))

    let wrap = crel("div", {class: prefix + "-dropdown-wrap"}, label)
    let open = null, listeningOnClose = null
    label.innerHTML = propo

    let close = () => {
      if (open && open.close()) {
        open = null
        window.removeEventListener("mousedown", listeningOnClose)
      }
    }
    label.addEventListener("mousedown", e => {
      e.preventDefault()
      markMenuEvent(e)
      if (open) {
        close()
      } else {
      	// label = "Meow"
        open = this.expand(wrap, items)
        window.addEventListener("mousedown", listeningOnClose = () => {
          if (!isMenuEvent(wrap)) {close()
          }
          
        })
      }
    })
    return wrap
  }

  expand(dom, items) {
    let menuDOM = crel("div", {class: prefix + "-dropdown-menu " + (this.options.class || "")}, items)

    let done = false
    function close() {
      if (done) return
      done = true
            //console.log("MenuDom: ")
      //console.dir(menuDOM)
      dom.removeChild(menuDOM)
      return true
    }
    dom.appendChild(menuDOM)
    return {close, node: menuDOM}
  }
}

function renderDropdownItems(items, view) {
  let rendered = []
  for (let i = 0; i < items.length; i++) {
    let inner = items[i].render(view)
    if (inner) rendered.push(crel("div", {class: prefix + "-dropdown-item"}, inner))
  }
  return rendered
}



const CSchema = new Schema({
  nodes: {
    doc: {content: '(block | topblock)+'},
    paragraph,
    ordered_list: add(orderedList, {content: 'list_item+', group: 'block'}),
    bullet_list: add(bulletList, {content: 'list_item+', group: 'block'}),
    list_item: add(listItem, {content: 'paragraph block*'}),
    horizontal_rule: add(horizontal_rule, {group: 'topblock'}),
    heading: add(heading, {group: 'topblock'}),
    code_block,
    fontsize: {
    	attrs: {level: {default: 16}},
    	content: "inline<_>*",
    	group: "topblock",
    	defining: true,
    	parseDOM: [{tag:"span"}],
    	toDOM(node) {
    		let styler = 'font-size:' + node.attrs.level + 'px';
    		// console.log(styler)
    		console.log(node)
    		// let styler2 = styler.replace(/"/g, "'");  
    		return ["span", { style: styler },0]}
    },
    colors: {
    	attrs: {color: {default: "black"}},
    	content: "inline<_>*",
    	group: "topblock",
    	inclusive: true,
    	parseDOM: [{tag: "span", getAttrs: dom => {
        let cls = dom.style
        console.log("Style:" , dom.style)
        return {style: cls}
      }}],
    	toDOM(node){
    		let styler = 'color:' + node.attrs.color;
    		return ["span", {style:styler},0]
    	}
    },
    meow: {
    	content: "inline<_>*",
    	group: "block",
    	defining:true,
    	parseDOM:[{tag:"hello"}],
    	toDOM(node) {
    		// console.log(node)
    		// console.log(this)
    		return ["hello",0];
    	}
    },
    // media: add(media, {group: 'topblock'}),
    text,
    hard_break,
  },
  marks: {
    em,
    strong,
    link,
    code,
    rahul:{
    	parseDOM: [{tag: "rahul"}],
    	toDOM() {return ["rahul"]}
    }
  },
})


function keypress(){
	console.log("HEy")
}
console.log(CSchema)
window.cschema = CSchema
 // console.log(Schema)

function wrapListItem(nodeType, options) {
  return cmdItem(wrapInList(nodeType, options.attrs), options)
}
function cmdItem(cmd, options) {
  let passedOptions = {
    label: options.title,
    run: cmd,
    select(state) { return cmd(state) }
  }
  for (let prop in options) passedOptions[prop] = options[prop]
  return new MenuItem(passedOptions)
}

function markActive(state, type) {
  let {from, $from, to, empty} = state.selection
  if (empty) return type.isInSet(state.storedMarks || $from.marks())
  else return state.doc.rangeHasMark(from, to, type)
}

function markItem(markType, options) {
  let passedOptions = {
    active(state) { return markActive(state, markType) }
  }
  for (let prop in options) passedOptions[prop] = options[prop]
  return cmdItem(toggleMark(markType), passedOptions)
}


function buildMenuItems(schema) {
  let r = {}, type
  if (type = schema.marks.strong)
    r.toggleStrong = markItem(type, {title: "Toggle strong style", icon: icons.strong})
  if (type = schema.marks.em)
    r.toggleEm = markItem(type, {title: "Toggle emphasis", icon: icons.em})
  if (type = schema.marks.code)
    r.toggleCode = markItem(type, {title: "Toggle code font", icon: icons.code})
  if (type = schema.nodes.bullet_list)
    r.wrapBulletList = wrapListItem(type, {
      title: "Wrap in bullet list",
      icon: icons.bulletList
    })
  if (type = schema.nodes.ordered_list)
    r.wrapOrderedList = wrapListItem(type, {
      title: "Wrap in ordered list",
      icon: icons.orderedList
    })
  if (type = schema.nodes.blockquote)
    r.wrapBlockQuote = wrapItem(type, {
      title: "Wrap in block quote",
      icon: icons.blockquote
    })
  if (type = schema.nodes.paragraph)
    r.makeParagraph = blockTypeItem(type, {
      title: "Change to paragraph",
      label: "Plain"
    })
  if (type = schema.nodes.code_block)
    r.makeCodeBlock = blockTypeItem(type, {
      title: "Change to code block",
      label: "Code"
    })
  // if (type = schema.nodes.fontsize)
  //   r.makeFont = blockTypeItem(type, {
  //     title: "Font",
  //     label: "Fontsize"
  //   })
  if (type = schema.nodes.meow)
    r.makemeow = blockTypeItem(type, {
      title: "Meow",
      label: "Meow"
    })
  if (type = schema.marks.rahul)
  		r.toggleRahul = markItem(type, {
  			title: "Add stylish <rahul tags>",
  			label: "Rahul"
  		})

  if (type = schema.nodes.heading)
    for (let i = 1; i <= 10; i++)
      r["makeHead" + i] = blockTypeItem(type, {
        title: "Change to heading " + i,
        label: "Level " + i,
        attrs: {level: i}
      })
  
  let fontsize =[]
  let fontsize_obj = {}
  if (type = schema.nodes.fontsize)
    for (let i = 10; i <= 20; i++){
      fontsize_obj["fontsize" + i] = blockTypeItem(type, {
        title: i + " px",
        label: i + " px",
        attrs: {level: i}
      })
      fontsize.push(fontsize_obj["fontsize"+i])

  }
  // if (type = schema.nodes.horizontal_rule) {
  //   let hr = type
  //   r.insertHorizontalRule = new MenuItem({
  //     title: "Insert horizontal rule",
  //     label: "Horizontal rule",
  //     select(state) { return canInsert(state, hr) },
  //     run(state, dispatch) { dispatch(state.tr.replaceSelectionWith(hr.create())) }
  //   })
  

  let colors=[]
  let color_obj = {}
  if (type = schema.nodes.colors){
        color_obj["red"] = blockTypeItem(type, {
        title: "red",
        label: "red",
        attrs: {color: "red"}
      })
  colors.push(color_obj["red"])

        color_obj["blue"] = blockTypeItem(type, {
        title: "blue",
        label: "blue",
        attrs: {color: "blue"}
      })
  colors.push(color_obj["blue"])
}
  // }

  console.log(fontsize)
  r["fontsize"] = fontsize
  
  let cut = arr => arr.filter(x => x)
  //r.insertMenu = new Dropdown(cut([r.insertImage, r.insertHorizontalRule, r.insertTable]), {label: "Insert"})
  //.typeMenu = new Dropdown(cut([r.makeParagraph, r.makeCodeBlock, r.makeHead1 && new DropdownSubmenu(cut([
   // r.makeHead1, r.makeHead2, r.makeHead3, r.makeHead4, r.makeHead5, r.makeHead6
  //]), {label: "Heading"})]), {label: "Type..."})
  r.fontMenu = new Dropdown(fontsize, {label: "16px"},"fontSize")
  r.colorMenu = new Dropdown(colors , {label: "color"}, "color")


  r.inlineMenu2 = [cut([r.toggleStrong, r.toggleEm, r.toggleCode, r.toggleRahul,r.fontsize10,r.makemeow, r.fontMenu, r.colorMenu])]

  r.inlineMenu = r.inlineMenu2.concat([[undoItem, redoItem]])
  //console.log(redoItem)
  //r.blockMenu = [cut([r.typeMenu, r.tableMenu, r.wrapBulletList, r.wrapOrderedList, r.wrapBlockQuote, joinUpItem,
 //                     liftItem, selectParentNodeItem]]
  //r.fullMenu = r.inlineMenu.concat(r.blockMenu).concat([[undoItem, redoItem]])
  // console.log(r)
  return r
}


let view = new EditorView(document.querySelector("#editor"), {
	menuBar: true,
	state: EditorState.create({
		schema:  CSchema,
		plugins: [menuBar({floating:true, content: buildMenuItems(CSchema).inlineMenu}), keymap(baseKeymap),
]
	}),

})



// let badCapitalization = /\. [a-z]/g

// let checkDocumentForBadCaps = () => {
//   while ( pm.ranges.ranges.length > 0 ) {
//     pm.removeRange( pm.ranges.ranges[0] )
//   }
//   function scanFragment( fragment, position ) {
//     fragment.forEach((child, offset) => scan(child, position + offset))
//   }
//   function scan(node, position) {
//     if ( node.isText ) {
//       let match
//       while (match = badCapitalization.exec(node.text)) {
//       	// console.log(pm.ranges.ranges)
//         pm.markRange(position + match.index + 2, position + match.index + match[0].length,)
//       }
//     }
//     scanFragment(node.content, position + 1)
//   }
//   scanFragment(pm.doc.content, 0)
// }
// checkDocumentForBadCaps()

// pm.on( 'transform', checkDocumentForBadCaps )
// pm.on('transform', function(){
// 	console.log("Ho gaya")
// })



// applyDevTools(pm)
