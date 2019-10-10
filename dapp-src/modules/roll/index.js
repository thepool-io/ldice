/*
 * Copyright © 2019 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

'use strict';

const Roll = require('./roll');
const BaseModule = require('lisk-framework/src/modules/base_module');

class RollModule extends BaseModule {
  constructor(options) {
    super(options);
    this.roll = null;
  }

  static get alias() {
    return 'roll';
  }

  static get info() {
    return {
      author: 'Moosty',
      version: '0.0.1',
      name: 'ldice-roll',
    };
  }

  static get defaults() {
    return {};
  }

  get events() {
    return [];
  }

  get actions() {
    return {};
  }

  async load(channel) {
    this.roll = new Roll(channel, this.options);

    channel.once('app:ready', async () => {
      await this.roll.bootstrap();
    });
  }

  async unload() {
    return this.roll ? this.roll.cleanup(0) : true;
  }
}

module.exports = RollModule;
