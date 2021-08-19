'use strict';

const {
  Util: BaseUtil,
  Options,
  Constants: { Endpoints },
} = require('discord.js');
const fetch = require('node-fetch');
const { Error: DiscordError } = require('../errors');

class Util extends BaseUtil {
  static chunk(arr, size) {
    let result = [];
    let dom = arr.length / size;

    while (arr.length > 0) {
      result.push(arr.splice(0, Math.ceil(dom)));
    }

    return result;
  }

  static async fetchSessionStartLimit(token) {
    if (!token) throw new DiscordError('TOKEN_MISSING');
    const defaults = Options.createDefault();
    const response = await fetch(`${defaults.http.api}/v${defaults.http.version}${Endpoints.botGateway}`, {
      method: 'GET',
      headers: { Authorization: `Bot ${token.replace(/^Bot\s*/i, '')}` },
    });
    if (!response.ok) {
      if (response.status === 401) throw new DiscordError('TOKEN_INVALID');
      throw response;
    }
    const { session_start_limit } = await response.json();
    return session_start_limit;
  }
}

module.exports = Util;
