/**
 *  Blue loot is handled by fixed NPC buy orders, not Jita price.
 */
var BLUE_LOOT = {
  'Ancient Coordinates Database': 1500000,
  'Neural Network Analyzer': 200000,
  'Sleeper Data Library': 500000,
  'Sleeper Drone AI Nexus': 5000000,
  'Triglavian Survey Databse': 100000
};

/**
 *  Tax rate to apply to loot.  Payout will be 1 - TAX_RATE.
 */
var TAX_RATE = 0.15;

/**
 *  Main rendering function for GET request
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('calc.html')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 *  Makes an Evepraisal URL for an inventory item paste.
 *
 *  Returns false for fetch error or no Evepraisal ID in response.
 */
function makeEvepraisal(loot) {
  var resp;
  try {
    resp = UrlFetchApp.fetch('http://evepraisal.com/appraisal', {
      method: 'post',
      //contentType: 'multipart/form-data',
      muteHttpExceptions: true,
      payload: {
        raw_textarea: loot,
        market: 'jita',
      }
    }).getContentText();
  } catch(error) {
    return false;
  }
  var matches = resp.match(/Evepraisal - Appraisal Result ([a-z0-9]+)/);
  if (!matches) {
    return false;
  }
  return 'http://evepraisal.com/a/' + matches[1];
}

/**
 *  Calculate the payout for some loot.
 *
 *  Handles both evepraisal URL or inventory block.
 */
function calculatePayout(loot) {
  var evepraisal_url = loot.match('http://evepraisal.com/a/[a-z0-9]+');
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
      payout += BLUE_LOOT[item.name] * item.quantity * (1 - TAX_RATE);
    } else {
      if (item.prices) {
        payout += item.prices.buy.max * item.quantity * (1 - TAX_RATE);
      }
    }
  }

  return {
    payout: payout,
    evepraisal_url: evepraisal_url
  };
}
