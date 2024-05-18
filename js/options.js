/*
 * This code is part of Lett Search With chrome extension
 * 
 */
'use strict';

const Extension = {
	EDITOR:'EDITOR'
}

const Mode = {
	NRML:'NRML',
	INCG:'INCG',
	BOTH:'BOTH',
}

function none()
{
	return null;
}

function keys(object)
{
	return Object.keys(object);
}

function values(object)
{
	return Object.values(object);
}

function entries(object)
{
	return Object.entries(object);
}

function unpack(object)
{
	return entries(object).shift();
}

function assign()
{
	return Object.assign(...arguments);
}

function clone(x)
{
	return is.array(x) ? [...x] : {...x}
}

function on(s)
{
	return 'on' + s[0].toUpperCase() + s.slice(1);
}

function match(value, ...cases)
{
	for (const [k, v] of cases) {
		if (k === value) return v;
	}
}

class is
{
	static null(x)
	{
		return x == null;
	}

	static bool(x)
	{
		return this.type(x) == Boolean;
	}

	static string(x)
	{
		return this.type(x) == String;
	}

	static array(x)
	{
		return this.type(x) == Array;
	}

	static object(x)
	{
		return this.type(x) == Object;
	}

	static function(x)
	{
		return this.type(x) == Function;
	}

	static type(x)
	{
		return x?.constructor;
	}
}

class std
{
	static alias(k, obj)
	{
		for (const [x, y] of entries(obj))
		{
			if (k == x) return y;
			if (k == y) return x;
		}
	}
}

class string
{
	static match(ptrn, str)
	{
		return str.match(ptrn) || [];
	}

	static split(str, d = ' ')
	{
		return str ? str.split(d) : [];
	}

	static format(str, args)
	{
		args = array.cast(args);

		return str.replace(/%s/g, _ => args.shift());
	}
}

class array
{
	static cast(x)
	{
		return is.array(x) ? x : [x];
	}

	static move(from, to, arr)
	{
		const item = arr.splice(from, 1).pop();

		arr.splice(to, 0, item);
	}

	static remove(item, arr)
	{
		const i = arr.indexOf(item);

		if (i >= 0) {
			return arr.splice(i, 1).pop();
		}
	}
}

class math
{
	static randint(n, asString)
	{
		let s = '0';

		if (n !== +n || n < 1 || n > 16) {
			throw 'out of bound';
		}

		while(s[0] == '0' || s.length != n) {
			s = Math.random().toString().slice(2, n + 2);
		}

		return asString ? s : +s;
	}

	static inRange(n, [min, max])
	{
		return min <= n && n <= max;
	}
}

class storage
{
	static get(k)
	{
		return this.local.get(k).then(o => is.string(k) ? o[k] : o);
	}

	static set(obj)
	{
		return this.local.set(obj);
	}

	static clear()
	{
		return this.local.clear();
	}

	static local = chrome.storage.local;
}

class timeout
{
	static once(id, ms, fn)
	{
		!this.map[id] &&
			this.push(id, ms, fn);
	}

	static push(id, ms, fn)
	{
		this.setTimeout(id, ms, fn);
	}

	static setTimeout(id, ms, fn)
	{
		clearTimeout(this.map[id]);

		this.map[id] = setTimeout(
			_ => (this.map[id] = 0) & fn(), ms
		);
	}

	static map = {};
}

class contextMenu
{
	static addItem(item)
	{
		item.id ||= math.randint(8, true);

		assign(item, {
			contexts:['selection']
		});

		return chrome.contextMenus.create(item);
	}

	static addSeparator()
	{
		return this.addItem({type:'separator'});
	}

	static addSeparatedItem(item)
	{
		return [
			this.addSeparator(),
			this.addItem(item),
			this.addSeparator(),
		][1];
	}

	static removeAll(fn)
	{
		chrome.contextMenus.removeAll(fn);
	}
}

