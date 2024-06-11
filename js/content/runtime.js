/*
 * This code is part of Lett Search With chrome extension
 *
 * LettApp lett.app/search-with
 * GitHub  @lettapp
 */
'use strict';

function entries(object)
{
	return Object.entries(object);
}

function unpack(object)
{
	return entries(object).shift();
}

class App
{
	constructor()
	{
		chrome.runtime.onMessage.addListener(
			this.onMessage.bind(this)
		);
	}

	onMessage(message, sender, callback)
	{
		const [kind, data] = unpack(message);

		if (kind == 'ping') {
			return callback(true);
		}

		if (kind == 'prompt') {
			return this.onPrompt(data, callback);
		}
	}

	onPrompt({message, value}, callback)
	{
		callback(
			prompt(message, value)
		);
	}
}

let app = new App;