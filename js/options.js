/* 
 * This code is part of Lett Search With chrome extension
 * 
 */
'use strict';

class std
{
	static isNull(var_)
	{
		return var_ == null;
	}

	static define(var_, default_)
	{
		return this.isNull(var_) ? default_ : var_;
	}

	static clamp(n, min, max)
	{
		return n < min ? min : n > max ? max : n;
	}

	static inRange(n, r)
	{
		return r[0] <= n && n <= r[1];
	}
}

class array
{
	static cast(x)
	{
		return x instanceof Array ? x : [x];
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
			arr.splice(i, 1);
		}
	}
}

class string
{
	static match(ptrn, str)
	{
		return str.match(ptrn) || [];
	}

	static format(str, args)
	{
		args = array.cast(args);

		return str.replace(/%s/g, _ => args.shift());
	}

	static last(after, str)
	{
		return str.split(after).pop();
	}

	static capital(str)
	{
		return str.substring(0, 1).toUpperCase() + str.substring(1);
	}
}

class storage
{
	static get(key, default_)
	{
		return new Promise(resolve =>
		{
			this.namespace.get(key, r =>
			{
				if (typeof key == 'string')
				{
					r = std.define(r[key], default_);
				}

				resolve(r);
			});
		});
	}

	static set(key, val)
	{
		if (typeof key == 'string')
		{
			key = {[key]:val};
		}

		return new Promise(done => {
			this.namespace.set(key, done);
		});
	}

	static remove(key)
	{
		return new Promise(done => {
			this.namespace.remove(key, done);
		});
	}

	static clear()
	{
		return new Promise(done => {
			this.namespace.clear(done);
		});
	}

	static getAll(fn)
	{
		this.namespace.get(null, fn);
	}

	static namespace = chrome.storage.local;
}

class sync
{
	static getItemsObject(fn)
	{
		this.getItems(items =>
		{
			const pairs = {};

			for (const item of items)
			{
				pairs[item.name] = item.link;
			}

			fn(pairs);
		});
	}

	static getItems(fn)
	{
		storage.get('items').then(fn);
	}

	static setItems(items)
	{
		const menu = chrome.contextMenus;

		if (items.length == 0)
		{
			items.push(this.default[0]);
		}

		menu.removeAll(done =>
		{
			for (const item of items)
			{
				menu.create({
					id:item.name,
					title:item.name,
					contexts:['selection'],
				});
			}

			menu.create({
				id:chrome.runtime.id,
				title:'Add new...',
				contexts:['selection'],
			});
		});

		storage.set({items});
	}

	static init()
	{
		this.getItems(
			items => this.setItems(items || this.default)
		);
	}

	static default = [
	{
		name:'Google',
		link:'https://www.google.com/search?q='
	},
	{
		name:'Youtube',
		link:'https://www.youtube.com/results?search_query='
	},
	{
		name:'Twitter',
		link:'https://twitter.com/search?q='
	}]
}

class UIFactory
{
	constructor()
	{
		this.protos = {};

		for (const proto of document.body.firstChild.children)
		{
			const id = proto.getAttribute('protoid');

			if (id) {
				proto.removeAttribute('protoid');
			}
			else {
				throw 'missing protoid for child';
			}

			this.protos[id] = proto;
		}

		document.body.innerHTML = '';
	}

	insertInitialView(view)
	{
		UX.fadein(view, 250);

		document.body.appendChild(view.element);
	}

	create(id)
	{
		return this.protos[id].cloneNode(true);
	}
}

class UX
{
	static transClass(view, newClass, oldClass)
	{
		view.addClass(newClass);

		if (oldClass) {
			view.removeClass(oldClass);
		}

		view.addEventListener('transitionend',
			_=> view.removeClass(newClass), {once:true}
		);
	}

	static translate(view, x, y, duration)
	{
		const rule = `translate(${x}px, ${y}px)`;

		if (duration)
		{
			const frames = [{
				transform:rule
			}];

			return view.element.animate(frames, duration).finished.then(
				_ => view.style.transform = null
			);
		}

		view.style.transform = rule;
	}

	static fadein(view, duration)
	{
		return this.fade(view, duration, true);
	}