class ext
{
	static async onInstalled()
	{
		this.getOptionsViewList().then(
			list => this.setItems(list || this.default)
		);
	}

	static setItems(optionsViewList)
	{
		const contextMenuList = structuredClone(optionsViewList);

		contextMenu.removeAll(
			_ => storage.set({contextMenuList:this.createContextMenu(contextMenuList)})
		);

		storage.set({optionsViewList});
	}

	static getContextMenuItem(id)
	{
		return storage.get('contextMenuList').then(
			list => list.find(e => e.id == id)
		);
	}

	static getOptionsViewList()
	{
		return storage.get('optionsViewList');
	}

	static getItemsCount()
	{
		return this.getOptionsViewList().then(list => list.length);
	}

	static createContextMenu(list)
	{
		const nrml = [];
		const incg = [];

		for (const item of list)
		{
			if (Mode.INCG != item.mode) {
				nrml.push(item);
			}

			if ([Mode.INCG, Mode.BOTH].includes(item.mode))
			{
				incg.push(
					assign({incognito:true}, item)
				);
			}
		}

		for (const item of nrml) {
			item.id = contextMenu.addItem({title:item.name});
		}

		if (incg.length)
		{
			const parentId = contextMenu.addSeparatedItem({title:'Incognito'});

			for (const item of incg) {
				item.id = contextMenu.addItem({title:item.name, parentId});
			}
		}

		if (list.length > 3) {
			contextMenu.addSeparator();
		}

		contextMenu.addItem({
			id:Extension.EDITOR,
			title:'Add new...',
		});

		return [...nrml, ...incg];
	}

	static default = [{
		name:'Google',
		link:'https://www.google.com/search?q=',
		mode:Mode.NRML,
	},{
		name:'Youtube',
		link:'https://www.youtube.com/results?search_query=',
		mode:Mode.NRML,
	},{
		name:'Twitter',
		link:'https://twitter.com/search?q=',
		mode:Mode.NRML,
	}]
}

class Notifier
{
	constructor()
	{
		this.channels = {};
	}

	addListener(target, ids)
	{
		ids = string.split(ids);

		for (const id of ids) {
			this.getChannel(id).add(target);
		}
	}

	removeListener(target, ids)
	{
		ids = string.split(ids);

		if (!ids.length) {
			ids = keys(this.channels);
		}

		for (const id of ids) {
			this.getChannel(id).delete(target);
		}
	}

	send(id, data)
	{
		for (const target of this.getChannel(id)) {
			target[on(id)](data);
		}
	}

	getChannel(id)
	{
		return this.channels[id] ||= new Set;
	}
}

class UX
{
	static getBoundingRect(view, unitSuffix)
	{
		const rect = view.getBoundingClientRect().toJSON();

		if (unitSuffix) for (const k in rect) {
			rect[k] = rect[k] + unitSuffix;
		}

		return rect;
	}

	static getBorders(view)
	{
		const rect = this.getBoundingRect(view);

		return {
			x: [rect.x, rect.x + rect.width],
			y: [rect.y, rect.y + rect.height],
		};
	}

	static translate(view, x, y, duration, persist)
	{
		const rule = `translate(${x}px, ${y}px)`;

		if (duration)
		{
			const anim = view.animate([{transform:rule}], duration);

			return anim.finished.then(
				_ => view.style.transform = persist ? rule : null
			);
		}

		view.style.transform = rule;
	}

	static fadein(view, duration)
	{
		const frames = [
			{opacity:0},
			{opacity:1},
		];

		return view.animate(frames, duration).finished;
	}

	static show(view, duration)
	{
		return this.visibility(view, duration, 'show');
	}

	static hide(view, duration)
	{
		return this.visibility(view, duration, 'hide');
	}

	static fromBottom(view, duration)
	{
		return this.bottom(view, duration, 'fromBottom');
	}

	static toBottom(view, duration)
	{
		return this.bottom(view, duration, 'toBottom');
	}

