/**
 *  Blue loot is handled by fixed NPC buy orders, not Jita price.
 */
var BLUE_LOOT = {
'Ancient Coordinates Database': 1500000,
'Neural Network Analyzer': 200000,
'Sleeper Data Library': 500000,
'Sleeper Drone AI Nexus': 5000000
};

/**
 *  Main rendering function for GET request
 */
function doGet() {
	return HtmlService.createHtmlOutputFromFile('calc.html')
		.addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 *  Makes an Evepraisal URL for an inventory item paste.
 *
 *  Returns false for fetch error or no Evepraisal ID in response.
 */
function makeEvepraisal(loot) {
	var resp;
  try {
		resp = UrlFetchApp.fetch('http://evepraisal.com/estimate', {
				method: 'post',
				payload: {
					raw_paste: loot,
					hide_buttons: false,
					paste_autosubmit: false,
					market: '30000142',  // Jita
					save: true
				}
			}).getContentText();
  } catch(error) {
    return false;
  }
	var matches = resp.match(/document.title = "Evepraisal - Result #([0-9]+)/);
	if (!matches) {
		return false;
	}
	return 'http://evepraisal.com/e/' + matches[1];
}

/**
 *  Calculate the payout for some loot.
 *
 *  Handles both evepraisal URL or inventory block.
 */
function calculatePayout(loot) {
	var evepraisal_url = loot.match('http://evepraisal.com/e/[0-9]+');
	if (!evepraisal_url) {
		evepraisal_url = makeEvepraisal(loot);
		if (!evepraisal_url) {
			return { error: "Couldn't make Evepraisal for items" };
		}
	}
	var json;
	try {
		json = UrlFetchApp.fetch(evepraisal_url + '.json');
	} catch(error) {
		return { error: "Couldn't fetch Evepraisal JSON for URL: " + evepraisal_url };
	}
	var evepraisal = JSON.parse(json);

	var payout = 0;
	for (i = 0, leni = evepraisal.items.length; i < leni; i++) {
		var item = evepraisal.items[i];
		if (item.name in BLUE_LOOT) {
			payout += BLUE_LOOT[item.name] * item.quantity * 0.85;
		} else {
			payout += item.prices.buy.max * item.quantity * 0.85;
		}
	}

	return {
		payout: payout,
		evepraisal_url: evepraisal_url
	};
}