	static fadeout(view, duration)
	{
		return this.fade(view, duration, false);
	}

	static removeStyle(view, name)
	{
		view.style[name] = null;
	}

	static fade(view, duration, fadein)
	{
		let frames = [
			{opacity:1},
			{opacity:0},
		];

		if (fadein) {
			frames.reverse();
		}

		return view.element.animate(frames, duration).finished;
	}
}

class UIResponder
{
	isChildOf(viewController)
	{
		this.parent = viewController;
	}

	handleAction(action, sender, data)
	{
		if (action in this && this != sender)
		{
			return this[action](sender, data);
		}

		if (this.nextResponder)
		{
			this.nextResponder.handleAction(action, sender, data);
		}
	}

	get nextResponder()
	{
		return this.parent || this.superview;
	}
}

class ViewController extends UIResponder
{
	constructor(view)
	{
		super();

		this.view;
		this.model;
		this.children = [];

		this.setView(view);
	}

	setView(view)
	{
		view.isChildOf(this);

		this.viewDidSet(
			this.view = view
		);
	}

	viewDidSet()
	{
	}

	addChild(child, viewTargetId)
	{
		child.isChildOf(this);

		this.children.push(child);

		this.view.addSubview(child.view, viewTargetId);
	}
}

class UIElement extends UIResponder
{
	constructor(protoId)
	{
		super();

		this.element = UI.create(protoId);

		this.import('style hidden addEventListener setAttribute querySelector appendChild textContent');
	}

	import(methods)
	{
		const e = this.element;

		for (const x of methods.split(' '))
		{
			if (x in this) {
				throw 'cannot redefine property';
			}

			if (typeof e[x] == 'function')
			{
				this[x] = e[x].bind(e);
			}
			else {
				Object.defineProperty(this, x, {
					get() {
						return e[x];
					},
					set(v) {
						e[x] = v;
					}
				});
			}
		}
	}
}

class UIView extends UIElement
{
	constructor(protoId, init)
	{
		super(protoId);

		this.superview;
		this.subviews = [];
		this.targets = {};

		if (init) {
			this.init(init);
		}
	}

	init(init)
	{
		if (init.import) {
			this.import(init.import);
		}

		if (init.target) {
			this.addTarget(...init.target);
		}

		if (init.css) {
			this.addClass(init.css);
		}

		if (init.text) {
			this.textContent = init.text;
		}

		if (init.dom)
		{
			const [superview, targetId] = init.dom;

			superview.addSubview(this, targetId);
		}
	}

	addClass(str)
	{
		this.element.classList.add(...str.split(' '));
	}

	removeClass(str)
	{
		this.element.classList.remove(...str.split(' '));
	}

	remove()
	{
		this.element.remove();
	}

	addSubview(view, targetId)
	{
		view.superview = this;

		if (targetId == 0) {
			this.subviews.unshift(view);
		}
		else {
			this.subviews.push(view);
		}

		switch (typeof targetId)
		{
			case 'string':
				return this.queryId(targetId).appendChild(view.element);

			case 'number':
				return this.element.prepend(view.element);

			default:
				return this.appendChild(view.element);
		}
	}

	removeSubview(view)
	{
		array.remove(view, this.subviews);

		view.remove();
	}

	addSubviews(views, targetId)
	{
		for (const view of views)
		{
			this.addSubview(view, targetId)
		}
	}

	addTarget(target, action, event = action)
	{
		const native = !event.startsWith('on');

		if (native) {
			this.addListener(event, 'handleEvent');
		}

		this.targetsFor(event).set(target, action);
	}

	addTargets(target, actions)
	{
		for (const action of actions) {
			this.addTarget(target, action);
		}
	}

	handleEvent(e)
	{
		const native = e.type;
		const custom = this.toCustomEvent(native);

		if (!this[custom])
		{
			Object.defineProperty(this, custom, {
				value: this.sendAction.bind(this, native)
			});
		}

		e.stopPropagation() & this[custom](e);
	}

	addListener(event, method)
	{
		this.addEventListener(event, this[method].bind(this));
	}

	queryId(id)
	{
		return this.querySelector('#' + id);
	}