	static dragStart(view)
	{
		this.setDragState(true);

		const d = this.getBoundingRect(view, 'px');

		view.parentNode.insertBefore(
			view.space = document.createElement('div'), view
		);

		assign(view.space.style, {
			visibility:'hidden',
			width:d.width,
			height:d.height,
		});

		assign(view.style, {
			position:'absolute',
			top:d.top,
			left:d.left,
			width:d.width,
			height:d.heigh,
			zIndex:99,
		});

		setTimeout(
			_ => view.addClass('CSDrag')
		);

		document.body.appendChild(view);
	}

	static dragEnd(parent, view, i)
	{
		if (!parent) {
			return view.space.remove() & this.setDragState(false);
		}

		const space = view.space;
		const nodes = parent.children;

		parent.insertBefore(space,
			nodes[i > [].indexOf.call(nodes, space) ? i + 1 : i]
		);

		this.removeTransClass(view, 'CSDrag', _ =>
		{
			parent.insertBefore(view, nodes[i]);

			space.remove();
			view.style = null;

			this.setDragState(false);
		});
	}

	static reverseAnim(view, duration)
	{
		const id = std.alias(view.anim.id, {
			show:'hide',
			fromBottom:'toBottom',
		});

		return this[id](view, duration);
	}

	static visibility(view, duration, id)
	{
		const frames = [
			{opacity:0, visibility:'hidden'},
			{opacity:1, visibility:'visible'},
		];

		if (id == 'hide') {
			frames.reverse();
		}

		return this.animFromCurrentState(view, frames, {id, duration});
	}

	static bottom(view, duration, id)
	{
		const frames = [
			{bottom:'-100%'},
			{bottom:'auto'},
		];

		if (id == 'toBottom') {
			frames.reverse();
		}

		return this.animFromCurrentState(view, frames, {id, duration});
	}

	static animFromCurrentState(view, frames, options)
	{
		options.fill = 'forwards';

		if (view.anim) {
			view.anim.pause() & frames.shift();
		}

		return (view.anim = view.animate(frames, options)).finished;
	}

	static removeTransClass(view, className, fn)
	{
		view.addEventListener('transitionend', fn, {
			once:true
		});

		setTimeout(
			_ => view.delClass(className)
		);
	}

	static setDragState(bool)
	{
		this.inDragState = bool;

		if (bool) {
			document.body.classList.add('CSOnDrag');
		}
		else {
			document.body.classList.remove('CSOnDrag');
		}
	}
}

class UI
{
	static init()
	{
		this.protos = {};

		for (const proto of document.body.firstChild.children)
		{
			const id = proto.getAttribute('protoid');

			if (id) {
				proto.removeAttribute('protoid');
			}
			else {
				throw proto;
			}

			this.protos[id] = proto;
		}

		document.body.innerHTML = '';
	}

	static create(id)
	{
		return this.protos[id].cloneNode(true);
	}

	static clone(id, view)
	{
		const node = this.protos[id];

		for (const child of node.children) 	{
			view.appendChild(child.cloneNode(true));
		}

		view.classList = node.classList;
	}

	static extend(a, b)
	{
		for (const k in b)
		{
			let ak = a[k], bk = b[k];

			switch (is.type(ak))
			{
				case String:
					bk = ak.concat(' ', bk);
				break;

				case Array:
					bk = ak.concat(bk);
				break;

				case Object:
					bk = this.extend(ak, bk);
				break;
			}

			a[k] = bk;
		}

		return a;
	}

	static insertInitialView(view)
	{
		view.style.opacity = 0;

		setTimeout(
			_ => UX.show(view, 250)
		);

		document.body.appendChild(view);
	}
}

