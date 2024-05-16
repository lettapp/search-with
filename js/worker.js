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
	return is.array(x) ? [...x] : assign({}, x);
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

	static removeAll()
	{
		return chrome.contextMenus.removeAll();
	}
}

class ext
{
	static async onInstalled({previousVersion})
	{
		if (previousVersion < 3.12) {
			await storage.clear();
		};

		this.getOptionsViewList().then(
			list => this.setItems(list || this.default)
		);
	}

	static setItems(optionsViewList)
	{
		const contextMenuList = structuredClone(optionsViewList);

		contextMenu.removeAll().then(
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
				item.id = contextMenu.addItem({parentId, title:item.name});
			}
		}

		contextMenu.addSeparator();
		contextMenu.addItem({id:Extension.EDITOR, title:'Add new...'});

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

class App
{
	constructor()
	{
		chrome.runtime.onInstalled.addListener(
			this.onInstalled.bind(this)
		);

		chrome.contextMenus.onClicked.addListener(
			this.onMenuItemClicked.bind(this)
		);

		chrome.action.onClicked.addListener(
			this.onClicked.bind(this)
		);
	}

	onMenuItemClicked({menuItemId, selectionText}, sender)
	{
		if (menuItemId == Extension.EDITOR) {
			return this.openEditor();
		}

		ext.getContextMenuItem(menuItemId).then(
			({link, incognito}) => this.openSearchTab(link, incognito, selectionText, sender)
		);
	}

	onClicked()
	{
		this.openEditor();
	}

	onInstalled(details)
	{
		ext.onInstalled(details);
	}

	openEditor()
	{
		this.tryFocusEditorWindow().then(
			didFocus => !didFocus && this.openNewEditorWindow()
		);
	}

	tryFocusEditorWindow()
	{
		return storage.get('lastEditorWindowId').then(
			id => chrome.windows.update(id ?? 0, {focused:true}).catch(none)
		);
	}

	async openNewEditorWindow()
	{
		const screen = await chrome.system.display.getInfo().then(arr => arr[0].bounds);
		const arrLen = await ext.getItemsCount();

		const params = {
			url:'html/options.html',
			type:'popup',
			top:0,
			width:340,
			left:Math.floor((screen.width - 340) / 2),
			height:Math.max(460, arrLen * 52 + 220),
		};

		chrome.windows.create(params).then(
			w => storage.set({lastEditorWindowId:w.id})
		);
	}

	openSearchTab(url, incognito, text, sender)
	{
		text = text.trim();
		text = encodeURIComponent(text).replace(/%20/g, '+');

		try {
			url = new URL(url.replace(/%s|$/, text)).href;
		}
		catch {
			return;
		}

		if (incognito > sender.incognito) {
			chrome.windows.create({url, incognito});
		}
		else {
			chrome.tabs.create({url});
		}
	}
}

let app = new App;