	sendAction(event, data)
	{
		for (const [target, action] of this.targetsFor(event))
		{
			target.handleAction(action, this, data);
		}
	}

	targetsFor(event)
	{
		return this.targets[event] ||= new Map;
	}

	toCustomEvent(name)
	{
		return 'on' + string.capital(name);
	}
}

class UIDefault extends UIView
{
	constructor(init)
	{
		super('UIDefault', init);
	}
}

class UIButton extends UIDefault
{
	constructor(init)
	{
		super(init);

		if (init.image) {
			this.addImage(init.image);
		}

		this.addClass('CSButton');

		this.value = init.value;
	}

	addImage(protoId)
	{
		this.appendChild(
			UI.create(protoId)
		);
	}
}

class Dataset
{
	constructor(array, scheme)
	{
		this.array = array;
		this.scheme = scheme;

		this.targets = {};
	}

	get iterator()
	{
		return this.array;
	}

	add(item)
	{
		const {array, scheme} = this;

		for (const k in scheme)
		{
			if (k in item) {
				continue;
			}

			item[k] = scheme[k].default;
		}

		array.unshift(item);

		this.notification('add', item, scheme);
	}

	move(from, to)
	{
		array.move(from, to, this.array);

		this.notification('move');
	}

	modify(item, key, val)
	{
		item[key] = val;

		this.notification('modify');
	}

	remove(item)
	{
		array.remove(item, this.array);

		this.notification('remove');
	}

	addListener(event, target, method)
	{
		this.eventTargets(event).push(
			target[method].bind(target)
		);
	}

	notification(event, ...args)
	{
		const isUpdate = ['add', 'move', 'modify', 'remove'];

		for (const target of this.eventTargets(event))
		{
			target(...args);
		}

		if (isUpdate.includes(event))
		{
			this.notification('update', this.array);
		}
	}

	eventTargets(event)
	{
		return this.targets[event] ||= [];
	}
}

class EditView extends ViewController
{
	constructor()
	{
		super(
			new UIView('UIEditView')
		);

		sync.getItems(
			items => this.init(items)
		);
	}

	init(items)
	{
		items = new Dataset(items, {
			name: {
				holder:'name',
				default:'',
			},
			link: {
				holder:'https://...',
				default:'',
			}
		});

		items.addListener('update', this, 'onUpdate');

		this.addItemsView(
			this.items = items
		);
	}

	addItemsView(items)
	{
		const itemsView = new ItemsView(items);

		itemsView.delegate = this;

		this.view.addSubview(itemsView);
	}

	itemDidModify(item, key, val)
	{
		this.items.modify(item, key, val);
	}

	itemDidRemove(item)
	{
		this.items.remove(item);
	}

	itemDidMove(from, to)
	{
		this.items.move(from, to);
	}

	onAddNewItem(sender)
	{
		let item = {}, {value, suggestion} = sender;

		if (!value) {
			return;
		}

		if (suggestion) {
			item.link = this.predefined[suggestion];
		}

		item.name = value;

		this.items.add(item) & sender.reset();
	}

	onUpdate(items)
	{
		this.saveChangesPid ||= setTimeout(
			_ => this.saveChanges(items) & (this.saveChangesPid = 0)
		, 250);
	}

	saveChanges(items)
	{
		const unique = [];

		const valids = items.filter(item =>
		{
			const name = item.name;

			if (!name || unique.includes(name)) {
				return false;
			}

			return unique.push(name);
		});

		sync.setItems(valids);
	}

	viewDidSet(view)
	{
		this.predefined = {
			Amazon:'https://www.amazon.com/s?k=',
			Brave:'https://search.brave.com/search?q=',
			DuckDuckGo:'https://duckduckgo.com/?q=',
			Genius:'https://genius.com/search?q=',
			Google:'https://www.google.com/search?q=',
			IMDb:'https://www.imdb.com/find?q=',
			PubMed:'https://pubmed.ncbi.nlm.nih.gov/?term=',
			Reddit:'https://www.reddit.com/search/?q=',
			Spotify:'https://open.spotify.com/search/',
			Twitter:'https://twitter.com/search?q=',
			UrbanDictionary:'https://www.urbandictionary.com/define.php?term=',
			Youtube:'https://www.youtube.com/results?search_query=',
		};

		new UIAddInput({
			values:Object.keys(this.predefined),
			target:[this, 'onAddNewItem', 'onSubmit'],
			dom:[view, 'addInput']
		});
	}
}