const UIResponder =
{
	setParent(parent)
	{
		this.parent = parent;
	},

	handleEvent(event, sender = this)
	{
		if (sender != this)
		{
			if (event in this) {
				return this[event](sender);
			}

			if (this.onEvent) {
				return this.onEvent(event, sender);
			}
		}

		this.superview?.handleEvent(event, sender);
	},

	handleAction(action, sender = this, data)
	{
		let nextResponder;

		if (action in this && this != sender) {
			return this[action](sender, data);
		}

		if (nextResponder = this.parent || this.superview) {
			return nextResponder.handleAction(action, sender, data);
		}
	}
}

class ViewController
{
	constructor(view)
	{
		this.view;
		this.model;
		this.children = [];

		this.setView(view);
	}

	setView(view)
	{
		view.setParent(this);

		this.viewDidSet(
			this.view = view
		);
	}

	viewDidSet() {
	}

	addChild(child, parentId)
	{
		child.setParent(this);

		this.children.push(child);

		this.view.addSubview(child.view, {parentId});
	}
}

assign(ViewController.prototype, UIResponder);

const UIElement =
{
	superview:null,

	init(init)
	{
		this.targets = new Map;

		if (init.data) {
			this.data = init.data;
		}

		if (init.styles) {
			this.addClass(init.styles);
		}

		if (init.events) {
			this.addListener(init.events);
		}

		if (init.target) {
			this.addTarget(...init.target);
		}

		if (init.text) {
			this.textContent = init.text;
		}

		if (init.superview)
		{
			const [superview, opts] = init.superview;

			superview.addSubview(this, opts);
		}

		this.didInit(init);
	},

	removeFromSuperview()
	{
		this.superview?.removeSubview(this);
	},

	hasClass(s)
	{
		return this.classList.contains(s);
	},

	addClass(s)
	{
		this.classList.add(
			...string.split(s)
		);
	},

	delClass(s)
	{
		this.classList.remove(
			...string.split(s)
		);
	},

	condClass(s, bool)
	{
		bool ? this.addClass(s) : this.delClass(s);
	},

	hide(bool)
	{
		this.hidden = bool;
	},

	addListener(events)
	{
		const handler = this.eventHandler.bind(this);

		for (const event of string.split(events))
		{
			this.addEventListener(event, handler);
		}
	},

	addTarget(target, events)
	{
		events = string.split(events);

		for (const eventAction of events)
		{
			const [event, action] = eventAction.split(':');

			this.targets.set(event, [target, action]);
		}
	},

	sendAction(event)
	{
		const [target, action] = this.targets.get(event) || [];

		if (target) {
			return target.handleAction(action, this);
		}

		this.handleEvent(event);
	},

	eventHandler(e)
	{
		const event = on(e.type);

		if (event in this) {
			this[event](e);
		}
		else {
			this.sendAction(event);
		}

		e.stopPropagation();
	}
}

class UIView extends HTMLElement
{
	constructor(init)
	{
		super();

		this.subviews = [];

		if (init.source) {
			UI.clone(init.source, this);
		}

		this.init(init);
	}

	didInit(init) {
	}

	addSubview(view, opts = {})
	{
		view.superview = this;

		if (opts.styles) {
			view.addClass(opts.styles);
		}

		if (opts.atIndex === 0) {
			this.subviews.unshift(view);
			this.prepend(view);
		}
		else {
			this.subviews.push(view);

			if (opts.parentId) {
				this.queryId(opts.parentId).appendChild(view);
			}
			else if (opts.replaceId) {
				this.querySelector(opts.replaceId).replaceWith(view);
			}
			else {
				this.appendChild(view);
			}
		}

		return view;
	}

	addSubviews(views, parentId)
	{
		for (const view of views) {
			this.addSubview(view, parentId);
		}
	}

	removeSubview(view)
	{
		view.superview = null;

		array.remove(view, this.subviews).remove();
	}

	clear()
	{
		clone(this.subviews).forEach(
			view => this.removeSubview(view)
		);
	}

	queryId(id)
	{
		return this.querySelector('#' + id);
	}
}

assign(UIView.prototype, UIResponder);
assign(UIView.prototype, UIElement);

