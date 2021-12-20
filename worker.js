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

class Main
{
	constructor()
	{
		chrome.runtime.onInstalled.addListener(
			this.onInstalled.bind(this)
		);

		chrome.action.onClicked.addListener(
			this.openOptionsPage.bind(this)
		);

		chrome.contextMenus.onClicked.addListener(
			this.handle.bind(this)
		);
	}

	onInstalled()
	{
		sync.init();
	}

	handle(e, tab)
	{
		sync.getItemsObject(items =>
		{
			const itemId = e.menuItemId, baseUrl = items[itemId];

			if (!baseUrl)
			{
				if (itemId == chrome.runtime.id) {
					return this.openOptionsPage(tab);
				}

				return;
			}

			chrome.tabs.create({
				url: baseUrl + encodeURIComponent(e.selectionText)
			});
		});
	}

	openOptionsPage(tab)
	{
		const w = 360, h = 400;

		const p = {
			type:'popup',
			url:'options/main.html',
			width:w,
			height:h,
			top:Math.floor((tab.height - h) / 2),
			left:Math.floor((tab.width - w) / 2),
		};

		chrome.windows.create(p);
	}
}

new Main;