class ItemsView extends UIView
{
	constructor(data)
	{
		super('UIItemsView');

		for (const item of data.iterator)
		{
			this.addItem(item, data.scheme);
		}

		data.addListener('add', this, 'onNewItemAdded');
	}

	addItem(item, scheme)
	{
		this.addSubview(
			new ItemView(item, scheme)
		);
	}

	onNewItemAdded(item, scheme)
	{
		const view = new ItemView(item, scheme);

		this.addSubview(view, 0);

		this.animateItemInsertion(view);

		if (!item.link) {
			view.querySelector('input[name=link]').focus();
		}
	}

	onItemValueChanged(sender, field)
	{
		this.delegate.itemDidModify(
			sender.item,
			field.name,
			field.value
		);
	}

	onItemDrag(sender, e)
	{
		let startX = e.clientX,
			startY = e.clientY,
			points = [],
			target = null,
			views = this.subviews;

		sender.addClass('CSDrag');

		for (const view of views)
		{
			const rect = view.element.getBoundingClientRect();

			points.push({
				x: [rect.x, rect.x + rect.width],
				y: [rect.y, rect.y + rect.height],
			});
		}

		document.onpointermove = e =>
		{
			let cx = e.clientX,
				cy = e.clientY,
				dx = cx - startX,
				dy = cy - startY;

			UX.translate(sender, dx, dy);

			let oldTarget = target;
			let newTarget = null;

			for (const p of points)
			{
				let view, isOver = std.inRange(cx, p.x) && std.inRange(cy, p.y);

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
					oldTarget.removeClass('CSDragOver');
				}

				if (newTarget) {
					newTarget.addClass('CSDragOver');
				}

				target = newTarget;
			}
		};

		document.onpointerup = e =>
		{
			let i, j, Y = 0, d = 200;

			if (target)
			{
				Y = target.element.offsetTop - sender.element.offsetTop;

				let childs, y = sender.element.offsetHeight;

				i = views.indexOf(sender);
				j = views.indexOf(target);

				if (i > j) {
					childs = views.slice(j, i);
				}
				else {
					childs = views.slice(i + 1, j + 1);
					y = -y;
				}

				this.animate(childs, [0, y], d);
			}

			UX.translate(sender, 0, Y, d).then(_ =>
			{
				UX.transClass(sender, 'CSDragEnd', 'CSDrag');

				if (target)
				{
					target.removeClass('CSDragOver');

					this.moveSubview(i, j);

					this.delegate.itemDidMove(i, j);
				}
			});

			document.onpointerup = document.onpointermove = null;
		}
	}

	onItemRemove(sender)
	{
		this.animateItemRemove(sender).then(
			done => this.removeSubview(sender)
		);

		this.delegate.itemDidRemove(sender.item);
	}

	moveSubview(i, j)
	{
		const source = this.subviews[i].element;
		const target = this.subviews[j].element;

		if (i < j) {
			target.insertAdjacentElement('afterend', source);
		}
		else {
			target.insertAdjacentElement('beforebegin', source);
		}

		array.move(i, j, this.subviews);
	}

	animateItemInsertion(view, duration = 200)
	{
		this.animateItemMutation(view, 'insertion', duration);

		return UX.fadein(view, duration);
	}

	animateItemRemove(view, duration = 200)
	{
		this.animateItemMutation(view, 'removal', duration);

		return UX.fadeout(view, duration);
	}

	animateItemMutation(view, mutation, duration)
	{
		const frames = [0, -view.element.offsetHeight];

		if (mutation == 'insertion') {
			frames.reverse();
		}

		const views = this.subviews.slice(
			this.subviews.indexOf(view) + 1
		);

		this.animate(views, frames, duration);
	}

	animate(views, frames, duration)
	{
		const [from, into] = frames;

		frames = [
			{transform:`translateY(${from}px)`},
			{transform:`translateY(${into}px)`},
		];

		for (const view of views)
		{
			view.element.animate(frames, duration);
		}
	}
}