customElements.define('ui-view', UIView);

class UITextInput extends HTMLInputElement
{
	constructor(init)
	{
		super();

		UI.extend(init, {
			events:'keydown input focus blur'
		});

		this.init(init);
	}

	didInit(init)
	{
		this.name = init.name;
		this.value = init.value;
		this.placeholder = init.placeholder;
		this.autocomplete = false;
		this.spellcheck = false;
	}

	get value()
	{
		return super.value.trim();
	}

	set value(s)
	{
		super.value = s.trim();
	}

	reset()
	{
		this.value = '';
	}

	onKeydown(e)
	{
		this.sendAction('onKeydown', e);

		if (e.key == 'Enter') {
			return this.onEnter();
		}

		if (e.key == 'Escape') {
			return this.onEscape();
		}
	}

	onInput(e)
	{
		this.sendAction('onChange');
	}

	onFocus(e)
	{
		this.sendAction('onFocus');
	}

	onBlur(e)
	{
		this.sendAction('onBlur');
	}

	onEnter()
	{
		this.sendAction('onEnter');
	}

	onEscape()
	{
		this.blur();
		this.sendAction('onEscape');
	}
}

assign(UITextInput.prototype, UIResponder);
assign(UITextInput.prototype, UIElement);

customElements.define('ui-text-input', UITextInput, {extends:'input'});

class UIButton extends UIView
{
	constructor(init)
	{
		UI.extend(init, {
			events:'click'
		});

		super(init);
	}

	didInit(init)
	{
		super.didInit(init);

		if (init.label) {
			this.setLabel(init.label);
		}

		if (init.image) {
			this.addImage(init.image);
		}

		this.value = init.value;
	}

	addImage(source)
	{
		this.addSubview(
			UI.create(source)
		);
	}
}

customElements.define('ui-button', UIButton);

class UIDragArea extends UIButton
{
	constructor(init)
	{
		UI.extend(init, {
			events:'pointerdown'
		});

		super(init);
	}

	onPointerdown(e)
	{
		if (e.which != 1 || UX.inDragState) {
			return;
		}

		this.handleAction('onDragStart', this, e);
	}
}

customElements.define('ui-drag', UIDragArea);

class UIEnumButton extends UIButton
{
	didInit(init)
	{
		this.name = init.name;

		this.values = init.values;
		this.images = init.images;

		this.setValue(init.value);
	}

	setValue(value)
	{
		this.value = value;

		this.setImage(
			this.values.indexOf(value)
		);

		this.setAttribute('value', value);
	}

	onClick()
	{
		this.nextEnum();

		this.sendAction('onChange');
	}

	nextEnum()
	{
		let vals = this.values, i = vals.indexOf(this.value);

		if (++i == vals.length) {
			i = 0;
		}

		this.setValue(vals[i]);
	}

	setImage(i)
	{
		this.clear() & this.addImage(this.images[i]);
	}
}

customElements.define('ui-enum-button', UIEnumButton);

class UILinkInput extends UITextInput
{
	get value()
	{
		return this.realValue;
	}

	set value(s)
	{
		super.value = s;

		this.realValue = super.value;

		this.setDisplayValue(this.shortValue);
	}

	onInput(e)
	{
		this.realValue = super.value;

		super.onInput(e);
	}

	onEnter()
	{
		this.blur() & this.setDisplayValue(this.shortValue);
	}

	onFocus(e)
	{
		this.setDisplayValue(this.realValue);
	}

	onBlur(e)
	{
		this.setDisplayValue(this.shortValue);
	}

	setDisplayValue(s)
	{
		super.value = s;
	}

	get shortValue()
	{
		const s = this.realValue;

		try {
			return new URL(s).host.replace('www.', '');
		}
		catch (e) {
			return s;
		}
	}
}

customElements.define('ui-link-input', UILinkInput, {extends:'input'});

