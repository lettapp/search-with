/*
 * This code is part of Lett Search With chrome extension
 *
 * LettApp lett.app/search-with
 * GitHub  @lettapp
 */
'use strict';

const Ext = {
	Editor:'Editor',
	NewTab:'newForegroundTab',
	CurrentTab:'currentTab',
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

	static grep(ptrn, str)
	{
		const m = this.match(ptrn, str);

		switch (m.length)
		{
			case 0: return '';
			case 1: return m[0];
			case 2: return m[1];

			default:
				return m.slice(1);
		}
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

class regex
{
	static create(pattern, args)
	{
		let ptrn = string.grep(/.(.+)\//, pattern),
			mods = string.grep(/[a-z]+$/, pattern);

		ptrn = string.format(ptrn,
			array.cast(args).map(this.escape)
		);

		return new RegExp(ptrn, mods);
	}

	static escape(s)
	{
		return String(s).replace(/[-()\[\]{}+?*.$^|,:#<!\\]/g, '\\$&');
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

	static removeAll(fn)
	{
		chrome.contextMenus.removeAll(fn);
	}
}

class ext
{
	static setItems(editorViewList)
	{
		const contextMenuList = structuredClone(editorViewList);

		contextMenu.removeAll(
			_ => storage.set({contextMenuList:this.createContextMenu(contextMenuList)})
		);

		storage.set({editorViewList});
	}

	static getContextMenuItem(id)
	{
		return storage.get('contextMenuList').then(
			list => list.find(e => e.id == id)
		);
	}

	static getItemsCount()
	{
		return this.getEditorViewList().then(list => list.length);
	}

	static getEditorViewList()
	{
		return storage.get('editorViewList');
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
			id:Ext.Editor,
			title:'Add new...',
		});

		return [...nrml, ...incg];
	}

	static default = [{
		name:'Google',
		link:'https://www.google.com/search?q=%s',
		mode:Mode.NRML,
	},{
		name:'YouTube',
		link:'https://www.youtube.com/results?search_query=%s',
		mode:Mode.NRML,
	},{
		name:'X',
		link:'https://x.com/search?q=%s',
		mode:Mode.NRML,
	}]
}

class tabs
{
	static async prompt(tab, prompt)
	{
		const alive = await this.sendMessage(tab.id, {ping:null}).catch(none);

		if (!alive)
		{
			const scriptable = await chrome.scripting.executeScript({
				target: {
					tabId: tab.id
				},
				files: ['/js/content/runtime.js']
			})
			.catch(none);

			if (!scriptable) {
				return;
			}
		}

		return this.sendMessage(tab.id, {prompt});
	}

	static getActive()
	{
		return this.query({active:true, currentWindow:true}).then(tabs => tabs[0]);
	}

	static sendMessage(tabId, message)
	{
		return chrome.tabs.sendMessage(tabId, message);
	}

	static query(p)
	{
		return chrome.tabs.query(p);
	}
}

class App
{
	constructor()
	{
		chrome.action.onClicked.addListener(
			this.onClicked.bind(this)
		);

		chrome.contextMenus.onClicked.addListener(
			this.onMenuItemClicked.bind(this)
		);

		chrome.omnibox.onInputEntered.addListener(
			this.onOmniEnter.bind(this)
		);

		chrome.commands.onCommand.addListener(
			this.onCommand.bind(this)
		);

		chrome.runtime.onInstalled.addListener(
			this.onInstalled.bind(this)
		);
	}

	onInstalled({reason})
	{
		if (!['install', 'update'].includes(reason)) {
			return;
		}

		ext.getEditorViewList().then(
			list => ext.setItems(list || ext.default)
		);
	}

	onClicked(sender)
	{
		this.openEditor(sender);
	}

	onCommand(command, sender)
	{
		tabs.prompt(sender, {message:'Lett Search With:', value:''}).then(
			userInput => this.onPromptEnter(userInput, sender)
		);
	}

	onMenuItemClicked({menuItemId, selectionText}, sender)
	{
		if (menuItemId == Ext.Editor) {
			return this.openEditor(sender);
		}

		if (!selectionText) {
			return;
		}

		ext.getContextMenuItem(menuItemId).then(
			item => this.execRequest(item.link, item.incognito, selectionText, sender, Ext.NewTab)
		);
	}

	async onOmniEnter(userInput, disposition)
	{
		const {searchUrl, incognito, userQuery} = await this.parse(userInput);

		if (searchUrl) {
			tabs.getActive().then(
				tab => this.execRequest(searchUrl, incognito, userQuery, tab, disposition)
			);
		}
	}

	async onPromptEnter(userInput, sender)
	{
		if (!userInput) {
			return;
		}

		const {searchUrl, incognito, userQuery} = await this.parse(userInput);

		if (searchUrl) {
			return this.execRequest(searchUrl, incognito, userQuery, sender, Ext.NewTab);
		}

		tabs.prompt(sender, {message:'Could not find engine', value:userInput}).then(
			userInput => this.onPromptEnter(userInput, sender)
		);
	}

	openEditor(sender)
	{
		this.tryFocusExistingEditor().then(
			didFocus => !didFocus && this.openNewEditorWindow(sender)
		);
	}

	tryFocusExistingEditor()
	{
		return storage.get('lastEditorWindowId').then(
			id => chrome.windows.update(id ?? 0, {focused:true}).catch(none)
		);
	}

	async openNewEditorWindow(tab)
	{
		const arrLen = await ext.getItemsCount();

		const params = {
			url:'html/editor.html',
			type:'popup',
			top:0,
			width:340,
			left:Math.floor((tab.width - 340) / 2),
			height:Math.max(460, arrLen * 52 + 220),
		};

		chrome.windows.create(params).then(
			w => storage.set({lastEditorWindowId:w.id})
		);
	}

	async parse(userInput)
	{
		const itemArray = await ext.getEditorViewList();

		for (const item of itemArray)
		{
			const matched = string.grep(
				regex.create('/^%sx?/i', item.name), userInput
			);

			if (matched) return {
				searchUrl:item.link,
				incognito:item.mode == Mode.INCG || /.x$/.test(matched),
				userQuery:userInput.substring(matched.length)
			};
		}

		return {};
	}

	execRequest(url, incognito, text, sender, disposition)
	{
		text = text.trim();
		text = encodeURIComponent(text).replace(/%20/g, '+');

		try {
			url = new URL(url.replace(/%s|$/, text)).href;
		}
		catch {
			return;
		}

		if (incognito && !sender.incognito) {
			return chrome.windows.create({url, incognito});
		}

		if (disposition == Ext.CurrentTab) {
			return chrome.tabs.update({url});
		}

		chrome.tabs.create({url,
			active: disposition == Ext.NewTab
		});
	}
}

let app = new App;