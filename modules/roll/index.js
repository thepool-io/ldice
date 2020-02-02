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

const Drawing = require('./moduleBase');
const BaseModule = require('lisk-framework/src/modules/base_module');

class RollModule extends BaseModule {
  constructor(options) {
    super(options);
    this.drawing = null;
  }

  static get alias() {
    return 'drawing';
  }

  static get info() {
    return {
      author: 'thepool',
      version: '1.0.0',
      name: 'ldice-draw-module',
      credits: 'Corbifex',
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
    this.drawing = new Drawing(channel, this.options);

    channel.once('app:ready', async () => {
      await this.drawing.bootstrap();
    });
  }

  async unload() {
    return this.drawing ? this.drawing.cleanup(0) : true;
  }
}

module.exports = RollModule;