class UIMessage extends UIView
{
	constructor()
	{
		super({styles:'CSGlobalMessage'});
	}

	setMessage(text)
	{
		this.textContent = text;
	}
}

customElements.define('ui-message', UIMessage);

class EditView extends ViewController
{
	constructor()
	{
		super(
			new UIView({source:'UIEditView'})
		);

		ext.getOptionsViewList().then(
			this.init.bind(this)
		);
	}

	init(items)
	{
		items = new Dataset(items, {
			name: '',
			link: '',
			mode: Mode.NRML
		});

		this.setItemsView(
			this.items = items
		);

		items.addListener(this, 'update');
	}

	setItemsView(items)
	{
		const itemsView = this.view.addSubview(
			new UIItemsView(items)
		);

		itemsView.delegate = this;
	}

	itemDidModify(item, key, newVal)
	{
		if (key == 'mode')
		{
			const fmt = match(newVal,
				[Mode.BOTH, 'Incognito enabled for %s'],
				[Mode.INCG, '%s is now Incognito-only'],
				[Mode.NRML, '%s removed from Incognito'],
			);

			notifications.send('GlobalMessage',
				string.format(fmt, item.name)
			);
		}

		this.items.modify(item, key, newVal);
	}

	itemDidRemove(item)
	{
		this.items.remove(item);
	}

	itemDidMove(from, to)
	{
		this.items.move(from, to);
	}

	onItemSubmit(sender)
	{
		const name = sender.value;

		if (name) {
			this.items.add({name}) & sender.reset();
		}
	}

	onUpdate(items)
	{
		timeout.once('saveChanges', 100,
			_ => this.saveChanges(items)
		);
	}

	saveChanges(items)
	{
		ext.setItems(
			items.filter(a => a.name)
		);
	}

	viewDidSet(view)
	{
		new UIButton({
			styles:'CSAddItemIcon',
			image:'UIIconPlus',
			superview:[view, {parentId:'add-item'}],
		});

		new UITextInput({
			name:'add',
			value:'',
			placeholder:'Add new item',
			target:[this, 'onEnter:onItemSubmit'],
			superview:[view, {parentId:'add-item'}],
		});
	}
}

class Dataset extends Notifier
{
	constructor(items, proto)
	{
		super();

		this.items = items;
		this.proto = proto;
	}

	get iterator()
	{
		return this.items;
	}

	add(item)
	{
		this.items.unshift(item);

		for (const k in this.proto) {
			item[k] ??= this.proto[k];
		}

		this.notify('add', item);
	}

	move(from, to)
	{
		array.move(from, to, this.items);

		this.notify('move');
	}

	modify(item, key, newVal)
	{
		item[key] = newVal;

		this.notify('modify');
	}

	remove(item)
	{
		array.remove(item, this.items);

		this.notify('remove');
	}

	notify(eventId, data)
	{
		this.send(eventId, data);
		this.send('update', this.items);
	}
}

class UIItemsView extends UIView
{
	constructor(data)
	{
		super({
			styles:'CSItemsView'
		});

		for (const item of data.iterator) {
			this.addItem(item);
		}

		data.addListener(this, 'add');
	}

	didInit(init)
	{
		notifications.addListener(this, 'WindowResize');
	}

	onAdd(item)
	{
		const view = this.addItem(item, 0);

		if (!item.link) {
			view.querySelector('[name=link]').focus();
		}

		this.animateItemInsertion(view);
	}

	onItemDataChanged(_, {item, key, newValue})
	{
		this.delegate.itemDidModify(item, key, newValue);
	}

