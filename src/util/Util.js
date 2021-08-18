'use strict';

const { Util: BaseUtil } = require('discord.js');

class Util extends BaseUtil {
  static chunk(arr, size) {
    let result = [];

    for (let i = 0; i < arr.length; i) {
      result.push(arr.slice(i, (i += size)));
    }

    return result;
  }
}

module.exports = Util;