class ItemView extends UIView
{
	constructor(item, scheme)
	{
		super('UIItemView');

		this.item = item;

		this.draw(item, scheme);
	}

	draw(item, scheme)
	{
		for (const key in scheme)
		{
			new UITextInput({
				css:'CSDataInput',
				name:key,
				value:item[key],
				placeholder:scheme[key].holder,
				target:[this, 'onChange'],
				dom:[this, 'dataContainer']
			});
		}

		new UIButton({
			image:'UIIconBars',
			target:[this, 'onDrag', 'pointerdown'],
			dom:[this, 'dragIcon']
		});

		new UIButton({
			image:'UIIconMinus',
			target:[this, 'onRemove', 'click'],
			dom:[this, 'removeIcon']
		});
	}

	onChange(input)
	{
		this.handleAction('onItemValueChanged', this, input);
	}

	onDrag(sender, e)
	{
		this.handleAction('onItemDrag', this, e);
	}

	onRemove()
	{
		this.handleAction('onItemRemove', this);
	}
}

class UITextInput extends UIView
{
	constructor(init)
	{
		init.import = 'focus placeholder';

		super('UITextInput', init);

		this.name = init.name || '';
		this.value = init.value || '';
		this.placeholder = init.placeholder || '';

		this.setAttribute('name', this.name);

		this.addListener('keydown', 'onKeydown');
		this.addListener('keyup', 'onKeyup');
		this.addListener('input', 'onChange');
	}

	get value()
	{
		return this.element.value.trim();
	}

	set value(s)
	{
		this.element.value = String(s).trim();
	}

	reset()
	{
		this.value = '';
	}

	onKeydown(e)
	{
		if (e.key == 'Enter') {
			return this.sendAction('onEnter', e);
		}

		if (e.key == 'Tab') {
			return this.sendAction('onTab', e);
		}
	}

	onKeyup(e)
	{
		this.sendAction('onKeyup', e);
	}

	onChange(e)
	{
		this.sendAction('onChange');
	}
}

class UIAddInput extends UIDefault
{
	constructor(init)
	{
		init.css = 'CSAddItemInput';

		super(init);

		this.setValues(init.values);

		this.draw();
	}

	get value()
	{
		return this.input.value;
	}

	set value(s)
	{
		this.input.value = s;
	}

	get suggestion()
	{
		return this.suggestId;
	}

	set suggestion(id)
	{
		const curVal = this.value;
		const newVal = this.values[id] || '';

		this.suggestId = newVal;

		this.suggest.textContent = curVal + newVal.substring(curVal.length);
	}

	reset()
	{
		this.input.reset();

		this.suggestion = '';
	}

	onChange()
	{
		this.autocomplete();
	}

	onTab(sender, e)
	{
		if (this.suggestion) {
			e.preventDefault() & this.acceptSuggestion();
		}
	}

	onEnter()
	{
		if (this.suggestion) {
			this.acceptSuggestion();
		}

		this.sendAction('onSubmit');
	}

	autocomplete()
	{
		const a = this.value.toLowerCase();

		for (const b in this.values)
		{
			if (a && b.startsWith(a)) {
				return this.suggestion = b;
			}
		}

		this.suggestion = '';
	}

	acceptSuggestion()
	{
		const s = this.suggestion;

		if (this.value.length == s.length) {
			return;
		}

		this.value = this.suggest.textContent = s;
	}

	setValues(array)
	{
		const values = {};

		for (const val of array)
		{
			values[val.toLowerCase()] = val;
		}

		this.values = values;
	}

	draw()
	{
		const suggest = new UIDefault({
			css:'CSSuggestion'
		});

		const input = new UITextInput({
			placeholder:'Add new item...'
		});

		input.addTargets(this, ['onChange', 'onTab', 'onEnter']);

		this.addSubviews([suggest, input]);

		Object.assign(this, {suggest, input});
	}
}

class Main extends ViewController
{
	constructor()
	{
		window.UI = new UIFactory;

		super(
			new UIView('UIMainView')
		);

		this.addChild(new EditView);
	}

	viewDidSet(view)
	{
		UI.insertInitialView(view);
	}
}

new Main;