	onItemDrag(sender, {clientX, clientY})
	{
		UX.dragStart(sender);

		let points = [],
			target = false,
			remove = false,
			views = this.subviews,
			trashCan = this.initTrashCan();

		for (const view of views)
		{
			points.push(
				UX.getBorders(view)
			);
		}

		const s = UX.getBorders(sender);
		const t = UX.getBorders(trashCan);

		document.onpointermove = e =>
		{
			let cx = e.clientX,
				cy = e.clientY,
				dx = cx - clientX,
				dy = cy - clientY,
				sn = s.y[0] + dy,
				sw = s.x[0] + dx,
				ss = s.y[1] + dy,
				se = s.x[1] + dx;

			UX.translate(sender, dx, dy);

			let oldRemove = remove,
				oldTarget = target,
				newRemove = false,
				newTarget = false;

			for (const p of points)
			{
				let view, isOver = math.inRange(cx, p.x) && math.inRange(cy, p.y);

				if (isOver)
				{
					view = views[points.indexOf(p)];

					if (view != sender)
					{
						newTarget = view;
						break;
					}
				}
			}

			if (oldTarget != newTarget)
			{
				if (oldTarget) {
					oldTarget.delClass('CSDragOver');
				}

				if (newTarget) {
					newTarget.addClass('CSDragOver');
				}

				target = newTarget;
			}

			newRemove = ss > t.y[0] && sn < t.y[1] && sw < t.x[1] && se > t.x[0];

			if (oldRemove != newRemove)
			{
				trashCan.condClass('CSDragOver', newRemove);
				remove = newRemove;
			}

			if (remove && target)
			{
				target.delClass('CSDragOver');
				target = false;
			}
		};

		document.onpointerup = e =>
		{
			document.onpointerup = document.onpointermove = null;

			app.releaseSpace(trashCan, 'hide', 200);

			if (remove) {
				return this.removeItem(sender).then(
					_ => UX.dragEnd(null, sender)
				);
			}

			let i = views.indexOf(sender),
				j = i,
				Y = 0,
				d = 200;

			if (target)
			{
				Y = target.offsetTop - sender.offsetTop - this.scrollTop;
				j = views.indexOf(target);

				let childs, y = sender.offsetHeight;

				if (i > j) {
					childs = views.slice(j, i);
				}
				else {
					childs = views.slice(i + 1, j + 1);
					y = -y;
				}

				this.animateItems(childs, [0, y], d);
			}

			UX.translate(sender, 0, Y, d, true).then(_ =>
			{
				UX.dragEnd(this, sender, j);

				if (target)
				{
					target.delClass('CSDragOver');

					this.moveSubview(i, j);

					this.delegate.itemDidMove(i, j);
				}
			});
		}
	}

	addItem(item, atIndex)
	{
		this.setOverscoll();

		return this.addSubview(
			new UIItemView(item), {atIndex}
		);
	}

	removeItem(sender)
	{
		this.delegate.itemDidRemove(sender.item);

		this.setOverscoll();

		return this.animateItemRemove(sender).then(
			_ => this.removeSubview(sender)
		);
	}

	onWindowResize()
	{
		this.setOverscoll();
	}

	setOverscoll()
	{
		timeout.once('ItemsOverscroll', 100, _ =>
		{
			this.delClass('CSOverscroll');

			if (this.scrollHeight > this.offsetHeight) {
				this.addClass('CSOverscroll');
			}
		});
	}

	initTrashCan()
	{
		const view = new UIButton({
			styles:'CSTrashCan',
			image:'UIIConTrash'
		});

		return app.requestSpace(view, 'show', 400, true);
	}

	moveSubview(i, j)
	{
		array.move(i, j, this.subviews);
	}

	animateItemInsertion(view)
	{
		this.animateItemMutation(view, 'insertion', 200);

		UX.fadein(view, 200);
	}

	animateItemRemove(view)
	{
		this.animateItemMutation(view, 'removal', 200);

		return UX.hide(view, 200);
	}

	animateItemMutation(view, mutation, duration)
	{
		const frames = [0, -view.offsetHeight];

		if (mutation == 'insertion') {
			frames.reverse();
		}

		const views = this.subviews.slice(
			this.subviews.indexOf(view) + 1
		);

		this.animateItems(views, frames, duration);
	}

	animateItems(views, frames, duration)
	{
		const [from, into] = frames;

		frames = [
			{transform:`translateY(${from}px)`},
			{transform:`translateY(${into}px)`},
		];

		for (const view of views) {
			view.animate(frames, duration);
		}
	}
}

customElements.define('ui-items-view', UIItemsView);

class UIItemView extends UIView
{
	constructor(item)
	{
		super({
			source:'UIItemView',
			item:item,
		});

		this.item = item;
	}

	didInit({item})
	{
		new UITextInput({
			styles:'CSItemInput',
			placeholder:'Name',
			name:'name',
			value:item.name,
			target:[this, 'onChange:onDataChange'],
			superview:[this, {parentId:'inputs'}],
		});

		new UILinkInput({
			styles:'CSItemInput',
			placeholder:'URL',
			name:'link',
			value:item.link,
			target:[this, 'onChange:onDataChange'],
			superview:[this, {parentId:'inputs'}],
		});

		new UIEnumButton({
			styles:'CSItemMode',
			name:'mode',
			value:item.mode,
			values:[Mode.NRML, Mode.BOTH, Mode.INCG],
			images:['UIIconGhostLight', 'UIIconGhostLight', 'UIIconGhostSolid'],
			target:[this, 'onChange:onDataChange'],
			superview:[this, {replaceId:'ghost-enum'}],
		});

		new UIDragArea({
			styles:'CSItemDrag',
			image:'UIIconBars',
			superview:[this, {replaceId:'drag-bars'}],
		});
	}

	onDataChange(sender)
	{
		this.handleAction('onItemDataChanged', this, {
			item:this.item,
			key:sender.name,
			newValue:sender.value,
		});
	}

	onDragStart(_, e)
	{
		this.handleAction('onItemDrag', this, e);
	}
}

customElements.define('ui-item', UIItemView);

class App extends ViewController
{
	constructor()
	{
		UI.init();

		self.notifications = new Notifier;

		super(
			new UIView({styles:'CSView CSAppView'})
		);

		this.spaceQueue = [];
	}

	requestSpace(view, anim, time, pinned)
	{
		!this.spaceQueue.includes(view) &&
			this.spaceQueuePush(view, anim, time, pinned);

		return view;
	}

	releaseSpace(view, anim, time)
	{
		view = array.remove(view, this.spaceQueue);

		if (!view) {
			return;
		}

		view.loaded = false;

		UX[anim](view, time).then(
			_ => this.view.removeSubview(view)
		);

		this.spaceQueueNext();
	}

	viewDidSet(view)
	{
		this.addChild(new EditView);

		notifications.addListener(this, 'GlobalMessage');

		self.addEventListener('resize',
			e => notifications.send('WindowResize')
		);

		UI.insertInitialView(view);
	}

	onGlobalMessage(text)
	{
		const view = (this.console ||= new UIMessage);

		view.setMessage(text);

		this.requestSpace(view, 'show', 200);

		timeout.push('gMessage', 3e3,
			_ => this.releaseSpace(view, 'hide', 200)
		);
	}

	spaceQueuePush(view, anim, time, pinned)
	{
		this.spaceQueue.push(view);

		view.spaceQueue = {
			view, anim, time, pinned, loaded:false
		}

		this.view.addSubview(view, {
			styles:'CSAppViewBottom CSInvisible'
		});

		this.spaceQueueNext();
	}

	spaceQueueNext()
	{
		const c = this.spaceQueue[0]?.spaceQueue;

		if (!c) {
			return;
		}

		if (!c.loaded) {
			return this.grantSpace(c);
		}

		if (!c.pinned) {
			return this.releaseSpace(c.view, 'reverseAnim', 100);
		}
	}

	grantSpace(c)
	{
		const {view, anim, time} = c;

		view.delClass('CSInvisible');

		UX[anim](view, time);

		c.loaded = true;
	}
}

let app = new App;